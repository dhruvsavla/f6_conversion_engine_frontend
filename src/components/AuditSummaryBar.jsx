const ITEMS = [
  { key: "added",       label: "added",       colorVar: "--status-success" },
  { key: "carried",     label: "carried",     colorVar: "--status-neutral" },
  { key: "modified",    label: "modified",    colorVar: "--status-purple" },
  { key: "removed",     label: "removed",     colorVar: "--status-error" },
  { key: "transformed", label: "transformed", colorVar: "--status-teal" },
  { key: "missing",     label: "missing",     colorVar: "--status-error" },
];

export default function AuditSummaryBar({ summary, activeFilter, onFilter }) {
  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: 0,
      alignItems: "center",
      padding: "4px 0",
    }}>
      {ITEMS.map(({ key, label, colorVar }, idx) => {
        const count = summary?.[key] ?? 0;
        const isActive = activeFilter === key;
        return (
          <div key={key} style={{ display: "flex", alignItems: "center" }}>
            <button
              onClick={() => onFilter(isActive ? null : key)}
              title={`Filter by ${label}`}
              style={{
                display: "inline-flex",
                alignItems: "baseline",
                gap: 5,
                padding: "4px 8px",
                background: "none",
                border: "none",
                cursor: "pointer",
                transition: "all var(--transition-fast)",
              }}
            >
              <span style={{
                fontSize: "var(--text-lg)", fontWeight: 700,
                color: `var(${colorVar})`,
                filter: isActive ? "brightness(1.2)" : undefined,
              }}>
                {count}
              </span>
              <span style={{
                fontSize: "var(--text-xs)", color: "var(--text-tertiary)",
                textDecoration: isActive ? "underline" : "none",
                textUnderlineOffset: 2,
              }}>
                {label}
              </span>
            </button>
            {idx < ITEMS.length - 1 && (
              <span style={{ color: "var(--text-tertiary)", fontSize: "var(--text-xs)", opacity: 0.5 }}>·</span>
            )}
          </div>
        );
      })}
      {activeFilter && (
        <button
          onClick={() => onFilter(null)}
          style={{
            marginLeft: 8,
            padding: "3px 8px",
            borderRadius: "var(--radius-full)",
            border: "1px solid var(--border-subtle)",
            background: "transparent",
            color: "var(--text-tertiary)",
            fontSize: "var(--text-xs)",
            cursor: "pointer",
          }}
        >
          ✕ clear
        </button>
      )}
    </div>
  );
}
