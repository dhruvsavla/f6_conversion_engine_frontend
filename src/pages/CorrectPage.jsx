import { useState } from "react";
import { correctF6Stream, fetchSampleF6 } from "../api/client";
import PipelineCircuit from "../components/PipelineCircuit";
import TransactionBadge from "../components/TransactionBadge";
import PageHeader from "../components/PageHeader";
import AuditTable from "../components/AuditTable";
import { IconCheck, IconX, IconWarn, IconCopy, IconDownload } from "../components/Icons";

const CONFIDENCE_COLOR = {
  HIGH:   { bg: "var(--status-success-bg)", text: "var(--status-success)", border: "var(--status-success)" },
  MEDIUM: { bg: "var(--status-warn-bg)",    text: "var(--status-warn)",    border: "var(--status-warn)"    },
  LOW:    { bg: "var(--status-error-bg)",   text: "var(--status-error)",   border: "var(--status-error)"   },
};

const STATUS_META = {
  CORRECTED:           { label: "Corrected",            color: "var(--status-success)" },
  PARTIALLY_CORRECTED: { label: "Partially Corrected",  color: "var(--status-warn)"    },
  UNCORRECTABLE:       { label: "Uncorrectable",        color: "var(--status-error)"   },
  VALID:               { label: "Already Valid",        color: "var(--status-success)" },
};

