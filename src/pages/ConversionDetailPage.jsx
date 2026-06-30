import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getConversion, downloadConversionFile, fetchLLMDecisions } from "../api/client";

import OutputPanel from "../components/OutputPanel";
import ValidationFindings from "../components/ValidationFindings";
import AuditSummaryBar from "../components/AuditSummaryBar";
import AuditTable from "../components/AuditTable";
import TransactionBadge from "../components/TransactionBadge";
import PipelineCircuit from "../components/PipelineCircuit";
import PageHeader from "../components/PageHeader";
import { IconDownload, IconSpinner, IconCheck, IconX } from "../components/Icons";

const CONFIDENCE_COLOR = {
  HIGH:   { bg: "var(--status-success-bg)", color: "var(--status-success)" },
  MEDIUM: { bg: "var(--status-teal-bg)",    color: "var(--status-teal)"    },
  LOW:    { bg: "var(--status-neutral-bg)", color: "var(--status-neutral)" },
};

function AIBadge() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 7px", borderRadius: "var(--radius-full)",
      background: "var(--status-purple-bg)", color: "var(--status-purple)",
      fontSize: "var(--text-xs)", fontWeight: 700,
      letterSpacing: "0.06em", fontFamily: "var(--font-ui)",
    }}>
      AI
    </span>
  );
}

function LLMPanel({ decisions }) {
  const [expanded, setExpanded] = useState(null);
  if (!decisions || decisions.length === 0) return null;

  return (
    <div style={{
      background: "var(--status-purple-bg)",
      border: "1px solid var(--status-purple)",
      borderLeft: "3px solid var(--status-purple)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 16px",
        borderBottom: "1px solid var(--status-purple)",
      }}>
        <AIBadge />
        <span style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--status-purple)" }}>
          LLM-Assisted Resolution
        </span>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginLeft: 4 }}>
          {decisions.length} decision{decisions.length !== 1 ? "s" : ""} · PHI masked before API call
        </span>
      </div>
      <div style={{ padding: "10px 0" }}>
        {decisions.map((d, i) => {
          const isOpen = expanded === i;
          const cc = CONFIDENCE_COLOR[d.confidence] || CONFIDENCE_COLOR.LOW;
          return (
            <div key={i}>
              <div
                onClick={() => setExpanded(isOpen ? null : i)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 16px", cursor: "pointer",
                  background: isOpen ? "rgba(139,92,246,0.05)" : "transparent",
                }}
                onMouseEnter={e => !isOpen && (e.currentTarget.style.background = "rgba(139,92,246,0.03)")}
                onMouseLeave={e => !isOpen && (e.currentTarget.style.background = "transparent")}
              >
                <code style={{ fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)", color: "var(--text-code)", minWidth: 80 }}>
                  {d.field_id}
                </code>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)", flex: 1 }}>
                  {d.field_name || d.field_id}
                </span>
                <span style={{
                  padding: "1px 6px", borderRadius: "var(--radius-full)",
                  background: cc.bg, color: cc.color,
                  fontSize: "var(--text-xs)", fontWeight: 600,
                }}>
                  {d.confidence}
                </span>
                <span style={{
                  padding: "1px 6px", borderRadius: "var(--radius-full)",
                  background: d.action === "RESOLVED" ? "var(--status-success-bg)" : "var(--status-neutral-bg)",
                  color: d.action === "RESOLVED" ? "var(--status-success)" : "var(--status-neutral)",
                  fontSize: "var(--text-xs)", fontWeight: 600,
                }}>
                  {d.action}
                </span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginLeft: 4 }}>
                  {isOpen ? "▲" : "▼"}
                </span>
              </div>
              {isOpen && (
                <div style={{
                  padding: "10px 16px 14px 24px",
                  background: "rgba(139,92,246,0.04)",
                  borderTop: "1px solid rgba(139,92,246,0.12)",
                  display: "flex", gap: 24, flexWrap: "wrap",
                }}>
                  {d.resolved_value && (
                    <div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.07em" }}>Resolved value</div>
                      <code style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-mono)", color: "var(--status-success)" }}>{d.resolved_value}</code>
                    </div>
                  )}
                  {d.original_value && (
                    <div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.07em" }}>Original</div>
                      <code style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>{d.original_value}</code>
                    </div>
                  )}
                  {d.segment_id && (
                    <div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.07em" }}>Segment</div>
                      <code style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-mono)", color: "var(--text-code)" }}>{d.segment_id}</code>
                    </div>
                  )}
                  {d.reasoning && (
                    <div style={{ flex: "1 1 300px" }}>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.07em" }}>Reasoning</div>
                      <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{d.reasoning}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZoneName: "short",
  });
}

