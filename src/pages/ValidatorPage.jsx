import { useState } from "react";
import { validateF6, fetchSampleF6 } from "../api/client";
import PipelineCircuit from "../components/PipelineCircuit";
import TransactionBadge from "../components/TransactionBadge";
import PageHeader from "../components/PageHeader";
import { IconCheck, IconX, IconWarn, IconInfo, IconSpinner } from "../components/Icons";

const STATUS_COLOR = {
  PASS:  { bg: "var(--status-success-bg)", border: "var(--status-success)", text: "var(--status-success)" },
  WARN:  { bg: "var(--status-warn-bg)",    border: "var(--status-warn)",    text: "var(--status-warn)" },
  ERROR: { bg: "var(--status-error-bg)",   border: "var(--status-error)",   text: "var(--status-error)" },
  INFO:  { bg: "var(--status-info-bg)",    border: "var(--status-info)",    text: "var(--status-info)" },
  SKIP:  { bg: "var(--status-neutral-bg)", border: "var(--status-neutral)", text: "var(--status-neutral)" },
};

const OVERALL_COLOR = {
  VALID:               { bg: "var(--status-success-bg)", border: "var(--status-success)", text: "var(--status-success)" },
  VALID_WITH_WARNINGS: { bg: "var(--status-warn-bg)",    border: "var(--status-warn)",    text: "var(--status-warn)" },
  INVALID:             { bg: "var(--status-error-bg)",   border: "var(--status-error)",   text: "var(--status-error)" },
};

const TX_SAMPLE_TYPES = ["RETAIL", "COB", "CONTROLLED"];
const STATUS_FILTERS  = ["ALL", "ERROR", "WARN", "PASS", "INFO", "SKIP"];

function StatusIcon({ status }) {
  const c = STATUS_COLOR[status] || STATUS_COLOR.SKIP;
  if (status === "PASS")  return <IconCheck size={13} color={c.text} />;
  if (status === "ERROR") return <IconX     size={13} color={c.text} />;
  if (status === "WARN")  return <IconWarn  size={13} color={c.text} />;
  if (status === "INFO")  return <IconInfo  size={13} color={c.text} />;
  return <span style={{ fontSize: 9, color: c.text }}>—</span>;
}

function ScoreBar({ score }) {
  const color = score >= 90 ? "var(--status-success)" : score >= 70 ? "var(--status-warn)" : "var(--status-error)";
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
        <span style={{ fontSize: 48, fontWeight: 700, color, fontFamily: "var(--font-ui)", lineHeight: 1 }}>
          {score}
        </span>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)" }}>/ 100</span>
      </div>
      <div style={{ height: 8, background: "var(--bg-raised)", borderRadius: "var(--radius-full)", overflow: "hidden", width: 200 }}>
        <div style={{
          height: "100%",
          width: `${score}%`,
          background: color,
          borderRadius: "var(--radius-full)",
          animation: "scoreGrow 600ms ease forwards",
        }} />
      </div>
    </div>
  );
}

function CategoryBar({ label, cat }) {
  const total   = cat.total || 1;
  const errPct  = (cat.errors   / total) * 100;
  const warnPct = (cat.warnings / total) * 100;
  const passPct = (cat.passed   / total) * 100;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "capitalize", color: "var(--text-secondary)" }}>
          {label}
        </span>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
          {cat.passed}/{cat.total} passed
          {cat.errors   > 0 && <span style={{ color: "var(--status-error)" }}> · {cat.errors}E</span>}
          {cat.warnings > 0 && <span style={{ color: "var(--status-warn)" }}> · {cat.warnings}W</span>}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: "var(--radius-full)", background: "var(--bg-raised)", overflow: "hidden", display: "flex" }}>
        <div style={{ width: `${errPct}%`,  background: "var(--status-error)", transition: "width .4s" }} />
        <div style={{ width: `${warnPct}%`, background: "var(--status-warn)",  transition: "width .4s" }} />
        <div style={{ width: `${passPct}%`, background: "var(--status-success)", transition: "width .4s" }} />
      </div>
    </div>
  );
}

