"""
=================================================================================
FILE 5: node_executor.py - Enhanced Production Node Executor
=================================================================================
"""
from typing import Optional, Dict, List, Tuple, Any
import pandas as pd
import numpy as np
import os
import psutil
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.pipelines import PipelineNode
from app.models.execution import PipelineRun, StepRun, Watermark
from app.models.connections import Asset, Connection
from app.models.enums import OperatorType, OperatorRunStatus
from app.core.logging import get_logger
from app.core.db_logging import DBLogger
from app.services.vault_service import VaultService
from app.connectors.factory import ConnectorFactory
from app.engine.transforms.factory import TransformFactory
from app.core.errors import AppError
from app.engine.runner_core.state_manager import StateManager
from app.engine.runner_core.forensics import ForensicSniffer

logger = get_logger(__name__)


class NodeExecutor:
    """
    Production-grade Node Executor with enhanced logging and telemetry.
    
    Features:
    - Comprehensive error handling and recovery
    - Real-time metrics tracking
    - Forensic data capture
    - Watermark-based incremental processing
    - Resource monitoring (CPU, memory)
    - Detailed execution logging
    """
    
    def __init__(self, state_manager: StateManager):
        self.state_manager = state_manager
    
    def _get_process_metrics(self) -> Tuple[float, float]:
        """Get current process CPU and memory usage"""
        try:
            process = psutil.Process(os.getpid())
            cpu = process.cpu_percent(interval=0.1)
            mem = process.memory_info().rss / (1024 * 1024)  # MB
            return float(cpu), float(mem)
        except Exception as e:
            logger.debug(f"Failed to get process metrics: {e}")
            return 0.0, 0.0
    
    def _fetch_asset_connection(self, db: Session, asset_id: int) -> Tuple[Asset, Connection]:
        """Fetch asset and its connection with validation"""
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        if not asset:
            raise AppError(f"Asset {asset_id} not found")
        
        conn = db.query(Connection).filter(Connection.id == asset.connection_id).first()
        if not conn:
            raise AppError(f"Connection {asset.connection_id} for asset {asset_id} not found")
        
        return asset, conn
    
    def _sniff_data(self, df: pd.DataFrame, max_rows: int = 100) -> Optional[Dict]:
        """Capture sample data for inspection with robust JSON handling"""
        try:
            if df.empty:
                return None
            
            # Use pandas built-in JSON conversion to handle Timestamps, etc.
            sample_df = df.head(max_rows)
            json_str = sample_df.to_json(orient="records", date_format="iso")
            sample = json.loads(json_str)
            
            return {
                "rows": sample,
                "columns": list(df.columns),
                "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
                "shape": df.shape,
                "total_rows": len(df)
            }
        except Exception as e:
            logger.error(f"Failed to sniff data: {e}")
            return None
    
    def execute(
        self,
        pipeline_run: PipelineRun,
        node: PipelineNode,
        input_data: Optional[Dict[str, List[pd.DataFrame]]] = None
    ) -> List[pd.DataFrame]:
        """
        Execute a single node with comprehensive error handling and telemetry.
        
        Args:
            pipeline_run: Current pipeline run
            node: Node to execute
            input_data: Input data from upstream nodes
            
        Returns:
            List of output DataFrames (materialized chunks)
        """
        db = self.state_manager.db
        
        # Get or create step run
        step_run = db.query(StepRun).filter(
            StepRun.pipeline_run_id == pipeline_run.id,
            StepRun.node_id == node.id
        ).first()
        
        if not step_run:
            step_run = self.state_manager.create_step_run(
                pipeline_run.id, node.id, node.operator_type, node.order_index
            )
        
        # Start execution
        self.state_manager.update_step_status(step_run, OperatorRunStatus.RUNNING)
        
        logger.info(f"→ Starting node '{node.name}' (ID: {node.node_id})")
        logger.info(f"  Type: {node.operator_type.value.upper()}")
        logger.info(f"  Implementation: {node.operator_class}")
        
        DBLogger.log_step(
            db, step_run.id, "INFO",
            f"Task lifecycle initiated for '{node.name}'. "
            f"Operation mode: {node.operator_type.value.upper()} (Logic: {node.operator_class}).",
            job_id=pipeline_run.job_id
        )
        
        # Pre-flight check for Custom Script environments
        if node.operator_class == "custom_script":
            from app.services.dependency_service import DependencyService
            
            # Find the language from the asset config
            asset_id = node.source_asset_id or node.destination_asset_id
            if asset_id:
                asset = db.query(Asset).filter(Asset.id == asset_id).first()
                if asset:
                    lang = asset.config.get("language")
                    if lang in ["python", "node"]:
                        DBLogger.log_step(db, step_run.id, "DEBUG", f"Validating required execution runtime for {lang}...", job_id=pipeline_run.job_id)
                        dep_service = DependencyService(db, asset.connection_id)
                        env = dep_service.get_environment(lang)
                        if not env or env.status != "ready":
                            error_msg = f"Runtime environment for {lang} is not ready (Status: {env.status if env else 'not initialized'}). Please initialize it in connection settings."
                            DBLogger.log_step(db, step_run.id, "ERROR", error_msg, job_id=pipeline_run.job_id)
                            raise AppError(error_msg)
                        else:
                            DBLogger.log_step(db, step_run.id, "DEBUG", f"Runtime check passed. {lang.capitalize()} environment is operational.", job_id=pipeline_run.job_id)

        # Initialize forensics and statistics
        sniffer = ForensicSniffer(pipeline_run.id)
        stats = {
            "in": 0,
            "out": 0,
            "filtered": 0,
            "error": 0,
            "bytes": 0,
            "chunks_in": 0,
            "chunks_out": 0
        }
        samples: Dict[str, Dict] = {}
        results: List[pd.DataFrame] = []
        
        def on_chunk(chunk: pd.DataFrame, direction: str = "out", error_count: int = 0, filtered_count: int = 0):
            """Callback for chunk processing with telemetry"""
            
            if chunk.empty and error_count == 0 and filtered_count == 0:
                return
            
            if error_count > 0:
                logger.debug(f"Node {node.id} reporting {error_count} rejections/errors")

            if direction == "quarantine":
                logger.info(f"Node {node.id} QUARANTINE update: {error_count} records")

            # Capture sample data (first chunk of each direction)
            if direction not in samples and not chunk.empty:
                samples[direction] = self._sniff_data(chunk)
            
            # Forensic capture
            if not chunk.empty:
                sniffer.capture_chunk(node.id, chunk, direction=direction)
            
            # Update statistics
            chunk_rows = len(chunk)
            chunk_bytes = int(chunk.memory_usage(deep=True).sum()) if not chunk.empty else 0
            
            if direction == "out":
                stats["out"] += chunk_rows
                stats["bytes"] += chunk_bytes
                stats["chunks_out"] += 1
                
                # Optional: Log progress every few chunks for very large datasets
                if stats["chunks_out"] % 50 == 0:
                    DBLogger.log_step(db, step_run.id, "INFO", f"Processing in progress: {stats['out']:,} records streamed...", job_id=pipeline_run.job_id)
            elif direction == "in":
                stats["in"] += chunk_rows
                stats["chunks_in"] += 1
            
            # Add explicit counts (useful for transforms reporting rejections)
            stats["error"] += error_count
            stats["filtered"] += filtered_count
            
            if error_count > 0 or direction == "quarantine":
                logger.info(f"Node {node.id} ({node.operator_class}) - Captured {error_count} rejections. Total rejections: {stats['error']}")

            # Broadcast real-time telemetry
            self.state_manager.update_step_status(
                step_run=step_run,
                status=OperatorRunStatus.RUNNING,
                records_in=stats["in"],
                records_out=stats["out"],
                records_filtered=stats["filtered"],
                records_error=stats["error"],
                bytes_processed=stats["bytes"],
                sample_data=samples
            )
        
        try:
            op_type = node.operator_type
            
            # =====================================================================
            # A. EXTRACT Operation
            # =====================================================================
            if op_type == OperatorType.EXTRACT:
                asset, conn = self._fetch_asset_connection(db, node.source_asset_id)
                
                logger.info(f"  Source: {conn.connector_type.value.upper()} / {asset.name}")
                DBLogger.log_step(
                    db, step_run.id, "INFO",
                    f"Establishing connection to {conn.connector_type.value.upper()} data source. Target entity: '{asset.name}'.",
                    job_id=pipeline_run.job_id
                )
                
                # Get connector configuration
                cfg = VaultService.get_connector_config(conn)
                connector = ConnectorFactory.get_connector(conn.connector_type.value, cfg)
                
                # Handle incremental loading
                current_wm, inc_filter = None, None
                if asset.is_incremental_capable:
                    current_wm, inc_filter = self._fetch_watermark(
                        pipeline_run.pipeline_id, asset.id
                    )
                    if current_wm:
                        logger.info(f"  Incremental: Resuming from watermark={current_wm}")
                        DBLogger.log_step(
                            db, step_run.id, "INFO",
                            f"Incremental sync active. Resuming from high-watermark cursor: {current_wm}.",
                            job_id=pipeline_run.job_id
                        )
                    else:
                        DBLogger.log_step(
                            db, step_run.id, "INFO",
                            "Incremental sync active but no previous cursor found. Initiating full baseline extract.",
                            job_id=pipeline_run.job_id
                        )
                
                # Prepare read parameters
                # Use fully_qualified_name as the primary identifier if available
                asset_identifier = asset.fully_qualified_name or asset.name
                read_params = {"asset": asset_identifier}
                
                # Merge asset config first, then override with node-specific config
                if asset.config:
                    read_params.update(asset.config)
                if node.config:
                    read_params.update(node.config)
                    
                if inc_filter:
                    read_params["incremental_filter"] = inc_filter
                
                wm_col = self._get_watermark_column(asset) if asset.is_incremental_capable else None
                max_val = None
                
                # Extract data
                logger.info("  Extracting data in batches...")
                DBLogger.log_step(db, step_run.id, "DEBUG", f"Initiating stream read from {conn.connector_type.value.upper()}.", job_id=pipeline_run.job_id)
                with connector.session() as session:
                    for chunk_idx, chunk in enumerate(session.read_batch(**read_params), 1):
                        on_chunk(chunk, direction="out")
                        
                        # Apply watermark filter
                        if wm_col and current_wm:
                            before_count = len(chunk)
                            chunk = self._apply_watermark_filter(chunk, wm_col, current_wm)
                            after_count = len(chunk)
                            stats["filtered"] += (before_count - after_count)
                            
                            if chunk.empty:
                                continue
                        
                        # Track high watermark
                        if wm_col:
                            max_val = self._track_high_watermark(chunk, wm_col, max_val)
                        
                        results.append(chunk)
                        
                        if chunk_idx % 10 == 0:
                            logger.debug(f"    Processed {chunk_idx} chunks, {stats['out']:,} rows")
                
                # Persist watermark
                if max_val is not None:
                    self._persist_watermark(
                        pipeline_run.pipeline_id, asset.id, wm_col, max_val
                    )
                    logger.info(f"  ✓ New watermark persisted: {max_val}")
                    DBLogger.log_step(
                        db, step_run.id, "INFO",
                        f"Extract phase complete. Updated high-watermark cursor to: {max_val}.",
                        job_id=pipeline_run.job_id
                    )
                else:
                    DBLogger.log_step(db, step_run.id, "INFO", "Extract phase complete. Received 0 new records.", job_id=pipeline_run.job_id)
            
            # =====================================================================
            # B. LOAD Operation
            # =====================================================================
            elif op_type == OperatorType.LOAD:
                asset, conn = self._fetch_asset_connection(db, node.destination_asset_id)
                
                logger.info(f"  Target: {conn.connector_type.value.upper()} / {asset.name}")
                DBLogger.log_step(
                    db, step_run.id, "INFO",
                    f"Transmitting payloads to {conn.connector_type.value.upper()} destination. Target entity: '{asset.name}'.",
                    job_id=pipeline_run.job_id
                )
                
                # Get connector
                cfg = VaultService.get_connector_config(conn)
                connector = ConnectorFactory.get_connector(conn.connector_type.value, cfg)
                
                # Prepare sink stream
                def sink_stream():
                    for uid, chunks in (input_data or {}).items():
                        logger.debug(f"  Processing input from '{uid}': {len(chunks)} chunks")
                        for chunk in chunks:
                            on_chunk(chunk, direction="in")
                            on_chunk(chunk, direction="out")
                            yield chunk
                
                # Write data
                write_mode = node.config.get("write_strategy") or (asset.config or {}).get("write_mode") or "append"
                asset_identifier = asset.fully_qualified_name or asset.name
                logger.info(f"  Write mode: {write_mode.upper()}")
                DBLogger.log_step(db, step_run.id, "INFO", f"Executing target commit using strategy: {write_mode.upper()}.", job_id=pipeline_run.job_id)
                
                with connector.session() as session:
                    # Merge node config for write parameters
                    write_params = {**node.config}
                    write_params.pop("write_strategy", None) # Handled separately via 'mode'
                    
                    records_out = session.write_batch(
                        sink_stream(),
                        asset=asset_identifier,
                        mode=write_mode,
                        **write_params
                    )
                    stats["out"] = records_out
                
                logger.info(f"  ✓ Loaded {records_out:,} records")
                DBLogger.log_step(db, step_run.id, "SUCCESS", f"Load phase complete. Successfully committed {records_out:,} records to destination.", job_id=pipeline_run.job_id)
            
            # =====================================================================
            # C. TRANSFORM / JOIN / SET Operations
            # =====================================================================
            elif op_type in {
                OperatorType.TRANSFORM,
                OperatorType.JOIN,
                OperatorType.UNION,
                OperatorType.MERGE,
                OperatorType.VALIDATE,
                OperatorType.NOOP
            }:
                # Prepare input iterators
                input_iters = {}
                for uid, chunks in (input_data or {}).items():
                    logger.debug(f"  Input from '{uid}': {len(chunks)} chunks")
                    
                    def make_it(c):
                        for chunk in c:
                            on_chunk(chunk, direction="in")
                            yield chunk
                    
                    input_iters[uid] = make_it(chunks)
                
                # Execute transform logic
                data_iter = None
                
                if op_type in {OperatorType.JOIN, OperatorType.UNION, OperatorType.MERGE}:
                    logger.info(f"  Applying multi-input operation: {op_type.value.upper()}")
                    DBLogger.log_step(
                        db, step_run.id, "INFO",
                        f"Executing composite multi-stream operation: {op_type.value.upper()}.",
                        job_id=pipeline_run.job_id
                    )
                    
                    # Inject run-time context for advanced features
                    t_config = {
                        **node.config, 
                        "_run_id": pipeline_run.id, 
                        "_job_id": pipeline_run.job_id,
                        "_node_id": node.id,
                        "_pipeline_id": pipeline_run.pipeline_id,
                        "_on_chunk": on_chunk
                    }
                    transform = TransformFactory.get_transform(node.operator_class, t_config)
                    data_iter = transform.transform_multi(input_iters)
                
                else:
                    # Single input transform
                    if not input_iters:
                        logger.warning("  No input data for transform node")
                        DBLogger.log_step(db, step_run.id, "WARNING", "No input data detected for transform. Finalizing with empty result.", job_id=pipeline_run.job_id)
                        data_iter = iter([])
                    else:
                        upstream_it = next(iter(input_iters.values()))
                        
                        try:
                            logger.info(f"  Applying transform: {node.operator_class}")
                            DBLogger.log_step(
                                db, step_run.id, "INFO",
                                f"Applying transformation logic: '{node.operator_class}'.",
                                job_id=pipeline_run.job_id
                            )
                            # Inject run-time context for advanced features
                            t_config = {
                                **node.config, 
                                "_run_id": pipeline_run.id, 
                                "_job_id": pipeline_run.job_id,
                                "_node_id": node.id,
                                "_pipeline_id": pipeline_run.pipeline_id,
                                "_on_chunk": on_chunk
                            }
                            transform = TransformFactory.get_transform(
                                node.operator_class, t_config
                            )
                            data_iter = transform.transform(upstream_it)
                        
                        except Exception as e:
                            logger.warning(
                                f"  Transform '{node.operator_class}' not found or failed to initialize, "
                                f"using pass-through: {e}"
                            )
                            DBLogger.log_step(
                                db, step_run.id, "WARNING",
                                f"Logic implementation '{node.operator_class}' failed to initialize (falling back to pass-through): {str(e)}",
                                job_id=pipeline_run.job_id
                            )
                            data_iter = upstream_it
                
                # Materialize results
                chunk_count = 0
                for chunk in data_iter:
                    chunk_count += 1
                    on_chunk(chunk, direction="out")
                    results.append(chunk)
                    
                    if chunk_count % 10 == 0:
                        logger.debug(f"    Processed {chunk_count} chunks, {stats['out']:,} rows")
                
                logger.info(f"  ✓ Transform complete: {stats['out']:,} rows, {chunk_count} chunks")
                DBLogger.log_step(db, step_run.id, "SUCCESS", f"Transformation complete. Processed {stats['out']:,} total records across {chunk_count} memory chunks.", job_id=pipeline_run.job_id)
            
            # =====================================================================
            # Finalize Success
            # =====================================================================
            cpu, mem = self._get_process_metrics()
            
            self.state_manager.update_step_status(
                step_run=step_run,
                status=OperatorRunStatus.SUCCESS,
                records_in=stats["in"],
                records_out=stats["out"],
                records_filtered=stats["filtered"],
                records_error=stats["error"],
                bytes_processed=stats["bytes"],
                retry_count=0,
                cpu_percent=cpu,
                memory_mb=mem,
                sample_data=samples
            )
            
            duration = step_run.duration_seconds or 0
            logger.info(f"← Node '{node.name}' completed successfully")
            logger.info(f"  Records IN: {stats['in']:,}, OUT: {stats['out']:,}, REJECTIONS: {stats['error']:,}")
            logger.info(f"  Duration: {duration:.2f}s")
            logger.info(f"  Resources: CPU={cpu:.1f}%, Memory={mem:.1f}MB")
            
            DBLogger.log_step(
                db, step_run.id, "SUCCESS",
                f"Task completed successfully: {stats['out']:,} records processed, {stats['error']:,} rejected in {duration:.2f}s"
            )
            
            return results
        
        except Exception as e:
            # =====================================================================
            # Handle Failure
            # =====================================================================
            cpu, mem = self._get_process_metrics()
            
            self.state_manager.update_step_status(
                step_run,
                OperatorRunStatus.FAILED,
                stats["in"],
                stats["out"],
                stats["filtered"],
                stats["error"],
                stats["bytes"],
                0,  # retry_count
                cpu,
                mem,
                samples,
                e
            )
            
            logger.error(f"✗ Node '{node.name}' FAILED: {str(e)}", exc_info=True)
            DBLogger.log_step(db, step_run.id, "ERROR", f"Task failed: {str(e)}")
            
            raise e
    
    # =========================================================================
    # Watermark Management
    # =========================================================================
    
    def _get_watermark_column(self, asset: Asset) -> Optional[str]:
        """Extract watermark column from asset configuration"""
        if not asset.config:
            return None
        return asset.config.get("watermark_column") or asset.config.get("WATERMARK_COLUMN")
    
    def _fetch_watermark(
        self, pipeline_id: int, asset_id: int
    ) -> Tuple[Any, Optional[Dict]]:
        """Fetch current watermark value for incremental processing"""
        wm_record = self.state_manager.db.query(Watermark).filter(
            Watermark.pipeline_id == pipeline_id,
            Watermark.asset_id == asset_id
        ).first()
        
        if not wm_record or not wm_record.last_value:
            return None, None
        
        val = next(iter(wm_record.last_value.values()))
        return val, {**wm_record.last_value, "high_watermark": val}
    
    def _apply_watermark_filter(
        self, chunk: pd.DataFrame, wm_col: Optional[str], current_wm_value: Any
    ) -> pd.DataFrame:
        """Filter chunk based on watermark value with maximum resiliency"""
        if current_wm_value is None or not wm_col:
            return chunk
        
        # Ensure current_wm_value is a scalar
        if isinstance(current_wm_value, (list, tuple, np.ndarray)) and len(current_wm_value) > 0:
            current_wm_value = current_wm_value[0]
        elif isinstance(current_wm_value, dict) and len(current_wm_value) > 0:
            current_wm_value = next(iter(current_wm_value.values()))

        # Find actual column (case-insensitive)
        actual_col = next(
            (c for c in chunk.columns if c.lower() == wm_col.lower()),
            None
        )
        
        if not actual_col:
            logger.warning(f"Watermark column '{wm_col}' not found in data. Available: {chunk.columns.tolist()}")
            return chunk
        
        try:
            series = chunk[actual_col]
            
            # Handle numeric columns with explicit conversion and .values comparison
            if pd.api.types.is_numeric_dtype(series):
                try:
                    # Robust numeric conversion
                    if isinstance(current_wm_value, str):
                        wm_val = float(current_wm_value.strip().replace(',', ''))
                    else:
                        wm_val = float(current_wm_value)
                    
                    # Use .values for a cleaner, often more resilient comparison
                    return chunk[series.values > wm_val]
                except (ValueError, TypeError) as e:
                    logger.warning(f"Failed to convert watermark '{current_wm_value}' to numeric for column '{actual_col}': {e}")
                    return chunk
            
            # Handle datetime columns
            if pd.api.types.is_datetime64_any_dtype(series):
                try:
                    wm_datetime = pd.to_datetime(current_wm_value)
                    if series.dt.tz is not None and wm_datetime.tzinfo is None:
                        wm_datetime = wm_datetime.replace(tzinfo=timezone.utc)
                    
                    return chunk[pd.to_datetime(series) > wm_datetime]
                except (ValueError, TypeError) as e:
                    logger.warning(f"Failed to convert watermark '{current_wm_value}' to datetime for column '{actual_col}': {e}")
                    return chunk
            
            # String comparison fallback (force both to string)
            return chunk[series.astype(str).values > str(current_wm_value)]
        
        except Exception as e:
            logger.error(f"Watermark filter failed for column '{wm_col}': {e}", exc_info=True)
            return chunk
    
    def _track_high_watermark(
        self, chunk: pd.DataFrame, wm_col: Optional[str], current_max: Any
    ) -> Any:
        """Track the highest watermark value in chunk with type safety"""
        if not wm_col:
            return current_max
        
        actual_col = next(
            (c for c in chunk.columns if c.lower() == wm_col.lower()),
            None
        )
        
        if not actual_col:
            return current_max
        
        try:
            new_max = chunk[actual_col].max()
            
            # If chunk is empty or all null, max() might be NaN or None
            if pd.isna(new_max):
                return current_max

            # Convert Timestamp to datetime
            if hasattr(new_max, 'to_pydatetime'):
                new_max = new_max.to_pydatetime()
            
            if current_max is None:
                return new_max

            # Type-safe comparison
            try:
                # If new_max is numeric, ensure current_max is numeric
                if isinstance(new_max, (int, float, np.integer, np.floating)):
                    current_max_numeric = pd.to_numeric(current_max)
                    if new_max > current_max_numeric:
                        return new_max
                
                # If new_max is datetime, ensure current_max is datetime
                elif isinstance(new_max, datetime):
                    current_max_dt = pd.to_datetime(current_max)
                    if current_max_dt.tzinfo is None and new_max.tzinfo is not None:
                        current_max_dt = current_max_dt.replace(tzinfo=new_max.tzinfo)
                    if new_max > current_max_dt:
                        return new_max
                
                # Fallback to string comparison
                elif str(new_max) > str(current_max):
                    return new_max
                    
            except (ValueError, TypeError):
                # If comparison fails, fallback to string comparison or just return current
                logger.warning(f"Watermark comparison failed between {type(new_max)} and {type(current_max)}")
                if str(new_max) > str(current_max):
                    return new_max
            
            return current_max
        
        except Exception as e:
            logger.error(f"Watermark tracking failed: {e}")
            return current_max
    
    def _persist_watermark(
        self, pipeline_id: int, asset_id: int, wm_col: str, max_val: Any
    ):
        """Persist watermark value to database with type preservation"""
        from app.db.session import SessionLocal
        from app.models.execution import Watermark
        
        with SessionLocal() as session:
            t_wm = session.query(Watermark).filter(
                Watermark.pipeline_id == pipeline_id,
                Watermark.asset_id == asset_id
            ).first()
            
            if not t_wm:
                t_wm = Watermark(
                    pipeline_id=pipeline_id,
                    asset_id=asset_id,
                    watermark_type="timestamp"
                )
                session.add(t_wm)
            
            # Preserve numeric types for JSON storage, only convert dates/complex types to string
            if hasattr(max_val, 'isoformat'):
                value = max_val.isoformat()
            elif isinstance(max_val, (int, float, np.integer, np.floating)):
                # Convert numpy types to native python types for JSON serialization
                value = max_val.item() if hasattr(max_val, 'item') else max_val
            else:
                value = max_val
            
            t_wm.last_value = {wm_col or "watermark": value}
            t_wm.last_updated = datetime.now(timezone.utc)
            
            session.commit()
            logger.debug(f"Watermark persisted: {wm_col or 'watermark'}={value}")