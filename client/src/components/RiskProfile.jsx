const RISK_STYLES = {
  LOW: { text: "text-[var(--color-risk-low)]", bg: "bg-[var(--color-risk-low-bg)]", bar: "bg-[var(--color-risk-low)]" },
  MEDIUM: { text: "text-[var(--color-risk-medium)]", bg: "bg-[var(--color-risk-medium-bg)]", bar: "bg-[var(--color-risk-medium)]" },
  HIGH: { text: "text-[var(--color-risk-high)]", bg: "bg-[var(--color-risk-high-bg)]", bar: "bg-[var(--color-risk-high)]" },
};

export function RiskPill({ label, size = "md" }) {
  const s = RISK_STYLES[label] ?? RISK_STYLES.LOW;
  const sizeCls = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5";
  return (
    <span className={`inline-flex items-center rounded font-mono font-semibold uppercase tracking-wider ${s.bg} ${s.text} ${sizeCls}`}>
      {label}
    </span>
  );
}

export default function RiskProfile({ title, profile, note, compact }) {
  const rows = [
    { key: "LOW", label: "Low", value: profile.low },
    { key: "MEDIUM", label: "Medium", value: profile.medium },
    { key: "HIGH", label: "High", value: profile.high },
  ];

  return (
    <div>
      {title && (
        <div className="mb-2 text-[11px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
          {title}
        </div>
      )}
      <div className={`flex items-baseline gap-2 ${compact ? "mb-2" : "mb-4"}`}>
        <span className={`font-mono font-bold tracking-tight ${RISK_STYLES[profile.label]?.text ?? ""} ${compact ? "text-2xl" : "text-4xl"}`}>
          {profile.label}
        </span>
        <span className="text-xs text-[var(--color-text-muted)]">downstream-impact profile</span>
      </div>

      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-2">
            <span className="w-14 text-[11px] font-mono text-[var(--color-text-secondary)]">{row.label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-hover)]">
              <div
                className={`h-full rounded-full ${RISK_STYLES[row.key].bar}`}
                style={{ width: `${Math.round(row.value * 100)}%` }}
              />
            </div>
            <span className="w-10 text-right text-[11px] font-mono text-[var(--color-text-secondary)]">
              {Math.round(row.value * 100)}%
            </span>
          </div>
        ))}
      </div>

      {note && <p className="mt-3 text-[11px] leading-relaxed text-[var(--color-text-muted)]">{note}</p>}
    </div>
  );
}
