import pandas as pd
import logging
import concurrent.futures
import threading
import json
import psutil
import os
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

from engine.metrics import ExecutionMetrics
from engine.connectors.factory import ConnectorFactory
from engine.transforms.factory import TransformFactory

logger = logging.getLogger("SynqX-Agent-Executor")

class DataCache:
    """Thread-safe data cache with LRU eviction."""
    def __init__(self, max_memory_mb: int = 2048):
        self._cache: Dict[str, List[pd.DataFrame]] = {}
        self._lock = threading.RLock()
        self.max_memory_mb = max_memory_mb
        self._current_memory_mb = 0.0
        self._access_order: List[str] = []
        
    def store(self, node_id: str, chunks: List[pd.DataFrame]):
        with self._lock:
            memory_mb = sum(df.memory_usage(deep=True).sum() for df in chunks) / (1024 * 1024)
            if self._current_memory_mb + memory_mb > self.max_memory_mb:
                self._apply_memory_pressure_strategy(memory_mb)
            if node_id in self._cache:
                old_memory = sum(df.memory_usage(deep=True).sum() for df in self._cache[node_id]) / (1024 * 1024)
                self._current_memory_mb -= old_memory
            self._cache[node_id] = chunks
            self._current_memory_mb += memory_mb
            if node_id in self._access_order:
                self._access_order.remove(node_id)
            self._access_order.append(node_id)

    def retrieve(self, node_id: str) -> List[pd.DataFrame]:
        with self._lock:
            chunks = self._cache.get(node_id, [])
            if chunks and node_id in self._access_order:
                self._access_order.remove(node_id)
                self._access_order.append(node_id)
            return chunks

    def clear(self, node_ids: List[str]):
        with self._lock:
            for nid in node_ids:
                if nid in self._cache:
                    chunks = self._cache.pop(nid)
                    self._current_memory_mb -= sum(df.memory_usage(deep=True).sum() for df in chunks) / (1024 * 1024)
                    if nid in self._access_order:
                        self._access_order.remove(nid)

    def _apply_memory_pressure_strategy(self, required_mb: float):
        if not self._cache:
            return
        target_free = required_mb * 1.2
        freed = 0.0
        while freed < target_free and self._access_order:
            lru_node = self._access_order.pop(0)
            chunks = self._cache.pop(lru_node)
            node_mem = sum(df.memory_usage(deep=True).sum() for df in chunks) / (1024 * 1024)
            self._current_memory_mb -= node_mem
            freed += node_mem

