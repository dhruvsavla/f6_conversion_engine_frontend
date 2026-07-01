import { useEffect, useRef, useState } from "react";
import { uploadPdf, getIngestStatus, getReview, promote, getFlagged } from "../api/ingestClient";
import PageHeader from "./PageHeader";
import { IconUpload, IconSpinner, IconCheck, IconX } from "./Icons";

const TX_TYPES = [
  "RETAIL", "SPECIALTY", "CONTROLLED", "COB",
  "COMPOUND", "LTC", "MEDICARE_PART_D", "REVERSAL",
  "ELIGIBILITY", "PRIOR_AUTH",
];

const SEGMENTS = ["", "HDR", "INS", "PAT", "CLM", "PRE", "PRI", "DUR", "COB", "CMP", "PA"];

// ── Sub-components ────────────────────────────────────────────────────────────

function StepIndicator({ current, label }) {
  const done   = current > 6;
  const active = current >= 1 && current <= 6;
  const pct    = done ? 100 : active ? Math.round((current / 6) * 100) : 0;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm)", marginBottom: 6 }}>
        <span style={{ color: "var(--text-secondary)" }}>
          {current > 0 ? `Step ${Math.min(current, 6)}/6  ` : ""}
          <span style={{ color: "var(--text-primary)" }}>{label || "Waiting to start…"}</span>
        </span>
        <span style={{ color: "var(--text-tertiary)" }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: "var(--bg-raised)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: done ? "var(--status-success)" : "var(--accent)",
          borderRadius: "var(--radius-full)", transition: "width .5s ease",
        }} />
      </div>
    </div>
  );
}

function SegmentRow({ seg }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      fontSize: "var(--text-sm)", padding: "4px 0",
      borderBottom: "1px solid var(--border-subtle)",
    }}>
      <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-bright)" }}>{seg.segment_id}</span>
      <span style={{ color: "var(--text-tertiary)" }}>
        {seg.rule_count != null ? `${seg.rule_count} rules` : `${seg.chunk_count} chunk(s) · pp.${seg.page_start}–${seg.page_end}`}
      </span>
    </div>
  );
}

function ValidationBadges({ v }) {
  if (!v) return null;
  return (
    <div style={{ display: "flex", gap: 12, fontSize: "var(--text-sm)", marginTop: 12 }}>
      <span style={{ color: "var(--status-success)" }}>✓ {v.valid} valid</span>
      {v.warn   > 0 && <span style={{ color: "var(--status-warn)" }}>⚠ {v.warn} warn</span>}
      {v.invalid > 0 && <span style={{ color: "var(--status-error)" }}>✗ {v.invalid} flagged</span>}
    </div>
  );
}

