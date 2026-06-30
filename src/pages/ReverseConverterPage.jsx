import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { reverseConvert, fetchSampleF6 } from "../api/client";
import PipelineCircuit from "../components/PipelineCircuit";
import ValidationFindings from "../components/ValidationFindings";
import AuditSummaryBar from "../components/AuditSummaryBar";
import AuditTable from "../components/AuditTable";
import ReverseOutputPanel from "../components/ReverseOutputPanel";
import TransactionBadge from "../components/TransactionBadge";
import PageHeader from "../components/PageHeader";
import { IconArrowRight, IconUpload, IconSpinner, IconX } from "../components/Icons";

const SAMPLE_TYPES = ["RETAIL", "COB", "CONTROLLED"];

// Summary stat chips shown after conversion
function StatChip({ label, value, color }) {
  if (!value) return null;
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "10px 20px",
      background: "var(--bg-surface)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-md)",
      minWidth: 72,
    }}>
      <span style={{ fontSize: "var(--text-xl)", fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginTop: 3 }}>{label}</span>
    </div>
  );
}

export default function ReverseConverterPage() {
  const navigate  = useNavigate();
  const fileRef   = useRef(null);

  const [f6Text,      setF6Text]      = useState("");
  const [filename,    setFilename]    = useState("manual_f6_input");
  const [dragging,    setDragging]    = useState(false);
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [typeFilter,  setTypeFilter]  = useState(null);
  const [sampleType,  setSampleType]  = useState("RETAIL");
  const [steps,       setSteps]       = useState([]);

  // ── File handling ──────────────────────────────────────
  function handleFile(file) {
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      setF6Text(new TextDecoder("utf-8").decode(e.target.result));
      setResult(null);
      setError(null);
    };
    reader.readAsArrayBuffer(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  // ── Conversion ─────────────────────────────────────────
  async function handleConvert() {
    if (!f6Text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setTypeFilter(null);
    setSteps([]);
    try {
      const data = await reverseConvert(f6Text, filename);
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
      setFilename(`sample_${sampleType.toLowerCase()}.txt`);
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
    setFilename("manual_f6_input");
    setError(null);
    setTypeFilter(null);
    setSteps([]);
  }

  const audit   = result?.audit || { summary: {}, entries: [], findings: [] };
  const summary = audit.summary || {};
  const showPipeline = steps.length > 0 || loading;
  const canConvert = !loading && f6Text.trim().length > 0;

  const segCount = f6Text.trim().split("\n").filter(Boolean).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader
        eyebrow="Reverse"
        title="F6 → D.0 Converter"
        subtitle="Paste or upload an F6 transaction. Fields added in F6 are dropped; deprecated fields marked with ~~strikethrough~~ are restored."
        actions={result?.conversion_id && (
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

      {/* ── Input section ─────────────────────────────── */}
      {!result && (
        <div style={{ padding: "24px 40px", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Sample loader */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontWeight: 500 }}>Load sample:</span>
            {SAMPLE_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setSampleType(t)}
                style={{
                  padding: "3px 10px", borderRadius: "var(--radius-full)",
                  border: `1px solid ${sampleType === t ? "var(--accent)" : "var(--border-default)"}`,
                  background: sampleType === t ? "var(--status-info-bg)" : "transparent",
                  color: sampleType === t ? "var(--accent)" : "var(--text-secondary)",
                  fontSize: "var(--text-xs)", fontWeight: 500, cursor: "pointer",
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
                border: "1px solid var(--border-default)",
                background: "transparent", color: "var(--text-secondary)",
                fontSize: "var(--text-xs)", cursor: "pointer",
              }}
            >
              ↓ Load
            </button>
          </div>

          {/* Input card */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            boxShadow: "var(--shadow-sm)",
          }}>
            {/* Toolbar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 16px",
              background: "var(--bg-raised)",
              borderBottom: "1px solid var(--border-subtle)",
            }}>
              <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
                F6 Transaction Input
              </span>
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  fontSize: "var(--text-xs)", background: "none",
                  border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)",
                  padding: "3px 10px", cursor: "pointer", color: "var(--text-secondary)",
                }}
              >
                <IconUpload size={11} /> Upload .txt
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.f6,.dat"
                style={{ display: "none" }}
                onChange={e => handleFile(e.target.files[0])}
              />
            </div>

            {/* Textarea with drag-and-drop */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              style={{ position: "relative" }}
            >
              <textarea
                value={f6Text}
                onChange={e => { setF6Text(e.target.value); setFilename("manual_f6_input"); }}
                placeholder={
                  "Paste F6 transaction here, or drag & drop a file.\n\n" +
                  "Example:\n" +
                  "HDR|101-A1=00610279|102-A2=F6|103-A3=B1|...\n" +
                  "INS|302-C2=ZH48291045|367-2N=01|~~990-MG=017394~~\n" +
                  "CLM|402-D2=104872|...\n\n" +
                  "Fields wrapped in ~~tildes~~ are deprecated D.0 fields\n" +
                  "preserved in the F6 diff output — they will be restored."
                }
                spellCheck={false}
                style={{
                  width: "100%", minHeight: 240,
                  padding: "14px 16px",
                  fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)",
                  lineHeight: 1.7,
                  background: dragging ? "var(--status-info-bg)" : "var(--bg-code)",
                  color: "var(--text-code)",
                  border: `1.5px solid ${dragging ? "var(--accent)" : "transparent"}`,
                  borderRadius: 0, resize: "vertical", outline: "none",
                  transition: "border-color var(--transition-normal)",
                }}
                onFocus={e  => { e.target.style.borderColor = "var(--border-focus)"; }}
                onBlur={e   => { e.target.style.borderColor = "transparent"; }}
              />
              {f6Text && (
                <button
                  onClick={() => { setF6Text(""); setFilename("manual_f6_input"); }}
                  style={{
                    position: "absolute", top: 8, right: 8,
                    background: "var(--bg-raised)", border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)", padding: "2px 8px",
                    color: "var(--text-tertiary)", fontSize: "var(--text-xs)", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  <IconX size={10} /> clear
                </button>
              )}
            </div>

            {/* Footer bar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 16px",
              background: "var(--bg-raised)",
              borderTop: "1px solid var(--border-subtle)",
            }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
                {f6Text.trim()
                  ? `${segCount} segment${segCount !== 1 ? "s" : ""} · ${f6Text.length.toLocaleString()} chars`
                  : "Pipe-delimited F6 format · ~~field=value~~ for deprecated fields"
                }
              </span>
              <button
                onClick={handleConvert}
                disabled={!canConvert}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: canConvert
                    ? "linear-gradient(135deg, #2563EB, #7C3AED)"
                    : "var(--bg-overlay)",
                  color: canConvert ? "#fff" : "var(--text-muted)",
                  border: "none", borderRadius: "var(--radius-md)",
                  height: 36, padding: "0 22px",
                  fontSize: "var(--text-sm)", fontWeight: 600,
                  cursor: canConvert ? "pointer" : "not-allowed",
                  boxShadow: canConvert ? "0 2px 12px rgba(37,99,235,0.3)" : "none",
                  transition: "all var(--transition-normal)",
                  opacity: canConvert ? 1 : 0.5,
                }}
              >
                {loading
                  ? <><IconSpinner size={13} color="#fff" /> Converting…</>
                  : "Convert to D.0 →"
                }
              </button>
            </div>
          </div>

          {/* Hint callout */}
          <div style={{
            padding: "10px 14px",
            background: "var(--status-info-bg)",
            border: "1px solid var(--border-subtle)",
            borderLeft: "3px solid var(--status-info)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.6,
          }}>
            <strong style={{ color: "var(--text-primary)" }}>Tip:</strong> Run a D.0 → F6 conversion first, then paste the F6 output here to round-trip back to D.0.
            Fields wrapped in <code style={{ fontFamily: "var(--font-mono)", background: "var(--bg-raised)", padding: "0 3px", borderRadius: 2 }}>~~tildes~~</code> are
            restored automatically. F6-only fields (like <code style={{ fontFamily: "var(--font-mono)", background: "var(--bg-raised)", padding: "0 3px", borderRadius: 2 }}>367-2N</code>, <code style={{ fontFamily: "var(--font-mono)", background: "var(--bg-raised)", padding: "0 3px", borderRadius: 2 }}>995-E2</code>) are dropped.
          </div>
        </div>
      )}

      {/* ── Results section ────────────────────────────── */}
      {result && (
        <div style={{ padding: "24px 40px", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Top bar: nav + type badge + stat chips */}
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
          </div>

          {/* Summary stat chips */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <StatChip label="carried"     value={summary.carried}     color="var(--status-neutral)" />
            <StatChip label="restored"    value={summary.restored}    color="var(--status-success)" />
            <StatChip label="transformed" value={summary.transformed} color="var(--status-warn)" />
            <StatChip label="dropped"     value={summary.dropped}     color="var(--status-error)" />
            {summary.missing > 0 && (
              <StatChip label="missing" value={summary.missing} color="var(--status-error)" />
            )}
            {summary.warnings > 0 && (
              <StatChip label="warnings" value={summary.warnings} color="var(--status-warn)" />
            )}
          </div>

          {/* Side-by-side diff */}
          <ReverseOutputPanel
            f6Input={result.f6_input}
            d0Output={result.d0_output}
            auditEntries={audit.entries}
            conversionId={result.conversion_id}
          />

          {/* Findings */}
          <ValidationFindings findings={audit.findings} />

          {/* Audit trail */}
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
