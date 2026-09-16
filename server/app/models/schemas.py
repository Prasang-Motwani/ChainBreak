"""Pydantic schemas for the ChainBreak API.

PRODUCT RULE: RiskProfile is a modeled downstream-impact profile under a
hypothetical compromise scenario -- never describe it as "probability this
package will be hacked". See app/ml/risk_engine.py.
"""

from typing import Optional

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    repository_url: str = Field(..., examples=["https://github.com/sparrow7559/laundry-ui"])


class Repository(BaseModel):
    name: str
    owner: str
    url: str
    ecosystem: str


class Summary(BaseModel):
    dependencies: int = 0
    vulnerable_dependencies: int = 0
    critical_dependencies: int = 0


class RiskProfile(BaseModel):
    label: str  # "LOW" | "MEDIUM" | "HIGH"
    low: float
    medium: float
    high: float


class Dependency(BaseModel):
    """A single resolved package@version, direct dependency of the repo."""

    id: str  # "name@version"
    name: str
    version: Optional[str] = None
    ecosystem: str = "npm"
    direct: bool = True
    resolved: bool = False  # True if the version came from a lockfile, not a semver-range guess
    vulnerabilities: int = 0
    max_cvss: float = 0.0
    scorecard: Optional[float] = None
    risk_profile: Optional[RiskProfile] = None

    # Graph-structural stats, already computed as part of feature
    # engineering (see app/ml/features.py) -- exposed here so the frontend
    # doesn't need a second round-trip to see them.
    direct_dependents: int = 0
    transitive_dependents: int = 0
    downstream_package_count: int = 0
    downstream_application_count: int = 0
    critical_downstream_count: int = 0
    propagation_paths: int = 0
    max_propagation_depth: int = 0
    betweenness_centrality: float = 0.0
    pagerank: float = 0.0
    project_age_years: float = 0.0
    releases_per_year: float = 0.0
    maintainer_count: int = 0


class GraphNode(BaseModel):
    id: str  # "name@version" for packages, repository name for the app node
    name: str
    version: Optional[str] = None
    ecosystem: Optional[str] = None
    node_type: str = "package"  # "application" | "package"
    risk_label: Optional[str] = None  # "LOW" | "MEDIUM" | "HIGH", packages only


class GraphEdge(BaseModel):
    """source depends on target (e.g. app -> package)."""

    source: str
    target: str
    relationship: str = "depends_on"


class DependencyGraph(BaseModel):
    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []


class AnalyzeResponse(BaseModel):
    repository: Repository
    summary: Summary
    graph: DependencyGraph
    packages: list[Dependency] = []


class FeatureContribution(BaseModel):
    feature: str
    contribution: float


class ExplanationResponse(BaseModel):
    package_id: str
    risk_profile: RiskProfile
    contributions: list[FeatureContribution]


class CompromiseRequest(BaseModel):
    package_id: str


class CompromiseStats(BaseModel):
    directly_affected: int
    reachable_downstream: int
    applications_affected: int
    critical_components: int
    max_propagation_depth: int
    propagation_paths: int


class CompromiseResponse(BaseModel):
    compromised_id: str
    waves: list[list[str]]  # BFS layers of affected node ids, for animated propagation
    reachable: list[str]
    critical_components: list[str]
    applications_affected: list[str]
    stats: CompromiseStats


class MitigationScenario(BaseModel):
    scenario: str  # "Current" | "Upgrade" | "Replace" | "Isolate"
    risk_profile: RiskProfile
    reduction: Optional[float] = None  # fractional drop in P(High) vs Current
    effort: Optional[str] = None
    description: str


class MitigationRequest(BaseModel):
    package_id: str


class MitigationResponse(BaseModel):
    package_id: str
    scenarios: list[MitigationScenario]
