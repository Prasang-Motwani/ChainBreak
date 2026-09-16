function StatBlock({ label, value }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3">
      <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-1 font-mono text-xl font-bold text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}

export default function CompromiseSimulator({ pkg, status, result, revealedCount, onReset, onClose, onOpenMitigation }) {
  if (!pkg) return null;

  return (
    <div className="animate-fade-in-up shrink-0 border-t border-[var(--color-risk-high)]/30 bg-[var(--color-bg-panel)]/97 backdrop-blur-md">
      <div className="mx-auto max-w-5xl px-6 py-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-risk-high)] opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-risk-high)]" />
            </span>
            <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
              What-If Scenario: Compromise
            </h3>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            ✕
          </button>
        </div>

        <p className="mb-4 text-xs text-[var(--color-text-secondary)]">
          Assumption:{" "}
          <span className="font-mono font-semibold text-[var(--color-text-primary)]">
            {pkg.name}@{pkg.version}
          </span>{" "}
          has been compromised. This is a hypothetical simulation, not a live detection.
        </p>

        {status === "running" && (
          <div className="flex items-center gap-3 py-4 text-sm text-[var(--color-text-secondary)]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-risk-high)] border-t-transparent" />
            Tracing propagation through the dependency graph
            {revealedCount > 0 && (
              <span className="font-mono text-[var(--color-risk-high)]">— {revealedCount} node(s) reached</span>
            )}
          </div>
        )}

        {status === "complete" && result && (
          <>
            <p className="mb-2 text-[11px] text-[var(--color-text-muted)]">
              Showing {result.reachable.length} of {result.stats.reachableDownstreamPackages.toLocaleString()} reachable
              dependents in this sample graph.
            </p>
            <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
              <StatBlock label="Directly Affected" value={result.stats.directlyAffected} />
              <StatBlock label="Reachable Downstream" value={result.stats.reachableDownstreamPackages.toLocaleString()} />
              <StatBlock label="Apps Affected" value={result.stats.applicationsAffected} />
              <StatBlock label="Critical Components" value={result.stats.criticalComponents} />
              <StatBlock label="Max Depth" value={result.stats.maxPropagationDepth} />
              <StatBlock label="Propagation Paths" value={result.stats.propagationPaths} />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onOpenMitigation}
                className="rounded-lg border border-[var(--color-brand)]/40 bg-[var(--color-brand-bg)] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-[var(--color-brand)] transition-colors hover:bg-[var(--color-brand)]/10"
              >
                Explore Mitigation Options
              </button>
              <button
                onClick={onReset}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-text-primary)] hover:text-[var(--color-text-primary)]"
              >
                Reset Simulation
              </button>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                Modeled / simulated results — values reflect the graph-reachability and impact model, not a confirmed
                incident.
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
