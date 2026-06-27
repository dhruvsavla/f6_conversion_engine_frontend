import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { reverseConvert, fetchSampleF6 } from "../api/client";
import PipelineSteps from "../components/PipelineSteps";
import ValidationFindings from "../components/ValidationFindings";
import AuditSummaryBar from "../components/AuditSummaryBar";
import AuditTable from "../components/AuditTable";
import TransactionBadge from "../components/TransactionBadge";

const TX_SAMPLE_TYPES = ["RETAIL", "COB", "CONTROLLED"];

export default function ReverseConverterPage() {
  const navigate = useNavigate();
  const [f6Text,      setF6Text]      = useState("");
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [typeFilter,  setTypeFilter]  = useState(null);
  const [sampleType,  setSampleType]  = useState("RETAIL");

  async function handleConvert() {
    if (!f6Text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setTypeFilter(null);
    try {
      const data = await reverseConvert(f6Text);
      setResult(data);
    } catch (e) {
      setError(e.message || "Reverse conversion failed. Is the backend running on port 8000?");
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
    setTypeFilter(null);
  }

  const audit = result?.audit || { summary: {}, entries: [], findings: [] };

  return (
    <div className="main-content">
      {/* Input area */}
      {!result && (
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 24px" }}>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{
              fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 6,
              background: "linear-gradient(135deg, #F1F5F9 30%, #38BDF8 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              F6 → D.0 Reverse Converter
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Paste F6 transaction text. Strikethrough fields (~~field=value~~) from the
              diff view are automatically restored to D.0.
            </p>
          </div>

          {/* Sample loader */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Load sample:</span>
            {TX_SAMPLE_TYPES.map(t => (
              <button
                key={t}
                className={`btn ${sampleType === t ? "btn-primary" : "btn-secondary"}`}
                style={{ fontSize: 11, padding: "5px 12px" }}
                onClick={() => { setSampleType(t); }}
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
              placeholder={"Paste F6 transaction text here…\n\nExample:\nHDR|101-A1=00610279|102-A2=F6|...\nINS|302-C2=ZH48291045|367-2N=01|~~990-MG=017394~~"}
              style={{
                width: "100%",
                minHeight: 280,
                padding: "16px 18px",
                background: "transparent",
                border: "none",
                outline: "none",
                resize: "vertical",
                fontFamily: "var(--mono)",
                fontSize: 12,
                color: "var(--text)",
                lineHeight: 1.7,
              }}
            />
            <div style={{
              padding: "10px 18px",
              borderTop: "1px solid var(--border-bright)",
              display: "flex",
              alignItems: "center",
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
                  onClick={handleConvert}
                  disabled={!f6Text.trim() || loading}
                >
                  {loading ? "Converting…" : "Convert to D.0 →"}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div style={{
              padding: "12px 16px",
              background: "var(--error-light)",
              border: "1px solid var(--error)",
              borderRadius: "var(--radius)",
              color: "var(--error)",
              fontSize: 13,
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {result && (
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <button className="btn btn-ghost" onClick={handleReset} style={{ fontSize: 13 }}>
              ← New conversion
            </button>
            <TransactionBadge type={result.transaction_type} />
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
              {result.conversion_id && (
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 12 }}
                  onClick={() => navigate(`/history/${result.conversion_id}`)}
                >
                  View in History →
                </button>
              )}
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {audit.entries.length} fields audited
              </span>
            </div>
          </div>

          {/* Pipeline steps */}
          {result.agent_steps?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <PipelineSteps steps={result.agent_steps} isRunning={false} />
            </div>
          )}

          {/* D.0 output */}
          <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
            <div style={{
              padding: "10px 16px",
              background: "var(--bg-elevated)",
              borderBottom: "1px solid var(--border-bright)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--cyan)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                D.0 Output
              </span>
              <button
                className="btn btn-secondary"
                style={{ fontSize: 11, padding: "4px 10px" }}
                onClick={() => {
                  const blob = new Blob([result.d0_output], { type: "text/plain" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `d0_output_${result.conversion_id?.slice(0,8) || "result"}.txt`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}
              >
                ⬇ Download
              </button>
            </div>
            <pre style={{
              padding: "16px 18px",
              margin: 0,
              fontFamily: "var(--mono)",
              fontSize: 12,
              color: "var(--text)",
              lineHeight: 1.75,
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              background: "var(--bg-code)",
            }}>
              {result.d0_output}
            </pre>
          </div>

          {/* Validation findings */}
          <div style={{ marginBottom: 16 }}>
            <ValidationFindings findings={audit.findings} />
          </div>

          {/* Audit */}
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
      )}
    </div>
  );
}
