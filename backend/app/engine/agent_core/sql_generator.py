from typing import List, Dict, Any
from app.models.enums import OperatorType

class SQLPushdownGenerator:
    """
    Translates SynqX pipeline nodes into optimized SQL subqueries.
    Supports dialect-specific overrides if needed.
    """

    @staticmethod
    def generate_sql(base_query: str, operators: List[Dict[str, Any]]) -> str:
        """
        Takes a base SQL query (or table name) and applies a sequence 
        of operators as wrapped subqueries.
        """
        current_sql = base_query.strip().rstrip(';')
        
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
                    current_sql = f"SELECT * FROM ({current_sql}) AS filter_subq WHERE {sql_condition}"
            
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

        return current_sql

class StaticOptimizer:
    """
    Analyzes and optimizes DAGs before execution.
    Features:
    - ELT Pushdown: Collapses SQL Extract + Transforms into optimized subqueries.
    """

    PUSHDOWN_COMPATIBLE_TRANSFORMS = {"filter", "limit_offset"}

    @classmethod
    def optimize(cls, pipeline_version: Any, db: Any) -> Any:
        """
        Main optimization entry point. Returns a modified pipeline_version (cloned)
        with collapsed nodes.
        """
        # Note: In a real system, we'd clone the objects. 
        # For this implementation, we'll mark nodes as 'collapsed'.
        
        from app.models.connections import Connection, Asset
        
        # 1. Map node_id to node object
        node_map = {n.node_id: n for n in pipeline_version.nodes}
        
        # 2. Find SQL Extract nodes
        for node_id, node in node_map.items():
            if node.operator_type == OperatorType.EXTRACT:
                asset = db.query(Asset).filter(Asset.id == node.source_asset_id).first()
                if not asset:
                    continue
                conn = db.query(Connection).filter(Connection.id == asset.connection_id).first()
                
                # Check if connector supports pushdown
                # (Simple check for now: relational types)
                if conn.connector_type.value in ["postgresql", "mysql", "mariadb", "mssql", "snowflake", "bigquery"]:
                    cls._attempt_pushdown(node, node_map, pipeline_version.edges)
        
        return pipeline_version

    @classmethod
    def _attempt_pushdown(cls, start_node: Any, node_map: Dict[str, Any], edges: List[Any]):
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
                pushed_meta.append({
                    "operator_class": pn.operator_class,
                    "config": pn.config
                })
                # Mark node as collapsed so executor skips it
                if not pn.config:
                    pn.config = {}
                pn.config["_collapsed_into"] = start_node.node_id
            
            if not start_node.config:
                start_node.config = {}
            start_node.config["_pushdown_operators"] = pushed_meta
            
            # Redirect edges: Connect start_node directly to whatever was after the last pushed node
            last_pushed = pushed_nodes[-1]
            final_out_edges = [e for e in edges if e.from_node_id == last_pushed.node_id]
            for edge in final_out_edges:
                edge.from_node_id = start_node.node_id
            
            # Remove original intermediate edges
            # (Note: In this simple implementation, we just let them stay but they'll be orphaned)
            pass
