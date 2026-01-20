import concurrent.futures
import json
import logging
import os
import time
from datetime import UTC, datetime
from typing import Any

import pandas as pd
import polars as pl
import psutil
from synqx_core.utils.data import is_df_empty
from synqx_engine.connectors.factory import ConnectorFactory
from synqx_engine.core import DataProfiler
from synqx_engine.core.data_cache import DataCache
from synqx_engine.metrics import ExecutionMetrics
from synqx_engine.transforms.factory import TransformFactory

from engine.core.sql_generator import SQLPushdownGenerator

logger = logging.getLogger("SynqX-Agent-Executor")


class NodeExecutor:
    """Agent Node Executor - Standardized with Backend logic."""

    def __init__(self, connections: dict[str, Any]):
        self.connections = connections
        self.profiler = DataProfiler()

    def _get_process_metrics(self) -> tuple[float, float]:
        try:
            process = psutil.Process(os.getpid())
            return float(process.cpu_percent()), process.memory_info().rss / (
                1024 * 1024
            )
        except Exception:
            return 0.0, 0.0

    def _sniff_data(self, df: Any, max_rows: int = 100) -> dict | None:
        try:
            if is_df_empty(df):
                return None

            # Standardize on pandas for sniffing if needed
            if hasattr(df, "to_pandas"):
                df = df.to_pandas()

            sample_df = df.head(max_rows)
            return {
                "rows": json.loads(
                    sample_df.to_json(orient="records", date_format="iso")
                ),
                "columns": list(df.columns),
                "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
                "shape": df.shape,
                "total_rows": len(df),
            }
        except Exception:
            return None

    def execute(  # noqa: PLR0912, PLR0915
        self,
        node: dict[str, Any],
        inputs: dict[str, list[Any]],
        status_cb: Any = None,
        log_cb: Any = None,
    ) -> list[Any]:
        node_id = node.get("node_id", "unknown")

        # PERFORMANCE: Handle nodes collapsed via ELT Pushdown
        if node.get("config", {}).get("_collapsed_into"):
            collapsed_id = node.get("config", {}).get("_collapsed_into")
            logger.info(
                f"Node '{node_id}' was collapsed into '{collapsed_id}' via ELT Pushdown. Skipping local execution."  # noqa: E501
            )
            if status_cb:
                status_cb(
                    node_id,
                    "success",
                    {
                        "records_in": 0,
                        "records_out": 0,
                        "message": f"Pushed down to {collapsed_id}",
                    },
                )
            return [], {}

        op_type = node.get("operator_type", "noop").lower()
        op_class = node.get("operator_class") or op_type

        # CLEANUP: Remove UI and routing metadata that shouldn't reach the engine/connectors  # noqa: E501
        config = {**node.get("config", {})}
        config.pop("ui", None)
        config.pop("connection_id", None)

        logger.info(
            f"[INIT] Initializing node '{node_id}' ({op_type.upper()}/{op_class})"
        )

        stats = {"in": 0, "out": 0, "error": 0, "bytes": 0, "chunks": 0}
        samples = {}
        results = []
        quality_profile = {}

        def on_chunk(  # noqa: PLR0912
            chunk: Any,
            direction: str = "out",
            error_count: int = 0,
            filtered_count: int = 0,
        ):
            nonlocal quality_profile
            chunk_is_empty = is_df_empty(chunk)
            if chunk_is_empty and error_count == 0:
                return

            stats["chunks"] += 1

            # --- QUALITY PROFILING ---
            if direction == "out" and not chunk_is_empty:
                chunk_profile = self.profiler.profile_chunk(chunk)
                quality_profile = self.profiler.merge_profiles(
                    quality_profile, chunk_profile
                )

                # ENFORCE GUARDRAILS (The "Circuit Breaker")
                guardrails = node.get("guardrails", []) or node.get("config", {}).get(
                    "guardrails", []
                )
                total_rows = stats["out"] + len(chunk)

                try:
                    self.profiler.check_guardrails(
                        quality_profile, guardrails, total_rows
                    )
                except ValueError as ge:
                    logger.error(f"Execution halted: {ge}")
                    raise ge

            # PERFORMANCE: Native Database Quarantine on Agent
            if direction == "quarantine" and not chunk_is_empty:
                q_asset_id = node.get("config", {}).get("quarantine_asset_id")
                q_conn_id = node.get("config", {}).get(
                    "quarantine_connection_id"
                )  # May be passed from backend

                if q_conn_id and q_asset_id:
                    try:
                        # Ensure pandas for write if needed
                        p_chunk = (
                            chunk.to_pandas() if hasattr(chunk, "to_pandas") else chunk
                        )

                        q_conn_data = self.connections.get(str(q_conn_id))
                        if q_conn_data:
                            q_connector = ConnectorFactory.get_connector(
                                q_conn_data["type"], q_conn_data["config"]
                            )
                            logger.info(
                                f"Diverting {len(p_chunk)} invalid rows to native quarantine..."  # noqa: E501
                            )
                            with q_connector.session():
                                q_connector.write_batch(
                                    [p_chunk], asset=q_asset_id, mode="append"
                                )
                    except Exception as q_err:
                        logger.error(
                            f"Agent failed to write native quarantine: {q_err}"
                        )

            if direction not in samples and not chunk_is_empty:
                samples[direction] = self._sniff_data(chunk)

            chunk_rows = len(chunk)

            # Memory usage handling
            if chunk_is_empty:
                chunk_bytes = 0
            elif hasattr(chunk, "estimated_size"):
                chunk_bytes = chunk.estimated_size()
            elif hasattr(chunk, "memory_usage"):
                chunk_bytes = int(chunk.memory_usage(deep=True).sum())
            else:
                chunk_bytes = 0

            if direction == "out":
                stats["out"] += chunk_rows
                stats["bytes"] += chunk_bytes
            elif direction == "in":
                stats["in"] += chunk_rows

            stats["error"] += error_count

            if status_cb:
                cpu, mem = self._get_process_metrics()
                status_cb(
                    node_id,
                    "running",
                    {
                        "records_in": stats["in"],
                        "records_out": stats["out"],
                        "records_error": stats["error"],
                        "bytes_processed": stats["bytes"],
                        "cpu_percent": cpu,
                        "memory_mb": mem,
                        "sample_data": samples,
                        "quality_profile": quality_profile,
                    },
                )

            if (
                log_cb and stats["chunks"] % 10 == 0
            ):  # Log every 10 chunks to avoid spam
                log_cb(
                    f"  Processed {stats['chunks']} chunks. Total records in-flight: {max(stats['in'], stats['out']):,}",  # noqa: E501
                    node_id,
                )

        try:
            # EXTRACT
            if op_type == "extract":
                conn_id = str(
                    node.get("connection_id")
                    or (node.get("source_asset") or {}).get("connection_id")
                )
                conn_data = self.connections.get(conn_id)
                if not conn_data:
                    raise ValueError(
                        f"Target connection metadata (ID: {conn_id}) is missing from payload."  # noqa: E501
                    )

                connector = ConnectorFactory.get_connector(
                    conn_data["type"], conn_data["config"]
                )
                asset_name = (
                    config.get("table")
                    or config.get("asset")
                    or config.get("query")
                    or "unknown"
                )

                # PERFORMANCE: Apply ELT Pushdown
                pushdown_ops = config.get("_pushdown_operators")
                if pushdown_ops:
                    optimized_sql = SQLPushdownGenerator.generate_sql(
                        asset_name, pushdown_ops
                    )
                    logger.info(
                        f"  ELT Pushdown applied. Generated SQL: {optimized_sql}"
                    )
                    config["query"] = optimized_sql
                    if "asset" in config:
                        config.pop("asset")
                    if "table" in config:
                        config.pop("table")

                logger.info(
                    f"  Streaming read from {conn_data['type'].upper()} entity: '{asset_name}'"  # noqa: E501
                )
                with connector.session():
                    for chunk in connector.read_batch(asset=asset_name, **config):
                        # PERFORMANCE: Convert to Arrow-backed dtypes
                        try:
                            chunk = chunk.convert_dtypes(dtype_backend="pyarrow")  # noqa: PLW2901
                        except Exception:
                            pass

                        on_chunk(chunk, direction="out")
                        results.append(chunk)

            # LOAD
            elif op_type == "load":
                conn_id = str(
                    node.get("connection_id")
                    or (node.get("destination_asset") or {}).get("connection_id")
                )
                conn_data = self.connections.get(conn_id)
                if not conn_data:
                    raise ValueError(
                        f"Target connection metadata (ID: {conn_id}) is missing from payload."
                    )

                connector = ConnectorFactory.get_connector(
                    conn_data["type"], conn_data["config"]
                )

                # PERFORMANCE: Zero-Movement ELT Pushdown
                native_query = config.get("_native_elt_query")
                if native_query:
                    logger.info(
                        "  ELT Pushdown active: Executing Zero-Movement transfer inside database."
                    )
                    with connector.session():
                        for stmt in native_query.split(";"):
                            if stmt.strip():
                                connector.execute_query(stmt.strip())
                    stats["out"] = 0
                    logger.info("  [SUCCESS] Native ELT command completed.")
                else:
                    # Resolve asset name (Table for SQL/OSDU)
                    asset_name = (
                        config.get("table")
                        or config.get("target_table")
                        or "synqx_output"
                    )

                    def input_stream():
                        for chunks in inputs.values():
                            for df in chunks:
                                on_chunk(df, direction="in")
                                yield df

                    logger.info(
                        f"  Streaming commit to {conn_data['type'].upper()} entity: '{asset_name}'"
                    )
                    
                    # Map write_strategy to mode for connector compatibility
                    write_mode = (
                        config.get("write_strategy") 
                        or config.get("write_mode") 
                        or "append"
                    )

                    with connector.session():
                        rows_written = connector.write_batch(
                            input_stream(),
                            asset=asset_name,
                            mode=write_mode,
                            **config
                        )
                        stats["out"] = rows_written
                results = []

            # TRANSFORM
            else:
                t_config = {
                    **config,
                    "_on_chunk": on_chunk,
                    "_connections": self.connections,
                }

                try:
                    transform = TransformFactory.get_transform(op_class, t_config)
                except Exception as e:
                    logger.warning(
                        f"Transform '{op_class}' not found, using pass-through: {e}"
                    )
                    transform = TransformFactory.get_transform("noop", t_config)

                engine = TransformFactory.get_engine(transform)
                logger.info(f"  Applying {engine.upper()} transformation: '{op_class}'")

                # Lineage Capture
                input_schemas = {
                    uid: [str(c) for c in chunks[0].columns] if chunks else []
                    for uid, chunks in inputs.items()
                }
                if op_type in ["join", "union", "merge"]:
                    if hasattr(transform, "get_lineage_map_multi"):
                        lineage_map = transform.get_lineage_map_multi(input_schemas)
                    else:
                        lineage_map = {
                            col: [
                                f"{uid}.{col}"
                                for uid, cols in input_schemas.items()
                                if col in cols
                            ]
                            for uid, cols in input_schemas.items()
                            for col in cols
                        }
                else:
                    first_input_cols = (
                        next(iter(input_schemas.values())) if input_schemas else []
                    )
                    lineage_map = transform.get_lineage_map(first_input_cols)

                # Store lineage in samples for reporting
                samples["lineage"] = lineage_map

                # Prepare input iterators with engine conversion
                input_iters = {}
                for uid, chunks in inputs.items():

                    def make_it(c, target_engine):
                        for chunk in c:
                            on_chunk(chunk, direction="in")
                            if target_engine == "polars" and isinstance(
                                chunk, pd.DataFrame
                            ):
                                yield pl.from_pandas(chunk)
                            elif target_engine == "pandas" and isinstance(
                                chunk, pl.DataFrame
                            ):
                                yield chunk.to_pandas()
                            else:
                                yield chunk

                    input_iters[uid] = make_it(chunks, engine)

                if op_type in ["join", "union", "merge"]:
                    data_iter = transform.transform_multi(input_iters)
                else:
                    upstream_it = (
                        next(iter(input_iters.values())) if input_iters else iter([])
                    )
                    data_iter = transform.transform(upstream_it)

                for chunk in data_iter:
                    on_chunk(chunk, direction="out")
                    results.append(chunk)

            return results, quality_profile

        except Exception as e:
            logger.error(f"Node '{node_id}' failed with a terminal error: {e!s}")
            raise