const selectStyle = {
  width: "100%", padding: "7px 10px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border-subtle)",
  fontSize: "var(--text-sm)",
  background: "var(--bg-input)",
  color: "var(--text-primary)",
  fontFamily: "var(--font-ui)",
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function IngestionPage() {
  const [file,           setFile]           = useState(null);
  const [dragging,       setDragging]       = useState(false);
  const [txType,         setTxType]         = useState("RETAIL");
  const [segment,        setSegment]        = useState("");
  const [dryRun,         setDryRun]         = useState(false);
  const [model,          setModel]          = useState("claude-sonnet-4-6");

  const [jobId,          setJobId]          = useState(null);
  const [job,            setJob]            = useState(null);
  const [uploading,      setUploading]      = useState(false);
  const [error,          setError]          = useState(null);

  const [review,         setReview]         = useState(null);
  const [loadingReview,  setLoadingReview]  = useState(false);
  const [flagged,        setFlagged]        = useState(null);
  const [promoting,      setPromoting]      = useState(false);
  const [promoteResult,  setPromoteResult]  = useState(null);

  const intervalRef = useRef(null);
  const fileRef     = useRef();

  // ── Polling ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!jobId) return;
    intervalRef.current = setInterval(async () => {
      try {
        const data = await getIngestStatus(jobId);
        setJob(data);
        if (data.status === "completed" || data.status === "error") {
          clearInterval(intervalRef.current);
          if (data.status === "completed" && !data.dry_run) {
            getFlagged().then(r => setFlagged(r.flagged)).catch(() => {});
          }
        }
      } catch (e) {
        setError(e.message);
        clearInterval(intervalRef.current);
      }
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [jobId]);

  // ── File handling ──────────────────────────────────────────────────────────
  function handleFile(f) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only .pdf files are supported.");
      return;
    }
    setFile(f);
    setError(null);
    setJob(null);
    setJobId(null);
    setReview(null);
    setFlagged(null);
    setPromoteResult(null);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  // ── Start extraction ───────────────────────────────────────────────────────
  async function handleExtract() {
    if (!file) return;
    setUploading(true);
    setError(null);
    setJob(null);
    setReview(null);
    setFlagged(null);
    setPromoteResult(null);
    try {
      const { job_id } = await uploadPdf({ file, transactionType: txType, segment, dryRun, model });
      setJobId(job_id);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  // ── Review diff ────────────────────────────────────────────────────────────
  async function handleReview() {
    setLoadingReview(true);
    try {
      const { diff } = await getReview();
      setReview(diff);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingReview(false);
    }
  }

  // ── Promote ────────────────────────────────────────────────────────────────
  async function handlePromote() {
    if (!window.confirm("Promote all extracted rules to rules/? Existing rules will be backed up first.")) return;
    setPromoting(true);
    try {
      const result = await promote();
      setPromoteResult(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setPromoting(false);
    }
  }

  const isRunning  = job?.status === "running";
  const isDone     = job?.status === "completed";
  const canExtract = !uploading && !isRunning && file !== null;
  const canPromote = isDone && !dryRun && !promoteResult;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader
        eyebrow="Ingest"
        title="PDF → Rules Ingestion"
        subtitle="Upload a PBM F6 implementation guide PDF. Claude reads the document, extracts field-level rules, validates them, and writes JSON files for review."
      />

      <div style={{ padding: "24px 40px", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Upload card */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}>
          <div style={{ padding: "12px 16px", background: "var(--bg-raised)", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)" }}>
              Implementation Guide PDF
            </div>
          </div>
          <div style={{ padding: "20px" }}>
            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current.click()}
              style={{
                border: `2px dashed ${dragging ? "var(--accent)" : file ? "var(--status-success)" : "var(--border-subtle)"}`,
                borderRadius: "var(--radius-md)",
                padding: "28px 20px",
                textAlign: "center",
                cursor: "pointer",
                background: dragging ? "var(--status-info-bg)" : "var(--bg-code)",
                transition: "all var(--transition-normal)",
                marginBottom: 16,
              }}
            >
              <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }}
                onChange={e => handleFile(e.target.files[0])} />
              {file ? (
                <div>
                  <div style={{ fontSize: "var(--text-md)", fontWeight: 600, color: "var(--status-success)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <IconCheck size={16} color="var(--status-success)" /> {file.name}
                  </div>
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)", marginTop: 4 }}>
                    {(file.size / 1024 / 1024).toFixed(1)} MB · click to replace
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <IconUpload size={24} color="var(--text-tertiary)" />
                  <div style={{ fontSize: "var(--text-base)", color: "var(--text-secondary)" }}>Drop a PDF here or click to browse</div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", opacity: 0.7 }}>PBM F6 implementation guide</div>
                </div>
              )}
            </div>

            {/* Config row */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: "1 1 160px" }}>
                <label style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Transaction type</label>
                <select value={txType} onChange={e => setTxType(e.target.value)} style={selectStyle}>
                  {TX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div style={{ flex: "1 1 120px" }}>
                <label style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Segment (optional)</label>
                <select value={segment} onChange={e => setSegment(e.target.value)} style={selectStyle}>
                  {SEGMENTS.map(s => <option key={s} value={s}>{s || "All segments"}</option>)}
                </select>
              </div>

              <div style={{ flex: "1 1 180px" }}>
                <label style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Model</label>
                <select value={model} onChange={e => setModel(e.target.value)} style={selectStyle}>
                  <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                  <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (faster)</option>
                  <option value="claude-opus-4-8">Claude Opus 4.8 (best)</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 2 }}>
                <input id="dry-run" type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)}
                  style={{ width: 14, height: 14 }} />
                <label htmlFor="dry-run" style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", cursor: "pointer" }}>Dry run</label>
              </div>

              <button
                onClick={handleExtract}
                disabled={!canExtract}
                style={{
                  background: canExtract ? "linear-gradient(135deg, #2563EB, #7C3AED)" : "var(--bg-raised)",
                  color: canExtract ? "#fff" : "var(--text-tertiary)",
                  border: "none", borderRadius: "var(--radius-md)",
                  padding: "9px 22px", fontSize: "var(--text-md)", fontWeight: 600,
                  cursor: canExtract ? "pointer" : "not-allowed",
                  whiteSpace: "nowrap",
                  display: "flex", alignItems: "center", gap: 6,
                  opacity: canExtract ? 1 : 0.5,
                }}
              >
                {(uploading || isRunning) && <IconSpinner size={14} color="#fff" />}
                {uploading ? "Uploading…" : isRunning ? "Running…" : "Extract Rules →"}
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: "10px 16px",
            background: "var(--status-error-bg)",
            border: "1px solid var(--status-error)",
            borderLeft: "3px solid var(--status-error)",
            borderRadius: "var(--radius-md)",
            color: "var(--status-error)", fontSize: "var(--text-sm)",
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Progress card */}
        {job && (
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: 24,
          }}>
            <div style={{ fontSize: "var(--text-md)", fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              {isRunning ? (
                <><IconSpinner size={14} color="var(--accent)" /> <span style={{ color: "var(--text-secondary)" }}>Extracting rules…</span></>
              ) : isDone ? (
                <><IconCheck size={16} color="var(--status-success)" /> <span style={{ color: "var(--status-success)" }}>{dryRun ? "Dry run complete" : "Extraction complete"}</span></>
              ) : (
                <><IconX size={16} color="var(--status-error)" /> <span style={{ color: "var(--status-error)" }}>Extraction failed</span></>
              )}
              {job.pdf_name && (
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)", fontWeight: 400, marginLeft: 4 }}>
                  {job.pdf_name}{job.pdf_pages ? ` · ${job.pdf_pages} pages` : ""}
                  {job.token_estimate ? ` · ~${(job.token_estimate / 1000).toFixed(0)}k tokens` : ""}
                </span>
              )}
            </div>

            <StepIndicator current={job.current_step} label={job.step_label} />

            {/* Segments found */}
            {job.segments_found?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", marginBottom: 8 }}>
                  Segments identified
                </div>
                {job.segments_found.map(s => <SegmentRow key={s.segment_id} seg={s} />)}
              </div>
            )}

            {/* Extraction progress */}
            {job.extraction_progress?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", marginBottom: 8 }}>
                  Rules extracted
                </div>
                {job.extraction_progress.map(s => (
                  <SegmentRow key={s.segment_id} seg={{ ...s, chunk_count: undefined }} />
                ))}
              </div>
            )}

            <ValidationBadges v={job.validation} />

            {/* Files written */}
            {job.files_written?.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Output files</div>
                {job.files_written.map(f => (
                  <div key={f} style={{ fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)", color: "var(--text-tertiary)", padding: "2px 0" }}>
                    {f}
                  </div>
                ))}
              </div>
            )}

            {/* Dry run rules */}
            {job.dry_run_rules && (
              <details style={{ marginTop: 12 }}>
                <summary style={{ fontSize: "var(--text-sm)", cursor: "pointer", color: "var(--text-tertiary)" }}>
                  {job.dry_run_rules.length} rules (dry run — not written)
                </summary>
                <div style={{ marginTop: 8, maxHeight: 300, overflowY: "auto" }}>
                  {job.dry_run_rules.map((r, i) => (
                    <div key={i} style={{
                      fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)", padding: "3px 0",
                      color: r.status === "INVALID" ? "var(--status-error)" : r.status === "WARN" ? "var(--status-warn)" : "var(--text-tertiary)",
                    }}>
                      [{r.status}] {r.segment_id}.{r.field_id} — {r.action}
                      {r.issues.length > 0 && <span style={{ color: "var(--text-tertiary)", opacity: 0.5, marginLeft: 8 }}>{r.issues[0]}</span>}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Flagged rules */}
        {flagged?.length > 0 && (
          <div style={{
            background: "var(--status-warn-bg)",
            border: "1px solid var(--status-warn)",
            borderLeft: "3px solid var(--status-warn)",
            borderRadius: "var(--radius-lg)",
            padding: 20,
          }}>
            <div style={{ fontSize: "var(--text-md)", fontWeight: 600, color: "var(--status-warn)", marginBottom: 10 }}>
              {flagged.length} rule(s) flagged for review
            </div>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: 12 }}>
              These rules have validation errors and were not written to output files.
              Edit <code style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-code)" }}>ingestion_output/flagged_for_review.json</code> and re-run.
            </p>
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {flagged.map((f, i) => (
                <div key={i} style={{ fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)", padding: "4px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <span style={{ color: "var(--status-error)" }}>{f.segment_id}.{f.rule?.field_id}</span>
                  <span style={{ color: "var(--text-tertiary)", marginLeft: 8 }}>{f.issues?.[0]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions: review + promote */}
        {isDone && !dryRun && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={handleReview}
              disabled={loadingReview}
              style={{
                background: "transparent", border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)", borderRadius: "var(--radius-md)",
                padding: "8px 18px", fontSize: "var(--text-base)", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {loadingReview && <IconSpinner size={13} />}
              {loadingReview ? "Loading diff…" : "Review diff vs live rules"}
            </button>
            {canPromote && (
              <button
                onClick={handlePromote}
                disabled={promoting}
                style={{
                  background: "var(--status-success-bg)",
                  border: "1px solid var(--status-success)",
                  color: "var(--status-success)", borderRadius: "var(--radius-md)",
                  padding: "8px 18px", fontSize: "var(--text-base)", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6, fontWeight: 600,
                }}
              >
                {promoting && <IconSpinner size={13} color="var(--status-success)" />}
                {promoting ? "Promoting…" : "Promote to rules/ →"}
              </button>
            )}
          </div>
        )}

        {/* Promote result */}
        {promoteResult && (
          <div style={{
            padding: "14px 16px",
            background: "var(--status-success-bg)",
            border: "1px solid var(--status-success)",
            borderLeft: "3px solid var(--status-success)",
            borderRadius: "var(--radius-md)",
          }}>
            <strong style={{ color: "var(--status-success)", fontSize: "var(--text-sm)" }}>
              ✓ {promoteResult.count} file(s) promoted to rules/
            </strong>
            <div style={{ marginTop: 6, color: "var(--text-secondary)" }}>
              {promoteResult.promoted.map(f => <div key={f} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>{f}</div>)}
            </div>
            <div style={{ marginTop: 8, color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>
              Restart the FastAPI server to pick up the new rules.
            </div>
          </div>
        )}

        {/* Diff output */}
        {review && (
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
          }}>
            <div style={{ padding: "10px 16px", background: "var(--bg-raised)", borderBottom: "1px solid var(--border-subtle)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-secondary)" }}>
              Diff — ingestion_output/ vs rules/
            </div>
            <pre style={{
              fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", lineHeight: 1.8,
              whiteSpace: "pre-wrap", color: "var(--text-tertiary)",
              maxHeight: 400, overflowY: "auto", margin: 0, padding: "16px",
            }}>
              {review.split("\n").map((line, i) => {
                const color = line.startsWith("  +") ? "var(--status-success)"
                            : line.startsWith("  -") ? "var(--status-error)"
                            : line.startsWith("  ~") ? "var(--status-warn)"
                            : line.startsWith("  ⚠") ? "var(--status-warn)"
                            : undefined;
                return <span key={i} style={color ? { color } : {}}>{line + "\n"}</span>;
              })}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
