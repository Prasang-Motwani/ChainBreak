// Frontend API service layer.
//
// The curated demo (mock data) and a real analyzed repository can both be
// "the current package" depending on how the user got there, so every
// function here disambiguates the same way: if the id/key exists in the
// local mock data, serve the curated demo response (used by the "try the
// demo repository" shortcut and as an offline fallback); otherwise call the
// real FastAPI backend, which by this point does real GitHub/OSV/npm/
// Scorecard extraction, real NetworkX graph analysis, and real XGBoost/SHAP
// inference (see server/app/api/*.py).

import {
  repository as mockRepository,
  packages as mockPackages,
  edges as mockEdges,
  compromiseScenarios,
  mitigationScenarios,
  analysisSteps,
} from "../data/mockData";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isCritical(dep) {
  return dep.max_cvss >= 9.0 || dep.risk_profile?.label === "HIGH";
}

function formatReleaseFrequency(releasesPerYear) {
  if (!releasesPerYear) return "inactive";
  if (releasesPerYear >= 12) return "weekly+";
  if (releasesPerYear >= 4) return "monthly";
  if (releasesPerYear >= 1) return `${releasesPerYear.toFixed(1)}/yr`;
  return "dormant";
}

function transformDependency(dep) {
  return {
    id: dep.id,
    name: dep.name,
    version: dep.version,
    kind: "package",
    ecosystem: dep.ecosystem,
    direct: dep.direct,
    resolved: dep.resolved,
    vulnerabilities: dep.vulnerabilities,
    maxCvss: dep.max_cvss,
    scorecard: dep.scorecard,
    riskProfile: dep.risk_profile ?? { label: "LOW", low: 1, medium: 0, high: 0 },
    isCritical: isCritical(dep),
    directDependents: dep.direct_dependents,
    transitiveDependents: dep.transitive_dependents,
    downstreamApplications: dep.downstream_application_count,
    criticalDownstream: dep.critical_downstream_count,
    propagationDepth: dep.max_propagation_depth,
    propagationPaths: dep.propagation_paths,
    betweenness: dep.betweenness_centrality,
    pageRank: dep.pagerank,
    projectAgeYears: Math.round(dep.project_age_years ?? 0),
    releaseFrequency: formatReleaseFrequency(dep.releases_per_year),
    maintainerCount: dep.maintainer_count,
  };
}

function computeEcosystemProfile(packages) {
  const scored = packages.filter((p) => p.riskProfile);
  if (scored.length === 0) return { label: "LOW", low: 1, medium: 0, high: 0 };

  const sums = scored.reduce(
    (acc, p) => ({
      low: acc.low + p.riskProfile.low,
      medium: acc.medium + p.riskProfile.medium,
      high: acc.high + p.riskProfile.high,
    }),
    { low: 0, medium: 0, high: 0 },
  );
  const n = scored.length;
  const avg = { low: sums.low / n, medium: sums.medium / n, high: sums.high / n };
  const label = avg.high >= avg.medium && avg.high >= avg.low ? "HIGH" : avg.medium >= avg.low ? "MEDIUM" : "LOW";
  return { ...avg, label };
}

async function analyzeRealRepository(repoUrl) {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repository_url: repoUrl }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Analyze request failed (${res.status})`);
  }
  const data = await res.json();
  if (!data.graph?.nodes?.length || !data.packages?.length) {
    throw new Error("Repository has no resolvable dependencies.");
  }

  const appNode = { id: data.repository.name, name: data.repository.name, kind: "app", isRoot: true };
  const packages = [appNode, ...data.packages.map(transformDependency)];
  const edges = data.graph.edges.map((e) => ({ source: e.source, target: e.target }));

  return {
    repository: {
      name: data.repository.name,
      owner: data.repository.owner,
      ecosystem: data.repository.ecosystem,
      url: repoUrl,
      totalDependencies: data.summary.dependencies,
      vulnerableDependencies: data.summary.vulnerable_dependencies,
      criticalDependencies: data.summary.critical_dependencies,
      highImpactPaths: packages.reduce((sum, p) => sum + (p.isCritical ? p.propagationPaths : 0), 0),
      ecosystemImpactProfile: computeEcosystemProfile(packages),
    },
    packages,
    edges,
  };
}

export async function analyzeRepository(repoUrl) {
  try {
    return await analyzeRealRepository(repoUrl);
  } catch (err) {
    console.warn(`ChainBreak API unavailable or repo unsupported, using demo data: ${err.message}`);
    await delay(400);
    return {
      repository: { ...mockRepository, url: repoUrl || mockRepository.url },
      packages: Object.values(mockPackages),
      edges: mockEdges,
    };
  }
}

export async function getPackage(packageId) {
  if (mockPackages[packageId]) {
    await delay(150);
    return mockPackages[packageId];
  }
  const res = await fetch(`${API_BASE}/api/package/${encodeURIComponent(packageId)}`);
  if (!res.ok) throw new Error(`Package not found: ${packageId}`);
  return transformDependency(await res.json());
}

export async function getExplanation(packageId) {
  if (mockPackages[packageId]) {
    await delay(250);
    const pkg = mockPackages[packageId];
    return { packageId, shap: pkg.shap ?? [] };
  }
  const res = await fetch(`${API_BASE}/api/package/${encodeURIComponent(packageId)}/explanation`);
  if (!res.ok) throw new Error(`Explanation not found for ${packageId}`);
  const data = await res.json();
  return { packageId, shap: data.contributions };
}

export async function simulateCompromise(packageId) {
  if (compromiseScenarios[packageId]) {
    await delay(500);
    return compromiseScenarios[packageId];
  }

  const res = await fetch(`${API_BASE}/api/simulate/compromise`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ package_id: packageId }),
  });
  if (!res.ok) throw new Error(`Compromise simulation failed for ${packageId}`);
  const data = await res.json();
  return {
    compromisedId: data.compromised_id,
    waves: data.waves,
    reachable: data.reachable,
    criticalComponents: data.critical_components,
    applicationsAffected: data.applications_affected,
    stats: {
      directlyAffected: data.stats.directly_affected,
      reachableDownstreamPackages: data.stats.reachable_downstream,
      applicationsAffected: data.stats.applications_affected,
      criticalComponents: data.stats.critical_components,
      maxPropagationDepth: data.stats.max_propagation_depth,
      propagationPaths: data.stats.propagation_paths,
    },
  };
}

export async function simulateMitigation(packageId) {
  if (mitigationScenarios[packageId]) {
    await delay(600);
    return mitigationScenarios[packageId];
  }

  const res = await fetch(`${API_BASE}/api/simulate/mitigation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ package_id: packageId }),
  });
  if (!res.ok) throw new Error(`Mitigation simulation failed for ${packageId}`);
  const data = await res.json();
  return data.scenarios.map((s) => ({
    scenario: s.scenario,
    label: s.risk_profile.label.charAt(0) + s.risk_profile.label.slice(1).toLowerCase(),
    value: s.risk_profile.high,
    reduction: s.reduction,
    effort: s.effort,
    profile: { low: s.risk_profile.low, medium: s.risk_profile.medium, high: s.risk_profile.high },
    description: s.description,
  }));
}

export function getAnalysisSteps() {
  return analysisSteps;
}
