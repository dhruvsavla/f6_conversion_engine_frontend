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
  RETAIL: "#057a55",
  SPECIALTY: "#6b21a8",
  COB: "#1e40af",
  CONTROLLED: "#c27803",
  REVERSAL: "#c81e1e",
  COMPOUND: "#0891b2",
  LTC: "#7c3aed",
  MEDICARE_PART_D: "#1d4ed8",
  ELIGIBILITY: "#15803d",
  PRIOR_AUTH: "#9333ea",
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