export default function ConversionDetailPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [typeFilter,  setTypeFilter]  = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [llmDecisions, setLlmDecisions] = useState([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getConversion(id)
      .then(d => {
        setData(d);
        // Fetch LLM decisions in parallel — non-blocking
        fetchLLMDecisions(id)
          .then(r => setLlmDecisions(r.decisions || []))
          .catch(() => {});
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDownload(type) {
    setDownloading(type);
    try {
      await downloadConversionFile(id, type);
    } catch (e) {
      setError(`Download failed: ${e.message}`);
    } finally {
      setDownloading(null);
    }
  }

  if (loading) return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      flex: 1, color: "var(--text-tertiary)", fontSize: "var(--text-sm)",
      gap: 8,
    }}>
      <IconSpinner size={16} color="var(--accent)" /> Loading conversion…
    </div>
  );

  if (error) return (
    <div style={{ padding: "40px" }}>
      <button
        onClick={() => navigate("/history")}
        style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "var(--text-sm)", marginBottom: 16, padding: 0 }}
      >
        ← History
      </button>
      <div style={{
        padding: "16px", borderRadius: "var(--radius-md)",
        background: "var(--status-error-bg)", border: "1px solid var(--status-error)",
        color: "var(--status-error)",
      }}>
        {error}
      </div>
    </div>
  );

  if (!data) return null;

  const conv  = data;
  const audit = data.audit || { summary: {}, entries: [], findings: [] };
  const steps = data.agent_steps || [];
  const isOk  = conv.status === "success";

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader
        eyebrow="History"
        title={conv.filename || "Conversion Detail"}
        subtitle={`${fmtDate(conv.created_at)}${conv.rule_set_version ? ` · ${conv.rule_set_version}` : ""}`}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {conv.transaction_type && <TransactionBadge type={conv.transaction_type} />}
            {llmDecisions.length > 0 && <AIBadge />}
            <span style={{
              padding: "3px 10px", borderRadius: "var(--radius-full)",
              background: isOk ? "var(--status-success-bg)" : "var(--status-error-bg)",
              color: isOk ? "var(--status-success)" : "var(--status-error)",
              fontSize: "var(--text-xs)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4,
            }}>
              {isOk ? <IconCheck size={11} color="var(--status-success)" /> : <IconX size={11} color="var(--status-error)" />}
              {isOk ? "Success" : "Failed"}
            </span>
          </div>
        }
      >
        <button
          onClick={() => navigate("/history")}
          style={{
            background: "none", border: "none", color: "var(--text-secondary)",
            cursor: "pointer", fontSize: "var(--text-sm)", padding: "4px 0", marginTop: 4,
          }}
        >
          ← Back to History
        </button>
      </PageHeader>

      {/* Pipeline steps */}
      {steps.length > 0 && <PipelineCircuit steps={steps} isRunning={false} />}

      <div style={{ padding: "24px 40px", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Metadata row */}
        <div style={{
          display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center",
          padding: "12px 16px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
        }}>
          <div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 2 }}>Converted</div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{fmtDate(conv.created_at)}</div>
          </div>
          {conv.completed_at && (
            <div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 2 }}>Completed</div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{fmtDate(conv.completed_at)}</div>
            </div>
          )}
          {conv.rule_set_version && (
            <div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 2 }}>Rule set</div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--status-teal)", fontFamily: "var(--font-mono)" }}>{conv.rule_set_version}</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 2 }}>ID</div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{conv.id}</div>
          </div>

          {isOk && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button
                onClick={() => handleDownload("f6")}
                disabled={downloading === "f6"}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "transparent", border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)", borderRadius: "var(--radius-md)",
                  padding: "6px 12px", fontSize: "var(--text-sm)", cursor: "pointer",
                }}
              >
                {downloading === "f6" ? <IconSpinner size={13} /> : <IconDownload size={13} />}
                F6 Output
              </button>
              <button
                onClick={() => handleDownload("json")}
                disabled={downloading === "json"}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "transparent", border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)", borderRadius: "var(--radius-md)",
                  padding: "6px 12px", fontSize: "var(--text-sm)", cursor: "pointer",
                }}
              >
                {downloading === "json" ? <IconSpinner size={13} /> : <IconDownload size={13} />}
                Audit JSON
              </button>
            </div>
          )}
        </div>

        {/* Error message for failed conversions */}
        {conv.status === "failed" && conv.error_message && (
          <div style={{
            padding: "14px 16px", borderRadius: "var(--radius-md)",
            background: "var(--status-error-bg)",
            border: "1px solid var(--status-error)",
            borderLeft: "3px solid var(--status-error)",
            color: "var(--status-error)", fontSize: "var(--text-sm)",
          }}>
            <strong>Error: </strong>{conv.error_message}
          </div>
        )}

        {/* D.0 / F6 side-by-side */}
        {isOk && conv.f6_output && (
          <OutputPanel
            d0Input={conv.d0_input}
            f6Output={conv.f6_output}
            auditEntries={audit.entries}
          />
        )}

        {/* LLM decisions panel */}
        {llmDecisions.length > 0 && <LLMPanel decisions={llmDecisions} />}

        {/* Validation findings */}
        <ValidationFindings findings={audit.findings} />

        {/* Audit summary + table */}
        {audit.entries.length > 0 && (
          <>
            <AuditSummaryBar
              summary={audit.summary}
              activeFilter={typeFilter}
              onFilter={setTypeFilter}
            />
            <AuditTable entries={audit.entries} changeTypeFilter={typeFilter} />
          </>
        )}
      </div>
    </div>
  );
}
