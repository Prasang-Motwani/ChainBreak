"""Builds the version-aware dependency graph.

Edge direction convention: source depends on target. For a direct
dependency this is (application -> package); later milestones adding
transitive resolution will add (package -> package) edges the same way.
"""

import networkx as nx

from app.models.schemas import Dependency, DependencyGraph, GraphEdge, GraphNode


def build_dependency_graph(app_id: str, app_name: str, dependencies: list[Dependency]) -> nx.DiGraph:
    graph = nx.DiGraph()
    graph.add_node(app_id, name=app_name, version=None, ecosystem=None, node_type="application")

    for dep in dependencies:
        graph.add_node(
            dep.id,
            name=dep.name,
            version=dep.version,
            ecosystem=dep.ecosystem,
            node_type="package",
        )
        graph.add_edge(app_id, dep.id, relationship="depends_on")

    return graph


def to_frontend_graph(graph: nx.DiGraph) -> DependencyGraph:
    nodes = [
        GraphNode(
            id=node_id,
            name=attrs.get("name", node_id),
            version=attrs.get("version"),
            ecosystem=attrs.get("ecosystem"),
            node_type=attrs.get("node_type", "package"),
        )
        for node_id, attrs in graph.nodes(data=True)
    ]
    edges = [
        GraphEdge(source=source, target=target, relationship=attrs.get("relationship", "depends_on"))
        for source, target, attrs in graph.edges(data=True)
    ]
    return DependencyGraph(nodes=nodes, edges=edges)
