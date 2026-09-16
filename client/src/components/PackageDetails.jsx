import RiskProfile from "./RiskProfile";

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">{label}</div>
      <div className="font-mono text-sm font-semibold text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}

export default function PackageDetails({ pkg, onWhyHigh, onSimulateCompromise, onSimulateMitigation }) {
  if (!pkg) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center text-sm text-[var(--color-text-muted)]">
        <p>Select a package in the graph to inspect its downstream-impact profile.</p>
      </div>
    );
  }

  if (pkg.kind === "app") {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center text-sm text-[var(--color-text-muted)]">
        <p>
          <span className="font-mono text-[var(--color-brand)]">{pkg.name}</span> is the application root. Select a
          dependency to view its impact profile.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5">
      <div className="mb-1 text-[11px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
        Package
      </div>
      <h3 className="mb-4 flex items-center gap-2 font-mono text-lg font-semibold text-[var(--color-text-primary)]">
        {pkg.name}
        <span className="text-[var(--color-text-muted)]">@{pkg.version}</span>
        {pkg.isCritical && (
          <span className="rounded bg-[var(--color-risk-high-bg)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-risk-high)]">
            critical
          </span>
        )}
      </h3>

      <div className="mb-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
        <RiskProfile profile={pkg.riskProfile} compact />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
        <Stat label="Vulnerabilities" value={pkg.vulnerabilities} />
        <Stat label="Max CVSS" value={pkg.maxCvss?.toFixed(1) ?? "0.0"} />
        <Stat label="Direct Dependents" value={pkg.directDependents} />
        <Stat label="Transitive Dependents" value={pkg.transitiveDependents.toLocaleString()} />
        <Stat label="Downstream Apps" value={pkg.downstreamApplications} />
        <Stat label="Critical Downstream" value={pkg.criticalDownstream} />
        <Stat label="Propagation Depth" value={pkg.propagationDepth} />
        <Stat label="Propagation Paths" value={pkg.propagationPaths} />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
        <Stat label="OpenSSF Scorecard" value={pkg.scorecard?.toFixed(1)} />
        <Stat label="Project Age" value={`${pkg.projectAgeYears}y`} />
        <Stat label="Release Freq." value={pkg.releaseFrequency} />
        <Stat label="Maintainers" value={pkg.maintainerCount} />
      </div>

      <div className="mt-auto space-y-2 pt-2">
        <button
          onClick={onWhyHigh}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-brand)] hover:text-[var(--color-text-primary)]"
        >
          Why is this {pkg.riskProfile.label}?
        </button>
        <button
          onClick={onSimulateCompromise}
          className="w-full rounded-lg bg-[var(--color-risk-high)] py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-[#2a0a0a] transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          Simulate Compromise
        </button>
        <button
          onClick={onSimulateMitigation}
          className="w-full rounded-lg border border-[var(--color-brand)]/40 bg-[var(--color-brand-bg)] py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-[var(--color-brand)] transition-colors hover:bg-[var(--color-brand)]/10"
        >
          Simulate Mitigation
        </button>
      </div>
    </div>
  );
}