class NodeExecutor:
    """Agent Node Executor - Standardized with Backend logic."""
    def __init__(self, connections: Dict[str, Any]):
        self.connections = connections

    def _get_process_metrics(self) -> Tuple[float, float]:
        try:
            process = psutil.Process(os.getpid())
            return float(process.cpu_percent()), process.memory_info().rss / (1024 * 1024)
        except Exception:
            return 0.0, 0.0

    def _sniff_data(self, df: pd.DataFrame, max_rows: int = 100) -> Optional[Dict]:
        try:
            if df.empty:
                return None
            sample_df = df.head(max_rows)
            return {
                "rows": json.loads(sample_df.to_json(orient="records", date_format="iso")),
                "columns": list(df.columns),
                "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
                "shape": df.shape,
                "total_rows": len(df)
            }
        except Exception:
            return None

    def execute(self, node: Dict[str, Any], inputs: Dict[str, List[pd.DataFrame]], status_cb: Any = None) -> List[pd.DataFrame]:
        node_id = node.get("node_id", "unknown")
        op_type = node.get("operator_type", "noop").lower()
        op_class = node.get("operator_class") or op_type
        
        # CLEANUP: Remove UI and routing metadata that shouldn't reach the engine/connectors
        config = {**node.get("config", {})}
        config.pop("ui", None)
        config.pop("connection_id", None)
        
        logger.info(f"→ Initializing node '{node_id}' ({op_type.upper()}/{op_class})")
        
        stats = {"in": 0, "out": 0, "error": 0, "bytes": 0}
        samples = {}
        results = []

        def on_chunk(chunk: pd.DataFrame, direction: str = "out", error_count: int = 0, filtered_count: int = 0):
            if chunk.empty and error_count == 0:
                return
            
            if direction not in samples and not chunk.empty:
                samples[direction] = self._sniff_data(chunk)
            
            chunk_rows = len(chunk)
            chunk_bytes = int(chunk.memory_usage(deep=True).sum()) if not chunk.empty else 0
            
            if direction == "out":
                stats["out"] += chunk_rows
                stats["bytes"] += chunk_bytes
            elif direction == "in":
                stats["in"] += chunk_rows
            
            stats["error"] += error_count
            
            if status_cb:
                cpu, mem = self._get_process_metrics()
                status_cb(node_id, "running", {
                    "records_in": stats["in"],
                    "records_out": stats["out"],
                    "records_error": stats["error"],
                    "bytes_processed": stats["bytes"],
                    "cpu_percent": cpu,
                    "memory_mb": mem,
                    "sample_data": samples
                })

        try:
            # EXTRACT
            if op_type == "extract":
                conn_id = str(node.get("connection_id") or (node.get("source_asset") or {}).get("connection_id"))
                conn_data = self.connections.get(conn_id)
                if not conn_data:
                    raise ValueError(f"Target connection metadata (ID: {conn_id}) is missing from payload.")
                
                connector = ConnectorFactory.get_connector(conn_data["type"], conn_data["config"])
                asset_name = config.get("table") or config.get("asset") or config.get("query") or "unknown"
                
                logger.info(f"  Streaming read from {conn_data['type'].upper()} entity: '{asset_name}'")
                with connector.session():
                    for chunk in connector.read_batch(asset=asset_name, **config):
                        on_chunk(chunk, direction="out")
                        results.append(chunk)

            # LOAD
            elif op_type == "load":
                conn_id = str(node.get("connection_id") or (node.get("destination_asset") or {}).get("connection_id"))
                conn_data = self.connections.get(conn_id)
                if not conn_data:
                    raise ValueError(f"Target connection metadata (ID: {conn_id}) is missing from payload.")
                
                connector = ConnectorFactory.get_connector(conn_data["type"], conn_data["config"])
                asset_name = config.get("table") or config.get("target_table") or "synqx_output"
                
                def input_stream():
                    for chunks in inputs.values():
                        for df in chunks:
                            on_chunk(df, direction="in")
                            yield df
                
                logger.info(f"  Streaming commit to {conn_data['type'].upper()} entity: '{asset_name}'")
                with connector.session():
                    rows_written = connector.write_batch(input_stream(), asset=asset_name, mode=config.get("write_mode", "append"))
                    stats["out"] = rows_written
                results = []

            # TRANSFORM
            else:
                t_config = {**config, "_on_chunk": on_chunk}
                transform = TransformFactory.get_transform(op_class, t_config)
                
                logger.info(f"  Applying transformation logic: '{op_class}'")
                if op_type in ["join", "union", "merge"]:
                    input_map = {uid: iter(chunks) for uid, chunks in inputs.items()}
                    # Join/Union implementations handle on_chunk internally via t_config
                    data_iter = transform.transform_multi(input_map)
                else:
                    first_input = next(iter(inputs.values())) if inputs else []
                    data_iter = transform.transform(iter(first_input))
                
                for chunk in data_iter:
                    on_chunk(chunk, direction="out")
                    results.append(chunk)

            return results

        except Exception as e:
            logger.error(f"Node '{node_id}' failed with a terminal error: {str(e)}")
            raise

class ParallelAgent:
    """Standardized multi-threaded executor matching backend standard."""
    def __init__(self, executor: NodeExecutor, max_workers: int = 4):
        self.executor = executor
        self.max_workers = max_workers
        self.cache = DataCache()
        self.metrics = ExecutionMetrics()

    def run(self, dag: Any, node_map: Dict[str, Any], log_cb: Any, status_cb: Any = None):
        self.metrics.execution_start = datetime.utcnow()
        self.metrics.total_nodes = len(node_map)
        layers = dag.get_execution_layers()
        
        try:
            for i, layer_nodes_ids in enumerate(layers):
                log_cb(f"🚀 Execution Stage {i+1}/{len(layers)} initiated")
                with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as pool:
                    futures = {}
                    for nid in layer_nodes_ids:
                        node = node_map[nid]
                        inputs = {uid: self.cache.retrieve(uid) for uid in dag.get_upstream_nodes(nid)}
                        if status_cb:
                            status_cb(nid, "pending")
                        futures[pool.submit(self.executor.execute, node, inputs, status_cb)] = nid
                        if status_cb:
                            status_cb(nid, "running")

                    for future in concurrent.futures.as_completed(futures):
                        nid = futures[future]
                        try:
                            chunks = future.result()
                            self.cache.store(nid, chunks)
                            self.metrics.completed_nodes += 1
                            total_rows = sum(len(df) for df in chunks)
                            self.metrics.total_records_processed += total_rows
                            log_cb(f"✅ Node '{nid}' finalized successfully. [{total_rows:,} records processed]", nid)
                            if status_cb:
                                status_cb(nid, "success", {
                                    "records_out": total_rows,
                                    "sample_data": self.executor._sniff_data(chunks[0]) if chunks else None
                                })
                        except Exception as e:
                            self.metrics.failed_nodes += 1
                            log_cb(f"❌ Node '{nid}' aborted due to a terminal error: {str(e)}", nid)
                            if status_cb:
                                status_cb(nid, "failed", {"error_message": str(e)})
                            raise e

            self.metrics.execution_end = datetime.utcnow()
            return self.metrics.to_dict()
        finally:
            self.cache.clear(list(node_map.keys()))