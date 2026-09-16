"""Feature engineering: turns a package's vulnerability, graph-structural,
and project signals into the fixed-order numeric vector the XGBoost risk
engine consumes.

Every value is computed from real data (OSV, NetworkX, npm registry,
OpenSSF Scorecard) except `scorecard_score`, which falls back to a neutral
midpoint only when Scorecard has no data for that package at all -- that
fallback is documented here, not silently presented as a real score.
"""

import networkx as nx

from app.graph import analysis as graph_analysis

FEATURE_ORDER = [
    # Vulnerability features
    "vuln_count",
    "max_cvss",
    "mean_cvss",
    "high_vuln_count",
    "critical_vuln_count",
    # Dependency structure
    "direct_dependencies",
    "transitive_dependencies",
    "direct_dependents",
    "transitive_dependents",
    "dependency_depth",
    "betweenness_centrality",
    "pagerank",
    "is_direct",
    # Downstream exposure
    "downstream_package_count",
    "downstream_application_count",
    "critical_downstream_count",
    "propagation_path_count",
    "max_propagation_depth",
    # Project / security signals
    "scorecard_score",
    "project_age_years",
    "releases_per_year",
    "maintainer_count",
]

NEUTRAL_SCORECARD = 5.0
HIGH_CVSS_MIN = 7.0
CRITICAL_CVSS_MIN = 9.0


def build_feature_vector(
    *,
    node_id: str,
    graph: nx.DiGraph,
    root_id: str,
    is_direct: bool,
    vuln_scores: list[float],
    critical_node_ids: set[str],
    betweenness: dict[str, float],
    pagerank: dict[str, float],
    npm_meta: dict | None,
    scorecard: float | None,
) -> dict[str, float]:
    dependents = graph_analysis.transitive_dependents(graph, node_id)
    node_types = nx.get_node_attributes(graph, "node_type")

    high_vuln = sum(1 for s in vuln_scores if HIGH_CVSS_MIN <= s < CRITICAL_CVSS_MIN)
    critical_vuln = sum(1 for s in vuln_scores if s >= CRITICAL_CVSS_MIN)
    paths = graph_analysis.propagation_paths(graph, node_id)

    return {
        "vuln_count": float(len(vuln_scores)),
        "max_cvss": max(vuln_scores) if vuln_scores else 0.0,
        "mean_cvss": (sum(vuln_scores) / len(vuln_scores)) if vuln_scores else 0.0,
        "high_vuln_count": float(high_vuln),
        "critical_vuln_count": float(critical_vuln),
        "direct_dependencies": float(len(graph_analysis.direct_dependencies(graph, node_id))),
        "transitive_dependencies": float(len(graph_analysis.transitive_dependencies(graph, node_id))),
        "direct_dependents": float(len(graph_analysis.direct_dependents(graph, node_id))),
        "transitive_dependents": float(len(dependents)),
        "dependency_depth": float(graph_analysis.dependency_depth(graph, root_id, node_id) or 0),
        "betweenness_centrality": betweenness.get(node_id, 0.0),
        "pagerank": pagerank.get(node_id, 0.0),
        "is_direct": 1.0 if is_direct else 0.0,
        "downstream_package_count": float(sum(1 for d in dependents if node_types.get(d) == "package")),
        "downstream_application_count": float(sum(1 for d in dependents if node_types.get(d) == "application")),
        "critical_downstream_count": float(sum(1 for d in dependents if d in critical_node_ids)),
        "propagation_path_count": float(len(paths)),
        "max_propagation_depth": float(graph_analysis.propagation_depth(graph, node_id)),
        "scorecard_score": scorecard if scorecard is not None else NEUTRAL_SCORECARD,
        "project_age_years": float((npm_meta or {}).get("project_age_years", 0.0)),
        "releases_per_year": float((npm_meta or {}).get("releases_per_year", 0.0)),
        "maintainer_count": float((npm_meta or {}).get("maintainer_count", 0)),
    }


def feature_vector_to_list(vector: dict[str, float]) -> list[float]:
    return [vector[key] for key in FEATURE_ORDER]
