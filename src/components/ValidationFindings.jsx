import { IconCheck, IconX, IconWarn } from './Icons';

export default function ValidationFindings({ findings }) {
  if (!findings || findings.length === 0) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 16px",
        background: "var(--status-success-bg)",
        border: "1px solid var(--status-success)",
        borderLeft: "3px solid var(--status-success)",
        borderRadius: "var(--radius-md)",
      }}>
        <IconCheck size={14} color="var(--status-success)" />
        <span style={{ fontWeight: 500, fontSize: "var(--text-base)", color: "var(--status-success)" }}>No validation findings</span>
        <span style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>— conversion completed cleanly.</span>
      </div>
    );
  }

  const errCount  = findings.filter(f => f.severity === "ERROR").length;
  const warnCount = findings.filter(f => f.severity === "WARN").length;

  return (
    <div>
      {/* Summary header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        marginBottom: 8, padding: "2px 0",
      }}>
        <span style={{ fontWeight: 600, fontSize: "var(--text-base)", color: "var(--text-secondary)" }}>
          Validation findings
        </span>
        {errCount > 0 && (
          <span style={{ padding: "1px 8px", borderRadius: "var(--radius-full)", background: "var(--status-error-bg)", color: "var(--status-error)", fontSize: "var(--text-xs)", fontWeight: 600 }}>
            {errCount} error{errCount !== 1 ? "s" : ""}
          </span>
        )}
        {warnCount > 0 && (
          <span style={{ padding: "1px 8px", borderRadius: "var(--radius-full)", background: "var(--status-warn-bg)", color: "var(--status-warn)", fontSize: "var(--text-xs)", fontWeight: 600 }}>
            {warnCount} warning{warnCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Finding cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {findings.map((f, i) => {
          const isError = f.severity === "ERROR";
          const borderColor = isError ? "var(--status-error)" : "var(--status-warn)";
          const bgColor = isError ? "var(--status-error-bg)" : "var(--status-warn-bg)";
          const Icon = isError ? IconX : IconWarn;
          const iconColor = isError ? "var(--status-error)" : "var(--status-warn)";

          return (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "12px 16px",
                background: bgColor,
                border: `1px solid ${borderColor}`,
                borderLeft: `3px solid ${borderColor}`,
                borderRadius: "var(--radius-md)",
              }}
            >
              <Icon size={14} color={iconColor} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{
                display: "inline-flex", alignItems: "center",
                padding: "1px 6px",
                background: isError ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)",
                border: `1px solid ${borderColor}`,
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--text-xs)", fontWeight: 700,
                color: iconColor, flexShrink: 0, textTransform: "uppercase",
              }}>
                {f.severity}
              </span>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)",
                color: "var(--text-tertiary)", flexShrink: 0,
                padding: "1px 6px",
                background: "var(--bg-raised)",
                borderRadius: "var(--radius-sm)",
              }}>
                {f.code}
              </span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>{f.message}</span>
                <span style={{ marginLeft: 8, fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                  {f.segment} · {f.field_id}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
