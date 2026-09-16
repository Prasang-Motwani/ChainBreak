"""Compromise propagation: walks the dependency graph in reverse from a
compromised node, layer by layer, to find every dependent (direct and
transitive) that could be affected -- and the order the ripple would reach
them in, for animated frontend rendering.
"""

import networkx as nx


def reverse_bfs_waves(graph: nx.DiGraph, node_id: str) -> list[list[str]]:
    """BFS layers of ancestors (dependents) of `node_id`, closest first.
    Layer 0 is its direct dependents, layer 1 is their dependents, and so
    on. Does not include `node_id` itself. Empty if the node has no
    dependents or doesn't exist in the graph.
    """
    if node_id not in graph:
        return []

    reversed_graph = graph.reverse(copy=False)
    waves: list[list[str]] = []
    visited = {node_id}
    frontier = [node_id]

    while frontier:
        next_frontier = [
            neighbor
            for current in frontier
            for neighbor in reversed_graph.successors(current)
            if neighbor not in visited
        ]
        next_frontier = list(dict.fromkeys(next_frontier))  # de-dupe, preserve order
        for node in next_frontier:
            visited.add(node)
        if not next_frontier:
            break
        waves.append(next_frontier)
        frontier = next_frontier

    return waves
