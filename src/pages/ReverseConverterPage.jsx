import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { reverseConvert, fetchSampleF6 } from "../api/client";
import PipelineCircuit from "../components/PipelineCircuit";
import ValidationFindings from "../components/ValidationFindings";
import AuditSummaryBar from "../components/AuditSummaryBar";
import AuditTable from "../components/AuditTable";
import TransactionBadge from "../components/TransactionBadge";
import PageHeader from "../components/PageHeader";
import { IconArrowRight, IconDownload, IconSpinner } from "../components/Icons";

const TX_SAMPLE_TYPES = ["RETAIL", "COB", "CONTROLLED"];

export default function ReverseConverterPage() {
  const navigate = useNavigate();
  const [f6Text,     setF6Text]     = useState("");
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);
  const [sampleType, setSampleType] = useState("RETAIL");
  const [steps,      setSteps]      = useState([]);

  async function handleConvert() {
    if (!f6Text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setTypeFilter(null);
    setSteps([]);
    try {
      const data = await reverseConvert(f6Text);
      setResult(data);
      if (data.agent_steps) setSteps(data.agent_steps);
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
      setSteps([]);
    } catch (e) {
      setError("Failed to load sample: " + e.message);
    }
  }

  function handleReset() {
    setResult(null);
    setF6Text("");
    setError(null);
    setTypeFilter(null);
    setSteps([]);
  }

  const audit = result?.audit || { summary: {}, entries: [], findings: [] };
  const showPipeline = steps.length > 0 || loading;

  const textareaStyle = {
    width: "100%", minHeight: 280,
    padding: "14px 16px",
    fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)",
    lineHeight: 1.7,
    background: "var(--bg-code)", color: "var(--text-code)",
    border: "none", outline: "none", resize: "vertical",
    display: "block",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader
        eyebrow="Reverse"
        title="F6 → D.0 Converter"
        subtitle="Paste F6 transaction text. Strikethrough fields (~~field=value~~) from the diff view are automatically restored to D.0."
        actions={result && result.conversion_id && (
          <button
            onClick={() => navigate(`/history/${result.conversion_id}`)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "transparent", border: "1px solid var(--border-default)",
              color: "var(--text-secondary)", borderRadius: "var(--radius-md)",
              padding: "6px 14px", fontSize: "var(--text-sm)", cursor: "pointer",
            }}
          >
            View in History <IconArrowRight size={13} />
          </button>
        )}
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
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>Load sample:</span>
            {TX_SAMPLE_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setSampleType(t)}
                style={{
                  padding: "3px 10px", borderRadius: "var(--radius-full)",
                  border: `1px solid ${sampleType === t ? "var(--accent)" : "var(--border-subtle)"}`,
                  background: sampleType === t ? "var(--status-info-bg)" : "transparent",
                  color: sampleType === t ? "var(--accent-bright)" : "var(--text-secondary)",
                  fontSize: "var(--text-xs)", cursor: "pointer",
                  transition: "all var(--transition-fast)",
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
                background: "transparent", color: "var(--text-secondary)",
                fontSize: "var(--text-xs)", cursor: "pointer",
              }}
            >
              ↓ Load
            </button>
          </div>

          {/* Textarea card */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: 16,
          }}>
            <textarea
              value={f6Text}
              onChange={e => setF6Text(e.target.value)}
              placeholder={"Paste F6 transaction text here…\n\nExample:\nHDR|101-A1=00610279|102-A2=F6|...\nINS|302-C2=ZH48291045|367-2N=01|~~990-MG=017394~~"}
              style={textareaStyle}
              onFocus={e => { e.target.style.boxShadow = "inset 0 0 0 1px var(--border-focus)"; }}
              onBlur={e => { e.target.style.boxShadow = "none"; }}
            />
            <div style={{
              padding: "10px 16px", borderTop: "1px solid var(--border-subtle)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "var(--bg-raised)",
            }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                {f6Text.trim().split("\n").filter(Boolean).length} segments · {f6Text.length} chars
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                {f6Text && (
                  <button
                    onClick={() => setF6Text("")}
                    style={{
                      background: "none", border: "none",
                      color: "var(--text-secondary)", fontSize: "var(--text-sm)", cursor: "pointer",
                    }}
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={handleConvert}
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
                  {loading ? "Converting…" : "Convert to D.0 →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div style={{ padding: "24px 40px", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={handleReset}
              style={{
                background: "transparent", border: "none",
                color: "var(--text-secondary)", cursor: "pointer",
                fontSize: "var(--text-sm)", padding: "4px 0",
              }}
            >
              ← New conversion
            </button>
            <TransactionBadge type={result.transaction_type} />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginLeft: "auto" }}>
              {audit.entries.length} fields audited
            </span>
          </div>

          {/* D.0 output panel */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)", overflow: "hidden",
          }}>
            <div style={{
              padding: "8px 16px", background: "var(--bg-raised)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--accent-bright)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                D.0 Output
              </span>
              <button
                onClick={() => {
                  const blob = new Blob([result.d0_output], { type: "text/plain" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `d0_output_${result.conversion_id?.slice(0, 8) || "result"}.txt`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "transparent", border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)", borderRadius: "var(--radius-sm)",
                  padding: "4px 10px", fontSize: "var(--text-xs)", cursor: "pointer",
                }}
              >
                <IconDownload size={12} /> Download
              </button>
            </div>
            <pre style={{
              padding: "16px", margin: 0,
              fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)",
              color: "var(--text-code)", lineHeight: 1.75,
              overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all",
              background: "var(--bg-code)", maxHeight: 400, overflowY: "auto",
            }}>
              {result.d0_output}
            </pre>
          </div>

          {/* Validation findings */}
          <ValidationFindings findings={audit.findings} />

          {/* Audit */}
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
      )}
    </div>
  );
}
