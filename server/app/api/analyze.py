import asyncio

from fastapi import APIRouter, HTTPException

from app.cache import AnalysisContext, repository_key, store
from app.graph import analysis as graph_analysis
from app.graph.builder import build_dependency_graph, to_frontend_graph
from app.ml import risk_engine
from app.ml.features import build_feature_vector
from app.models.schemas import AnalyzeRequest, AnalyzeResponse, Dependency, Repository, RiskProfile, Summary
from app.services import github_service, npm_registry_service, npm_service, osv_service, scorecard_service
from app.services.repository import parse_github_url

CRITICAL_CVSS_THRESHOLD = 9.0

router = APIRouter(prefix="/api")


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_repository(payload: AnalyzeRequest) -> AnalyzeResponse:
    owner, name = parse_github_url(payload.repository_url)

    repo_meta = await github_service.get_repository(owner, name)
    default_branch = repo_meta.get("default_branch") or "main"

    package_json_content = await github_service.get_file_content(owner, name, "package.json", default_branch)
    if package_json_content is None:
        raise HTTPException(
            status_code=422,
            detail="No package.json found in this repository. Only npm repositories are supported right now.",
        )

    package_json = npm_service.parse_package_json(package_json_content)
    direct_deps = npm_service.extract_direct_dependencies(package_json)

    lockfile_content = await github_service.get_file_content(owner, name, "package-lock.json", default_branch)
    locked_versions = npm_service.parse_lockfile_versions(lockfile_content) if lockfile_content else {}

    dependencies: list[Dependency] = []
    for dep_name, version_range in direct_deps.items():
        resolved_version = locked_versions.get(dep_name)
        version = resolved_version or npm_service.clean_version_range(version_range)
        dependencies.append(
            Dependency(
                id=f"{dep_name}@{version}",
                name=dep_name,
                version=version,
                ecosystem="npm",
                direct=True,
                resolved=resolved_version is not None,
            )
        )

    # --- Vulnerabilities (OSV) ---
    vuln_data = await osv_service.get_package_vulnerabilities(
        [(dep.name, dep.version) for dep in dependencies if dep.version]
    )
    vuln_scores: dict[str, list[float]] = {}
    for dep in dependencies:
        stats = vuln_data.get(dep.id)
        if stats:
            dep.vulnerabilities = stats["vulnerabilities"]
            dep.max_cvss = stats["max_cvss"]
            vuln_scores[dep.id] = stats["scores"]

    critical_node_ids = {dep.id for dep in dependencies if dep.max_cvss >= CRITICAL_CVSS_THRESHOLD}

    # --- Project signals (npm registry + best-effort OpenSSF Scorecard) ---
    npm_meta_list = await asyncio.gather(*[npm_registry_service.get_npm_metadata(dep.name) for dep in dependencies])
    npm_meta_by_id = dict(zip((dep.id for dep in dependencies), npm_meta_list))

    scorecard_targets = [
        (dep.id, meta["github_repo"]) for dep, meta in zip(dependencies, npm_meta_list) if meta and meta.get("github_repo")
    ]
    scorecard_results = await asyncio.gather(
        *[scorecard_service.get_scorecard(repo[0], repo[1]) for _, repo in scorecard_targets]
    )
    scorecard_by_id = {dep_id: score for (dep_id, _), score in zip(scorecard_targets, scorecard_results)}
    for dep in dependencies:
        dep.scorecard = scorecard_by_id.get(dep.id)

    # --- Graph + structural metrics ---
    graph = build_dependency_graph(app_id=name, app_name=name, dependencies=dependencies)
    betweenness = graph_analysis.betweenness_centrality(graph)
    pagerank = graph_analysis.pagerank(graph)

    # --- Feature engineering + risk engine (XGBoost) + risk profile per package ---
    feature_vectors: dict[str, dict[str, float]] = {}
    risk_profiles: dict[str, dict] = {}
    for dep in dependencies:
        features = build_feature_vector(
            node_id=dep.id,
            graph=graph,
            root_id=name,
            is_direct=dep.direct,
            vuln_scores=vuln_scores.get(dep.id, []),
            critical_node_ids=critical_node_ids,
            betweenness=betweenness,
            pagerank=pagerank,
            npm_meta=npm_meta_by_id.get(dep.id),
            scorecard=dep.scorecard,
        )
        profile = risk_engine.predict(features)
        feature_vectors[dep.id] = features
        risk_profiles[dep.id] = profile
        dep.risk_profile = RiskProfile(label=profile["label"], low=profile["low"], medium=profile["medium"], high=profile["high"])

        dep.direct_dependents = int(features["direct_dependents"])
        dep.transitive_dependents = int(features["transitive_dependents"])
        dep.downstream_package_count = int(features["downstream_package_count"])
        dep.downstream_application_count = int(features["downstream_application_count"])
        dep.critical_downstream_count = int(features["critical_downstream_count"])
        dep.propagation_paths = int(features["propagation_path_count"])
        dep.max_propagation_depth = int(features["max_propagation_depth"])
        dep.betweenness_centrality = features["betweenness_centrality"]
        dep.pagerank = features["pagerank"]
        dep.project_age_years = features["project_age_years"]
        dep.releases_per_year = features["releases_per_year"]
        dep.maintainer_count = int(features["maintainer_count"])

    frontend_graph = to_frontend_graph(graph)
    for node in frontend_graph.nodes:
        if node.id in risk_profiles:
            node.risk_label = risk_profiles[node.id]["label"]

    dependencies_by_id = {dep.id: dep for dep in dependencies}
    store(
        repository_key(owner, name),
        AnalysisContext(
            repository=Repository(name=name, owner=owner, url=payload.repository_url, ecosystem="npm"),
            graph=graph,
            dependencies=dependencies_by_id,
            feature_vectors=feature_vectors,
            risk_profiles=risk_profiles,
            vuln_scores=vuln_scores,
        ),
    )

    return AnalyzeResponse(
        repository=Repository(name=name, owner=owner, url=payload.repository_url, ecosystem="npm"),
        summary=Summary(
            dependencies=len(dependencies),
            vulnerable_dependencies=sum(1 for dep in dependencies if dep.vulnerabilities > 0),
            critical_dependencies=sum(1 for dep in dependencies if dep.max_cvss >= CRITICAL_CVSS_THRESHOLD),
        ),
        graph=frontend_graph,
        packages=dependencies,
    )
