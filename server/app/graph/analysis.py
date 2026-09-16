"""Reusable NetworkX graph-analysis functions.

Edge convention (see graph/builder.py): source depends on target. So a
node's "dependents" are its predecessors/ancestors (things that would break
if the node were compromised), and its "dependencies" are its
successors/descendants (things it relies on).

These are used both by /api/analyze's summary stats and, later, by the
compromise/mitigation simulators. They operate on real graph structure --
on a shallow (direct-dependencies-only) graph today, values like
"transitive dependents" will simply be small or empty until the graph grows
deeper in a later milestone; they are never hardcoded.
"""

import networkx as nx


def direct_dependencies(graph: nx.DiGraph, node_id: str) -> list[str]:
    return list(graph.successors(node_id))


def transitive_dependencies(graph: nx.DiGraph, node_id: str) -> list[str]:
    return list(nx.descendants(graph, node_id))


def direct_dependents(graph: nx.DiGraph, node_id: str) -> list[str]:
    return list(graph.predecessors(node_id))


def transitive_dependents(graph: nx.DiGraph, node_id: str) -> list[str]:
    return list(nx.ancestors(graph, node_id))


def dependency_depth(graph: nx.DiGraph, root_id: str, node_id: str) -> int | None:
    """Shortest path length from `root_id` down to `node_id`, or None if
    unreachable.
    """
    try:
        return nx.shortest_path_length(graph, root_id, node_id)
    except (nx.NodeNotFound, nx.NetworkXNoPath):
        return None


def downstream_reach(graph: nx.DiGraph, node_id: str) -> int:
    """How many nodes would be reachable in a compromise of `node_id` --
    i.e. how many things (transitively) depend on it.
    """
    return len(transitive_dependents(graph, node_id))


def propagation_depth(graph: nx.DiGraph, node_id: str) -> int:
    """Longest dependency chain that would carry a compromise of `node_id`
    up to one of its ancestors.
    """
    ancestors = transitive_dependents(graph, node_id)
    if not ancestors:
        return 0
    return max(nx.shortest_path_length(graph, ancestor, node_id) for ancestor in ancestors)


def propagation_paths(graph: nx.DiGraph, node_id: str) -> list[list[str]]:
    """All simple paths from any dependent (ancestor) down to `node_id` --
    the distinct routes a compromise could ripple outward through.
    """
    paths: list[list[str]] = []
    for ancestor in transitive_dependents(graph, node_id):
        paths.extend(nx.all_simple_paths(graph, ancestor, node_id))
    return paths


def betweenness_centrality(graph: nx.DiGraph) -> dict[str, float]:
    return nx.betweenness_centrality(graph)


def pagerank(graph: nx.DiGraph) -> dict[str, float]:
    if graph.number_of_edges() == 0:
        return dict.fromkeys(graph.nodes, 0.0)
    return nx.pagerank(graph)
