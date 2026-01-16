from typing import Dict, List, Any, Optional
import threading
import logging
import os
import shutil
import tempfile
import pickle
import pandas as pd
import polars as pl

logger = logging.getLogger(__name__)


class DataCache:
    """
    Thread-safe data cache with intelligent memory management and Spill-to-Disk.
    Implements chunked storage with automatic memory pressure handling.
    """
    
    def __init__(self, max_memory_mb: int = 2048, spill_dir: Optional[str] = None):
        self._cache: Dict[str, List[Any]] = {}
        self._spilled_nodes: Dict[str, List[str]] = {} # node_id -> list of file paths
        self._lock = threading.RLock()
        self.max_memory_mb = max_memory_mb
        self._current_memory_mb = 0.0
        self._access_order = []  # Track access for LRU eviction/spilling
        
        # Setup Spill Directory
        if not spill_dir:
            self.spill_dir = tempfile.mkdtemp(prefix="synqx_spill_")
        else:
            self.spill_dir = spill_dir
            os.makedirs(self.spill_dir, exist_ok=True)
            
        logger.info(f"DataCache initialized. Memory Limit: {max_memory_mb}MB | Spill Dir: {self.spill_dir}")
    
    def _get_df_size(self, df: Any) -> int:
        """Type-agnostic calculation of DataFrame memory footprint in bytes"""
        if df is None:
            return 0
        try:
            if hasattr(df, "estimated_size"):
                return df.estimated_size()
            if hasattr(df, "memory_usage"):
                return int(df.memory_usage(deep=True).sum())
        except Exception:
            pass
        return 0

    def store(self, node_id: str, chunks: List[Any]):
        """Store chunks with memory tracking and pressure handling"""
        with self._lock:
            # Calculate memory footprint
            memory_mb = sum(
                self._get_df_size(df) for df in chunks
            ) / (1024 * 1024)
            
            # Memory pressure handling: Spill instead of just warning
            if self._current_memory_mb + memory_mb > self.max_memory_mb:
                logger.warning(
                    f"Memory pressure detected: Current={self._current_memory_mb:.2f}MB, "
                    f"Incoming={memory_mb:.2f}MB, Limit={self.max_memory_mb}MB. Triggering Spill-to-Disk."
                )
                self._apply_spill_strategy(memory_mb)
            
            # Store chunks in memory
            if node_id in self._cache:
                old_memory = sum(self._get_df_size(df) for df in self._cache[node_id]) / (1024 * 1024)
                self._current_memory_mb -= old_memory
            
            # Cleanup any existing spill for this node
            self._cleanup_spill(node_id)
            
            self._cache[node_id] = chunks
            self._current_memory_mb += memory_mb
            
            # Update access order for LRU
            if node_id in self._access_order:
                self._access_order.remove(node_id)
            self._access_order.append(node_id)
            
            logger.debug(
                f"Cached {len(chunks)} chunk(s) for node '{node_id}' "
                f"({memory_mb:.2f}MB, total: {self._current_memory_mb:.2f}MB)"
            )
    
    def retrieve(self, node_id: str) -> List[Any]:
        """Retrieve cached chunks (from RAM or Disk) and update access order"""
        with self._lock:
            # Case 1: In RAM
            if node_id in self._cache:
                chunks = self._cache.get(node_id, [])
                if node_id in self._access_order:
                    self._access_order.remove(node_id)
                self._access_order.append(node_id)
                return chunks
            
            # Case 2: Spilled to Disk
            if node_id in self._spilled_nodes:
                return self._load_from_spill(node_id)
            
            return []

    def clear_node(self, node_id: str):
        """Clear cache for specific node from both RAM and Disk"""
        with self._lock:
            # Clear RAM
            if node_id in self._cache:
                chunks = self._cache.pop(node_id)
                memory_freed = sum(self._get_df_size(df) for df in chunks) / (1024 * 1024)
                self._current_memory_mb -= memory_freed
            
            # Clear Disk
            self._cleanup_spill(node_id)
            
            if node_id in self._access_order:
                self._access_order.remove(node_id)

    def _apply_spill_strategy(self, required_mb: float):
        """Spills least recently used nodes to disk until enough memory is free"""
        if not self._cache:
            return
        
        freed = 0.0
        
        # Iterate over access order (oldest first)
        for node_id in list(self._access_order):
            if node_id not in self._cache:
                continue
                
            freed_from_node = self._spill_to_disk(node_id)
            freed += freed_from_node
            
            if self._current_memory_mb + required_mb <= self.max_memory_mb:
                break

    def _spill_to_disk(self, node_id: str) -> float:
        """Serializes chunks of a node to disk and removes from RAM"""
        chunks = self._cache.pop(node_id, [])
        if not chunks:
            return 0.0
            
        memory_to_free = sum(self._get_df_size(df) for df in chunks) / (1024 * 1024)
        file_paths = []
        
        try:
            for i, chunk in enumerate(chunks):
                file_path = os.path.join(self.spill_dir, f"{node_id}_{i}.spill")
                
                # Use high-performance serialization
                if isinstance(chunk, pl.DataFrame):
                    chunk.write_ipc(file_path)
                elif isinstance(chunk, pd.DataFrame):
                    chunk.to_pickle(file_path)
                else:
                    with open(file_path, 'wb') as f:
                        pickle.dump(chunk, f)
                
                file_paths.append(file_path)
            
            self._spilled_nodes[node_id] = file_paths
            self._current_memory_mb -= memory_to_free
            logger.info(f"Spilled node '{node_id}' to disk. Freed {memory_to_free:.2f}MB RAM.")
            return memory_to_free
            
        except Exception as e:
            logger.error(f"Failed to spill node '{node_id}' to disk: {e}")
            # Revert to cache if spill failed
            self._cache[node_id] = chunks
            self._current_memory_mb += memory_to_free
            return 0.0

    def _load_from_spill(self, node_id: str) -> List[Any]:
        """Loads chunks from disk back into memory"""
        file_paths = self._spilled_nodes.get(node_id, [])
        chunks = []
        
        try:
            for path in file_paths:
                if not os.path.exists(path):
                    continue
                    
                # Intelligent loading based on file extension/node data
                # For this implementation, we try Polars IPC then Pickle
                try:
                    chunk = pl.read_ipc(path)
                except Exception:
                    try:
                        chunk = pd.read_pickle(path)
                    except Exception:
                        with open(path, 'rb') as f:
                            chunk = pickle.load(f)
                chunks.append(chunk)
            
            # Update access order
            if node_id in self._access_order:
                self._access_order.remove(node_id)
            self._access_order.append(node_id)
            
            return chunks
        except Exception as e:
            logger.error(f"Failed to load spilled node '{node_id}': {e}")
            return []

    def _cleanup_spill(self, node_id: str):
        """Deletes spill files for a node"""
        file_paths = self._spilled_nodes.pop(node_id, [])
        for path in file_paths:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception:
                pass

    def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics including spill info"""
        with self._lock:
            total_rows = 0
            # Rows in RAM
            for chunks in self._cache.values():
                total_rows += sum(len(df) for df in chunks)
            
            utilization_pct = (self._current_memory_mb / self.max_memory_mb * 100) if self.max_memory_mb > 0 else 0
            
            return {
                "nodes_in_ram": len(self._cache),
                "nodes_spilled": len(self._spilled_nodes),
                "memory_mb": round(self._current_memory_mb, 2),
                "memory_limit_mb": self.max_memory_mb,
                "utilization_pct": round(utilization_pct, 2),
                "spill_dir": self.spill_dir
            }
    
    def clear_all(self):
        """Clear entire cache and delete spill directory"""
        with self._lock:
            self._cache.clear()
            self._spilled_nodes.clear()
            self._access_order.clear()
            self._current_memory_mb = 0.0
            
            if os.path.exists(self.spill_dir):
                shutil.rmtree(self.spill_dir, ignore_errors=True)
            
            logger.info("Cache and spill data cleared completely")