class ParallelAgent:
    """Standardized multi-threaded executor matching backend standard."""

    def __init__(self, executor: NodeExecutor, max_workers: int | None = None):
        self.executor = executor

        # Auto-calculate workers based on CPU core count
        if not max_workers or max_workers == 0:
            cpu_count = os.cpu_count() or 2
            self.max_workers = cpu_count * 2
            logger.info(
                f"Agent ParallelExecutor auto-scaled to {self.max_workers} threads (Cores: {cpu_count})"  # noqa: E501
            )
        else:
            self.max_workers = max_workers
            logger.info(
                f"Agent ParallelExecutor initialized with {self.max_workers} threads"
            )

        self.cache = DataCache()
        self.metrics = ExecutionMetrics()

    def run(  # noqa: PLR0915
        self, dag: Any, node_map: dict[str, Any], log_cb: Any, status_cb: Any = None
    ):
        self.metrics.execution_start = datetime.now(UTC)
        self.metrics.total_nodes = len(node_map)
        layers = dag.get_execution_layers()

        try:
            for i, layer_nodes_ids in enumerate(layers):
                log_cb(f"[START] Execution Stage {i + 1}/{len(layers)} initiated")
                with concurrent.futures.ThreadPoolExecutor(
                    max_workers=self.max_workers
                ) as pool:
                    futures = {}
                    for nid in layer_nodes_ids:
                        node = node_map[nid]
                        inputs = {
                            uid: self.cache.retrieve(uid)
                            for uid in dag.get_upstream_nodes(nid)
                        }

                        # Node-level retry wrapper
                        def execute_with_retry(n, inp, s_cb):
                            max_attempts = (n.get("max_retries") or 0) + 1
                            strategy = n.get("retry_strategy") or "fixed"
                            delay = n.get("retry_delay_seconds") or 5

                            for attempt in range(max_attempts):
                                try:
                                    # Create a local context for capturing quality_profile  # noqa: E501
                                    results, quality_profile = self.executor.execute(
                                        n, inp, s_cb, log_cb
                                    )
                                    return results, quality_profile
                                except Exception as exc:
                                    if attempt + 1 < max_attempts:
                                        wait_time = delay
                                        if strategy == "exponential_backoff":
                                            wait_time = delay * (2**attempt)
                                        elif strategy == "linear_backoff":
                                            wait_time = delay * (attempt + 1)

                                        log_cb(
                                            f"[RETRY] Node '{n.get('node_id')}' failed (Attempt {attempt + 1}/{max_attempts}). Retrying in {wait_time}s: {exc}",  # noqa: E501
                                            n.get("node_id"),
                                        )
                                        if s_cb:
                                            s_cb(
                                                n.get("node_id"),
                                                "pending",
                                                {
                                                    "message": f"Retrying ({attempt + 1}/{max_attempts})..."  # noqa: E501
                                                },
                                            )
                                        time.sleep(wait_time)
                                    else:
                                        raise exc

                        if status_cb:
                            status_cb(nid, "pending")
                        futures[
                            pool.submit(execute_with_retry, node, inputs, status_cb)
                        ] = nid
                        if status_cb:
                            status_cb(nid, "running")

                    for future in concurrent.futures.as_completed(futures):
                        nid = futures[future]
                        try:
                            # Capture both data chunks and the final quality profile
                            chunks, quality_profile = future.result()
                            self.cache.store(nid, chunks)
                            self.metrics.completed_nodes += 1
                            total_rows = sum(len(df) for df in chunks)
                            self.metrics.total_records_processed += total_rows
                            log_cb(
                                f"[SUCCESS] Node '{nid}' finalized successfully. [{total_rows:,} records processed]",  # noqa: E501
                                nid,
                            )
                            if status_cb:
                                status_cb(
                                    nid,
                                    "success",
                                    {
                                        "records_out": total_rows,
                                        "sample_data": self.executor._sniff_data(
                                            chunks[0]
                                        )
                                        if chunks
                                        else None,
                                        "quality_profile": quality_profile,
                                    },
                                )
                        except Exception as e:
                            import traceback  # noqa: PLC0415

                            self.metrics.failed_nodes += 1
                            tb_str = traceback.format_exc()
                            log_cb(
                                f"[FAILED] Node '{nid}' aborted due to a terminal error:\n{tb_str}",  # noqa: E501
                                nid,
                            )
                            if status_cb:
                                status_cb(
                                    nid,
                                    "failed",
                                    {"error_message": str(e), "traceback": tb_str},
                                )
                            raise e

            self.metrics.execution_end = datetime.now(UTC)
            return self.metrics.to_dict()
        finally:
            self.cache.clear_all()
