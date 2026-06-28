import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getConversion, downloadConversionFile } from "../api/client";

import OutputPanel from "../components/OutputPanel";
import ValidationFindings from "../components/ValidationFindings";
import AuditSummaryBar from "../components/AuditSummaryBar";
import AuditTable from "../components/AuditTable";
import TransactionBadge from "../components/TransactionBadge";
import PipelineCircuit from "../components/PipelineCircuit";
import PageHeader from "../components/PageHeader";
import { IconDownload, IconSpinner, IconCheck, IconX } from "../components/Icons";

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
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getConversion(id)
      .then(setData)
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
