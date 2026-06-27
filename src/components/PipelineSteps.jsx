const STEP_DEFS = [
  { id: "reading_rules", label: "Reading rules" },
  { id: "parsing",       label: "Parsing D.0" },
  { id: "detecting",     label: "Detecting type" },
  { id: "planning",      label: "Loading rules" },
  { id: "mapping",       label: "Mapping fields" },
  { id: "assembling",    label: "Assembling F6" },
  { id: "validating",    label: "Validating" },
  { id: "auditing",      label: "Building audit" },
];

export default function PipelineSteps({ steps = [], isRunning }) {
  const stepMap = Object.fromEntries(steps.map(s => [s.id, s]));

  return (
    <div style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)", padding: "14px 24px", overflowX: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0, minWidth: "max-content" }}>
        {STEP_DEFS.map((def, i) => {
          const s = stepMap[def.id];
          const status = s?.status || (isRunning ? "pending" : "idle");
          const isComplete = status === "complete";
          const isRunningNow = status === "running";
          const isError = status === "error";

          let dotBg = "var(--border)";
          let dotColor = "var(--text-secondary)";
          let icon = i + 1;
          if (isComplete)   { dotBg = "var(--success)"; dotColor = "#fff"; icon = "✓"; }
          if (isRunningNow) { dotBg = "var(--accent)";  dotColor = "#fff"; icon = i + 1; }
          if (isError)      { dotBg = "var(--error)";   dotColor = "#fff"; icon = "✗"; }

          return (
            <div key={def.id} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 80 }} title={s?.detail || def.label}>
                <div
                  style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: dotBg, color: dotColor,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 11, marginBottom: 4,
                    transition: "background .3s",
                    animation: isRunningNow ? "stepPulse 1.2s ease-in-out infinite" : "none",
                    boxShadow: isRunningNow ? "0 0 0 3px rgba(99,102,241,.30)" : "none",
                  }}
                >
                  {icon}
                </div>
                <span style={{ fontSize: 10, fontWeight: isRunningNow ? 600 : 400, color: isRunningNow ? "var(--accent)" : isComplete ? "var(--text)" : "var(--text-secondary)", whiteSpace: "nowrap" }}>
                  {def.label}
                </span>
              </div>
              {i < STEP_DEFS.length - 1 && (
                <div style={{ height: 2, width: 16, background: isComplete ? "var(--success)" : "var(--border)", marginBottom: 14, flexShrink: 0, transition: "background .3s" }} />
              )}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes stepPulse { 0%,100%{box-shadow:0 0 0 3px rgba(99,102,241,.28)} 50%{box-shadow:0 0 0 7px rgba(99,102,241,.10)} }`}</style>
    </div>
  );
}
