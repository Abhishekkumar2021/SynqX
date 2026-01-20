import logging
import time
from typing import Any

from agent.components.api_client import AgentAPIClient

# Import Engine Components safely
try:
    from synqx_engine.dag import DAG

    from engine.core.sql_generator import StaticOptimizer
    from engine.executor import NodeExecutor, ParallelAgent

    ENGINE_AVAILABLE = True
except ImportError:
    ENGINE_AVAILABLE = False

logger = logging.getLogger("SynqX-Handler-Pipeline")


class PipelineHandler:
    def __init__(self, client: AgentAPIClient, max_workers: int = 0):
        self.client = client
        self.max_workers = max_workers

    def process(self, payload: dict[str, Any]):
        if not ENGINE_AVAILABLE:
            logger.error("Cannot process pipeline: Engine components missing.")
            return

        job_info = payload["job"]
        job_id = job_info["id"]
        dag_data = payload["dag"]
        connections = payload.get("connections", {})

        logger.info(f"[START] Initializing Pipeline Job #{job_id}")
        self.client.report_job_status(
            job_id, "running", "Orchestrating parallel execution plan"
        )
        start_time = time.time()

        try:
            # 1. Optimize
            StaticOptimizer.optimize(dag_data["nodes"], dag_data["edges"], connections)

            # 2. Build DAG
            dag = DAG()
            node_map = {n["node_id"]: n for n in dag_data["nodes"]}
            for n in dag_data["nodes"]:
                dag.add_node(n["node_id"])
            for e in dag_data["edges"]:
                dag.add_edge(e["from_node_id"], e["to_node_id"])

            # 3. Setup Executors
            executor = NodeExecutor(connections=connections)
            runner = ParallelAgent(executor=executor, max_workers=self.max_workers)

            # 4. Define Callbacks
            def log_cb(msg, node_id=None):
                self.client.send_logs(job_id, "INFO", msg, node_id)

            def status_cb(node_id, status, data=None):
                self.client.report_step_status(job_id, node_id, status, data)

            # 5. Run
            run_stats = runner.run(dag, node_map, log_cb, status_cb)

            duration_ms = int((time.time() - start_time) * 1000)
            self.client.report_job_status(
                job_id,
                "success",
                f"Finalized in {duration_ms}ms",
                duration_ms,
                run_stats["total_records"],
            )
            logger.info(f"[SUCCESS] Pipeline Job #{job_id} complete.")

        except Exception as e:
            logger.exception(f"[FAILED] Pipeline Job #{job_id} ABORTED")
            duration_ms = int((time.time() - start_time) * 1000)
            self.client.report_job_status(job_id, "failed", str(e), duration_ms)
