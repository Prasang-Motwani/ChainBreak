"""What-if mitigation simulator: recomputes the XGBoost risk profile under
hypothetical remediation actions by adjusting the package's real feature
vector, then re-running the SAME trained model -- not a separate hardcoded
lookup table. The adjustments themselves (e.g. "Upgrade" zeroes out
vulnerability features) are a transparent, documented modeling choice for
each scenario, same as any what-if tool; they are not claims about a
specific real-world outcome.
"""

from app.cache import AnalysisContext
from app.ml import risk_engine
from app.models.schemas import MitigationResponse, MitigationScenario, RiskProfile

_ISOLATION_RETENTION = 0.4  # fraction of structural exposure assumed to remain after isolating


def _predict_profile(features: dict[str, float]) -> RiskProfile:
    result = risk_engine.predict(features)
    return RiskProfile(label=result["label"], low=result["low"], medium=result["medium"], high=result["high"])


def _reduction(baseline: RiskProfile, scenario: RiskProfile) -> float:
    if baseline.high <= 0:
        return 0.0
    return max(0.0, (baseline.high - scenario.high) / baseline.high)


def simulate_mitigation(context: AnalysisContext, package_id: str) -> MitigationResponse:
    base = context.feature_vectors[package_id]
    current_profile = _predict_profile(base)

    upgrade_features = {
        **base,
        "vuln_count": 0.0,
        "max_cvss": 0.0,
        "mean_cvss": 0.0,
        "high_vuln_count": 0.0,
        "critical_vuln_count": 0.0,
    }
    upgrade_profile = _predict_profile(upgrade_features)

    replace_features = {
        **upgrade_features,
        "transitive_dependents": 0.0,
        "downstream_package_count": 0.0,
        "downstream_application_count": 0.0,
        "critical_downstream_count": 0.0,
        "propagation_path_count": 0.0,
        "max_propagation_depth": 0.0,
        "betweenness_centrality": 0.0,
        "pagerank": 0.0,
        "scorecard_score": 8.5,
        "maintainer_count": max(base.get("maintainer_count", 0.0), 10.0),
        "releases_per_year": max(base.get("releases_per_year", 0.0), 12.0),
    }
    replace_profile = _predict_profile(replace_features)

    isolate_features = dict(base)
    for key in (
        "betweenness_centrality",
        "pagerank",
        "downstream_package_count",
        "downstream_application_count",
        "critical_downstream_count",
        "propagation_path_count",
        "max_propagation_depth",
        "transitive_dependents",
    ):
        isolate_features[key] = base.get(key, 0.0) * _ISOLATION_RETENTION
    isolate_profile = _predict_profile(isolate_features)

    scenarios = [
        MitigationScenario(
            scenario="Current",
            risk_profile=current_profile,
            reduction=None,
            effort=None,
            description="No action taken; current downstream-impact profile stands.",
        ),
        MitigationScenario(
            scenario="Upgrade",
            risk_profile=upgrade_profile,
            reduction=_reduction(current_profile, upgrade_profile),
            effort="Medium",
            description="Upgrade to a patched version, resolving its known vulnerabilities.",
        ),
        MitigationScenario(
            scenario="Replace",
            risk_profile=replace_profile,
            reduction=_reduction(current_profile, replace_profile),
            effort="High",
            description="Replace the dependency entirely, removing it from the graph.",
        ),
        MitigationScenario(
            scenario="Isolate",
            risk_profile=isolate_profile,
            reduction=_reduction(current_profile, isolate_profile),
            effort="Low",
            description="Sandbox the dependency to restrict its blast radius without removing it.",
        ),
    ]

    return MitigationResponse(package_id=package_id, scenarios=scenarios)
