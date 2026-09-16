"""In-memory cache of the last analysis per repository.

Lets GET /api/package/{id}, its /explanation, and the simulate endpoints
reuse the graph/features/risk profile computed by /api/analyze instead of
re-fetching GitHub/OSV/npm data on every call. A single dict is fine for a
single-process hackathon demo; swap for Redis/a DB before this needs to
survive a restart or run across multiple workers.
"""

from dataclasses import dataclass, field

import networkx as nx

from app.models.schemas import Dependency, Repository


@dataclass
class AnalysisContext:
    repository: Repository
    graph: nx.DiGraph
    dependencies: dict[str, Dependency]  # package id -> Dependency
    feature_vectors: dict[str, dict[str, float]]  # package id -> feature vector
    risk_profiles: dict[str, dict]  # package id -> {label, low, medium, high}
    vuln_scores: dict[str, list[float]] = field(default_factory=dict)  # package id -> CVSS scores


_CACHE: dict[str, AnalysisContext] = {}


def repository_key(owner: str, name: str) -> str:
    return f"{owner}/{name}"


def store(key: str, context: AnalysisContext) -> None:
    _CACHE[key] = context


def get(key: str) -> AnalysisContext | None:
    return _CACHE.get(key)


def find_package(package_id: str) -> tuple[AnalysisContext, Dependency] | None:
    """Scans all cached repositories for a package id. Fine at hackathon
    scale (a handful of analyzed repos); add an id->repo index first if
    this ever needs to handle many concurrently-cached repositories.
    """
    for context in _CACHE.values():
        dep = context.dependencies.get(package_id)
        if dep is not None:
            return context, dep
    return None
