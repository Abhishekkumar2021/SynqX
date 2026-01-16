"""
=================================================================================
FILE 1: pipeline_agent.py - Enhanced DAG Agent
=================================================================================
"""

from typing import Dict, List, Set, Optional
import pandas as pd
from sqlalchemy.orm import Session
import concurrent.futures
import time
from datetime import datetime, timezone

from synqx_engine.dag import DAG, DagCycleError
from synqx_core.models.pipelines import PipelineVersion, PipelineNode
from synqx_core.models.execution import PipelineRun
from synqx_core.models.enums import OperatorRunStatus, RetryStrategy
from synqx_core.utils.data import is_df_empty
from app.core.errors import ConfigurationError, PipelineExecutionError
from app.core.logging import get_logger
from app.core.db_logging import DBLogger
from app.engine.agent_core.state_manager import StateManager
from app.engine.agent_core.node_executor import NodeExecutor
from synqx_engine.core.data_cache import DataCache
from synqx_engine.metrics import ExecutionMetrics
from app.engine.agent_core.sql_generator import StaticOptimizer
from app.db.session import SessionLocal
from app.core.config import settings
import os

logger = get_logger(__name__)


class ParallelExecutionLayer:
    """Manages parallel execution of independent nodes within the same DAG layer"""

    def __init__(self, max_workers: Optional[int] = None):
        # Auto-calculate workers if not provided or 0
        if not max_workers or max_workers == 0:
            cpu_count = os.cpu_count() or 2
            self.max_workers = cpu_count * 2
            logger.info(f"ParallelExecutionLayer initialized with auto-scaled {self.max_workers} workers (CPUs: {cpu_count})")
        else:
            self.max_workers = max_workers
            logger.info(f"ParallelExecutionLayer initialized with {self.max_workers} workers")

    def execute_layer(
        self,
        nodes: List[PipelineNode],
        pipeline_run: PipelineRun,
        data_cache: DataCache,
        dag: DAG,
        state_manager: StateManager,
        job_id: int,
    ) -> Dict[str, List[pd.DataFrame]]:
        """Execute all nodes in a layer in parallel, respecting edge conditions"""
        results = {}
        errors = []
        
        # --- CONDITIONAL EXECUTION FILTERING ---
        executable_nodes = []
        for node in nodes:
            # A node is executable if ALL its incoming active edges evaluate to True
            # (or if it has no incoming edges / no conditions)
            incoming_edges = dag.get_incoming_edge_metadata(node.node_id)
            is_branch_active = True
            
            for edge in incoming_edges:
                condition = edge.get("condition")
                if condition:
                    try:
                        # Simple evaluator for conditions like "inputs['prev'].count > 0"
                        if not self._evaluate_condition(condition, data_cache):
                            is_branch_active = False
                            break
                    except Exception as e:
                        logger.warning(f"Failed to evaluate edge condition for node '{node.name}': {e}")
            
            if is_branch_active:
                executable_nodes.append(node)
            else:
                DBLogger.log_job(state_manager.db, job_id, "INFO", f"Branching: Skipping node '{node.name}' due to False edge condition.")
                # Mark as skipped in state
                step_run = state_manager.create_step_run(pipeline_run.id, node.id, node.operator_type, node.order_index)
                state_manager.update_step_status(step_run, OperatorRunStatus.SKIPPED, message="Branch condition evaluated to False")

        if not executable_nodes:
            return {}

        if len(executable_nodes) == 1:
            # ... (rest of sequential logic)

            # Single node - execute directly without threading overhead
            node = nodes[0]
            DBLogger.log_job(state_manager.db, job_id, "DEBUG", f"Executing node '{node.name}' sequentially (no parallel siblings).")
            try:
                result = self._execute_single_node(
                    node, pipeline_run, data_cache, dag, state_manager, job_id
                )
                results[node.node_id] = result
                logger.info(f"[SUCCESS] Node '{node.name}' completed ({len(result)} chunks)")
            except Exception as e:
                errors.append((node.name, e))
                logger.error(f"[FAILED] Node '{node.name}' failed: {e}", exc_info=True)
        else:
            # Multiple nodes - parallel execution
            actual_workers = min(self.max_workers, len(nodes))
            DBLogger.log_job(state_manager.db, job_id, "INFO", f"Initiating parallel execution for {len(nodes)} independent nodes using {actual_workers} worker threads.")
            logger.info(
                f"Parallel execution: {len(nodes)} nodes with {actual_workers} workers"
            )

            with concurrent.futures.ThreadPoolExecutor(
                max_workers=actual_workers
            ) as executor:
                future_to_node = {
                    executor.submit(
                        self._execute_single_node,
                        node,
                        pipeline_run,
                        data_cache,
                        dag,
                        state_manager,
                        job_id,
                    ): node
                    for node in nodes
                }

                for future in concurrent.futures.as_completed(future_to_node):
                    node = future_to_node[future]
                    try:
                        # Use node-specific timeout or default to 1 hour
                        timeout = node.timeout_seconds or 3600
                        result = future.result(timeout=timeout)
                        results[node.node_id] = result
                        logger.info(
                            f"[SUCCESS] Node '{node.name}' completed ({len(result)} chunks)"
                        )
                    except concurrent.futures.TimeoutError:
                        errors.append(
                            (node.name, Exception(f"Execution timeout reached ({timeout}s)"))
                        )
                        logger.error(f"[FAILED] Node '{node.name}' timed out after {timeout}s")
                    except Exception as e:
                        errors.append((node.name, e))
                        logger.error(
                            f"[FAILED] Node '{node.name}' failed: {e}", exc_info=True
                        )

        if errors:
            error_summary = "; ".join([f"Node '{name}': {str(e)}" for name, e in errors])
            raise PipelineExecutionError(f"Stage execution failed. Component errors: {error_summary}")

        return results

    def _evaluate_condition(self, condition: str, data_cache: DataCache) -> bool:
        """Evaluates simple boolean conditions for edge branching"""
        try:
            # Basic support for "inputs['node'].count > 0"
            if "count" in condition:
                import re
                match = re.search(r"inputs\['(.+?)'\]", condition)
                if match:
                    node_id = match.group(1)
                    data = data_cache.retrieve(node_id)
                    count = sum(len(df) for df in data) if data else 0
                    eval_expr = condition.replace(f"inputs['{node_id}'].count", str(count))
                    return eval(eval_expr, {"__builtins__": {}}, {})
            
            # Fallback to simple eval
            return eval(condition, {"__builtins__": {}}, {})
        except Exception:
            return True # Default to True on failure to avoid deadlocks

    def _execute_single_node(
        self,
        node: PipelineNode,
        pipeline_run: PipelineRun,
        data_cache: DataCache,
        dag: DAG,
        state_manager: StateManager,
        job_id: int,
    ) -> List[pd.DataFrame]:
        """Execute a single node, handling Dynamic Mapping if enabled"""
        
        # --- DYNAMIC MAPPING (FAN-OUT) LOGIC ---
        if getattr(node, "is_dynamic", False) and node.mapping_expr:
            return self._execute_dynamic_node(node, pipeline_run, data_cache, dag, state_manager, job_id)

        return self._execute_node_with_retry(node, pipeline_run, data_cache, dag, state_manager, job_id)

    def _execute_dynamic_node(
        self,
        node: PipelineNode,
        pipeline_run: PipelineRun,
        data_cache: DataCache,
        dag: DAG,
        state_manager: StateManager,
        job_id: int,
    ) -> List[pd.DataFrame]:
        """Evaluates mapping expression and executes multiple parallel instances"""
        
        # 1. Resolve Mapping List
        # In a real system, we'd use a safe eval or a specialized parser
        # For now, we support simple literal lists or 'inputs[node].rows'
        mapping_items = []
        results = []
        try:
            expr = node.mapping_expr
            if expr.startswith("[") and expr.endswith("]"):
                import ast
                mapping_items = ast.literal_eval(expr)
            elif "inputs" in expr:
                # Basic parser for "inputs['node_id'].count" or similar
                # For prototype, we'll try to find the upstream node and get its count
                import re
                match = re.search(r"inputs\['(.+?)'\]", expr)
                if match:
                    up_node_id = match.group(1)
                    up_data = data_cache.retrieve(up_node_id)
                    if up_data:
                        # Map over each row of the first chunk as an example
                        mapping_items = up_data[0].to_dict('records') if not is_df_empty(up_data[0]) else []
            
            if not mapping_items:
                DBLogger.log_job(state_manager.db, job_id, "WARNING", f"Dynamic node '{node.name}' mapping expression evaluated to an empty list. Skipping.")
                return []

            DBLogger.log_job(state_manager.db, job_id, "INFO", f"Dynamic Fan-out: Node '{node.name}' spawning {len(mapping_items)} parallel instances.")
        except Exception as e:
            raise PipelineExecutionError(f"Failed to evaluate mapping expression for node '{node.name}': {e}")

        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # We pass the mapping item as an override in the config
            def run_instance(item):
                # For prototype, we'll assume the executor knows how to handle 'dynamic_item' in config
                instance_config = {**(node.config or {}), "_dynamic_item": item}
                # We need a way to pass this config... 
                # Better: modify the _execute_node_with_retry to take an optional config override
                return self._execute_node_with_retry(node, pipeline_run, data_cache, dag, state_manager, job_id, config_override=instance_config)

            futures = [executor.submit(run_instance, it) for i, it in enumerate(mapping_items)]
            for future in concurrent.futures.as_completed(futures):
                results.extend(future.result())

        return results

    def _execute_node_with_retry(
        self,
        node: PipelineNode,
        pipeline_run: PipelineRun,
        data_cache: DataCache,
        dag: DAG,
        state_manager: StateManager,
        job_id: int,
        config_override: Optional[Dict] = None
    ) -> List[pd.DataFrame]:
        """Execute a single node with proper session management and retry logic"""
        
        attempt = 0
        max_retries = node.max_retries or 0
        
        while attempt <= max_retries:
            node_start = time.time()
            try:
                with SessionLocal() as session:
                    # Re-fetch objects in this thread's session
                    t_pipeline_run = (
                        session.query(PipelineRun)
                        .filter(PipelineRun.id == pipeline_run.id)
                        .first()
                    )
                    t_node = (
                        session.query(PipelineNode).filter(PipelineNode.id == node.id).first()
                    )

                    if not t_pipeline_run or not t_node:
                        raise PipelineExecutionError(
                            f"Failed to load pipeline run or node '{node.name}' in thread"
                        )

                    # Inject config override if present (for Dynamic Mapping)
                    if config_override:
                        t_node.config = {**(t_node.config or {}), **config_override}

                    # Create thread-local state manager and executor
                    t_state_manager = StateManager(session, job_id)
                    t_node_executor = NodeExecutor(t_state_manager)

                    # Prepare input data from cache
                    upstream_ids = dag.get_upstream_nodes(node.node_id)
                    input_data = {}

                    for uid in upstream_ids:
                        chunks = data_cache.retrieve(uid)
                        input_data[uid] = chunks
                        logger.debug(
                            f"Node '{node.name}' loaded {len(chunks)} chunks from '{uid}'"
                        )

                    # Execute node
                    logger.info(
                        f"→ Executing node '{node.name}' (type: {node.operator_type.value}, attempt: {attempt + 1}/{max_retries + 1})"
                    )
                    
                    if attempt > 0:
                        DBLogger.log_job(
                            session, job_id, "WARNING", 
                            f"Retrying node '{node.name}' (Attempt {attempt + 1}/{max_retries + 1})"
                        )

                    results, quality_profile = t_node_executor.execute(t_pipeline_run, t_node, input_data)

                    node_duration = time.time() - node_start
                    total_rows = sum(len(df) for df in results)
                    logger.info(
                        f"← Node '{node.name}' completed: {total_rows:,} rows, "
                        f"{len(results)} chunks in {node_duration:.2f}s"
                    )

                    return results

            except Exception as e:
                attempt += 1
                
                # Check for non-retryable error types
                if isinstance(e, (ConfigurationError, ValueError, PipelineExecutionError)):
                    logger.error(f"Node '{node.name}' failed with non-retryable error: {e}")
                    raise e

                if attempt > max_retries:
                    logger.error(f"Node '{node.name}' failed after {attempt} attempts: {e}")
                    raise e
                
                # Calculate delay
                delay = self._calculate_retry_delay(node, attempt)
                logger.warning(
                    f"Node '{node.name}' failed (attempt {attempt}/{max_retries + 1}). "
                    f"Retrying in {delay}s... Error: {e}"
                )
                time.sleep(delay)

    def _calculate_retry_delay(self, node: PipelineNode, attempt: int) -> int:
        """Calculate retry delay based on node configuration and attempt number"""
        
        base_delay = node.retry_delay_seconds or 60
        strategy = node.retry_strategy or RetryStrategy.FIXED
        
        if strategy == RetryStrategy.FIXED:
            return base_delay
        elif strategy == RetryStrategy.EXPONENTIAL_BACKOFF:
            return base_delay * (2 ** (attempt - 1))
        elif strategy == RetryStrategy.LINEAR_BACKOFF:
            return base_delay * attempt
        return base_delay