function ScoreDelta({ pre, post }) {
  const preColor  = pre  >= 90 ? "var(--status-success)" : pre  >= 70 ? "var(--status-warn)" : "var(--status-error)";
  const postColor = post >= 90 ? "var(--status-success)" : post >= 70 ? "var(--status-warn)" : "var(--status-error)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>Before</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 36, fontWeight: 700, color: preColor, fontFamily: "var(--font-ui)", lineHeight: 1 }}>{pre}</span>
          <div style={{ height: 8, width: 120, background: "var(--bg-raised)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pre}%`, background: preColor, borderRadius: "var(--radius-full)" }} />
          </div>
        </div>
      </div>
      <span style={{ fontSize: 20, color: "var(--text-tertiary)" }}>→</span>
      <div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>After</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 36, fontWeight: 700, color: postColor, fontFamily: "var(--font-ui)", lineHeight: 1 }}>{post}</span>
          <div style={{ height: 8, width: 120, background: "var(--bg-raised)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${post}%`, background: postColor, borderRadius: "var(--radius-full)", transition: "width 600ms ease" }} />
          </div>
        </div>
      </div>
      {post > pre && (
        <span style={{
          padding: "4px 10px", borderRadius: "var(--radius-full)",
          background: "var(--status-success-bg)", color: "var(--status-success)",
          border: "1px solid var(--status-success)", fontSize: 13, fontWeight: 700,
        }}>
          +{post - pre} pts
        </span>
      )}
    </div>
  );
}

function CorrectionRow({ item }) {
  const [expanded, setExpanded] = useState(false);
  const conf = CONFIDENCE_COLOR[item.confidence] || CONFIDENCE_COLOR.MEDIUM;
  return (
    <div
      onClick={() => setExpanded(v => !v)}
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "10px 14px",
        borderBottom: "1px solid var(--border-subtle)",
        cursor: "pointer",
        background: expanded ? "var(--bg-overlay)" : "transparent",
        transition: "background var(--transition-fast)",
      }}
      onMouseEnter={e => !expanded && (e.currentTarget.style.background = "var(--bg-raised)")}
      onMouseLeave={e => !expanded && (e.currentTarget.style.background = "transparent")}
    >
      <div style={{ marginTop: 2, flexShrink: 0 }}>
        <IconCheck size={13} color="var(--status-success)" />
      </div>
      <span style={{
        display: "inline-flex", padding: "2px 6px", borderRadius: "var(--radius-sm)",
        background: "var(--bg-raised)", border: "1px solid var(--border-subtle)",
        fontSize: "var(--text-xs)", color: "var(--text-tertiary)",
        fontFamily: "var(--font-mono)", flexShrink: 0, whiteSpace: "nowrap",
      }}>
        {item.segment || "—"}
      </span>
      <span style={{ fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)", color: "var(--text-code)", flexShrink: 0, minWidth: 70 }}>
        {item.field_id}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
            {item.original_value !== undefined && item.original_value !== ""
              ? <><span style={{ color: "var(--status-error)", textDecoration: "line-through" }}>{item.original_value || "[empty]"}</span>{" → "}</>
              : <><span style={{ color: "var(--text-tertiary)", fontStyle: "italic" }}>[missing]</span>{" → "}</>
            }
            <span style={{ color: "var(--status-success)", fontWeight: 600 }}>{item.corrected_value}</span>
          </span>
          {item.field_name && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>{item.field_name}</span>
          )}
        </div>
        {expanded && item.reasoning && (
          <div style={{ marginTop: 6, fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {item.reasoning}
          </div>
        )}
      </div>
      <span style={{
        display: "inline-flex", padding: "2px 6px", borderRadius: "var(--radius-sm)",
        background: conf.bg, border: `1px solid ${conf.border}`,
        fontSize: 9, fontWeight: 700, color: conf.text,
        fontFamily: "var(--font-mono)", flexShrink: 0,
      }}>
        {item.confidence}
      </span>
    </div>
  );
}

function UnresolvableRow({ item }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "10px 14px",
      borderBottom: "1px solid var(--border-subtle)",
      background: "var(--status-error-bg)",
    }}>
      <div style={{ marginTop: 2, flexShrink: 0 }}>
        <IconX size={13} color="var(--status-error)" />
      </div>
      <span style={{ fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)", color: "var(--text-code)", flexShrink: 0, minWidth: 70 }}>
        {item.field_id}
      </span>
      <span style={{ fontSize: "var(--text-xs)", color: "var(--status-error)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
        {item.finding_code || "—"}
      </span>
      <div style={{ flex: 1, fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
        {item.reason || "Could not be determined"}
      </div>
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={handleCopy}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        background: "transparent", border: "1px solid var(--border-default)",
        color: "var(--text-secondary)", borderRadius: "var(--radius-md)",
        padding: "5px 12px", fontSize: "var(--text-xs)", cursor: "pointer",
      }}
    >
      {copied ? <IconCheck size={13} color="var(--status-success)" /> : <IconCopy size={13} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function DownloadButton({ text, filename }) {
  function handleDownload() {
    const blob = new Blob([text], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button
      onClick={handleDownload}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        background: "transparent", border: "1px solid var(--border-default)",
        color: "var(--text-secondary)", borderRadius: "var(--radius-md)",
        padding: "5px 12px", fontSize: "var(--text-xs)", cursor: "pointer",
      }}
    >
      <IconDownload size={13} />
      Download
    </button>
  );
}

const SAMPLE_TYPES = ["RETAIL", "COB", "CONTROLLED"];

export default function CorrectPage() {
  const [f6Text,      setF6Text]      = useState("");
  const [steps,       setSteps]       = useState([]);
  const [result,      setResult]      = useState(null);
  const [isRunning,   setIsRunning]   = useState(false);
  const [error,       setError]       = useState(null);

  function _callbacks() {
    return {
      onStep: (stepData) => {
        setSteps(prev => {
          const idx = prev.findIndex(s => s.id === stepData.id);
          if (idx >= 0) { const next = [...prev]; next[idx] = stepData; return next; }
          return [...prev, stepData];
        });
      },
      onResult: (data) => setResult(data),
      onError:  (msg)  => setError(msg),
    };
  }

  async function handleCorrect() {
    if (!f6Text.trim()) return;
    setError(null); setResult(null); setSteps([]); setIsRunning(true);
    try {
      await correctF6Stream(f6Text, _callbacks());
    } catch (e) {
      setError(e.message || "Correction failed. Is the backend running on port 8000?");
    } finally {
      setIsRunning(false);
    }
  }

  async function handleLoadSample(type) {
    try {
      const data = await fetchSampleF6(type);
      setF6Text(data.f6_text || "");
    } catch (e) {
      setError("Failed to load sample: " + e.message);
    }
  }

  function handleReset() {
    setResult(null); setSteps([]); setError(null);
  }

  const showPipeline = steps.length > 0 || isRunning;
  const statusMeta   = result ? STATUS_META[result.status] || STATUS_META.VALID : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader
        eyebrow="Correct"
        title="F6 Correction"
        subtitle="Paste an F6 transaction to validate it and use AI to fix every error and warning it can determine with confidence."
      />

      {showPipeline && <PipelineCircuit steps={steps} isRunning={isRunning} />}

      {error && (
        <div style={{
          margin: "16px 40px", padding: "12px 16px",
          background: "var(--status-error-bg)", border: "1px solid var(--status-error)",
          borderLeft: "3px solid var(--status-error)", borderRadius: "var(--radius-md)",
          color: "var(--status-error)", fontSize: "var(--text-sm)",
        }}>
          {error}
        </div>
      )}

      {/* Input area */}
      {!result && !isRunning && (
        <div style={{ padding: "24px 40px", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-lg)", overflow: "hidden",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)",
            }}>
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)" }}>
                F6 Input
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {SAMPLE_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => handleLoadSample(type)}
                    style={{
                      padding: "3px 10px", borderRadius: "var(--radius-sm)",
                      background: "var(--bg-raised)", border: "1px solid var(--border-subtle)",
                      color: "var(--text-secondary)", fontSize: "var(--text-xs)", cursor: "pointer",
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={f6Text}
              onChange={e => setF6Text(e.target.value)}
              placeholder={"HDR|101-A1=610279|102-A2=D0|103-A3=B1|...\nINS|302-C2=CARD123|...\nCLM|455-EM=RX1001|..."}
              rows={10}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "14px 16px", background: "transparent",
                border: "none", outline: "none", resize: "vertical",
                fontFamily: "var(--font-mono)", fontSize: 13,
                color: "var(--text-primary)", lineHeight: 1.6,
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleCorrect}
              disabled={!f6Text.trim()}
              style={{
                padding: "10px 24px", borderRadius: "var(--radius-md)",
                background: f6Text.trim()
                  ? "linear-gradient(135deg, #2563EB, #7C3AED)"
                  : "var(--bg-raised)",
                color: f6Text.trim() ? "#fff" : "var(--text-tertiary)",
                border: "none", fontSize: "var(--text-sm)", fontWeight: 600,
                cursor: f6Text.trim() ? "pointer" : "not-allowed",
                boxShadow: f6Text.trim() ? "0 4px 16px rgba(37,99,235,0.3)" : "none",
                transition: "all var(--transition-fast)",
              }}
            >
              Validate & Correct
            </button>
          </div>
        </div>
      )}

      {isRunning && !result && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          flex: 1, color: "var(--text-tertiary)", fontSize: "var(--text-sm)",
        }}>
          Correcting…
        </div>
      )}

      {/* Result */}
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
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              ← New correction
            </button>
            <TransactionBadge type={result.transaction_type} />
            {statusMeta && (
              <span style={{
                padding: "3px 10px", borderRadius: "var(--radius-full)",
                background: `${statusMeta.color}22`,
                border: `1px solid ${statusMeta.color}`,
                color: statusMeta.color, fontSize: "var(--text-xs)", fontWeight: 700,
              }}>
                {statusMeta.label}
              </span>
            )}
          </div>

          {/* Score delta */}
          {result.status !== "VALID" && (
            <div style={{
              background: "var(--bg-card)", border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-lg)", padding: "20px 24px",
            }}>
              <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 16, textTransform: "uppercase", letterSpacing: ".06em" }}>
                Validation Score
              </div>
              <ScoreDelta pre={result.pre_score} post={result.post_score} />
            </div>
          )}

          {/* Valid shortcut */}
          {result.status === "VALID" && (
            <div style={{
              background: "var(--status-success-bg)", border: "1px solid var(--status-success)",
              borderRadius: "var(--radius-lg)", padding: "16px 20px",
              display: "flex", alignItems: "center", gap: 10,
              color: "var(--status-success)", fontSize: "var(--text-sm)", fontWeight: 600,
            }}>
              <IconCheck size={16} color="var(--status-success)" />
              This F6 transaction is already valid (score {result.pre_score}/100). No corrections needed.
            </div>
          )}

          {/* Corrections table */}
          {result.corrections && result.corrections.length > 0 && (
            <div style={{
              background: "var(--bg-card)", border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-lg)", overflow: "hidden",
            }}>
              <div style={{
                padding: "12px 14px", borderBottom: "1px solid var(--border-subtle)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <IconCheck size={14} color="var(--status-success)" />
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Corrections Applied
                </span>
                <span style={{
                  marginLeft: "auto", fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)",
                  padding: "2px 8px", borderRadius: "var(--radius-full)",
                  background: "var(--status-success-bg)", color: "var(--status-success)",
                }}>
                  {result.corrections.length}
                </span>
              </div>
              {result.corrections.map((item, i) => (
                <CorrectionRow key={i} item={item} />
              ))}
            </div>
          )}

          {/* Unresolvable */}
          {result.unresolvable && result.unresolvable.length > 0 && (
            <div style={{
              background: "var(--bg-card)", border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-lg)", overflow: "hidden",
            }}>
              <div style={{
                padding: "12px 14px", borderBottom: "1px solid var(--border-subtle)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <IconWarn size={14} color="var(--status-warn)" />
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Could Not Correct
                </span>
                <span style={{
                  marginLeft: "auto", fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)",
                  padding: "2px 8px", borderRadius: "var(--radius-full)",
                  background: "var(--status-warn-bg)", color: "var(--status-warn)",
                }}>
                  {result.unresolvable.length}
                </span>
              </div>
              {result.unresolvable.map((item, i) => (
                <UnresolvableRow key={i} item={item} />
              ))}
            </div>
          )}

          {/* Corrected F6 output */}
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-lg)", overflow: "hidden",
          }}>
            <div style={{
              padding: "12px 14px", borderBottom: "1px solid var(--border-subtle)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)" }}>
                {result.status === "VALID" ? "F6 Output (unchanged)" : "Corrected F6 Output"}
              </span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <CopyButton text={result.f6_output} />
                <DownloadButton text={result.f6_output} filename="corrected_f6.txt" />
              </div>
            </div>
            <pre style={{
              margin: 0, padding: "14px 16px",
              fontFamily: "var(--font-mono)", fontSize: 12,
              color: "var(--text-primary)", lineHeight: 1.6,
              overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all",
              maxHeight: 360, overflowY: "auto",
            }}>
              {result.f6_output}
            </pre>
          </div>

          {/* Audit trail */}
          {result.audit && result.audit.entries && result.audit.entries.length > 0 && (
            <div>
              <div style={{
                display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8,
              }}>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                  Correction Audit Trail
                </span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
                  {(result.audit.summary.corrected || 0)} corrected
                  {" · "}{(result.audit.summary.unchanged || 0)} already valid
                  {result.audit.summary.unresolvable > 0 && ` · ${result.audit.summary.unresolvable} unresolvable`}
                </span>
              </div>
              <AuditTable entries={result.audit.entries} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
