import { featureLabels } from "../data/mockData";

export default function ShapExplanation({ pkg, loading, contributions, onClose }) {
  if (!pkg) return null;

  const maxAbs = Math.max(...contributions.map((f) => Math.abs(f.contribution)), 0.01);
  const sorted = [...contributions].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="animate-fade-in-up w-full max-w-lg rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
              Why {pkg.riskProfile.label}?
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
          The model classified this package's downstream-impact profile as{" "}
          <span className="font-semibold text-[var(--color-text-primary)]">{pkg.riskProfile.label}</span> primarily
          because of the feature contributions below (SHAP values, positive = pushes impact estimate higher).
        </p>

        {loading ? (
          <div className="flex items-center gap-3 py-8 text-sm text-[var(--color-text-secondary)]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-brand)] border-t-transparent" />
            Computing SHAP feature contributions...
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((f) => {
              const pct = Math.round((Math.abs(f.contribution) / maxAbs) * 100);
              const positive = f.contribution >= 0;
              return (
                <div key={f.feature}>
                  <div className="mb-1 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[var(--color-text-secondary)]">
                      {featureLabels[f.feature] ?? f.feature}
                    </span>
                    <span className={positive ? "text-[var(--color-risk-high)]" : "text-[var(--color-risk-low)]"}>
                      {positive ? "+" : ""}
                      {f.contribution.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-hover)]">
                    <div
                      className={`h-full rounded-full ${positive ? "bg-[var(--color-risk-high)]" : "bg-[var(--color-risk-low)]"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-5 border-t border-[var(--color-border-soft)] pt-4 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
          This is an explanation of the model's output, not a prediction that this package will be compromised.
        </p>
      </div>
    </div>
  );
}
