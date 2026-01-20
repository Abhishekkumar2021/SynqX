from typing import Any


class SQLPushdownGenerator:
    """
    Translates SynqX pipeline nodes into optimized SQL subqueries on the Agent.
    """

    @staticmethod
    def generate_sql(base_query: str, operators: list[dict[str, Any]]) -> str:
        current_sql = base_query.strip().rstrip(";")

        if " " not in current_sql and "SELECT" not in current_sql.upper():
            current_sql = f"SELECT * FROM {current_sql}"

        for op in operators:
            op_class = op.get("operator_class")
            config = op.get("config", {})

            if op_class == "filter":
                condition = config.get("condition")
                if condition:
                    sql_condition = condition.replace("==", "=")
                    current_sql = f"SELECT * FROM ({current_sql}) AS filter_subq WHERE {sql_condition}"  # noqa: E501

            elif op_class == "limit_offset":
                limit = config.get("limit")
                offset = config.get("offset")
                if limit or offset:
                    current_sql = f"SELECT * FROM ({current_sql}) AS limit_subq"
                    if limit:
                        current_sql += f" LIMIT {limit}"
                    if offset:
                        current_sql += f" OFFSET {offset}"

            elif op_class == "join":
                right_sql = config.get("_right_sql")
                join_on = config.get("on")
                how = config.get("how", "inner").upper()
                if right_sql and join_on:
                    current_sql = f"SELECT * FROM ({current_sql}) AS left_subq {how} JOIN ({right_sql}) AS right_subq ON left_subq.{join_on} = right_subq.{join_on}"  # noqa: E501

        return current_sql


