"""
=================================================================================
FILE 2: data_cache.py - Intelligent Data Cache with Memory Management
=================================================================================
"""
from typing import Dict, List, Any
import pandas as pd
import threading
from app.core.logging import get_logger

logger = get_logger(__name__)


class DataCache:
    """
    Thread-safe data cache with intelligent memory management.
    Implements chunked storage with automatic memory pressure handling.
    """
    
    def __init__(self, max_memory_mb: int = 2048):
        self._cache: Dict[str, List[pd.DataFrame]] = {}
        self._lock = threading.RLock()
        self.max_memory_mb = max_memory_mb
        self._current_memory_mb = 0.0
        self._access_order = []  # Track access for LRU eviction
        
        logger.info(f"DataCache initialized with {max_memory_mb}MB limit")
    
    def store(self, node_id: str, chunks: List[pd.DataFrame]):
        """Store chunks with memory tracking and pressure handling"""
        with self._lock:
            # Calculate memory footprint
            memory_mb = sum(
                df.memory_usage(deep=True).sum() for df in chunks
            ) / (1024 * 1024)
            
            # Memory pressure handling
            if self._current_memory_mb + memory_mb > self.max_memory_mb:
                logger.warning(
                    f"Memory pressure detected: "
                    f"Current={self._current_memory_mb:.2f}MB, "
                    f"Incoming={memory_mb:.2f}MB, "
                    f"Limit={self.max_memory_mb}MB"
                )
                self._apply_memory_pressure_strategy(memory_mb)
            
            # Store chunks
            if node_id in self._cache:
                # Update existing
                old_memory = sum(
                    df.memory_usage(deep=True).sum() for df in self._cache[node_id]
                ) / (1024 * 1024)
                self._current_memory_mb -= old_memory
            
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
    
    def retrieve(self, node_id: str) -> List[pd.DataFrame]:
        """Retrieve cached chunks and update access order"""
        with self._lock:
            chunks = self._cache.get(node_id, [])
            
            # Update LRU access order
            if node_id in self._access_order:
                self._access_order.remove(node_id)
                self._access_order.append(node_id)
            
            return chunks
    
    def clear_node(self, node_id: str):
        """Clear cache for specific node to free memory"""
        with self._lock:
            if node_id in self._cache:
                chunks = self._cache.pop(node_id)
                memory_freed = sum(
                    df.memory_usage(deep=True).sum() for df in chunks
                ) / (1024 * 1024)
                self._current_memory_mb -= memory_freed
                
                if node_id in self._access_order:
                    self._access_order.remove(node_id)
                
                logger.debug(f"Freed {memory_freed:.2f}MB from node '{node_id}'")
                return memory_freed
            return 0.0
    
    def _apply_memory_pressure_strategy(self, required_mb: float):
        """
        Apply LRU eviction strategy when memory pressure is detected.
        Evicts least recently used nodes until enough space is available.
        """
        if not self._cache:
            logger.warning("Memory pressure but cache is empty!")
            return
        
        target_free = required_mb * 1.2  # Free 20% extra buffer
        freed = 0.0
        evicted_nodes = []
        
        # Evict LRU nodes until we have enough space
        while freed < target_free and self._access_order:
            lru_node = self._access_order[0]  # Oldest accessed
            freed += self.clear_node(lru_node)
            evicted_nodes.append(lru_node)
            
            if self._current_memory_mb + required_mb <= self.max_memory_mb:
                break
        
        logger.info(
            f"Memory pressure strategy applied: "
            f"Evicted {len(evicted_nodes)} node(s), "
            f"Freed {freed:.2f}MB, "
            f"Current: {self._current_memory_mb:.2f}MB"
        )
    
    def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics"""
        with self._lock:
            total_chunks = sum(len(chunks) for chunks in self._cache.values())
            total_rows = sum(
                sum(len(df) for df in chunks) 
                for chunks in self._cache.values()
            )
            
            utilization_pct = (
                (self._current_memory_mb / self.max_memory_mb * 100) 
                if self.max_memory_mb > 0 else 0
            )
            
            return {
                "cached_nodes": len(self._cache),
                "total_chunks": total_chunks,
                "total_rows": total_rows,
                "memory_mb": round(self._current_memory_mb, 2),
                "memory_limit_mb": self.max_memory_mb,
                "utilization_pct": round(utilization_pct, 2),
                "lru_order": self._access_order.copy()
            }
    
    def clear_all(self):
        """Clear entire cache"""
        with self._lock:
            self._cache.clear()
            self._access_order.clear()
            self._current_memory_mb = 0.0
            logger.info("Cache cleared completely")