import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getConversion, downloadConversionFile } from "../api/client";

import OutputPanel from "../components/OutputPanel";
import ValidationFindings from "../components/ValidationFindings";
import AuditSummaryBar from "../components/AuditSummaryBar";
import AuditTable from "../components/AuditTable";
import TransactionBadge from "../components/TransactionBadge";
import PipelineSteps from "../components/PipelineSteps";

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
  const [downloading, setDownloading] = useState(null);  // "json" | "f6" | null

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
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px", textAlign: "center", color: "var(--text-secondary)" }}>
      Loading conversion…
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
      <button className="btn btn-ghost" onClick={() => navigate("/history")} style={{ marginBottom: 16 }}>← History</button>
      <div className="card" style={{ padding: 20, color: "var(--error)", background: "var(--error-light)", border: "1px solid var(--error)" }}>{error}</div>
    </div>
  );

  if (!data) return null;

  const conv    = data;
  const audit   = data.audit || { summary: {}, entries: [], findings: [] };
  const steps   = data.agent_steps || [];
  const isOk    = conv.status === "success";

  return (
    <div style={{ maxWidth: 1140, margin: "0 auto", padding: "28px 20px" }}>
      {/* Back + header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
        <button className="btn btn-ghost" onClick={() => navigate("/history")} style={{ fontSize: 13 }}>
          ← History
        </button>
        <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>
          {conv.filename}
        </span>
        {conv.transaction_type && <TransactionBadge type={conv.transaction_type} />}
        <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 999, background: isOk ? "var(--success-light)" : "var(--error-light)", color: isOk ? "var(--success)" : "var(--error)", fontWeight: 700 }}>
          {isOk ? "✓ Success" : "✕ Failed"}
        </span>
      </div>

      {/* Metadata */}
      <div className="card" style={{ padding: "12px 18px", marginBottom: 16, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }}>Converted</div>
          <div style={{ fontSize: 12, color: "var(--text)", fontFamily: "var(--mono)" }}>{fmtDate(conv.created_at)}</div>
        </div>
        {conv.completed_at && (
          <div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }}>Completed</div>
            <div style={{ fontSize: 12, color: "var(--text)", fontFamily: "var(--mono)" }}>{fmtDate(conv.completed_at)}</div>
          </div>
        )}
        {conv.rule_set_version && (
          <div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }}>Rule set</div>
            <div style={{ fontSize: 12, color: "var(--cyan)" }}>{conv.rule_set_version}</div>
          </div>
        )}
        <div>
          <div style={{ fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }}>ID</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--mono)" }}>{conv.id}</div>
        </div>

        {/* Downloads — only when conversion succeeded */}
        {isOk && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              className="btn btn-primary"
              style={{ fontSize: 12, padding: "7px 14px" }}
              onClick={() => handleDownload("f6")}
              disabled={downloading === "f6"}
            >
              {downloading === "f6" ? "⟳" : "⬇"} F6 Output
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: "7px 14px" }}
              onClick={() => handleDownload("json")}
              disabled={downloading === "json"}
            >
              {downloading === "json" ? "⟳" : "⬇"} Audit JSON
            </button>
          </div>
        )}
      </div>

      {/* Error message for failed conversions */}
      {conv.status === "failed" && conv.error_message && (
        <div className="card" style={{ padding: "14px 18px", marginBottom: 16, background: "var(--error-light)", border: "1px solid var(--error)", color: "var(--error)" }}>
          <strong>Error: </strong>{conv.error_message}
        </div>
      )}

      {/* Pipeline steps */}
      {steps.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <PipelineSteps steps={steps} isRunning={false} />
        </div>
      )}

      {/* D.0 / F6 side-by-side */}
      {isOk && conv.f6_output && (
        <div style={{ marginBottom: 16 }}>
          <OutputPanel
            d0Input={conv.d0_input}
            f6Output={conv.f6_output}
            auditEntries={audit.entries}
          />
        </div>
      )}

      {/* Validation findings */}
      <div style={{ marginBottom: 16 }}>
        <ValidationFindings findings={audit.findings} />
      </div>

      {/* Audit summary + table */}
      {audit.entries.length > 0 && (
        <>
          <div style={{ marginBottom: 8 }}>
            <AuditSummaryBar
              summary={audit.summary}
              activeFilter={typeFilter}
              onFilter={setTypeFilter}
            />
          </div>
          <AuditTable entries={audit.entries} changeTypeFilter={typeFilter} />
        </>
      )}
    </div>
  );
}