function CheckRow({ check }) {
  const [expanded, setExpanded] = useState(false);
  const c = STATUS_COLOR[check.status] || STATUS_COLOR.SKIP;
  const rowBg = check.status === "ERROR" ? "var(--status-error-bg)" : check.status === "WARN" ? "var(--status-warn-bg)" : "transparent";

  return (
    <div
      onClick={() => setExpanded(v => !v)}
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "10px 14px",
        borderBottom: "1px solid var(--border-subtle)",
        background: expanded ? "var(--bg-overlay)" : rowBg,
        cursor: check.expected ? "pointer" : "default",
        transition: "background var(--transition-fast)",
      }}
      onMouseEnter={e => !expanded && (e.currentTarget.style.background = "var(--bg-raised)")}
      onMouseLeave={e => !expanded && (e.currentTarget.style.background = rowBg)}
    >
      <div style={{ marginTop: 1, flexShrink: 0 }}>
        <StatusIcon status={check.status} />
      </div>

      <span style={{
        display: "inline-flex", padding: "2px 6px",
        borderRadius: "var(--radius-sm)",
        background: "var(--bg-raised)",
        border: `1px solid var(--border-subtle)`,
        fontSize: "var(--text-xs)", color: "var(--text-tertiary)",
        fontFamily: "var(--font-mono)", flexShrink: 0, whiteSpace: "nowrap",
      }}>
        {check.segment || "—"}
      </span>

      <span style={{ fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)", color: "var(--text-code)", flexShrink: 0, minWidth: 70 }}>
        {check.field_id || "—"}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>{check.message}</div>
        {expanded && check.expected && (
          <div style={{
            marginTop: 6, fontSize: "var(--text-xs)", color: "var(--text-secondary)",
            fontFamily: "var(--font-mono)",
          }}>
            Expected: <span style={{ color: "var(--text-code)" }}>{check.expected}</span>
            {check.actual && check.actual !== check.expected && (
              <> · Actual: <span style={{ color: c.text }}>{check.actual}</span></>
            )}
          </div>
        )}
      </div>

      <span style={{
        display: "inline-flex", padding: "2px 6px",
        borderRadius: "var(--radius-sm)",
        background: c.bg, color: c.text,
        fontSize: "var(--text-xs)", fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.05em",
        flexShrink: 0, whiteSpace: "nowrap",
      }}>
        {check.category}
      </span>
    </div>
  );
}

