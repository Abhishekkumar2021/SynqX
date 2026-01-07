from collections import defaultdict, deque
from typing import Dict, List, Set, Optional

class DagCycleError(Exception):
    pass

class DAG:
    """Production-grade DAG implementation ported from SynqX Backend."""
    def __init__(self):
        self._graph: Dict[str, Set[str]] = defaultdict(set)
        self._reverse_graph: Dict[str, Set[str]] = defaultdict(set)
        self._nodes: Set[str] = set()
        self._topological_order: Optional[List[str]] = None
        self._layers: Optional[List[Set[str]]] = None

    def add_node(self, node_id: str) -> None:
        if node_id not in self._nodes:
            self._nodes.add(node_id)
            self._graph.setdefault(node_id, set())
            self._reverse_graph.setdefault(node_id, set())
            self._invalidate_cache()

    def add_edge(self, from_node: str, to_node: str) -> None:
        if from_node == to_node:
            raise ValueError(f"Self-loops are not allowed: {from_node}")
        self.add_node(from_node)
        self.add_node(to_node)
        if to_node not in self._graph[from_node]:
            self._graph[from_node].add(to_node)
            self._reverse_graph[to_node].add(from_node)
            self._invalidate_cache()

    def get_upstream_nodes(self, node_id: str) -> Set[str]:
        return self._reverse_graph.get(node_id, set()).copy()

    def _invalidate_cache(self) -> None:
        self._topological_order = None
        self._layers = None

    def topological_sort(self) -> List[str]:
        if self._topological_order is not None:
            return self._topological_order.copy()

        in_deg = {node: len(self._reverse_graph[node]) for node in self._nodes}
        queue = deque([n for n, d in in_deg.items() if d == 0])
        result = []

        while queue:
            node = queue.popleft()
            result.append(node)
            for neighbor in self._graph[node]:
                in_deg[neighbor] -= 1
                if in_deg[neighbor] == 0:
                    queue.append(neighbor)

        if len(result) != len(self._nodes):
            raise DagCycleError("Cycle detected in DAG")

        self._topological_order = result
        return result.copy()

    def get_execution_layers(self) -> List[Set[str]]:
        """Used for parallel execution stages."""
        if self._layers is not None:
            return [layer.copy() for layer in self._layers]

        in_deg = {node: len(self._reverse_graph[node]) for node in self._nodes}
        layers = []
        remaining = self._nodes.copy()

        while remaining:
            current_layer = {node for node in remaining if in_deg[node] == 0}
            if not current_layer:
                raise DagCycleError("Cycle detected while computing layers")
            layers.append(current_layer)
            for node in current_layer:
                remaining.remove(node)
                for neighbor in self._graph[node]:
                    in_deg[neighbor] -= 1

        self._layers = layers
        return [layer.copy() for layer in layers]