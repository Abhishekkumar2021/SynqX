"""
=================================================================================
FILE 5: node_executor.py - Enhanced Production Node Executor
=================================================================================
"""

import json
import os
from datetime import UTC, datetime
from typing import Any

import numpy as np
import pandas as pd
import polars as pl
import psutil
from sqlalchemy.orm import Session
from synqx_core.models.connections import Asset, Connection
from synqx_core.models.enums import OperatorRunStatus, OperatorType
from synqx_core.models.execution import PipelineRun, StepRun, Watermark
from synqx_core.models.pipelines import PipelineNode, PipelineVersion
from synqx_core.utils.data import is_df_empty
from synqx_engine.connectors.factory import ConnectorFactory
from synqx_engine.core import DataProfiler
from synqx_engine.transforms.factory import TransformFactory

from app.core.db_logging import DBLogger
from app.core.errors import AppError
from app.core.logging import get_logger
from app.engine.agent_core.forensics import ForensicSniffer
from app.engine.agent_core.state_manager import StateManager
from app.services.vault_service import VaultService

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
        self.profiler = DataProfiler()

    def _get_process_metrics(self) -> tuple[float, float]:
        """Get current process CPU and memory usage"""
        try:
            process = psutil.Process(os.getpid())
            cpu = process.cpu_percent(interval=0.1)
            mem = process.memory_info().rss / (1024 * 1024)  # MB
            return float(cpu), float(mem)
        except Exception as e:
            logger.debug(f"Failed to get process metrics: {e}")
            return 0.0, 0.0

    def _fetch_asset_connection(
        self, db: Session, asset_id: int
    ) -> tuple[Asset, Connection]:
        """Fetch asset and its connection with validation"""
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        if not asset:
            raise AppError(f"Asset {asset_id} not found")

        conn = db.query(Connection).filter(Connection.id == asset.connection_id).first()
        if not conn:
            raise AppError(
                f"Connection {asset.connection_id} for asset {asset_id} not found"
            )

        return asset, conn

    def _sniff_data(self, df: Any, max_rows: int = 100) -> dict | None:
        """Capture sample data for inspection with robust JSON handling"""
        try:
            if is_df_empty(df):
                return None

            # Convert Polars to Pandas for standardized sniffing if needed
            if hasattr(df, "to_pandas"):
                df = df.to_pandas()
            json_str = df.to_json(orient="records", date_format="iso")
            sample = json.loads(json_str)

            return {
                "rows": sample,
                "columns": list(df.columns),
                "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
                "shape": df.shape,
                "total_rows": len(df),
            }
        except Exception as e:
            logger.error(f"Failed to sniff data: {e}")
            return None

    def execute(  # noqa: PLR0912, PLR0915
        self,
        pipeline_run: PipelineRun,
        node: PipelineNode,
        input_data: dict[str, list[pd.DataFrame]] | None = None,
    ) -> list[pd.DataFrame]:
        """
        Execute a single node with comprehensive error handling and telemetry.
        """
        db = self.state_manager.db

        # PERFORMANCE: Handle nodes collapsed via ELT Pushdown
        if node.config and node.config.get("_collapsed_into"):
            collapsed_id = node.config.get("_collapsed_into")
            logger.info(
                f"Node '{node.name}' was collapsed into '{collapsed_id}' via ELT Pushdown. Skipping local execution."  # noqa: E501
            )

            # Record a success with 0 records so UI shows it as complete
            step_run = self.state_manager.create_step_run(
                pipeline_run.id, node.id, node.operator_type, node.order_index
            )
            self.state_manager.update_step_status(
                step_run,
                OperatorRunStatus.SUCCESS,
                records_in=0,
                records_out=0,
                message=f"Pushed down to {collapsed_id}",
            )
            return [], {}

        # Get or create step run
        step_run = (
            db.query(StepRun)
            .filter(
                StepRun.pipeline_run_id == pipeline_run.id, StepRun.node_id == node.id
            )
            .first()
        )

        if not step_run:
            step_run = self.state_manager.create_step_run(
                pipeline_run.id, node.id, node.operator_type, node.order_index
            )

        # Start execution
        self.state_manager.update_step_status(step_run, OperatorRunStatus.RUNNING)

        logger.info(f"→ Starting node '{node.name}' (ID: {node.node_id})")

        DBLogger.log_step(
            db,
            step_run.id,
            "INFO",
            f"Execution lifecycle started for node '{node.name}'. "
            f"Operation: {node.operator_type.value.upper()} | Implementation: {node.operator_class}.",  # noqa: E501
            job_id=pipeline_run.job_id,
        )

        # Log input context if available
        if input_data:
            input_summary = ", ".join(
                [
                    f"'{k}' ({sum(len(df) for df in v):,} rows)"
                    for k, v in input_data.items()
                ]
            )
            DBLogger.log_step(
                db,
                step_run.id,
                "DEBUG",
                f"Input context initialized with {len(input_data)} upstream sources: {input_summary}",  # noqa: E501
                job_id=pipeline_run.job_id,
            )

        # Pre-flight check for Custom Script environments
        if node.operator_class == "custom_script":
            from app.services.dependency_service import (
                DependencyService,
            )

            # Find the language from the asset config
            asset_id = node.source_asset_id or node.destination_asset_id
            if asset_id:
                asset = db.query(Asset).filter(Asset.id == asset_id).first()
                if asset:
                    lang = asset.config.get("language")
                    if lang in ["python", "node"]:
                        DBLogger.log_step(
                            db,
                            step_run.id,
                            "DEBUG",
                            f"Verifying required runtime environment: {lang.upper()}...",  # noqa: E501
                            job_id=pipeline_run.job_id,
                        )
                        dep_service = DependencyService(db, asset.connection_id)
                        env = dep_service.get_environment(lang)
                        if not env or env.status != "ready":
                            error_msg = f"Runtime environment '{lang.upper()}' is not ready (current status: {env.status if env else 'not initialized'}). Please initialize the environment in Connection Settings."  # noqa: E501
                            DBLogger.log_step(
                                db,
                                step_run.id,
                                "ERROR",
                                error_msg,
                                job_id=pipeline_run.job_id,
                            )
                            raise AppError(error_msg)
                        else:
                            DBLogger.log_step(
                                db,
                                step_run.id,
                                "DEBUG",
                                f"Runtime check successful. {lang.capitalize()} environment is operational.",  # noqa: E501
                                job_id=pipeline_run.job_id,
                            )

        # Initialize forensics and statistics
        sniffer = ForensicSniffer(pipeline_run.id)
        stats = {
            "in": 0,
            "out": 0,
            "filtered": 0,
            "error": 0,
            "bytes": 0,
            "chunks_in": 0,
            "chunks_out": 0,
        }
        samples: dict[str, dict] = {}
        results: list[pd.DataFrame] = []
        quality_profile = {}

        def on_chunk(  # noqa: PLR0912, PLR0915
            chunk: Any,
            direction: str = "out",
            error_count: int = 0,
            filtered_count: int = 0,
        ):
            """Callback for chunk processing with telemetry"""
            nonlocal quality_profile

            chunk_is_empty = is_df_empty(chunk)

            if chunk_is_empty and error_count == 0 and filtered_count == 0:
                return

            # --- QUALITY PROFILING ---
            if direction == "out" and not chunk_is_empty:
                chunk_profile = self.profiler.profile_chunk(chunk)
                quality_profile = self.profiler.merge_profiles(
                    quality_profile, chunk_profile
                )

                # ENFORCE GUARDRAILS (The "Circuit Breaker")
                # Check both top-level and config-level for backward compatibility
                guardrails = getattr(node, "guardrails", []) or (
                    node.config.get("guardrails", []) if node.config else []
                )
                total_rows = stats["out"] + len(chunk)

                try:
                    self.profiler.check_guardrails(
                        quality_profile, guardrails, total_rows
                    )
                except ValueError as ge:
                    logger.error(f"Execution halted: {ge}")
                    DBLogger.log_step(
                        db,
                        step_run.id,
                        "CRITICAL",
                        f"GUARDRAIL BREACH: {ge}",
                        job_id=pipeline_run.job_id,
                    )
                    raise ge

            if error_count > 0:
                logger.debug(
                    f"Node {node.id} reporting {error_count} rejections/errors"
                )

            # PERFORMANCE: Native Database Quarantine
            if direction == "quarantine" and not chunk_is_empty:
                q_asset_id = node.quarantine_asset_id
                if q_asset_id:
                    try:
                        # Ensure we have pandas for quarantine write if necessary
                        p_chunk = (
                            chunk.to_pandas() if hasattr(chunk, "to_pandas") else chunk
                        )

                        q_asset, q_conn = self._fetch_asset_connection(db, q_asset_id)
                        q_cfg = VaultService.get_connector_config(q_conn)
                        q_connector = ConnectorFactory.get_connector(
                            q_conn.connector_type.value, q_cfg
                        )

                        logger.info(
                            f"Diverting {len(p_chunk)} invalid rows to quarantine asset: {q_asset.name}"  # noqa: E501
                        )
                        with q_connector.session():
                            q_connector.write_batch(
                                [p_chunk],
                                asset=q_asset.fully_qualified_name or q_asset.name,
                                mode="append",
                            )
                        DBLogger.log_step(
                            db,
                            step_run.id,
                            "DEBUG",
                            f"Diverted {len(p_chunk)} rows to native quarantine table '{q_asset.name}'.",  # noqa: E501
                            job_id=pipeline_run.job_id,
                        )
                    except Exception as q_err:
                        logger.error(f"Failed to write to native quarantine: {q_err}")
                        DBLogger.log_step(
                            db,
                            step_run.id,
                            "ERROR",
                            f"Native quarantine write failed: {q_err}. Falling back to forensic capture.",  # noqa: E501
                            job_id=pipeline_run.job_id,
                        )

            if direction == "quarantine":
                logger.info(f"Node {node.id} QUARANTINE update: {error_count} records")

            # Capture sample data (first chunk of each direction)
            if direction not in samples and not chunk_is_empty:
                samples[direction] = self._sniff_data(chunk)

            # Forensic capture
            if not chunk_is_empty:
                sniffer.capture_chunk(node.id, chunk, direction=direction)

            # Update statistics
            chunk_rows = len(chunk)

            # Calculate memory usage (Polars vs Pandas)
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
                stats["chunks_out"] += 1

                # Log progress every few chunks for very large datasets
                if stats["chunks_out"] % 10 == 0:
                    DBLogger.log_step(
                        db,
                        step_run.id,
                        "INFO",
                        f"Stream processing in progress: {stats['out']:,} records synchronized...",  # noqa: E501
                        job_id=pipeline_run.job_id,
                    )
            elif direction == "in":
                stats["in"] += chunk_rows
                stats["chunks_in"] += 1

            # Add explicit counts (useful for transforms reporting rejections)
            stats["error"] += error_count
            stats["filtered"] += filtered_count

            if error_count > 0 or direction == "quarantine":
                logger.info(
                    f"Node {node.id} ({node.operator_class}) - Captured {error_count} rejections. Total rejections: {stats['error']}"  # noqa: E501
                )

            # Broadcast real-time telemetry
            self.state_manager.update_step_status(
                step_run=step_run,
                status=OperatorRunStatus.RUNNING,
                records_in=stats["in"],
                records_out=stats["out"],
                records_filtered=stats["filtered"],
                records_error=stats["error"],
                bytes_processed=stats["bytes"],
                sample_data=samples,
                quality_profile=quality_profile,
            )

        try:
            op_type = node.operator_type

            # =====================================================================
            # A. EXTRACT Operation
            # =====================================================================
            if op_type == OperatorType.EXTRACT:
                asset, conn = self._fetch_asset_connection(db, node.source_asset_id)

                logger.info(
                    f"  Source: {conn.connector_type.value.upper()} / {asset.name}"
                )
                DBLogger.log_step(
                    db,
                    step_run.id,
                    "INFO",
                    f"Connecting to {conn.connector_type.value.upper()} data source. Target entity: '{asset.name}'.",  # noqa: E501
                    job_id=pipeline_run.job_id,
                )

                # Get connector configuration
                cfg = VaultService.get_connector_config(conn)
                connector = ConnectorFactory.get_connector(
                    conn.connector_type.value, cfg
                )

                # Handle incremental loading
                current_wm, inc_filter = None, None
                if asset.is_incremental_capable:
                    current_wm, inc_filter = self._fetch_watermark(  # noqa: RUF059
                        pipeline_run.pipeline_id, asset.id
                    )
                    if current_wm:
                        logger.info(
                            f"  Incremental: Resuming from watermark={current_wm}"
                        )
                        DBLogger.log_step(
                            db,
                            step_run.id,
                            "INFO",
                            f"Resuming incremental synchronization from high-watermark: {current_wm}.",  # noqa: E501
                            job_id=pipeline_run.job_id,
                        )
                    else:
                        DBLogger.log_step(
                            db,
                            step_run.id,
                            "INFO",
                            "Incremental synchronization enabled. No previous state found; initiating full baseline extraction.",  # noqa: E501
                            job_id=pipeline_run.job_id,
                        )

                # Prepare read parameters
                # Resolve asset name (OSDU Kind or physical table)
                asset_identifier = (
                    node.config.get("osdu_kind")
                    or asset.fully_qualified_name
                    or asset.name
                )
                read_params = {"asset": asset_identifier}

                # Merge asset config first, then override with node-specific config
                if asset.config:
                    read_params.update(asset.config)
                if node.config:
                    read_params.update(node.config)

                # PERFORMANCE: Apply ELT Pushdown (Collapse downstream transforms into SQL)  # noqa: E501
                pushdown_ops = node.config.get("_pushdown_operators")
                if pushdown_ops:
                    from app.engine.agent_core.sql_generator import (
                        SQLPushdownGenerator,
                    )

                    original_asset = read_params.get("asset") or read_params.get(
                        "query"
                    )
                    optimized_sql = SQLPushdownGenerator.generate_sql(
                        original_asset, pushdown_ops
                    )
                    logger.info(
                        f"  ELT Pushdown applied. Generated SQL: {optimized_sql}"
                    )
                    DBLogger.log_step(
                        db,
                        step_run.id,
                        "INFO",
                        f"ELT Pushdown optimization active. Collapsed {len(pushdown_ops)} downstream transforms into SQL subqueries.",  # noqa: E501
                        job_id=pipeline_run.job_id,
                    )
                    # Switch to raw query mode
                    read_params["query"] = optimized_sql
                    if "asset" in read_params:
                        read_params.pop("asset")

                # --- DATA CONTRACT INITIALIZATION ---
                contract_validator = None
                if node.data_contract:
                    from synqx_engine.core.contract import (
                        ContractValidator,
                    )

                    contract_validator = ContractValidator(node.data_contract)
                    DBLogger.log_step(
                        db,
                        step_run.id,
                        "INFO",
                        "Data Contract active. Pre-flight validation enabled.",
                        job_id=pipeline_run.job_id,
                    )

                # --- CDC / LOG TAILING LOGIC ---
                from synqx_core.models.enums import SyncMode  # noqa: PLC0415

                if (
                    node.sync_mode == SyncMode.CDC  # noqa: PLR1714
                    or node.sync_mode == SyncMode.LOG_TAILING
                ):
                    cdc_config = node.cdc_config or {}
                    slot_name = cdc_config.get("slot_name") or f"synqx_slot_{node.id}"
                    pub_name = cdc_config.get("publication_name") or "synqx_pub"

                    # 1. Fetch Resume Token (LSN/Position) from Watermark
                    resume_token, _ = self._fetch_watermark(
                        pipeline_run.pipeline_id, asset.id
                    )

                    DBLogger.log_step(
                        db,
                        step_run.id,
                        "INFO",
                        f"Initiating Real-time CDC Stream [Slot: {slot_name}]"
                        + (f" resuming from {resume_token}" if resume_token else ""),
                        job_id=pipeline_run.job_id,
                    )

                    try:
                        # CDC is a blocking infinite loop in this process
                        for chunk in connector.read_cdc(
                            slot_name=slot_name,
                            publication_name=pub_name,
                            tables=[asset.name],
                            resume_token=resume_token,
                            **read_params,
                        ):
                            # 2. Extract and Persist Checkpoint Token from chunk
                            if not is_df_empty(chunk) and "_cdc_token" in chunk.columns:
                                # Get the latest token from the last row of the chunk
                                last_token = chunk["_cdc_token"].iloc[-1]
                                if last_token:
                                    self._persist_watermark(
                                        pipeline_run.pipeline_id,
                                        asset.id,
                                        "_cdc_token",
                                        last_token,
                                    )

                            # Process changes
                            on_chunk(chunk, direction="out")

                    except Exception as cdc_err:
                        logger.error(f"CDC Stream interrupted: {cdc_err}")
                        DBLogger.log_step(
                            db,
                            step_run.id,
                            "ERROR",
                            f"Real-time stream interrupted: {cdc_err}",
                            job_id=pipeline_run.job_id,
                        )
                        raise cdc_err

                    # Terminate execution loop for this node since CDC is a continuous stream  # noqa: E501
                    return [], {}

                wm_col = (
                    self._get_watermark_column(asset)
                    if asset.is_incremental_capable
                    else None
                )
                max_val = None

                # Extract data
                logger.info("  Extracting data in batches...")
                DBLogger.log_step(
                    db,
                    step_run.id,
                    "DEBUG",
                    f"Initiating optimized stream read from {conn.connector_type.value.upper()}.",  # noqa: E501
                    job_id=pipeline_run.job_id,
                )
                with connector.session() as session:
                    for chunk_idx, chunk in enumerate(
                        session.read_batch(**read_params), 1
                    ):
                        # PERFORMANCE: Convert to Arrow-backed dtypes for memory efficiency  # noqa: E501
                        try:
                            chunk = chunk.convert_dtypes(dtype_backend="pyarrow")  # noqa: PLW2901
                        except Exception as e:
                            logger.debug(f"PyArrow conversion skipped for chunk: {e}")

                        # --- DATA CONTRACT VALIDATION ---
                        if contract_validator:
                            # Convert to Polars for high-speed validation
                            pl_chunk = (
                                pl.from_pandas(chunk)
                                if isinstance(chunk, pd.DataFrame)
                                else chunk
                            )
                            valid_chunk, quarantine_chunk = (
                                contract_validator.validate_chunk(pl_chunk)
                            )

                            if not quarantine_chunk.is_empty():
                                error_count = len(quarantine_chunk)
                                logger.warning(
                                    f"Data Contract violation: Quarantining {error_count} records from node '{node.name}'"  # noqa: E501
                                )
                                on_chunk(
                                    quarantine_chunk.to_pandas(),
                                    direction="quarantine",
                                    error_count=error_count,
                                )

                            chunk = (  # noqa: PLW2901
                                valid_chunk.to_pandas()
                                if isinstance(chunk, pd.DataFrame)
                                else valid_chunk
                            )
                            if (
                                chunk.is_empty()
                                if hasattr(chunk, "is_empty")
                                else is_df_empty(chunk)
                            ):
                                continue

                        on_chunk(chunk, direction="out")

                        # Apply watermark filter
                        if wm_col and current_wm:
                            before_count = len(chunk)
                            chunk = self._apply_watermark_filter(  # noqa: PLW2901
                                chunk, wm_col, current_wm
                            )

                            if is_df_empty(chunk):
                                after_count = 0
                                stats["filtered"] += before_count - after_count
                                continue

                            after_count = len(chunk)
                            stats["filtered"] += before_count - after_count

                        # Track high watermark
                        if wm_col:
                            max_val = self._track_high_watermark(chunk, wm_col, max_val)

                        results.append(chunk)

                        if chunk_idx % 10 == 0:
                            logger.debug(
                                f"    Processed {chunk_idx} chunks, {stats['out']:,} rows"  # noqa: E501
                            )

                # Persist watermark
                if max_val is not None:
                    self._persist_watermark(
                        pipeline_run.pipeline_id, asset.id, wm_col, max_val
                    )
                    logger.info(f"  [SUCCESS] New watermark persisted: {max_val}")
                    DBLogger.log_step(
                        db,
                        step_run.id,
                        "SUCCESS",
                        f"Data extraction complete. Synchronized {stats['out']:,} new records. High-watermark updated to: {max_val}.",  # noqa: E501
                        job_id=pipeline_run.job_id,
                    )
                elif stats["out"] > 0:
                    DBLogger.log_step(
                        db,
                        step_run.id,
                        "SUCCESS",
                        f"Data extraction complete. Successfully processed {stats['out']:,} total records.",  # noqa: E501
                        job_id=pipeline_run.job_id,
                    )
                else:
                    DBLogger.log_step(
                        db,
                        step_run.id,
                        "INFO",
                        "Extraction phase complete. No new data identified in source.",
                        job_id=pipeline_run.job_id,
                    )

            # =====================================================================
            # B. LOAD Operation
            # =====================================================================
            elif op_type == OperatorType.LOAD:
                asset, conn = self._fetch_asset_connection(
                    db, node.destination_asset_id
                )

                logger.info(
                    f"  Target: {conn.connector_type.value.upper()} / {asset.name}"
                )
                DBLogger.log_step(
                    db,
                    step_run.id,
                    "INFO",
                    f"Transmitting payloads to {conn.connector_type.value.upper()} destination. Target entity: '{asset.name}'.",  # noqa: E501
                    job_id=pipeline_run.job_id,
                )

                # Get connector
                cfg = VaultService.get_connector_config(conn)
                connector = ConnectorFactory.get_connector(
                    conn.connector_type.value, cfg
                )

                # PERFORMANCE: Zero-Movement ELT Pushdown
                native_query = node.config.get("_native_elt_query")
                if native_query:
                    logger.info(
                        "  ELT Pushdown active: Executing Zero-Movement transfer inside database."  # noqa: E501
                    )
                    DBLogger.log_step(
                        db,
                        step_run.id,
                        "INFO",
                        "Zero-Movement ELT optimization active. Synchronizing data natively within the database cluster.",  # noqa: E501
                        job_id=pipeline_run.job_id,
                    )
                    with connector.session() as session:
                        # Handle multi-statement (e.g. TRUNCATE; INSERT)
                        for stmt in native_query.split(";"):
                            if stmt.strip():
                                session.execute_query(stmt.strip())

                    # For pushdown, records processed is often unknown or the full source count  # noqa: E501
                    # We'll set a success flag
                    stats["out"] = 0
                    logger.info("  [SUCCESS] Native ELT command completed.")
                    DBLogger.log_step(
                        db,
                        step_run.id,
                        "SUCCESS",
                        "Native database synchronization finalized successfully.",
                        job_id=pipeline_run.job_id,
                    )
                else:
                    # --- DATA CONTRACT INITIALIZATION ---
                    contract_validator = None
                    if node.data_contract:
                        from synqx_engine.core.contract import (
                            ContractValidator,
                        )

                        contract_validator = ContractValidator(node.data_contract)
                        DBLogger.log_step(
                            db,
                            step_run.id,
                            "INFO",
                            "Data Contract active. Validating ingress before target commit.",  # noqa: E501
                            job_id=pipeline_run.job_id,
                        )

                    # Prepare sink stream
                    def sink_stream():
                        for uid, chunks in (input_data or {}).items():
                            logger.debug(
                                f"  Processing input from upstream '{uid}': {len(chunks)} chunks"  # noqa: E501
                            )
                            for chunk in chunks:
                                on_chunk(chunk, direction="in")

                                # --- DATA CONTRACT VALIDATION ---
                                if contract_validator:
                                    pl_chunk = (
                                        pl.from_pandas(chunk)
                                        if isinstance(chunk, pd.DataFrame)
                                        else chunk
                                    )
                                    valid_chunk, quarantine_chunk = (
                                        contract_validator.validate_chunk(pl_chunk)
                                    )

                                    if not quarantine_chunk.is_empty():
                                        on_chunk(
                                            quarantine_chunk.to_pandas(),
                                            direction="quarantine",
                                            error_count=len(quarantine_chunk),
                                        )

                                    chunk = (  # noqa: PLW2901
                                        valid_chunk.to_pandas()
                                        if isinstance(chunk, pd.DataFrame)
                                        else valid_chunk
                                    )
                                    if (
                                        chunk.is_empty()
                                        if hasattr(chunk, "is_empty")
                                        else is_df_empty(chunk)
                                    ):
                                        continue

                                on_chunk(chunk, direction="out")
                                yield chunk

                    # Write data
                    write_mode = (
                        node.config.get("write_strategy")
                        or node.write_strategy.value
                        or (asset.config or {}).get("write_mode")
                        or "append"
                    )
                    evolution_policy = node.schema_evolution_policy.value

                    asset_identifier = (
                        node.config.get("osdu_kind")
                        or asset.fully_qualified_name
                        or asset.name
                    )
                    logger.info(
                        f"  Write mode: {write_mode.upper()} | Policy: {evolution_policy.upper()}"  # noqa: E501
                    )
                    DBLogger.log_step(
                        db,
                        step_run.id,
                        "INFO",
                        f"Executing target commit using strategy: {write_mode.upper()} (Policy: {evolution_policy.upper()}).",  # noqa: E501
                        job_id=pipeline_run.job_id,
                    )

                    with connector.session() as session:
                        # Merge node config for write parameters
                        write_params = {**node.config}
                        write_params.pop(
                            "write_strategy", None
                        )  # Handled separately via 'mode'
                        write_params.pop("ui", None)  # Metadata cleanup
                        write_params.pop("connection_id", None)  # Metadata cleanup
                        write_params["schema_evolution_policy"] = evolution_policy

                        # --- HIGH PERFORMANCE STAGING ---
                        if session.supports_staging() and conn.staging_connection_id:
                            try:
                                stage_conn_obj = db.query(Connection).get(
                                    conn.staging_connection_id
                                )
                                if stage_conn_obj:
                                    stage_cfg = VaultService.get_connector_config(
                                        stage_conn_obj
                                    )
                                    stage_connector = ConnectorFactory.get_connector(
                                        stage_conn_obj.connector_type.value, stage_cfg
                                    )

                                    DBLogger.log_step(
                                        db,
                                        step_run.id,
                                        "INFO",
                                        f"Optimized Staging detected. Using '{stage_conn_obj.name}' as intermediate buffer.",  # noqa: E501
                                        job_id=pipeline_run.job_id,
                                    )

                                    records_out = session.write_staged(
                                        sink_stream(),
                                        asset=asset_identifier,
                                        stage_connector=stage_connector,
                                        mode=write_mode,
                                        **write_params,
                                    )
                                    stats["out"] = records_out
                                else:
                                    # Fallback to standard batch
                                    records_out = session.write_batch(
                                        sink_stream(),
                                        asset=asset_identifier,
                                        mode=write_mode,
                                        **write_params,
                                    )
                                    stats["out"] = records_out
                            except Exception as stage_err:
                                logger.warning(
                                    f"Staged write failed, falling back to batch: {stage_err}"  # noqa: E501
                                )
                                DBLogger.log_step(
                                    db,
                                    step_run.id,
                                    "WARNING",
                                    f"Staged load failed ({stage_err}). Falling back to standard batch transfer.",  # noqa: E501
                                    job_id=pipeline_run.job_id,
                                )
                                records_out = session.write_batch(
                                    sink_stream(),
                                    asset=asset_identifier,
                                    mode=write_mode,
                                    **write_params,
                                )
                                stats["out"] = records_out
                        else:
                            # Standard write
                            records_out = session.write_batch(
                                sink_stream(),
                                asset=asset_identifier,
                                mode=write_mode,
                                **write_params,
                            )
                            stats["out"] = records_out

                    logger.info(f"  [SUCCESS] Loaded {records_out:,} records")
                    DBLogger.log_step(
                        db,
                        step_run.id,
                        "SUCCESS",
                        f"Load phase complete. Successfully committed {records_out:,} records to destination.",  # noqa: E501
                        job_id=pipeline_run.job_id,
                    )

            # =====================================================================
            # C. TRANSFORM / JOIN / SET Operations
            # =====================================================================
            elif op_type in {
                OperatorType.TRANSFORM,
                OperatorType.JOIN,
                OperatorType.UNION,
                OperatorType.MERGE,
                OperatorType.VALIDATE,
                OperatorType.NOOP,
            }:
                # 1. Resolve Transform and Engine
                t_config = {
                    **node.config,
                    "_run_id": pipeline_run.id,
                    "_job_id": pipeline_run.job_id,
                    "_node_id": node.id,
                    "_pipeline_id": pipeline_run.pipeline_id,
                    "_on_chunk": on_chunk,
                    "_db": db,
                }

                try:
                    transform = TransformFactory.get_transform(
                        node.operator_class, t_config
                    )
                except Exception as e:
                    logger.warning(
                        f"Transform '{node.operator_class}' not found, using pass-through: {e}"  # noqa: E501
                    )
                    transform = TransformFactory.get_transform("noop", t_config)

                engine = TransformFactory.get_engine(transform)
                logger.info(
                    f"  Applying {engine.upper()} transform: {node.operator_class}"
                )
                DBLogger.log_step(
                    db,
                    step_run.id,
                    "INFO",
                    f"Applying {engine.upper()} transformation logic: '{node.operator_class}'.",  # noqa: E501
                    job_id=pipeline_run.job_id,
                )

                # 2. Prepare input iterators with automatic engine conversion
                input_iters = {}
                for uid, chunks in (input_data or {}).items():

                    def make_it(c, target_engine):
                        for chunk in c:
                            on_chunk(chunk, direction="in")
                            # Convert engine if necessary (Zero-copy Arrow where possible)  # noqa: E501
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

                # 3. Execute
                data_iter = None
                if op_type in {
                    OperatorType.JOIN,
                    OperatorType.UNION,
                    OperatorType.MERGE,
                }:
                    DBLogger.log_step(
                        db,
                        step_run.id,
                        "DEBUG",
                        f"Merging {len(input_iters)} data streams using {op_type.value} logic.",  # noqa: E501
                        job_id=pipeline_run.job_id,
                    )
                    data_iter = transform.transform_multi(input_iters)
                else:
                    upstream_it = (
                        next(iter(input_iters.values())) if input_iters else iter([])
                    )
                    data_iter = transform.transform(upstream_it)

                # --- DATA CONTRACT INITIALIZATION ---
                contract_validator = None
                if node.data_contract:
                    from synqx_engine.core.contract import (
                        ContractValidator,
                    )

                    contract_validator = ContractValidator(node.data_contract)

                # 4. Materialize results
                chunk_count = 0
                for chunk in data_iter:
                    chunk_count += 1

                    # --- DATA CONTRACT VALIDATION ---
                    if contract_validator:
                        pl_chunk = (
                            pl.from_pandas(chunk)
                            if isinstance(chunk, pd.DataFrame)
                            else chunk
                        )
                        valid_chunk, quarantine_chunk = (
                            contract_validator.validate_chunk(pl_chunk)
                        )

                        if not quarantine_chunk.is_empty():
                            on_chunk(
                                quarantine_chunk.to_pandas(),
                                direction="quarantine",
                                error_count=len(quarantine_chunk),
                            )

                        chunk = (  # noqa: PLW2901
                            valid_chunk.to_pandas()
                            if isinstance(chunk, pd.DataFrame)
                            else valid_chunk
                        )
                        if (
                            chunk.is_empty()
                            if hasattr(chunk, "is_empty")
                            else is_df_empty(chunk)
                        ):
                            continue

                    on_chunk(chunk, direction="out")
                    results.append(chunk)

                    if chunk_count % 10 == 0:
                        logger.debug(
                            f"    Processed {chunk_count} chunks, {stats['out']:,} rows"
                        )
                        DBLogger.log_step(
                            db,
                            step_run.id,
                            "DEBUG",
                            f"Transformation in progress: {chunk_count} chunks materialized...",  # noqa: E501
                            job_id=pipeline_run.job_id,
                        )

            # =====================================================================
            # D. SUB-PIPELINE Operation (Recursive DAG)
            # =====================================================================
            elif op_type == OperatorType.SUB_PIPELINE:
                sub_id = node.sub_pipeline_id
                if not sub_id:
                    raise AppError(
                        f"Sub-pipeline node '{node.name}' has no target pipeline ID defined."  # noqa: E501
                    )

                DBLogger.log_step(
                    db,
                    step_run.id,
                    "INFO",
                    f"Recursing into sub-pipeline (ID: {sub_id})...",
                    job_id=pipeline_run.job_id,
                )

                from synqx_core.models.pipelines import Pipeline  # noqa: PLC0415

                from app.engine.agent_core.core import PipelineAgent  # noqa: PLC0415

                sub_pipe = db.query(Pipeline).filter(Pipeline.id == sub_id).first()
                if not sub_pipe or not sub_pipe.published_version_id:
                    raise AppError(
                        f"Sub-pipeline {sub_id} not found or has no published version."
                    )

                sub_version = (
                    db.query(PipelineVersion)
                    .filter(PipelineVersion.id == sub_pipe.published_version_id)
                    .first()
                )

                # We spawn a new agent for the sub-pipeline
                # Note: We reuse the same DB session
                sub_agent = PipelineAgent()
                # We'll need a unique job ID or use the same one? Better to create a child job.  # noqa: E501
                # For prototype, we'll run it in the current context
                sub_agent.run(sub_version, db, job_id=pipeline_run.job_id)

                DBLogger.log_step(
                    db,
                    step_run.id,
                    "SUCCESS",
                    f"Sub-pipeline {sub_id} execution finalized.",
                    job_id=pipeline_run.job_id,
                )
                results = []  # Sub-pipelines currently don't return data to parents in this model  # noqa: E501

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
                sample_data=samples,
                quality_profile=quality_profile,
            )

            duration = step_run.duration_seconds or 0
            logger.info(f"[SUCCESS] Node '{node.name}' completed successfully")
            logger.info(
                f"  Inbound: {stats['in']:,} | Outbound: {stats['out']:,} | Quarantined: {stats['error']:,}"  # noqa: E501
            )
            logger.info(
                f"  Efficiency: {duration:.2f}s | CPU: {cpu:.1f}% | Memory: {mem:.1f}MB"
            )

            DBLogger.log_step(
                db,
                step_run.id,
                "SUCCESS",
                f"Node execution finalized. Successfully processed {stats['out']:,} records ({stats['error']:,} rejected) in {duration:.2f}s. "  # noqa: E501
                f"Peak system footprint: CPU {cpu:.1f}%, Mem {mem:.1f}MB.",
                job_id=pipeline_run.job_id,
            )

            logger.info(f"Node {node.id} returning {len(results)} chunks")
            return results, quality_profile

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
                quality_profile,
                e,
            )

            logger.error(f"[FAILED] Node '{node.name}' FAILED: {e!s}", exc_info=True)

            raise e

    # =========================================================================
    # Watermark Management
    # =========================================================================

    def _get_watermark_column(self, asset: Asset) -> str | None:
        """Extract watermark column from asset configuration"""
        if not asset.config:
            return None
        return asset.config.get("watermark_column") or asset.config.get(
            "WATERMARK_COLUMN"
        )

    def _fetch_watermark(
        self, pipeline_id: int, asset_id: int
    ) -> tuple[Any, dict | None]:
        """Fetch current watermark value for incremental processing"""
        wm_record = (
            self.state_manager.db.query(Watermark)
            .filter(
                Watermark.pipeline_id == pipeline_id, Watermark.asset_id == asset_id
            )
            .first()
        )

        if not wm_record or not wm_record.last_value:
            return None, None

        val = next(iter(wm_record.last_value.values()))
        return val, {**wm_record.last_value, "high_watermark": val}

    def _apply_watermark_filter(  # noqa: PLR0911
        self, chunk: pd.DataFrame, wm_col: str | None, current_wm_value: Any
    ) -> pd.DataFrame:
        """Filter chunk based on watermark value with maximum resiliency"""
        if current_wm_value is None or not wm_col:
            return chunk

        # Ensure current_wm_value is a scalar
        if (
            isinstance(current_wm_value, (list, tuple, np.ndarray))
            and len(current_wm_value) > 0
        ):
            current_wm_value = current_wm_value[0]
        elif isinstance(current_wm_value, dict) and len(current_wm_value) > 0:
            current_wm_value = next(iter(current_wm_value.values()))

        # Find actual column (case-insensitive)
        actual_col = next(
            (c for c in chunk.columns if c.lower() == wm_col.lower()), None
        )

        if not actual_col:
            logger.warning(
                f"Watermark column '{wm_col}' not found in data. Available: {chunk.columns.tolist()}"  # noqa: E501
            )
            return chunk

        try:
            series = chunk[actual_col]

            # Handle numeric columns with explicit conversion and .values comparison
            if pd.api.types.is_numeric_dtype(series):
                try:
                    # Robust numeric conversion
                    if isinstance(current_wm_value, str):
                        wm_val = float(current_wm_value.strip().replace(",", ""))
                    else:
                        wm_val = float(current_wm_value)

                    # Use .values for a cleaner, often more resilient comparison
                    return chunk[series.values > wm_val]
                except (ValueError, TypeError) as e:
                    logger.warning(
                        f"Failed to convert watermark '{current_wm_value}' to numeric for column '{actual_col}': {e}"  # noqa: E501
                    )
                    return chunk

            # Handle datetime columns
            if pd.api.types.is_datetime64_any_dtype(series):
                try:
                    wm_datetime = pd.to_datetime(current_wm_value)
                    if series.dt.tz is not None and wm_datetime.tzinfo is None:
                        wm_datetime = wm_datetime.replace(tzinfo=UTC)

                    return chunk[pd.to_datetime(series) > wm_datetime]
                except (ValueError, TypeError) as e:
                    logger.warning(
                        f"Failed to convert watermark '{current_wm_value}' to datetime for column '{actual_col}': {e}"  # noqa: E501
                    )
                    return chunk

            # String comparison fallback (force both to string)
            return chunk[series.astype(str).values > str(current_wm_value)]

        except Exception as e:
            logger.error(
                f"Watermark filter failed for column '{wm_col}': {e}", exc_info=True
            )
            return chunk

    def _track_high_watermark(  # noqa: PLR0911, PLR0912
        self, chunk: pd.DataFrame, wm_col: str | None, current_max: Any
    ) -> Any:
        """Track the highest watermark value in chunk with type safety"""
        if not wm_col:
            return current_max

        actual_col = next(
            (c for c in chunk.columns if c.lower() == wm_col.lower()), None
        )

        if not actual_col:
            return current_max

        try:
            new_max = chunk[actual_col].max()

            # If chunk is empty or all null, max() might be NaN or None
            if pd.isna(new_max):
                return current_max

            # Convert Timestamp to datetime
            if hasattr(new_max, "to_pydatetime"):
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
                # If comparison fails, fallback to string comparison or just return current  # noqa: E501
                logger.warning(
                    f"Watermark comparison failed between {type(new_max)} and {type(current_max)}"  # noqa: E501
                )
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
        from synqx_core.models.execution import Watermark  # noqa: PLC0415

        from app.db.session import SessionLocal  # noqa: PLC0415

        with SessionLocal() as session:
            t_wm = (
                session.query(Watermark)
                .filter(
                    Watermark.pipeline_id == pipeline_id, Watermark.asset_id == asset_id
                )
                .first()
            )

            if not t_wm:
                t_wm = Watermark(
                    pipeline_id=pipeline_id,
                    asset_id=asset_id,
                    watermark_type="timestamp",
                )
                session.add(t_wm)

            # Preserve numeric types for JSON storage, only convert dates/complex types to string  # noqa: E501
            if hasattr(max_val, "isoformat"):
                value = max_val.isoformat()
            elif isinstance(max_val, (int, float, np.integer, np.floating)):
                # Convert numpy types to native python types for JSON serialization
                value = max_val.item() if hasattr(max_val, "item") else max_val
            else:
                value = max_val

            t_wm.last_value = {wm_col or "watermark": value}
            t_wm.last_updated = datetime.now(UTC)

            session.commit()
            logger.debug(f"Watermark persisted: {wm_col or 'watermark'}={value}")