export default function ValidatorPage() {
  const [f6Text,      setF6Text]      = useState("");
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [sampleType,  setSampleType]  = useState("RETAIL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [steps,       setSteps]       = useState([]);

  async function handleValidate() {
    if (!f6Text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setStatusFilter("ALL");
    setSteps([]);
    try {
      const data = await validateF6(f6Text);
      setResult(data);
      if (data.agent_steps) setSteps(data.agent_steps);
    } catch (e) {
      setError(e.message || "Validation failed. Is the backend running on port 8000?");
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadSample() {
    try {
      const data = await fetchSampleF6(sampleType);
      setF6Text(data.f6_text);
      setResult(null);
      setError(null);
      setSteps([]);
    } catch (e) {
      setError("Failed to load sample: " + e.message);
    }
  }

  function handleReset() {
    setResult(null);
    setF6Text("");
    setError(null);
    setStatusFilter("ALL");
    setSteps([]);
  }

  const overall    = result ? (OVERALL_COLOR[result.overall_status] || OVERALL_COLOR.INVALID) : null;
  const checks     = result?.checks || [];
  const filtered   = statusFilter === "ALL" ? checks : checks.filter(c => c.status === statusFilter);
  const categories = result?.categories || {};
  const showPipeline = steps.length > 0 || loading;

  const filterBtnStyle = (s) => {
    const sc = STATUS_COLOR[s];
    const isActive = statusFilter === s;
    return {
      padding: "3px 10px", borderRadius: "var(--radius-sm)",
      fontSize: "var(--text-xs)", fontWeight: 600, cursor: "pointer",
      border: `1px solid ${isActive ? (sc?.border || "var(--accent)") : "var(--border-subtle)"}`,
      background: isActive ? (sc?.bg || "var(--status-info-bg)") : "transparent",
      color: isActive ? (sc?.text || "var(--accent-bright)") : "var(--text-tertiary)",
      transition: "all var(--transition-fast)",
    };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader
        eyebrow="Validate"
        title="F6 Transaction Checker"
        subtitle="Validate an F6 transaction against the active rule set without converting."
      />

      {showPipeline && <PipelineCircuit steps={steps} isRunning={loading} />}

      {error && (
        <div style={{
          margin: "16px 40px", padding: "12px 16px",
          background: "var(--status-error-bg)",
          border: "1px solid var(--status-error)",
          borderLeft: "3px solid var(--status-error)",
          borderRadius: "var(--radius-md)",
          color: "var(--status-error)", fontSize: "var(--text-sm)",
        }}>
          {error}
        </div>
      )}

      {!result && (
        <div style={{ padding: "24px 40px", flex: 1 }}>
          {/* Sample type pills */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>Load sample F6:</span>
            {TX_SAMPLE_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setSampleType(t)}
                style={{
                  padding: "3px 10px", borderRadius: "var(--radius-full)",
                  border: `1px solid ${sampleType === t ? "var(--accent)" : "var(--border-subtle)"}`,
                  background: sampleType === t ? "var(--status-info-bg)" : "transparent",
                  color: sampleType === t ? "var(--accent-bright)" : "var(--text-tertiary)",
                  fontSize: "var(--text-xs)", cursor: "pointer",
                }}
              >
                {t}
              </button>
            ))}
            <button
              onClick={handleLoadSample}
              style={{
                padding: "3px 10px", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                background: "transparent", color: "var(--text-tertiary)",
                fontSize: "var(--text-xs)", cursor: "pointer",
              }}
            >
              ↓ Load
            </button>
          </div>

          {/* Textarea */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: 16,
          }}>
            <textarea
              value={f6Text}
              onChange={e => setF6Text(e.target.value)}
              placeholder={"Paste F6 transaction text here…\n\nExample:\nHDR|101-A1=00610279|102-A2=F6|103-A3=B1|…\nINS|302-C2=ZH48291045|…"}
              style={{
                width: "100%", minHeight: 280,
                padding: "14px 16px",
                fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)",
                lineHeight: 1.7,
                background: "var(--bg-code)", color: "var(--text-code)",
                border: "none", outline: "none", resize: "vertical", display: "block",
              }}
              onFocus={e => { e.target.style.boxShadow = "inset 0 0 0 1px var(--border-focus)"; }}
              onBlur={e => { e.target.style.boxShadow = "none"; }}
            />
            <div style={{
              padding: "10px 16px", borderTop: "1px solid var(--border-subtle)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "var(--bg-raised)",
            }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
                {f6Text.trim().split("\n").filter(Boolean).length} segments · {f6Text.length} chars
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                {f6Text && (
                  <button
                    onClick={() => setF6Text("")}
                    style={{
                      background: "none", border: "none",
                      color: "var(--text-tertiary)", fontSize: "var(--text-sm)", cursor: "pointer",
                    }}
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={handleValidate}
                  disabled={!f6Text.trim() || loading}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: f6Text.trim() && !loading ? "linear-gradient(135deg, #2563EB, #7C3AED)" : "var(--bg-raised)",
                    color: f6Text.trim() && !loading ? "#fff" : "var(--text-tertiary)",
                    border: "none", borderRadius: "var(--radius-md)",
                    padding: "7px 18px", fontSize: "var(--text-sm)", fontWeight: 600,
                    cursor: f6Text.trim() && !loading ? "pointer" : "not-allowed",
                    opacity: !f6Text.trim() || loading ? 0.7 : 1,
                  }}
                >
                  {loading && <IconSpinner size={13} color="#fff" />}
                  {loading ? "Validating…" : "Validate →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div style={{ padding: "24px 40px", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={handleReset}
              style={{
                background: "transparent", border: "none",
                color: "var(--text-secondary)", cursor: "pointer",
                fontSize: "var(--text-sm)", padding: "4px 0",
              }}
            >
              ← New validation
            </button>
            <TransactionBadge type={result.transaction_type} />
            {result.rule_set_name && (
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginLeft: "auto" }}>
                Rule set: <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{result.rule_set_name}</span>
              </span>
            )}
          </div>

          {/* Overall status + score */}
          <div style={{
            background: "var(--bg-surface)",
            border: `1px solid ${overall.border}`,
            borderRadius: "var(--radius-lg)",
            padding: "20px 24px",
            display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap",
          }}>
            <ScoreBar score={result.summary.score} />

            <div style={{ flex: 1 }}>
              <div style={{
                display: "inline-flex", alignItems: "center",
                padding: "4px 12px", borderRadius: "var(--radius-md)",
                background: overall.bg, border: `1px solid ${overall.border}`,
                color: overall.text, fontSize: "var(--text-sm)", fontWeight: 700,
                letterSpacing: "0.05em", marginBottom: 12,
              }}>
                {result.overall_status.replace(/_/g, " ")}
              </div>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {[
                  { label: "Total",    val: result.summary.total_checks, color: "var(--text-primary)" },
                  { label: "Passed",   val: result.summary.passed,       color: "var(--status-success)" },
                  { label: "Warnings", val: result.summary.warnings,     color: "var(--status-warn)" },
                  { label: "Errors",   val: result.summary.errors,       color: "var(--status-error)" },
                ].map(({ label, val, color }) => (
                  <div key={label}>
                    <div style={{ fontSize: "var(--text-xl)", fontWeight: 700, color }}>{val}</div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontWeight: 600 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category breakdown */}
            {Object.keys(categories).length > 0 && (
              <div style={{ flex: 2, minWidth: 260 }}>
                {Object.entries(categories).map(([cat, data]) => (
                  <CategoryBar key={cat} label={cat} cat={data} />
                ))}
              </div>
            )}
          </div>

          {/* Checks list */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)", overflow: "hidden",
          }}>
            {/* Filter bar */}
            <div style={{
              padding: "10px 14px", background: "var(--bg-raised)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
            }}>
              <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-tertiary)", marginRight: 4 }}>Filter:</span>
              {STATUS_FILTERS.map(s => {
                const count = s === "ALL" ? checks.length : checks.filter(c => c.status === s).length;
                return (
                  <button key={s} onClick={() => setStatusFilter(s)} style={filterBtnStyle(s)}>
                    {s} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
                  </button>
                );
              })}
              <span style={{ marginLeft: "auto", fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
                {filtered.length} of {checks.length} checks shown
              </span>
            </div>

            {/* Check rows */}
            {filtered.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "var(--text-base)" }}>
                No checks match the current filter.
              </div>
            ) : (
              <div style={{ maxHeight: 520, overflowY: "auto" }}>
                {filtered.map((c, i) => (
                  <CheckRow key={`${c.check_id}-${i}`} check={c} />
                ))}
              </div>
            )}
          </div>

          {/* Parse errors */}
          {result.parse_errors?.length > 0 && (
            <div style={{
              background: "var(--status-error-bg)",
              border: "1px solid var(--status-error)",
              borderRadius: "var(--radius-md)", padding: "14px 16px",
            }}>
              <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--status-error)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Parse Warnings ({result.parse_errors.length})
              </div>
              {result.parse_errors.map((e, i) => (
                <div key={i} style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: 4, fontFamily: "var(--font-mono)" }}>
                  {typeof e === "string" ? e : JSON.stringify(e)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
