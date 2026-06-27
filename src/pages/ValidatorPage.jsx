import { useState } from "react";
import { validateF6, fetchSampleF6 } from "../api/client";
import PipelineSteps from "../components/PipelineSteps";
import TransactionBadge from "../components/TransactionBadge";

const STATUS_COLOR = {
  PASS:  { bg: "#0F3128", border: "#22C55E", text: "#4ADE80" },
  WARN:  { bg: "#2A1F08", border: "#F59E0B", text: "#FCD34D" },
  ERROR: { bg: "#2A0F0F", border: "#EF4444", text: "#F87171" },
  INFO:  { bg: "#0F1D2A", border: "#38BDF8", text: "#7DD3FC" },
  SKIP:  { bg: "#1A1F2E", border: "#4B5563", text: "#9CA3AF" },
};

const OVERALL_COLOR = {
  VALID:                { bg: "#0F3128", border: "#22C55E", text: "#4ADE80" },
  VALID_WITH_WARNINGS:  { bg: "#2A1F08", border: "#F59E0B", text: "#FCD34D" },
  INVALID:              { bg: "#2A0F0F", border: "#EF4444", text: "#F87171" },
};

const TX_SAMPLE_TYPES = ["RETAIL", "COB", "CONTROLLED"];
const STATUS_FILTERS  = ["ALL", "ERROR", "WARN", "PASS", "INFO", "SKIP"];

function ScoreRing({ score }) {
  const r   = 36;
  const circ = 2 * Math.PI * r;
  const pct  = Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * circ;
  const color = pct >= 90 ? "#4ADE80" : pct >= 70 ? "#FCD34D" : "#F87171";

  return (
    <div style={{ position: "relative", width: 100, height: 100 }}>
      <svg width={100} height={100} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={50} cy={50} r={r} fill="none"
          stroke="#21262D" strokeWidth={8} />
        <circle cx={50} cy={50} r={r} fill="none"
          stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray .6s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 20, fontWeight: 800, color }}>{pct}</span>
        <span style={{ fontSize: 9, color: "var(--text-secondary)", fontWeight: 600 }}>/ 100</span>
      </div>
    </div>
  );
}

function CategoryBar({ label, cat }) {
  const total = cat.total || 1;
  const errPct  = (cat.errors   / total) * 100;
  const warnPct = (cat.warnings / total) * 100;
  const passPct = (cat.passed   / total) * 100;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "capitalize", color: "var(--text)" }}>
          {label}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
          {cat.passed}/{cat.total} passed
          {cat.errors > 0   && <span style={{ color: "#F87171" }}> · {cat.errors}E</span>}
          {cat.warnings > 0 && <span style={{ color: "#FCD34D" }}> · {cat.warnings}W</span>}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "#21262D", overflow: "hidden", display: "flex" }}>
        <div style={{ width: `${errPct}%`,  background: "#EF4444", transition: "width .4s" }} />
        <div style={{ width: `${warnPct}%`, background: "#F59E0B", transition: "width .4s" }} />
        <div style={{ width: `${passPct}%`, background: "#22C55E", transition: "width .4s" }} />
      </div>
    </div>
  );
}

function CheckRow({ check }) {
  const c = STATUS_COLOR[check.status] || STATUS_COLOR.SKIP;
  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      <td style={{ padding: "8px 10px", width: 70 }}>
        <span style={{
          display: "inline-block", padding: "2px 7px",
          borderRadius: 4, fontSize: 10, fontWeight: 700,
          background: c.bg, border: `1px solid ${c.border}`, color: c.text,
        }}>
          {check.status}
        </span>
      </td>
      <td style={{ padding: "8px 10px", width: 90 }}>
        <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-secondary)" }}>
          {check.category}
        </span>
      </td>
      <td style={{ padding: "8px 10px", width: 80 }}>
        <span style={{ fontSize: 11, fontFamily: "var(--mono)", fontWeight: 600, color: "var(--cyan)" }}>
          {check.segment || "—"}
        </span>
      </td>
      <td style={{ padding: "8px 10px", width: 90 }}>
        <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-secondary)" }}>
          {check.field_id || "—"}
        </span>
      </td>
      <td style={{ padding: "8px 12px" }}>
        <div style={{ fontSize: 12, color: "var(--text)", marginBottom: check.expected ? 2 : 0 }}>
          {check.message}
        </div>
        {check.expected && (
          <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
            Expected: <span style={{ fontFamily: "var(--mono)" }}>{check.expected}</span>
            {check.actual && check.actual !== check.expected &&
              <> · Actual: <span style={{ fontFamily: "var(--mono)", color: c.text }}>{check.actual}</span></>
            }
          </div>
        )}
      </td>
    </tr>
  );
}

