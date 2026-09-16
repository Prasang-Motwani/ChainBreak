export default function GraphLegend({ simulationActive }) {
  const items = simulationActive
    ? [
        { color: "#ef4444", ring: true, label: "Compromised" },
        { color: "#f87171", label: "Affected" },
        { color: "#8b95a8", label: "Critical (double border)" },
        { color: "#232b3a", dim: true, label: "Unaffected" },
      ]
    : [
        { color: "#34d399", label: "Low impact" },
        { color: "#fbbf24", label: "Medium impact" },
        { color: "#f87171", label: "High impact" },
        { color: "#22d3ee", label: "Application" },
      ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-panel)]/70 px-3 py-2 text-[11px] text-[var(--color-text-secondary)]">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm border"
            style={{
              backgroundColor: item.dim ? "transparent" : item.color,
              borderColor: item.color,
              opacity: item.dim ? 0.5 : 1,
            }}
          />
          <span className={item.dim ? "opacity-60" : ""}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
