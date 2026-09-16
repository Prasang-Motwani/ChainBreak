"""What-if compromise simulator: given a package, computes which parts of
the dependency graph could be reached if it were compromised, using real
graph reachability -- not a hardcoded scenario.

This is a hypothetical simulation, not a detection: it answers "if this
package were compromised, what could it reach", not "this package has
been compromised".
"""

import networkx as nx

from app.cache import AnalysisContext
from app.graph import analysis as graph_analysis
from app.graph.propagation import reverse_bfs_waves
from app.models.schemas import CompromiseResponse, CompromiseStats

CRITICAL_CVSS_THRESHOLD = 9.0


def simulate_compromise(context: AnalysisContext, package_id: str) -> CompromiseResponse:
    graph = context.graph
    waves = reverse_bfs_waves(graph, package_id)
    reachable = [node for wave in waves for node in wave]

    node_types = nx.get_node_attributes(graph, "node_type")
    applications_affected = [node for node in reachable if node_types.get(node) == "application"]

    critical_ids = {dep_id for dep_id, dep in context.dependencies.items() if dep.max_cvss >= CRITICAL_CVSS_THRESHOLD}
    critical_components = [node for node in reachable if node in critical_ids]

    direct_dependents = graph_analysis.direct_dependents(graph, package_id)
    paths = graph_analysis.propagation_paths(graph, package_id)
    max_depth = graph_analysis.propagation_depth(graph, package_id)

    return CompromiseResponse(
        compromised_id=package_id,
        waves=waves,
        reachable=reachable,
        critical_components=critical_components,
        applications_affected=applications_affected,
        stats=CompromiseStats(
            directly_affected=len(direct_dependents),
            reachable_downstream=len(reachable),
            applications_affected=len(applications_affected),
            critical_components=len(critical_components),
            max_propagation_depth=max_depth,
            propagation_paths=len(paths),
        ),
    )
