from typing import Any

from synqx_core.models.enums import OperatorType


class SQLPushdownGenerator:
    """
    Translates SynqX pipeline nodes into optimized SQL subqueries.
    Supports dialect-specific overrides if needed.
    """

    @staticmethod
    def generate_sql(base_query: str, operators: list[dict[str, Any]]) -> str:
        """
        Takes a base SQL query (or table name) and applies a sequence
        of operators as wrapped subqueries.
        """
        current_sql = base_query.strip().rstrip(";")

        # If it's a raw table name, wrap it first
        if " " not in current_sql and "SELECT" not in current_sql.upper():
            current_sql = f"SELECT * FROM {current_sql}"

        for op in operators:
            op_class = op.get("operator_class")
            config = op.get("config", {})

            if op_class == "filter":
                condition = config.get("condition")
                if condition:
                    # Replace Pandas-style '==' with SQL '='
                    sql_condition = condition.replace("==", "=")
                    current_sql = f"SELECT * FROM ({current_sql}) AS filter_subq WHERE {sql_condition}"  # noqa: E501

            elif op_class == "rename_columns":
                mapping = config.get("columns", {})
                if mapping:
                    # In a full ELT implementation, we would need the upstream columns
                    # to generate a complete SELECT clause.
                    # For this V1, we only push down filters which are the biggest win.
                    pass

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
                    # Basic join implementation.
                    # Production level should handle column aliasing to avoid collisions.  # noqa: E501
                    current_sql = f"SELECT * FROM ({current_sql}) AS left_subq {how} JOIN ({right_sql}) AS right_subq ON left_subq.{join_on} = right_subq.{join_on}"  # noqa: E501

        return current_sql


