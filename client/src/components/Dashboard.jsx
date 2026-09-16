import { useMemo, useRef, useState } from "react";
import DependencyGraph from "./DependencyGraph";
import GraphLegend from "./GraphLegend";
import PackageDetails from "./PackageDetails";
import ShapExplanation from "./ShapExplanation";
import CompromiseSimulator from "./CompromiseSimulator";
import MitigationSimulator from "./MitigationSimulator";
import { getExplanation, simulateCompromise, simulateMitigation } from "../services/api";

function OverviewStat({ label, value, tone }) {
  const toneCls = {
    default: "text-[var(--color-text-primary)]",
    high: "text-[var(--color-risk-high)]",
    critical: "text-[var(--color-risk-high)]",
  }[tone ?? "default"];
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-panel)] px-4 py-3">
      <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">{label}</div>
      <div className={`mt-1 font-mono text-xl font-bold ${toneCls}`}>{value}</div>
    </div>
  );
}

export default function Dashboard({ repository, packages, edges, onReset }) {
  const [selectedId, setSelectedId] = useState(null);
  const [shap, setShap] = useState(null); // { packageId, loading, contributions }
  const [compromiseState, setCompromiseState] = useState(null); // { packageId, status, result, revealedIds }
  const [mitigation, setMitigation] = useState(null); // { packageId, loading, scenarios, selected }
  const runToken = useRef(0);

  const packagesById = packages;
  const selectedPkg = selectedId ? packagesById[selectedId] : null;

  const simulation = useMemo(() => {
    if (!compromiseState) return { active: false };
    return {
      active: true,
      compromisedId: compromiseState.packageId,
      affectedIds: new Set(compromiseState.revealedIds ?? []),
    };
  }, [compromiseState]);

  const handleSimulateCompromise = async () => {
    if (!selectedPkg) return;
    const token = ++runToken.current;
    const targetId = selectedPkg.id;

    setCompromiseState({ packageId: targetId, status: "running", result: null, revealedIds: new Set() });
    const result = await simulateCompromise(targetId);
    if (runToken.current !== token) return; // reset happened mid-flight

    const revealed = new Set();
    for (const wave of result.waves ?? [result.reachable]) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (runToken.current !== token) return;
      wave.forEach((id) => revealed.add(id));
      setCompromiseState({ packageId: targetId, status: "running", result, revealedIds: new Set(revealed) });
    }

    if (runToken.current !== token) return;
    setCompromiseState({ packageId: targetId, status: "complete", result, revealedIds: new Set(revealed) });
  };

  const handleResetCompromise = () => {
    runToken.current += 1;
    setCompromiseState(null);
  };

  const handleWhyHigh = async () => {
    if (!selectedPkg) return;
    const targetId = selectedPkg.id;
    setShap({ packageId: targetId, loading: true, contributions: [] });
    const result = await getExplanation(targetId);
    setShap({ packageId: targetId, loading: false, contributions: result.shap ?? [] });
  };

  const handleOpenMitigation = async () => {
    if (!selectedPkg) return;
    setMitigation({ packageId: selectedPkg.id, loading: true, scenarios: [], selected: null });
    const scenarios = await simulateMitigation(selectedPkg.id);
    const current = scenarios.find((s) => s.scenario === "Current") ?? scenarios[0] ?? null;
    setMitigation({ packageId: selectedPkg.id, loading: false, scenarios, selected: current?.scenario ?? null });
  };

  return (
    <div className="flex h-screen flex-col bg-[var(--color-bg-base)]">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[var(--color-brand)]">
            <path
              d="M12 2 3 6v6c0 5.2 3.6 9.7 9 10.9 5.4-1.2 9-5.7 9-10.9V6l-9-4Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M9 12.4 11.2 14.6 15.5 9.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-mono text-sm font-semibold tracking-tight text-[var(--color-text-primary)]">
            CHAIN<span className="text-[var(--color-brand)]">BREAK</span>
          </span>
          <span className="ml-3 hidden font-mono text-xs text-[var(--color-text-muted)] sm:inline">
            {repository.url.replace(/^https?:\/\//, "")}
          </span>
        </div>
        <button
          onClick={onReset}
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)] hover:border-[var(--color-brand)] hover:text-[var(--color-text-primary)]"
        >
          New Analysis
        </button>
      </header>

      <div className="grid grid-cols-6 gap-3 border-b border-[var(--color-border)] px-6 py-4">
        <OverviewStat label="Ecosystem" value={repository.ecosystem} />
        <OverviewStat label="Dependencies" value={repository.totalDependencies} />
        <OverviewStat label="Vulnerable Deps" value={repository.vulnerableDependencies} tone="high" />
        <OverviewStat label="Critical Deps" value={repository.criticalDependencies} tone="critical" />
        <OverviewStat label="High-Impact Paths" value={repository.highImpactPaths} tone="high" />
        <div className="rounded-lg border border-[var(--color-risk-high)]/30 bg-[var(--color-risk-high-bg)] px-4 py-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
            Ecosystem Impact
          </div>
          <div className="mt-1 font-mono text-xl font-bold text-[var(--color-risk-high)]">
            {repository.ecosystemImpactProfile.label}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Version-Aware Dependency Graph
            </h2>
            <GraphLegend simulationActive={simulation.active} />
          </div>
          <div className="min-h-0 flex-1 px-2 pb-2">
            <DependencyGraph
              packages={packagesById}
              edges={edges}
              selectedId={selectedId}
              onSelect={setSelectedId}
              simulation={simulation}
            />
          </div>

          {compromiseState && (
            <CompromiseSimulator
              pkg={packagesById[compromiseState.packageId]}
              status={compromiseState.status}
              result={compromiseState.result}
              revealedCount={compromiseState.revealedIds?.size ?? 0}
              onReset={handleResetCompromise}
              onClose={handleResetCompromise}
              onOpenMitigation={handleOpenMitigation}
            />
          )}
        </div>

        <aside className="w-96 shrink-0 border-l border-[var(--color-border)] bg-[var(--color-bg-panel)]">
          <PackageDetails
            pkg={selectedPkg}
            onWhyHigh={handleWhyHigh}
            onSimulateCompromise={handleSimulateCompromise}
            onSimulateMitigation={handleOpenMitigation}
          />
        </aside>
      </div>

      {shap && (
        <ShapExplanation
          pkg={packagesById[shap.packageId]}
          loading={shap.loading}
          contributions={shap.contributions}
          onClose={() => setShap(null)}
        />
      )}

      {mitigation && (
        <MitigationSimulator
          pkg={packagesById[mitigation.packageId]}
          scenarios={mitigation.scenarios}
          loading={mitigation.loading}
          selected={mitigation.selected}
          onSelect={(scenario) => setMitigation((m) => ({ ...m, selected: scenario }))}
          onClose={() => setMitigation(null)}
        />
      )}
    </div>
  );
}