export default function ValidatorPage() {
  const [f6Text,      setF6Text]      = useState("");
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [sampleType,  setSampleType]  = useState("RETAIL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  async function handleValidate() {
    if (!f6Text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setStatusFilter("ALL");
    try {
      const data = await validateF6(f6Text);
      setResult(data);
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
    } catch (e) {
      setError("Failed to load sample: " + e.message);
    }
  }

  function handleReset() {
    setResult(null);
    setF6Text("");
    setError(null);
    setStatusFilter("ALL");
  }

  const overall   = result ? (OVERALL_COLOR[result.overall_status] || OVERALL_COLOR.INVALID) : null;
  const checks    = result?.checks || [];
  const filtered  = statusFilter === "ALL" ? checks : checks.filter(c => c.status === statusFilter);
  const categories = result?.categories || {};

  return (
    <div className="main-content">
      {/* ── Input ──────────────────────────────────────────────────────────── */}
      {!result && (
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 24px" }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{
              fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 6,
              background: "linear-gradient(135deg, #F1F5F9 30%, #7C7FFF 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              F6 Transaction Validator
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Validate an F6 transaction against the active rule set without converting.
              Checks structural integrity, mandatory fields, format rules, business logic,
              and deprecated field usage.
            </p>
          </div>

          {/* Sample loader */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Load sample F6:</span>
            {TX_SAMPLE_TYPES.map(t => (
              <button
                key={t}
                className={`btn ${sampleType === t ? "btn-primary" : "btn-secondary"}`}
                style={{ fontSize: 11, padding: "5px 12px" }}
                onClick={() => setSampleType(t)}
              >
                {t}
              </button>
            ))}
            <button
              className="btn btn-secondary"
              style={{ fontSize: 11, padding: "5px 12px" }}
              onClick={handleLoadSample}
            >
              ↓ Load
            </button>
          </div>

          {/* Textarea */}
          <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
            <textarea
              value={f6Text}
              onChange={e => setF6Text(e.target.value)}
              placeholder={"Paste F6 transaction text here…\n\nExample:\nHDR|101-A1=00610279|102-A2=F6|103-A3=B1|…\nINS|302-C2=ZH48291045|…"}
              style={{
                width: "100%", minHeight: 280,
                padding: "16px 18px", background: "transparent",
                border: "none", outline: "none", resize: "vertical",
                fontFamily: "var(--mono)", fontSize: 12,
                color: "var(--text)", lineHeight: 1.7,
              }}
            />
            <div style={{
              padding: "10px 18px", borderTop: "1px solid var(--border-bright)",
              display: "flex", alignItems: "center",
              justifyContent: "space-between",
              background: "var(--bg-elevated)",
            }}>
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                {f6Text.trim().split("\n").filter(Boolean).length} segments · {f6Text.length} chars
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                {f6Text && (
                  <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setF6Text("")}>
                    Clear
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  style={{ fontSize: 13 }}
                  onClick={handleValidate}
                  disabled={!f6Text.trim() || loading}
                >
                  {loading ? "Validating…" : "Validate →"}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div style={{
              padding: "12px 16px", background: "var(--error-light)",
              border: "1px solid var(--error)", borderRadius: "var(--radius)",
              color: "var(--error)", fontSize: 13,
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>
      )}

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {result && (
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <button className="btn btn-ghost" onClick={handleReset} style={{ fontSize: 13 }}>
              ← New validation
            </button>
            <TransactionBadge type={result.transaction_type} />
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              {result.rule_set_name && (
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  Rule set: <span style={{ color: "var(--text)", fontWeight: 600 }}>{result.rule_set_name}</span>
                </span>
              )}
            </div>
          </div>

          {/* Pipeline */}
          {result.agent_steps?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <PipelineSteps steps={result.agent_steps} isRunning={false} />
            </div>
          )}

          {/* Overall status + score */}
          <div className="card" style={{
            marginBottom: 20, padding: "20px 24px",
            display: "flex", alignItems: "center", gap: 24,
            border: `1px solid ${overall.border}`,
            flexWrap: "wrap",
          }}>
            <ScoreRing score={result.summary.score} />
            <div style={{ flex: 1 }}>
              <div style={{
                display: "inline-block", padding: "3px 12px",
                borderRadius: 6, fontSize: 12, fontWeight: 800,
                background: overall.bg, border: `1px solid ${overall.border}`, color: overall.text,
                marginBottom: 8, letterSpacing: ".04em",
              }}>
                {result.overall_status.replace(/_/g, " ")}
              </div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {[
                  { label: "Total Checks", val: result.summary.total_checks, color: "var(--text)" },
                  { label: "Passed",       val: result.summary.passed,       color: "#4ADE80" },
                  { label: "Warnings",     val: result.summary.warnings,     color: "#FCD34D" },
                  { label: "Errors",       val: result.summary.errors,       color: "#F87171" },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}</div>
                    <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category breakdown */}
            <div style={{ flex: 2, minWidth: 260 }}>
              {Object.entries(categories).map(([cat, data]) => (
                <CategoryBar key={cat} label={cat} cat={data} />
              ))}
            </div>
          </div>

          {/* Checks table */}
          <div className="card" style={{ overflow: "hidden" }}>
            {/* Filter bar */}
            <div style={{
              padding: "10px 16px",
              background: "var(--bg-elevated)",
              borderBottom: "1px solid var(--border-bright)",
              display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginRight: 4 }}>
                Filter:
              </span>
              {STATUS_FILTERS.map(s => {
                const count = s === "ALL" ? checks.length : checks.filter(c => c.status === s).length;
                const active = statusFilter === s;
                const sc = STATUS_COLOR[s];
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    style={{
                      padding: "3px 10px", borderRadius: 4,
                      fontSize: 11, fontWeight: 600, cursor: "pointer",
                      border: `1px solid ${active ? (sc?.border || "#7C7FFF") : "var(--border-bright)"}`,
                      background: active ? (sc?.bg || "#1D1F3A") : "transparent",
                      color: active ? (sc?.text || "#7C7FFF") : "var(--text-secondary)",
                    }}
                  >
                    {s} {count > 0 && <span style={{ opacity: .75 }}>({count})</span>}
                  </button>
                );
              })}
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-secondary)" }}>
                {filtered.length} of {checks.length} checks shown
              </span>
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
                No checks match the current filter.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-bright)" }}>
                      {["Status", "Category", "Segment", "Field", "Message / Details"].map(h => (
                        <th key={h} style={{
                          padding: "8px 10px", textAlign: "left",
                          fontSize: 10, fontWeight: 700,
                          color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".06em",
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c, i) => (
                      <CheckRow key={`${c.check_id}-${i}`} check={c} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Parse errors */}
          {result.parse_errors?.length > 0 && (
            <div className="card" style={{ marginTop: 16, padding: "14px 18px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#F87171", marginBottom: 8 }}>
                PARSE WARNINGS ({result.parse_errors.length})
              </div>
              {result.parse_errors.map((e, i) => (
                <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4,
                  fontFamily: "var(--mono)" }}>
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
