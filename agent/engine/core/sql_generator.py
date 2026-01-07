from typing import List, Dict, Any, Optional

class SQLPushdownGenerator:
    """
    Translates SynqX pipeline nodes into optimized SQL subqueries on the Agent.
    """

    @staticmethod
    def generate_sql(base_query: str, operators: List[Dict[str, Any]]) -> str:
        current_sql = base_query.strip().rstrip(';')
        
        if " " not in current_sql and "SELECT" not in current_sql.upper():
            current_sql = f"SELECT * FROM {current_sql}"

        for op in operators:
            op_class = op.get("operator_class")
            config = op.get("config", {})
            
            if op_class == "filter":
                condition = config.get("condition")
                if condition:
                    sql_condition = condition.replace("==", "=")
                    current_sql = f"SELECT * FROM ({current_sql}) AS filter_subq WHERE {sql_condition}"
            
            elif op_class == "limit_offset":
                limit = config.get("limit")
                offset = config.get("offset")
                if limit or offset:
                    current_sql = f"SELECT * FROM ({current_sql}) AS limit_subq"
                    if limit: current_sql += f" LIMIT {limit}"
                    if offset: current_sql += f" OFFSET {offset}"

        return current_sql

class StaticOptimizer:
    """
    Agent-side DAG Optimizer.
    """

    PUSHDOWN_COMPATIBLE_TRANSFORMS = {"filter", "limit_offset"}

    @classmethod
    def optimize(cls, nodes: List[Dict], edges: List[Dict], connections: Dict) -> List[Dict]:
        """
        Collapses agent nodes before execution.
        """
        node_map = {n['node_id']: n for n in nodes}
        
        for node in nodes:
            if node.get('operator_type') == "extract":
                # Resolve connection ID from node or source_asset
                conn_id = str(node.get("connection_id") or (node.get("source_asset") or {}).get("connection_id"))
                conn_data = connections.get(conn_id)
                
                if conn_data and conn_data.get('type') in ["postgresql", "mysql", "mariadb", "mssql", "snowflake", "bigquery"]:
                    cls._attempt_pushdown(node, node_map, edges)
        
        return nodes

    @classmethod
    def _attempt_pushdown(cls, start_node: Dict, node_map: Dict[str, Dict], edges: List[Dict]):
        current_node = start_node
        pushed_nodes = []
        
        while True:
            out_edges = [e for e in edges if e['from_node_id'] == current_node['node_id']]
            if len(out_edges) != 1:
                break
                
            downstream_node = node_map.get(out_edges[0]['to_node_id'])
            if not downstream_node:
                break
                
            if downstream_node.get('operator_class') in cls.PUSHDOWN_COMPATIBLE_TRANSFORMS:
                pushed_nodes.append(downstream_node)
                current_node = downstream_node
            else:
                break
        
        if pushed_nodes:
            pushed_meta = []
            for pn in pushed_nodes:
                pushed_meta.append({
                    "operator_class": pn.get('operator_class'),
                    "config": pn.get('config', {})
                })
                if 'config' not in pn: pn['config'] = {}
                pn['config']["_collapsed_into"] = start_node['node_id']
            
            if 'config' not in start_node: start_node['config'] = {}
            start_node['config']["_pushdown_operators"] = pushed_meta
            
            # Edge redirection
            last_pushed = pushed_nodes[-1]
            final_out_edges = [e for e in edges if e['from_node_id'] == last_pushed['node_id']]
            for edge in final_out_edges:
                edge['from_node_id'] = start_node['node_id']
