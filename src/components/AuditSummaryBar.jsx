const ITEMS = [
  { key: "added", label: "added", colorVar: "--success" },
  { key: "carried", label: "carried", colorVar: "--carried" },
  { key: "modified", label: "modified", colorVar: "--modified" },
  { key: "removed", label: "removed", colorVar: "--error" },
  { key: "transformed", label: "transformed", colorVar: "--transformed" },
  { key: "missing", label: "missing", colorVar: "--warning" },
];

export default function AuditSummaryBar({ summary, activeFilter, onFilter }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        alignItems: "center",
        padding: "10px 0",
      }}
    >
      {ITEMS.map(({ key, label, colorVar }) => {
        const count = summary?.[key] ?? 0;
        const isActive = activeFilter === key;
        return (
          <button
            key={key}
            onClick={() => onFilter(isActive ? null : key)}
            title={`Filter by ${label}`}
            style={{
              display: "inline-flex",
              alignItems: "baseline",
              gap: 4,
              padding: "4px 12px",
              borderRadius: 999,
              border: `1px solid ${isActive ? `var(${colorVar})` : "var(--border)"}`,
              background: isActive ? `var(${colorVar})` : "var(--surface)",
              color: isActive ? "#fff" : `var(${colorVar})`,
              fontWeight: isActive ? 700 : 600,
              fontSize: 13,
              cursor: "pointer",
              transition: "all .15s",
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700 }}>{count}</span>
            <span style={{ fontSize: 11, opacity: 0.85 }}>{label}</span>
          </button>
        );
      })}
      {activeFilter && (
        <button
          onClick={() => onFilter(null)}
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          ✕ clear
        </button>
      )}
    </div>
  );
}
