from collections import defaultdict, deque
from typing import Dict, List, Set, Tuple, Optional
from app.core.errors import AppError


class DagCycleError(AppError):
    pass


class DAG:
    def __init__(self):
        self._graph: Dict[str, Set[str]] = defaultdict(set)
        self._reverse_graph: Dict[str, Set[str]] = defaultdict(set)
        self._nodes: Set[str] = set()
        self._topological_order: Optional[List[str]] = None
        self._layers: Optional[List[Set[str]]] = None

    def add_node(self, node_id: str) -> None:
        """Add a node to the DAG."""
        if node_id not in self._nodes:
            self._nodes.add(node_id)
            self._graph.setdefault(node_id, set())
            self._reverse_graph.setdefault(node_id, set())
            self._invalidate_cache()

    def add_edge(self, from_node: str, to_node: str) -> None:
        """Add a directed edge from from_node to to_node."""
        if from_node == to_node:
            raise ValueError(f"Self-loops are not allowed: {from_node}")
        self.add_node(from_node)
        self.add_node(to_node)
        if to_node not in self._graph[from_node]:
            self._graph[from_node].add(to_node)
            self._reverse_graph[to_node].add(from_node)
            self._invalidate_cache()

    def remove_node(self, node_id: str) -> None:
        """Remove a node and all its edges from the DAG."""
        if node_id not in self._nodes:
            return

        # Remove all edges involving this node
        for neighbor in self._graph[node_id]:
            self._reverse_graph[neighbor].discard(node_id)
        for neighbor in self._reverse_graph[node_id]:
            self._graph[neighbor].discard(node_id)

        del self._graph[node_id]
        del self._reverse_graph[node_id]
        self._nodes.discard(node_id)
        self._invalidate_cache()

    def remove_edge(self, from_node: str, to_node: str) -> None:
        """Remove an edge from the DAG."""
        if from_node in self._graph:
            self._graph[from_node].discard(to_node)
        if to_node in self._reverse_graph:
            self._reverse_graph[to_node].discard(from_node)
        self._invalidate_cache()

    def get_nodes(self) -> Set[str]:
        """Return all nodes in the DAG."""
        return self._nodes.copy()

    def get_edges(self) -> List[Tuple[str, str]]:
        """Return all edges in the DAG."""
        return [(u, v) for u in self._graph for v in self._graph[u]]

    def get_downstream_nodes(self, node_id: str) -> Set[str]:
        """Return direct children of a node."""
        return self._graph.get(node_id, set()).copy()

    def get_upstream_nodes(self, node_id: str) -> Set[str]:
        """Return direct parents of a node."""
        return self._reverse_graph.get(node_id, set()).copy()

    def get_all_downstream_nodes(self, node_id: str) -> Set[str]:
        """Return all descendants of a node (transitive closure)."""
        visited = set()
        queue = deque([node_id])

        while queue:
            current = queue.popleft()
            for neighbor in self._graph.get(current, set()):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)

        return visited

    def get_all_upstream_nodes(self, node_id: str) -> Set[str]:
        """Return all ancestors of a node (transitive closure)."""
        visited = set()
        queue = deque([node_id])

        while queue:
            current = queue.popleft()
            for neighbor in self._reverse_graph.get(current, set()):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)

        return visited

    def get_root_nodes(self) -> Set[str]:
        """Return nodes with no incoming edges."""
        return {node for node in self._nodes if not self._reverse_graph[node]}

    def get_leaf_nodes(self) -> Set[str]:
        """Return nodes with no outgoing edges."""
        return {node for node in self._nodes if not self._graph[node]}

    def _in_degrees(self) -> Dict[str, int]:
        """Calculate in-degree for each node."""
        return {node: len(self._reverse_graph[node]) for node in self._nodes}

    def _invalidate_cache(self) -> None:
        """Invalidate cached computations."""
        self._topological_order = None
        self._layers = None

    def topological_sort(self) -> List[str]:
        """
        Return nodes in topological order using Kahn's algorithm.
        Raises DagCycleError if a cycle is detected.
        """
        if self._topological_order is not None:
            return self._topological_order.copy()

        in_deg = self._in_degrees()
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
            # Find the cycle for better error message
            cycle = self._find_cycle()
            raise DagCycleError(f"Cycle detected in DAG: {' -> '.join(cycle)}")

        self._topological_order = result
        return result.copy()

    def _find_cycle(self) -> List[str]:
        """Find and return a cycle in the graph (for debugging)."""
        visited = set()
        rec_stack = set()
        parent = {}

        def dfs(node: str, path: List[str]) -> Optional[List[str]]:
            visited.add(node)
            rec_stack.add(node)
            path.append(node)

            for neighbor in self._graph[node]:
                if neighbor not in visited:
                    parent[neighbor] = node
                    cycle = dfs(neighbor, path.copy())
                    if cycle:
                        return cycle
                elif neighbor in rec_stack:
                    # Found a cycle
                    cycle_start = path.index(neighbor)
                    return path[cycle_start:] + [neighbor]

            rec_stack.remove(node)
            return None

        for node in self._nodes:
            if node not in visited:
                cycle = dfs(node, [])
                if cycle:
                    return cycle

        return []

    def check_for_cycles(self) -> bool:
        """Check if the DAG contains any cycles."""
        try:
            self.topological_sort()
            return False
        except DagCycleError:
            return True

    def get_execution_layers(self) -> List[Set[str]]:
        """
        Return nodes grouped by execution layers.
        Nodes in the same layer can be executed in parallel.
        """
        if self._layers is not None:
            return [layer.copy() for layer in self._layers]

        in_deg = self._in_degrees()
        layers = []
        remaining = self._nodes.copy()

        while remaining:
            # Find all nodes with no remaining dependencies
            current_layer = {node for node in remaining if in_deg[node] == 0}

            if not current_layer:
                # Should not happen if topological_sort passes
                raise DagCycleError("Cycle detected while computing layers")

            layers.append(current_layer)

            # Update in-degrees for next iteration
            for node in current_layer:
                remaining.remove(node)
                for neighbor in self._graph[node]:
                    in_deg[neighbor] -= 1

        self._layers = layers
        return [layer.copy() for layer in layers]

    def get_node_depth(self, node_id: str) -> int:
        """
        Return the depth of a node (longest path from any root to this node).
        """
        if node_id not in self._nodes:
            raise ValueError(f"Node {node_id} not in DAG")

        # Use dynamic programming with topological sort
        order = self.topological_sort()
        depths = {n: 0 for n in self._nodes}

        for node in order:
            for neighbor in self._graph[node]:
                depths[neighbor] = max(depths[neighbor], depths[node] + 1)

        return depths[node_id]

    def subgraph(self, nodes: Set[str]) -> "DAG":
        """Create a subgraph containing only the specified nodes."""
        subdag = DAG()
        for node in nodes:
            if node in self._nodes:
                subdag.add_node(node)

        for node in nodes:
            if node in self._graph:
                for neighbor in self._graph[node]:
                    if neighbor in nodes:
                        subdag.add_edge(node, neighbor)

        return subdag

    def is_reachable(self, from_node: str, to_node: str) -> bool:
        """Check if to_node is reachable from from_node."""
        return to_node in self.get_all_downstream_nodes(from_node)

    def longest_path_length(self) -> int:
        """Return the length of the longest path in the DAG."""
        if not self._nodes:
            return 0

        order = self.topological_sort()
        depths = {n: 0 for n in self._nodes}

        for node in order:
            for neighbor in self._graph[node]:
                depths[neighbor] = max(depths[neighbor], depths[node] + 1)

        return max(depths.values())

    def __str__(self):
        nodes_str = ", ".join(sorted(self._nodes))
        edges_str = ", ".join(f"{u}->{v}" for u, v in self.get_edges())
        return f"DAG(Nodes: {{{nodes_str}}}, Edges: {{{edges_str}}})"

    def __repr__(self):
        return self.__str__()

    def __len__(self):
        return len(self._nodes)

    def __iter__(self):
        return iter(self._nodes)

    def __contains__(self, item):
        return item in self._nodes

    def __eq__(self, other):
        if not isinstance(other, DAG):
            return False
        return self._nodes == other._nodes and self._graph == other._graph
