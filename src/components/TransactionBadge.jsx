const TX_COLORS = {
  RETAIL:          { color: "var(--status-info)",    bg: "var(--status-info-bg)" },
  COMPOUND:        { color: "var(--status-teal)",    bg: "var(--status-teal-bg)" },
  COB:             { color: "var(--status-purple)",  bg: "var(--status-purple-bg)" },
  CONTROLLED:      { color: "var(--status-warn)",    bg: "var(--status-warn-bg)" },
  REVERSAL:        { color: "var(--status-neutral)", bg: "var(--status-neutral-bg)" },
  SPECIALTY:       { color: "var(--status-success)", bg: "var(--status-success-bg)" },
  LTC:             { color: "var(--status-purple)",  bg: "var(--status-purple-bg)" },
  MEDICARE_PART_D: { color: "var(--status-info)",    bg: "var(--status-info-bg)" },
  ELIGIBILITY:     { color: "var(--status-success)", bg: "var(--status-success-bg)" },
  PRIOR_AUTH:      { color: "var(--status-teal)",    bg: "var(--status-teal-bg)" },
};

export default function TransactionBadge({ type }) {
  const c = TX_COLORS[type] || { color: "var(--status-neutral)", bg: "var(--status-neutral-bg)" };
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 10px",
      borderRadius: "var(--radius-full)",
      background: c.bg,
      color: c.color,
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-xs)",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
    }}>
      {type || "UNKNOWN"}
    </span>
  );
}