class PipelineAgent:
    """
    Production-Grade DAG Pipeline Agent

    Features:
    - Layer-based parallel execution for independent nodes
    - Intelligent memory management with cache eviction
    - Comprehensive error handling and recovery
    - Real-time metrics and telemetry
    - Detailed execution logging with visual indicators
    """

    def __init__(self, max_parallel_nodes: Optional[int] = None, max_cache_memory_mb: Optional[int] = None):
        self.max_parallel_nodes = max_parallel_nodes or settings.ENGINE_MAX_WORKERS
        self.max_cache_memory_mb = max_cache_memory_mb or settings.ENGINE_MAX_CACHE_MB
        self.metrics = ExecutionMetrics()

    def _build_dag(self, pipeline_version: PipelineVersion) -> DAG:
        """Build and validate DAG from pipeline version"""
        logger.info(
            f"Building DAG: {len(pipeline_version.nodes)} nodes, {len(pipeline_version.edges)} edges"
        )

        dag = DAG()
        node_map = {node.id: node for node in pipeline_version.nodes}

        # Add all nodes
        for node in pipeline_version.nodes:
            dag.add_node(node.node_id)
            logger.debug(f"  + Node: '{node.node_id}' ({node.operator_type.value})")

        # Add all edges with validation
        for edge in pipeline_version.edges:
            from_node = node_map.get(edge.from_node_id)
            to_node = node_map.get(edge.to_node_id)

            if not from_node or not to_node:
                raise ConfigurationError(
                    f"Invalid edge: references non-existent node "
                    f"({edge.from_node_id} -> {edge.to_node_id})"
                )

            if from_node.node_id == to_node.node_id:
                raise ConfigurationError(
                    f"Self-loop detected: node '{from_node.node_id}' cannot connect to itself"
                )

            dag.add_edge(
                from_node.node_id, 
                to_node.node_id, 
                condition=edge.condition,
                edge_type=edge.edge_type
            )
            logger.debug(f"  → Edge: '{from_node.node_id}' → '{to_node.node_id}'")

        # Validate DAG structure (detect cycles)
        try:
            order = dag.topological_sort()
            logger.info(
                f"[SUCCESS] DAG validation successful (topological order: {len(order)} nodes)"
            )
        except DagCycleError as e:
            raise ConfigurationError(
                f"Pipeline {pipeline_version.id} contains cycle(s): {e}"
            )

        return dag

    def _compute_execution_layers(
        self, dag: DAG, node_map: Dict[str, PipelineNode]
    ) -> List[List[PipelineNode]]:
        """Compute execution layers for parallel processing"""
        layers = []
        executed = set()
        all_nodes = set(node_map.keys())

        logger.info("Computing execution layers...")

        while executed != all_nodes:
            # Find nodes whose dependencies are all satisfied
            current_layer = []
            for node_id in all_nodes - executed:
                upstream = set(dag.get_upstream_nodes(node_id))
                if upstream.issubset(executed):
                    current_layer.append(node_map[node_id])

            if not current_layer:
                remaining = all_nodes - executed
                raise PipelineExecutionError(
                    f"Execution deadlock detected. Cannot schedule nodes: {remaining}"
                )

            layers.append(current_layer)
            executed.update(node.node_id for node in current_layer)

            logger.info(
                f"  Layer {len(layers)}: {len(current_layer)} node(s) - "
                f"[{', '.join(n.node_id for n in current_layer)}]"
            )

        return layers

    def _cleanup_cache(
        self, cache: DataCache, dag: DAG, completed_layer_nodes: Set[str]
    ):
        """Clean up cache for nodes no longer needed"""
        cache_stats = cache.get_stats()

        # Cleanup strategy: if utilization > 75%, clear old nodes
        if cache_stats["utilization_pct"] > 75:
            logger.warning(
                f"High cache utilization: {cache_stats['utilization_pct']:.1f}% "
                f"({cache_stats['memory_mb']:.2f}MB / {cache_stats['memory_limit_mb']}MB)"
            )

            # Clear nodes that have no downstream dependencies waiting
            # This is a simple strategy - can be enhanced
            for node_id in list(cache._cache.keys()):
                downstream = dag.get_downstream_nodes(node_id)
                if all(dn in completed_layer_nodes for dn in downstream):
                    cache.clear_node(node_id)
                    logger.debug(f"Cleared cache for completed node: '{node_id}'")

    def run(self, pipeline_version: PipelineVersion, db: Session, job_id: int) -> None:
        """Execute pipeline with layer-based parallel processing"""

        # Initialize metrics and state
        self.metrics = ExecutionMetrics(total_nodes=len(pipeline_version.nodes))
        self.metrics.execution_start = datetime.now(timezone.utc)

        state_manager = StateManager(db, job_id)
        data_cache = DataCache(max_memory_mb=self.max_cache_memory_mb)

        # Initialize pipeline run
        pipeline_run = state_manager.initialize_run(
            pipeline_version.pipeline_id,
            pipeline_version.id,
            total_nodes=len(pipeline_version.nodes),
        )

        logger.info("=" * 80)
        logger.info("PIPELINE EXECUTION STARTED")
        logger.info(
            f"Pipeline: {pipeline_version.pipeline_id}, Version: {pipeline_version.id}"
        )
        logger.info(f"Job ID: {job_id}, Run ID: {pipeline_run.id}")
        logger.info(
            f"Nodes: {len(pipeline_version.nodes)}, Max Parallel: {self.max_parallel_nodes}"
        )
        logger.info("=" * 80)

        DBLogger.log_job(
            db,
            job_id,
            "INFO",
            f"Execution lifecycle initiated. Orchestrating {len(pipeline_version.nodes)} logical processing nodes. "
            f"Engine concurrency level optimized to {self.max_parallel_nodes} threads.",
        )

        try:
            # Build and validate DAG
            DBLogger.log_job(db, job_id, "DEBUG", "Analyzing pipeline topology and constructing Directed Acyclic Graph (DAG)...")
            dag = self._build_dag(pipeline_version)
            
            # PERFORMANCE: Apply Static Optimizations (ELT Pushdown)
            DBLogger.log_job(db, job_id, "INFO", "Performing static analysis and ELT pushdown optimization...")
            StaticOptimizer.optimize(pipeline_version, db)
            # Re-build DAG as edges might have changed
            dag = self._build_dag(pipeline_version)
            
            node_map = {n.node_id: n for n in pipeline_version.nodes}

            # Compute execution layers
            DBLogger.log_job(db, job_id, "DEBUG", "Resolving stream dependencies and calculating optimal execution stages...")
            layers = self._compute_execution_layers(dag, node_map)

            DBLogger.log_job(
                db, job_id, "INFO", 
                f"Static analysis finalized. Orchestration plan contains {len(layers)} sequential stages. "
                f"Beginning automated execution sequence."
            )

            # Execute layers sequentially, nodes within layer in parallel
            parallel_executor = ParallelExecutionLayer(
                max_workers=self.max_parallel_nodes
            )

            for layer_idx, layer_nodes in enumerate(layers, 1):
                layer_start = time.time()

                # Check for overall pipeline timeout
                if pipeline_version.pipeline and pipeline_version.pipeline.execution_timeout_seconds:
                    elapsed = (datetime.now(timezone.utc) - self.metrics.execution_start).total_seconds()
                    if elapsed > pipeline_version.pipeline.execution_timeout_seconds:
                        timeout_msg = f"Orchestration aborted: Pipeline execution exceeded global timeout limit of {pipeline_version.pipeline.execution_timeout_seconds}s."
                        logger.error(timeout_msg)
                        raise PipelineExecutionError(timeout_msg)

                node_ids = [n.node_id for n in layer_nodes]
                DBLogger.log_job(
                    db,
                    job_id,
                    "INFO",
                    f"Stage {layer_idx}/{len(layers)}: Initiating synchronized processing for nodes: [{', '.join(node_ids)}].",
                )

                # Execute layer
                layer_results = parallel_executor.execute_layer(
                    layer_nodes, pipeline_run, data_cache, dag, state_manager, job_id
                )

                # Cache results and update metrics
                total_layer_records = 0
                for node_id, results in layer_results.items():
                    data_cache.store(node_id, results)
                    self.metrics.completed_nodes += 1

                    records = sum(len(df) for df in results)
                    total_layer_records += records
                    self.metrics.total_records_processed += records
                    
                    # Add meaningful per-node completion log
                    DBLogger.log_job(
                        db, job_id, "INFO",
                        f"Node '{node_id}' finalized. [Processed {records:,} records in {len(results)} chunks]",
                        source="engine"
                    )

                # Memory management
                completed_nodes = set(n.node_id for n in layer_nodes)
                self._cleanup_cache(data_cache, dag, completed_nodes)

                layer_duration = time.time() - layer_start
                cache_stats = data_cache.get_stats()

                DBLogger.log_job(
                    db,
                    job_id,
                    "INFO",
                    f"Stage {layer_idx} finalized successfully. Processed {total_layer_records:,} records in {layer_duration:.2f}s. "
                    f"Total records in-flight: {self.metrics.total_records_processed:,} | Memory footprint: {cache_stats['utilization_pct']:.1f}%.",
                )

            # Finalize execution
            self.metrics.execution_end = datetime.now(timezone.utc)
            state_manager.complete_run(pipeline_run)

            summary = (
                f"Pipeline orchestration finalized successfully. "
                f"Total Duration: {self.metrics.duration_seconds:.2f}s. "
                f"Processed {self.metrics.total_records_processed:,} records across {self.metrics.completed_nodes} nodes with an average throughput of {self.metrics.throughput_records_per_sec:.2f} rec/s."
            )
            DBLogger.log_job(db, job_id, "SUCCESS", summary, source="engine")

        except Exception as e:
            self.metrics.execution_end = datetime.now(timezone.utc)
            self.metrics.failed_nodes += 1

            error_msg = (
                f"Orchestration halted due to a terminal error after {self.metrics.duration_seconds:.2f}s "
                f"({self.metrics.completed_nodes}/{self.metrics.total_nodes} nodes finalized). "
                f"Terminal fault: {str(e)}"
            )

            DBLogger.log_job(db, job_id, "ERROR", error_msg)
            state_manager.fail_run(pipeline_run, e)

            raise PipelineExecutionError(error_msg) from e