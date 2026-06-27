const TX_LABELS = {
  RETAIL: "Retail Pharmacy Claim",
  SPECIALTY: "Specialty Pharmacy Claim",
  COB: "Coordination of Benefits",
  CONTROLLED: "Controlled Substance Claim",
  REVERSAL: "Claim Reversal",
  COMPOUND: "Compound Claim",
  LTC: "Long-Term Care Claim",
  MEDICARE_PART_D: "Medicare Part D Claim",
  ELIGIBILITY: "Eligibility Verification",
  PRIOR_AUTH: "Prior Authorization",
};

const TX_COLORS = {
  RETAIL:         "#34D399",   // emerald
  SPECIALTY:      "#A78BFA",   // violet
  COB:            "#60A5FA",   // sky blue
  CONTROLLED:     "#FBBF24",   // amber
  REVERSAL:       "#FB7185",   // rose
  COMPOUND:       "#22D3EE",   // cyan
  LTC:            "#C084FC",   // purple
  MEDICARE_PART_D:"#6366F1",   // indigo
  ELIGIBILITY:    "#4ADE80",   // green
  PRIOR_AUTH:     "#F472B6",   // pink
};

export default function TransactionBadge({ type }) {
  const label = TX_LABELS[type] || type;
  const color = TX_COLORS[type] || "#6b7280";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 999,
        background: color + "18",
        color,
        fontWeight: 600,
        fontSize: 12,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        border: `1px solid ${color}33`,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}
