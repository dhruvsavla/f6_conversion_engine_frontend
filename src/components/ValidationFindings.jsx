export default function ValidationFindings({ findings }) {
  if (!findings || findings.length === 0) {
    return (
      <div className="card" style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "var(--success)", fontSize: 16 }}>✓</span>
        <span style={{ fontWeight: 500, fontSize: 13 }}>No validation findings</span>
        <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>— conversion completed cleanly.</span>
      </div>
    );
  }

  const errCount = findings.filter(f => f.severity === "ERROR").length;
  const warnCount = findings.filter(f => f.severity === "WARN").length;

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 13 }}>Validation findings</span>
        <span
          style={{
            padding: "1px 8px",
            borderRadius: 999,
            background: errCount > 0 ? "var(--error-light)" : "var(--warning-light)",
            color: errCount > 0 ? "var(--error)" : "var(--warning)",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {findings.length} finding{findings.length !== 1 ? "s" : ""}
        </span>
        {errCount > 0 && (
          <span style={{ fontSize: 11, color: "var(--error)", fontWeight: 500 }}>
            {errCount} error{errCount !== 1 ? "s" : ""}
          </span>
        )}
        {warnCount > 0 && (
          <span style={{ fontSize: 11, color: "var(--warning)", fontWeight: 500 }}>
            {warnCount} warning{warnCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {findings.map((f, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 18px",
              borderLeft: `3px solid ${f.severity === "ERROR" ? "var(--error)" : "var(--warning)"}`,
              borderBottom: i < findings.length - 1 ? "1px solid var(--border)" : "none",
              background: f.severity === "ERROR" ? "var(--error-light)" : "#fffbf0",
            }}
          >
            <span
              className="badge"
              style={{
                background: f.severity === "ERROR" ? "var(--error)" : "var(--warning)",
                color: "#fff",
                flexShrink: 0,
                fontSize: 10,
              }}
            >
              {f.severity}
            </span>
            <span
              className="mono"
              style={{
                fontSize: 11,
                padding: "1px 6px",
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: 3,
                flexShrink: 0,
                color: "var(--text)",
              }}
            >
              {f.code}
            </span>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 12, color: "var(--text)" }}>{f.message}</span>
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  fontFamily: "var(--mono)",
                }}
              >
                {f.segment} · {f.field_id}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