class StaticOptimizer:
    """
    Agent-side DAG Optimizer.
    """

    PUSHDOWN_COMPATIBLE_TRANSFORMS = {"filter", "limit_offset"}  # noqa: RUF012

    @classmethod
    def optimize(
        cls, nodes: list[dict], edges: list[dict], connections: dict
    ) -> list[dict]:
        """
        Collapses agent nodes before execution.
        """
        node_map = {n["node_id"]: n for n in nodes}

        # 1. Linear Pushdown
        for node in nodes:
            if node.get("operator_type") == "extract":
                # Resolve connection ID from node or source_asset
                conn_id = str(
                    node.get("connection_id")
                    or (node.get("source_asset") or {}).get("connection_id")
                )
                conn_data = connections.get(conn_id)

                if conn_data and conn_data.get("type") in [
                    "postgresql",
                    "mysql",
                    "mariadb",
                    "mssql",
                    "snowflake",
                    "bigquery",
                ]:
                    cls._attempt_linear_pushdown(node, node_map, edges)

        # 2. Join Pushdown
        cls._optimize_joins(nodes, edges, connections)

        # 3. PERFORMANCE: Zero-Movement ELT
        cls._optimize_zero_movement(nodes, edges, connections)

        return nodes

    @classmethod
    def _optimize_zero_movement(  # noqa: PLR0912
        cls, nodes: list[dict], edges: list[dict], connections: dict
    ):
        node_map = {n["node_id"]: n for n in nodes}

        for node in list(nodes):
            if node.get("operator_type") == "load":
                parent_edges = [e for e in edges if e["to_node_id"] == node["node_id"]]
                if len(parent_edges) != 1:
                    continue

                source_node = node_map.get(parent_edges[0]["from_node_id"])
                if not source_node:
                    continue

                # Get connection IDs
                sink_conn_id = str(
                    node.get("connection_id")
                    or (node.get("destination_asset") or {}).get("connection_id")
                )
                source_conn_id = cls._get_node_connection_id(source_node)

                if source_conn_id and source_conn_id == sink_conn_id:
                    conn_data = connections.get(source_conn_id)
                    if not conn_data or conn_data.get("type") not in [
                        "postgresql",
                        "mysql",
                        "mariadb",
                        "mssql",
                        "snowflake",
                        "bigquery",
                    ]:
                        continue

                    source_sql = cls._get_node_sql(source_node)
                    if not source_sql:
                        continue

                    # Determine target table
                    config = node.get("config", {})
                    target_table = (
                        config.get("asset")
                        or config.get("table")
                        or config.get("target_table")
                    )
                    if not target_table:
                        continue

                    write_mode = config.get("write_strategy", "append").lower()

                    native_query = ""
                    if write_mode == "replace":
                        native_query = f"TRUNCATE TABLE {target_table}; INSERT INTO {target_table} {source_sql}"  # noqa: E501
                    elif write_mode == "overwrite":
                        native_query = f"DELETE FROM {target_table}; INSERT INTO {target_table} {source_sql}"  # noqa: E501
                    else:
                        native_query = f"INSERT INTO {target_table} {source_sql}"

                    if "config" not in node:
                        node["config"] = {}
                    node["config"]["_native_elt_query"] = native_query

                    if "config" not in source_node:
                        source_node["config"] = {}
                    source_node["config"]["_collapsed_into"] = node["node_id"]

    @classmethod
    def _get_node_connection_id(cls, node: dict) -> str | None:
        if node.get("operator_type") == "extract":
            return str(
                node.get("connection_id")
                or (node.get("source_asset") or {}).get("connection_id")
            )
        return node.get("config", {}).get("_source_connection_id")

    @classmethod
    def _get_node_sql(cls, node: dict) -> str | None:
        if node.get("operator_type") == "extract":
            config = node.get("config", {})
            base = config.get("asset") or config.get("table") or config.get("query")
            if not base:
                return None
            if config.get("_pushdown_operators"):
                return SQLPushdownGenerator.generate_sql(
                    base, config["_pushdown_operators"]
                )
            return f"SELECT * FROM {base}"
        return None

    @classmethod
    def _optimize_joins(cls, nodes: list[dict], edges: list[dict], connections: dict):
        node_map = {n["node_id"]: n for n in nodes}

        for node in list(nodes):
            if node.get("operator_class") == "join":
                parent_edges = [e for e in edges if e["to_node_id"] == node["node_id"]]
                if len(parent_edges) != 2:  # noqa: PLR2004
                    continue

                left = node_map.get(parent_edges[0]["from_node_id"])
                right = node_map.get(parent_edges[1]["from_node_id"])

                if not left or not right:
                    continue

                left_conn_id = cls._get_node_connection_id(left)
                right_conn_id = cls._get_node_connection_id(right)

                if left_conn_id and left_conn_id == right_conn_id:
                    cls._collapse_join(node, left, right, edges)

    @classmethod
    def _collapse_join(
        cls, join_node: dict, left: dict, right: dict, edges: list[dict]
    ):
        right_sql = cls._get_node_sql(right)
        if not right_sql:
            return

        if "config" not in left:
            left["config"] = {}
        if "_pushdown_operators" not in left["config"]:
            left["config"]["_pushdown_operators"] = []

        join_meta = {
            "operator_class": "join",
            "config": {**join_node.get("config", {}), "_right_sql": right_sql},
        }
        left["config"]["_pushdown_operators"].append(join_meta)
        left["config"]["_source_connection_id"] = cls._get_node_connection_id(left)

        if "config" not in join_node:
            join_node["config"] = {}
        join_node["config"]["_collapsed_into"] = left["node_id"]

        if "config" not in right:
            right["config"] = {}
        right["config"]["_collapsed_into"] = left["node_id"]

        # Redirect Join's output to Left
        out_edges = [e for e in edges if e["from_node_id"] == join_node["node_id"]]
        for edge in out_edges:
            edge["from_node_id"] = left["node_id"]

    @classmethod
    def _attempt_linear_pushdown(
        cls, start_node: dict, node_map: dict[str, dict], edges: list[dict]
    ):
        current_node = start_node
        pushed_nodes = []

        while True:
            out_edges = [
                e for e in edges if e["from_node_id"] == current_node["node_id"]
            ]
            if len(out_edges) != 1:
                break

            downstream_node = node_map.get(out_edges[0]["to_node_id"])
            if not downstream_node:
                break

            if (
                downstream_node.get("operator_class")
                in cls.PUSHDOWN_COMPATIBLE_TRANSFORMS
            ):
                pushed_nodes.append(downstream_node)
                current_node = downstream_node
            else:
                break

        if pushed_nodes:
            pushed_meta = []
            for pn in pushed_nodes:
                pushed_meta.append(
                    {
                        "operator_class": pn.get("operator_class"),
                        "config": pn.get("config", {}),
                    }
                )
                if "config" not in pn:
                    pn["config"] = {}
                pn["config"]["_collapsed_into"] = start_node["node_id"]

            if "config" not in start_node:
                start_node["config"] = {}
            start_node["config"]["_pushdown_operators"] = pushed_meta

            # Edge redirection
            last_pushed = pushed_nodes[-1]
            final_out_edges = [
                e for e in edges if e["from_node_id"] == last_pushed["node_id"]
            ]
            for edge in final_out_edges:
                edge["from_node_id"] = start_node["node_id"]
