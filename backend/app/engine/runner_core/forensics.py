"""
=================================================================================
FILE 4: forensics.py - Enhanced Forensic Data Capture System
=================================================================================
"""

import os
import json
import shutil
import threading
from typing import Dict, Any, Optional, List
import pandas as pd
from datetime import datetime, timezone

from app.core.logging import get_logger

logger = get_logger(__name__)


class ForensicSniffer:
    """
    Production-grade forensic data capture system with optimized I/O.
    Captures data at each node for debugging and data lineage tracking.

    Features:
    - Thread-safe chunk capture
    - Configurable row limits per node
    - Efficient Parquet storage with appends (fastparquet)
    - Pagination support for data inspection
    - Automatic cleanup and management
    """

    MAX_ROWS_PER_FILE = 5000000  # Increased to 5M for better data capture coverage
    COMPRESSION = "SNAPPY"  # fastparquet uses uppercase

    def __init__(self, run_id: int):
        self.run_id = run_id
        # Use absolute path to ensure consistency across different processes/workers
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # current_dir is backend/app/engine/runner_core
        # We need to go up 3 levels to reach 'backend'
        project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        self.base_dir = os.path.join(project_root, "data", "forensics", f"run_{run_id}")
        os.makedirs(self.base_dir, exist_ok=True)

        self._write_lock = threading.Lock()
        self._row_counts: Dict[str, int] = {}
        self._metadata: Dict[str, Dict] = {}

        logger.debug(f"ForensicSniffer initialized at {self.base_dir}")
        self._write_metadata()

    def capture_chunk(
        self,
        node_id: int,
        chunk: pd.DataFrame,
        direction: str = "out",
        metadata: Optional[Dict] = None,
    ):
        """
        Thread-safe chunk capture with optimized batching using fastparquet appends.
        """
        if chunk.empty:
            return

        try:
            import fastparquet
            file_path = os.path.join(
                self.base_dir, f"node_{node_id}_{direction}.parquet"
            )
            file_key = f"{node_id}_{direction}"

            with self._write_lock:
                current_rows = self._row_counts.get(file_key, 0)

                # Initialize row count from file if not in memory (e.g. distributed workers)
                if current_rows == 0 and os.path.exists(file_path):
                    try:
                        import pyarrow.parquet as pq
                        current_rows = pq.read_metadata(file_path).num_rows
                        self._row_counts[file_key] = current_rows
                    except Exception:
                        pass

                if current_rows >= self.MAX_ROWS_PER_FILE:
                    return

                available_space = self.MAX_ROWS_PER_FILE - current_rows
                chunk_to_write = (
                    chunk.head(available_space)
                    if len(chunk) > available_space
                    else chunk
                )
                
                rows_to_add = len(chunk_to_write)
                if rows_to_add == 0:
                    return

                file_exists = os.path.exists(file_path)
                
                # Use fastparquet for efficient appends
                # Note: fastparquet requires 'append' to be True for subsequent writes
                fastparquet.write(
                    file_path, 
                    chunk_to_write, 
                    append=file_exists, 
                    compression=self.COMPRESSION,
                    write_index=False
                )
                
                new_count = current_rows + rows_to_add
                self._row_counts[file_key] = new_count

                if file_key not in self._metadata:
                    self._metadata[file_key] = {
                        "node_id": node_id,
                        "direction": direction,
                        "first_capture": datetime.now(timezone.utc).isoformat(),
                        "schema": list(chunk.columns),
                        "dtypes": {
                            col: str(dtype) for col, dtype in chunk.dtypes.items()
                        },
                    }

                self._metadata[file_key]["last_capture"] = datetime.now(
                    timezone.utc
                ).isoformat()
                self._metadata[file_key]["total_rows"] = new_count

                if metadata:
                    self._metadata[file_key]["custom"] = metadata

        except Exception as e:
            logger.error(
                f"Forensic capture failed for node {node_id} ({direction}): {e}"
            )

    def fetch_slice(
        self, node_id: int, direction: str = "out", limit: int = 100, offset: int = 0
    ) -> Dict[str, Any]:
        """
        Read a slice of forensic data with guaranteed JSON serialization and existence check.
        """
        try:
            file_path = os.path.join(
                self.base_dir, f"node_{node_id}_{direction}.parquet"
            )

            if not os.path.exists(file_path):
                return {
                    "rows": [],
                    "columns": [],
                    "total_cached": 0,
                    "offset": offset,
                    "limit": limit,
                    "has_more": False,
                    "found": False # Indicator for missing buffer
                }

            df = pd.read_parquet(file_path, engine="pyarrow")
            total = len(df)

            end_idx = min(offset + limit, total)
            slice_df = df.iloc[offset:end_idx]

            # Robust JSON serialization using pandas built-in handler for complex types
            json_str = slice_df.to_json(orient="records", date_format="iso")
            rows = json.loads(json_str)

            return {
                "rows": rows,
                "columns": list(df.columns),
                "total_cached": total,
                "offset": offset,
                "limit": limit,
                "returned": len(rows),
                "has_more": end_idx < total,
                "metadata": self._metadata.get(f"{node_id}_{direction}", {}),
                "found": True
            }

        except Exception as e:
            logger.error(f"Forensic fetch failed for node {node_id} ({direction}): {e}")
            return {"rows": [], "columns": [], "total_cached": 0, "error": str(e)}

    def get_node_summary(self, node_id: int) -> Dict[str, Any]:
        """Get summary of captured data for a specific node"""
        summary = {"node_id": node_id, "inputs": {}, "outputs": {}}

        for direction in ["in", "out"]:
            file_key = f"{node_id}_{direction}"
            file_path = os.path.join(
                self.base_dir, f"node_{node_id}_{direction}.parquet"
            )

            if os.path.exists(file_path):
                metadata = self._metadata.get(file_key, {})
                summary["outputs" if direction == "out" else "inputs"] = {
                    "rows": self._row_counts.get(file_key, 0),
                    "columns": metadata.get("schema", []),
                    "first_capture": metadata.get("first_capture"),
                    "last_capture": metadata.get("last_capture"),
                    "file_size_mb": os.path.getsize(file_path) / (1024 * 1024),
                }

        return summary

    def get_run_summary(self) -> Dict[str, Any]:
        """Get summary of all forensic data for this run"""
        nodes = set()
        total_rows = 0
        total_size = 0

        for filename in os.listdir(self.base_dir):
            if filename.endswith(".parquet"):
                # Extract node_id from filename
                parts = filename.replace(".parquet", "").split("_")
                if len(parts) >= 2:
                    nodes.add(int(parts[1]))

                file_path = os.path.join(self.base_dir, filename)
                total_size += os.path.getsize(file_path)

                file_key = filename.replace(".parquet", "")
                total_rows += self._row_counts.get(file_key, 0)

        return {
            "run_id": self.run_id,
            "total_nodes": len(nodes),
            "total_rows": total_rows,
            "total_size_mb": total_size / (1024 * 1024),
            "base_dir": self.base_dir,
            "nodes": sorted(list(nodes)),
        }

    def _write_metadata(self):
        """Write metadata file to disk"""
        try:
            metadata_path = os.path.join(self.base_dir, "_metadata.json")
            with open(metadata_path, "w") as f:
                json.dump(
                    {
                        "run_id": self.run_id,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "captures": self._metadata,
                    },
                    f,
                    indent=2,
                )
        except Exception as e:
            logger.error(f"Failed to write metadata: {e}")

    def cleanup(self):
        """Clean up forensic data for this run"""
        try:
            if os.path.exists(self.base_dir):
                shutil.rmtree(self.base_dir)
                logger.info(f"Cleaned up forensic data for run {self.run_id}")
        except Exception as e:
            logger.error(f"Failed to cleanup forensic data: {e}")

    @staticmethod
    def cleanup_all():
        """Utility to wipe all forensic data"""
        try:
            path = os.path.join("data", "forensics")
            if os.path.exists(path):
                shutil.rmtree(path)
                os.makedirs(path, exist_ok=True)
                logger.info("All forensic data cleaned up")
        except Exception as e:
            logger.error(f"Failed to cleanup all forensic data: {e}")

    @staticmethod
    def list_runs() -> List[Dict[str, Any]]:
        """List all available forensic runs"""
        runs = []
        base_path = os.path.join("data", "forensics")

        if not os.path.exists(base_path):
            return runs

        for dirname in os.listdir(base_path):
            if dirname.startswith("run_"):
                try:
                    run_id = int(dirname.replace("run_", ""))
                    run_path = os.path.join(base_path, dirname)

                    # Get run size
                    total_size = sum(
                        os.path.getsize(os.path.join(run_path, f))
                        for f in os.listdir(run_path)
                        if f.endswith(".parquet")
                    )

                    runs.append(
                        {
                            "run_id": run_id,
                            "path": run_path,
                            "size_mb": total_size / (1024 * 1024),
                            "files": len(
                                [
                                    f
                                    for f in os.listdir(run_path)
                                    if f.endswith(".parquet")
                                ]
                            ),
                        }
                    )
                except Exception as e:
                    logger.error(f"Error processing run {dirname}: {e}")

        return sorted(runs, key=lambda x: x["run_id"], reverse=True)
