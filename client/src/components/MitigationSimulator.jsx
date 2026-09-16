import RiskProfile from "./RiskProfile";

const RISK_TEXT = {
  Low: "text-[var(--color-risk-low)]",
  Medium: "text-[var(--color-risk-medium)]",
  High: "text-[var(--color-risk-high)]",
};

export default function MitigationSimulator({ pkg, scenarios, loading, selected, onSelect, onClose }) {
  if (!pkg) return null;

  const selectedRow = scenarios.find((s) => s.scenario === selected);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="animate-fade-in-up w-full max-w-2xl rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
              Mitigation Simulator
            </div>
            <h3 className="font-mono text-base font-semibold text-[var(--color-text-primary)]">
              {pkg.name}@{pkg.version}
            </h3>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            ✕
          </button>
        </div>

        <p className="mb-5 mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
          What happens to the downstream-impact estimate if we take a different action on this dependency? Values
          below are modeled / simulated — they don't guarantee a specific real-world outcome.
        </p>

        {loading ? (
          <div className="flex items-center gap-3 py-8 text-sm text-[var(--color-text-secondary)]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-brand)] border-t-transparent" />
            Running mitigation scenarios...
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
                    <th className="px-4 py-2.5 font-medium">Scenario</th>
                    <th className="px-4 py-2.5 font-medium">Predicted Impact</th>
                    <th className="px-4 py-2.5 font-medium">Reduction</th>
                    <th className="px-4 py-2.5 font-medium">Effort</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((row) => {
                    const isSelected = row.scenario === selected;
                    return (
                      <tr
                        key={row.scenario}
                        onClick={() => onSelect(row.scenario)}
                        className={`cursor-pointer border-b border-[var(--color-border-soft)] transition-colors last:border-0 ${
                          isSelected ? "bg-[var(--color-brand-bg)]" : "hover:bg-[var(--color-bg-hover)]"
                        }`}
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-[var(--color-text-primary)]">
                          <span className="flex items-center gap-2">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-[var(--color-brand)]" : "bg-transparent"}`}
                            />
                            {row.scenario}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono">
                          <span className={RISK_TEXT[row.label]}>{row.label}</span>{" "}
                          <span className="text-[var(--color-text-muted)]">{row.value.toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[var(--color-text-secondary)]">
                          {row.reduction != null ? `${Math.round(row.reduction * 100)}%` : "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-[var(--color-text-secondary)]">{row.effort ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {selectedRow && (
              <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
                    Preview — {selectedRow.scenario}
                  </span>
                  {selectedRow.reduction != null && (
                    <span className="font-mono text-xs text-[var(--color-risk-low)]">
                      {Math.round(selectedRow.reduction * 100)}% impact reduction
                    </span>
                  )}
                </div>
                <RiskProfile
                  profile={{ label: selectedRow.label.toUpperCase(), ...selectedRow.profile }}
                  compact
                />
                <p className="mt-3 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
                  {selectedRow.description}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