class StaticOptimizer:
    """
    Analyzes and optimizes DAGs before execution.
    Features:
    - ELT Pushdown: Collapses SQL Extract + Transforms into optimized subqueries.
    """

    PUSHDOWN_COMPATIBLE_TRANSFORMS = {"filter", "limit_offset"}  # noqa: RUF012

    @classmethod
    def optimize(cls, pipeline_version: Any, db: Any) -> Any:
        """
        Main optimization entry point. Returns a modified pipeline_version (cloned)
        with collapsed nodes.
        """
        from synqx_core.models.connections import Asset, Connection  # noqa: PLC0415

        # 1. Map node_id to node object
        node_map = {n.node_id: n for n in pipeline_version.nodes}

        # 2. Linear Pushdown (Filter, Limit)
        for node_id, node in node_map.items():  # noqa: B007
            if node.operator_type == OperatorType.EXTRACT:
                asset = db.query(Asset).filter(Asset.id == node.source_asset_id).first()
                if not asset:
                    continue
                conn = (
                    db.query(Connection)
                    .filter(Connection.id == asset.connection_id)
                    .first()
                )

                if conn.connector_type.value in [
                    "postgresql",
                    "mysql",
                    "mariadb",
                    "mssql",
                    "snowflake",
                    "bigquery",
                ]:
                    cls._attempt_linear_pushdown(node, node_map, pipeline_version.edges)

        # 3. Set Operation Pushdown (Joins)
        cls._optimize_joins(pipeline_version, db)

        # 4. PERFORMANCE: Zero-Movement ELT (Source -> Target on same Connection)
        cls._optimize_zero_movement(pipeline_version, db)

        return pipeline_version

    @classmethod
    def _optimize_zero_movement(cls, pipeline_version: Any, db: Any):  # noqa: PLR0912
        """
        Detects chains that start and end on the same connection.
        Collapses them into a single INSERT INTO ... SELECT or CREATE TABLE AS.
        """
        from synqx_core.models.connections import Asset, Connection  # noqa: PLC0415

        node_map = {n.node_id: n for n in pipeline_version.nodes}
        edges = pipeline_version.edges

        for node in list(pipeline_version.nodes):
            if node.operator_type == OperatorType.LOAD:
                # Find parent (only support single-parent load for now)
                parent_edges = [e for e in edges if e.to_node_id == node.node_id]
                if len(parent_edges) != 1:
                    continue

                source_node = node_map.get(parent_edges[0].from_node_id)
                if not source_node:
                    continue

                # Both must share the same connection
                target_asset = (
                    db.query(Asset)
                    .filter(Asset.id == node.destination_asset_id)
                    .first()
                )
                if not target_asset:
                    continue

                source_conn_id = cls._get_node_connection_id(source_node, db)
                if not source_conn_id or source_conn_id != target_asset.connection_id:
                    continue

                # Check if the connector supports native ELT commands
                conn = (
                    db.query(Connection).filter(Connection.id == source_conn_id).first()
                )
                if conn.connector_type.value not in [
                    "postgresql",
                    "mysql",
                    "mariadb",
                    "mssql",
                    "snowflake",
                    "bigquery",
                ]:
                    continue

                # SUCCESS: We can do a Zero-Movement pushdown
                source_sql = cls._get_node_sql(source_node, db)
                if not source_sql:
                    continue

                target_table = target_asset.fully_qualified_name or target_asset.name
                write_mode = node.config.get("write_strategy", "append").lower()

                # Generate the native command
                native_query = ""
                if write_mode == "replace":
                    # Some dialects support 'CREATE OR REPLACE', but standard is TRUNCATE then INSERT  # noqa: E501
                    # For safety across dialects, we use a multi-statement approach if supported,  # noqa: E501
                    # but here we generate the main statement.
                    native_query = f"TRUNCATE TABLE {target_table}; INSERT INTO {target_table} {source_sql}"  # noqa: E501
                elif write_mode == "overwrite":
                    native_query = f"DELETE FROM {target_table}; INSERT INTO {target_table} {source_sql}"  # noqa: E501
                else:
                    native_query = f"INSERT INTO {target_table} {source_sql}"

                # Collapse logic
                if not node.config:
                    node.config = {}
                node.config["_native_elt_query"] = native_query
                node.config["_collapsed_source_node"] = source_node.node_id

                # Mark source node as collapsed so it doesn't extract data
                if not source_node.config:
                    source_node.config = {}
                source_node.config["_collapsed_into"] = node.node_id

    @classmethod
    def _get_node_connection_id(cls, node: Any, db: Any) -> int | None:
        from synqx_core.models.connections import Asset  # noqa: PLC0415

        if node.operator_type == OperatorType.EXTRACT:
            asset = db.query(Asset).filter(Asset.id == node.source_asset_id).first()
            return asset.connection_id if asset else None

        # If it was collapsed, it carries its source connection
        return node.config.get("_source_connection_id")

    @classmethod
    def _get_node_sql(cls, node: Any, db: Any) -> str | None:
        from synqx_core.models.connections import Asset  # noqa: PLC0415

        if node.operator_type == OperatorType.EXTRACT:
            asset = db.query(Asset).filter(Asset.id == node.source_asset_id).first()
            if not asset:
                return None
            base = asset.fully_qualified_name or asset.name
            if node.config and node.config.get("_pushdown_operators"):
                return SQLPushdownGenerator.generate_sql(
                    base, node.config["_pushdown_operators"]
                )
            return f"SELECT * FROM {base}"
        return None

    @classmethod
    def _optimize_joins(cls, pipeline_version: Any, db: Any):
        node_map = {n.node_id: n for n in pipeline_version.nodes}
        edges = pipeline_version.edges

        for node in list(pipeline_version.nodes):
            if node.operator_class == "join":
                # Find parents
                parent_edges = [e for e in edges if e.to_node_id == node.node_id]
                if len(parent_edges) != 2:  # noqa: PLR2004
                    continue

                left = node_map.get(parent_edges[0].from_node_id)
                right = node_map.get(parent_edges[1].from_node_id)

                if not left or not right:
                    continue

                left_conn_id = cls._get_node_connection_id(left, db)
                right_conn_id = cls._get_node_connection_id(right, db)

                if left_conn_id and left_conn_id == right_conn_id:
                    # SUCCESS: Join between same connection
                    cls._collapse_join(node, left, right, pipeline_version, db)

    @classmethod
    def _collapse_join(
        cls, join_node: Any, left: Any, right: Any, pipeline_version: Any, db: Any
    ):
        # 1. Get SQL for Right side
        right_sql = cls._get_node_sql(right, db)
        if not right_sql:
            return

        # 2. Inject Join into Left side's pushdown stack
        if not left.config:
            left.config = {}
        if "_pushdown_operators" not in left.config:
            left.config["_pushdown_operators"] = []

        join_meta = {
            "operator_class": "join",
            "config": {**join_node.config, "_right_sql": right_sql},
        }
        left.config["_pushdown_operators"].append(join_meta)
        left.config["_source_connection_id"] = cls._get_node_connection_id(left, db)

        # 3. Mark Join and Right side as collapsed
        if not join_node.config:
            join_node.config = {}
        join_node.config["_collapsed_into"] = left.node_id

        if not right.config:
            right.config = {}
        right.config["_collapsed_into"] = left.node_id

        # 4. Redirect Join's output to Left
        out_edges = [
            e for e in pipeline_version.edges if e.from_node_id == join_node.node_id
        ]
        for edge in out_edges:
            edge.from_node_id = left.node_id

    @classmethod
    def _attempt_linear_pushdown(
        cls, start_node: Any, node_map: dict[str, Any], edges: list[Any]
    ):
        """
        Greedily find downstream transform nodes that can be pushed into the SQL.
        """
        current_node = start_node
        pushed_nodes = []

        while True:
            # Find downstream edge
            out_edges = [e for e in edges if e.from_node_id == current_node.node_id]

            # Can only push down if single consumer (no branching)
            if len(out_edges) != 1:
                break

            downstream_node = node_map.get(out_edges[0].to_node_id)
            if not downstream_node:
                break

            # Check if compatible
            if downstream_node.operator_class in cls.PUSHDOWN_COMPATIBLE_TRANSFORMS:
                pushed_nodes.append(downstream_node)
                current_node = downstream_node
            else:
                break

        if pushed_nodes:
            # COLLAPSE:
            # 1. Update start_node config with combined SQL logic
            # 2. Mark pushed_nodes as 'no-op' or 'collapsed'

            pushed_meta = []
            for pn in pushed_nodes:
                pushed_meta.append(
                    {"operator_class": pn.operator_class, "config": pn.config}
                )
                # Mark node as collapsed so executor skips it
                if not pn.config:
                    pn.config = {}
                pn.config["_collapsed_into"] = start_node.node_id

            if not start_node.config:
                start_node.config = {}
            start_node.config["_pushdown_operators"] = pushed_meta

            # Redirect edges: Connect start_node directly to whatever was after the last pushed node  # noqa: E501
            last_pushed = pushed_nodes[-1]
            final_out_edges = [
                e for e in edges if e.from_node_id == last_pushed.node_id
            ]
            for edge in final_out_edges:
                edge.from_node_id = start_node.node_id

            # Remove original intermediate edges
            # (Note: In this simple implementation, we just let them stay but they'll be orphaned)  # noqa: E501
            pass
