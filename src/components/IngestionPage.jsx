import { useEffect, useRef, useState } from "react";
import { uploadPdf, getIngestStatus, getReview, promote, getFlagged } from "../api/ingestClient";

const TX_TYPES = [
  "RETAIL", "SPECIALTY", "CONTROLLED", "COB",
  "COMPOUND", "LTC", "MEDICARE_PART_D", "REVERSAL",
  "ELIGIBILITY", "PRIOR_AUTH",
];

const SEGMENTS = ["", "HDR", "INS", "PAT", "CLM", "PRE", "PRI", "DUR", "COB", "CMP", "PA"];

const STEP_LABELS = [
  "", // 0 = not started
  "Loading PDF",
  "Extracting text",
  "Chunking by segment",
  "Extracting rules via LLM",
  "Validating",
  "Writing output",
];

// ── Sub-components ────────────────────────────────────────────────────────────

function StepIndicator({ current, label }) {
  const done    = current > 6;
  const active  = current >= 1 && current <= 6;
  const pct     = done ? 100 : active ? Math.round((current / 6) * 100) : 0;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
        <span style={{ color: "var(--text-secondary)" }}>
          {current > 0 ? `Step ${Math.min(current, 6)}/6  ` : ""}
          <span style={{ color: "var(--text-primary)" }}>{label || "Waiting to start…"}</span>
        </span>
        <span style={{ color: "var(--text-secondary)" }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,.08)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: done ? "#22c55e" : "var(--accent)",
          borderRadius: 99, transition: "width .5s ease",
        }} />
      </div>
    </div>
  );
}

function SegmentRow({ seg }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
      <span style={{ fontFamily: "var(--mono)", color: "var(--accent)" }}>{seg.segment_id}</span>
      <span style={{ color: "var(--text-secondary)" }}>
        {seg.rule_count != null ? `${seg.rule_count} rules` : `${seg.chunk_count} chunk(s) · pp.${seg.page_start}–${seg.page_end}`}
      </span>
    </div>
  );
}

function ValidationBadges({ v }) {
  if (!v) return null;
  return (
    <div style={{ display: "flex", gap: 12, fontSize: 12, marginTop: 12 }}>
      <span style={{ color: "#22c55e" }}>✓ {v.valid} valid</span>
      {v.warn  > 0 && <span style={{ color: "#f59e0b" }}>⚠ {v.warn} warn</span>}
      {v.invalid > 0 && <span style={{ color: "var(--error)" }}>✗ {v.invalid} flagged</span>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function IngestionPage() {
  const [file,            setFile]            = useState(null);
  const [dragging,        setDragging]        = useState(false);
  const [txType,          setTxType]          = useState("RETAIL");
  const [segment,         setSegment]         = useState("");
  const [dryRun,          setDryRun]          = useState(false);
  const [model,           setModel]           = useState("claude-sonnet-4-6");

  const [jobId,           setJobId]           = useState(null);
  const [job,             setJob]             = useState(null);
  const [uploading,       setUploading]       = useState(false);
  const [error,           setError]           = useState(null);

  const [review,          setReview]          = useState(null);
  const [loadingReview,   setLoadingReview]   = useState(false);
  const [flagged,         setFlagged]         = useState(null);
  const [promoting,       setPromoting]       = useState(false);
  const [promoteResult,   setPromoteResult]   = useState(null);

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
          // Auto-load flagged rules when done
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
  const isError    = job?.status === "error";
  const canExtract = !uploading && !isRunning && file !== null;
  const canPromote = isDone && !dryRun && !promoteResult;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em", marginBottom: 8 }}>
          PDF → Rules Ingestion
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, maxWidth: 580 }}>
          Upload a PBM F6 implementation guide PDF. Claude reads the document,
          extracts field-level rules, validates them, and writes JSON files to{" "}
          <code style={{ fontFamily: "var(--mono)", fontSize: 12 }}>ingestion_output/</code>{" "}
          for review before promoting to the live <code style={{ fontFamily: "var(--mono)", fontSize: 12 }}>rules/</code> folder.
        </p>
      </div>

      {/* Upload card */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text-secondary)", marginBottom: 12 }}>
          Implementation Guide PDF
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current.click()}
          style={{
            border: `2px dashed ${dragging ? "var(--accent)" : file ? "#22c55e" : "rgba(255,255,255,.15)"}`,
            borderRadius: "var(--radius)",
            padding: "28px 20px",
            textAlign: "center",
            cursor: "pointer",
            background: dragging ? "rgba(59,130,246,.06)" : "transparent",
            transition: "border-color .2s, background .2s",
            marginBottom: 16,
          }}
        >
          <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }}
            onChange={e => handleFile(e.target.files[0])} />
          {file ? (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#22c55e" }}>✓ {file.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                {(file.size / 1024 / 1024).toFixed(1)} MB · click to replace
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Drop a PDF here or click to browse</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 4 }}>PBM F6 implementation guide</div>
            </div>
          )}
        </div>

        {/* Config row */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 160px" }}>
            <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Transaction type</label>
            <select value={txType} onChange={e => setTxType(e.target.value)}
              style={{ width: "100%", padding: "7px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12, background: "var(--bg-surface)", color: "var(--text-primary)", fontFamily: "var(--sans)" }}>
              {TX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ flex: "1 1 120px" }}>
            <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Segment only (optional)</label>
            <select value={segment} onChange={e => setSegment(e.target.value)}
              style={{ width: "100%", padding: "7px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12, background: "var(--bg-surface)", color: "var(--text-primary)", fontFamily: "var(--sans)" }}>
              {SEGMENTS.map(s => <option key={s} value={s}>{s || "All segments"}</option>)}
            </select>
          </div>

          <div style={{ flex: "1 1 180px" }}>
            <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Model</label>
            <select value={model} onChange={e => setModel(e.target.value)}
              style={{ width: "100%", padding: "7px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12, background: "var(--bg-surface)", color: "var(--text-primary)", fontFamily: "var(--sans)" }}>
              <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
              <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (faster)</option>
              <option value="claude-opus-4-8">Claude Opus 4.8 (best)</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 2 }}>
            <input id="dry-run" type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} />
            <label htmlFor="dry-run" style={{ fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>Dry run</label>
          </div>

          <button className="btn btn-primary" onClick={handleExtract} disabled={!canExtract}
            style={{ padding: "8px 22px", fontSize: 14, whiteSpace: "nowrap" }}>
            {uploading ? "Uploading…" : isRunning ? "Running…" : "Extract Rules →"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "10px 16px", background: "var(--error-light)", border: "1px solid var(--error)", borderRadius: "var(--radius)", color: "var(--error)", fontSize: 13, marginBottom: 16 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Progress card */}
      {job && (
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            {isRunning ? (
              <><span style={{ display: "inline-block", animation: "spin 1s linear infinite", marginRight: 6 }}>⟳</span>Extracting rules…</>
            ) : isDone ? (
              <span style={{ color: "#22c55e" }}>✓ {dryRun ? "Dry run complete" : "Extraction complete"}</span>
            ) : (
              <span style={{ color: "var(--error)" }}>✗ Extraction failed</span>
            )}
            {job.pdf_name && (
              <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 400, marginLeft: 10 }}>
                {job.pdf_name}{job.pdf_pages ? ` · ${job.pdf_pages} pages` : ""}
                {job.token_estimate ? ` · ~${(job.token_estimate / 1000).toFixed(0)}k tokens` : ""}
              </span>
            )}
          </div>

          <StepIndicator current={job.current_step} label={job.step_label} />

          {/* Segments found */}
          {job.segments_found?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text-secondary)", marginBottom: 8 }}>
                Segments identified
              </div>
              {job.segments_found.map(s => <SegmentRow key={s.segment_id} seg={s} />)}
            </div>
          )}

          {/* Extraction progress */}
          {job.extraction_progress?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text-secondary)", marginBottom: 8 }}>
                Rules extracted
              </div>
              {job.extraction_progress.map(s => (
                <SegmentRow key={s.segment_id} seg={{ ...s, chunk_count: undefined }} />
              ))}
            </div>
          )}

          {/* Validation summary */}
          <ValidationBadges v={job.validation} />

          {/* Files written */}
          {job.files_written?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>Output files</div>
              {job.files_written.map(f => (
                <div key={f} style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-secondary)", padding: "2px 0" }}>
                  {f}
                </div>
              ))}
            </div>
          )}

          {/* Dry run rules */}
          {job.dry_run_rules && (
            <details style={{ marginTop: 12 }}>
              <summary style={{ fontSize: 12, cursor: "pointer", color: "var(--text-secondary)" }}>
                {job.dry_run_rules.length} rules (dry run — not written)
              </summary>
              <div style={{ marginTop: 8, maxHeight: 300, overflowY: "auto" }}>
                {job.dry_run_rules.map((r, i) => (
                  <div key={i} style={{ fontSize: 11, fontFamily: "var(--mono)", padding: "3px 0",
                    color: r.status === "INVALID" ? "var(--error)" : r.status === "WARN" ? "#f59e0b" : "var(--text-secondary)" }}>
                    [{r.status}] {r.segment_id}.{r.field_id} — {r.action}
                    {r.issues.length > 0 && <span style={{ color: "rgba(255,255,255,.3)", marginLeft: 8 }}>{r.issues[0]}</span>}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Flagged rules */}
      {flagged?.length > 0 && (
        <div className="card" style={{ padding: 24, marginBottom: 20, borderColor: "rgba(245,158,11,.3)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b", marginBottom: 12 }}>
            ⚠ {flagged.length} rule(s) flagged for review
          </div>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
            These rules have validation errors and were not written to output files.
            Edit <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>ingestion_output/flagged_for_review.json</code> and re-run.
          </p>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {flagged.map((f, i) => (
              <div key={i} style={{ fontSize: 11, fontFamily: "var(--mono)", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ color: "var(--error)" }}>{f.segment_id}.{f.rule?.field_id}</span>
                <span style={{ color: "rgba(255,255,255,.3)", marginLeft: 8 }}>{f.issues?.[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions: review + promote */}
      {isDone && !dryRun && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <button className="btn btn-secondary" onClick={handleReview} disabled={loadingReview} style={{ fontSize: 13 }}>
            {loadingReview ? "Loading diff…" : "Review diff vs live rules"}
          </button>
          {canPromote && (
            <button className="btn btn-primary" onClick={handlePromote} disabled={promoting} style={{ fontSize: 13, background: "#16a34a", borderColor: "#16a34a" }}>
              {promoting ? "Promoting…" : "Promote to rules/ →"}
            </button>
          )}
        </div>
      )}

      {/* Promote result */}
      {promoteResult && (
        <div style={{ padding: "12px 16px", background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.3)", borderRadius: "var(--radius)", fontSize: 12, marginBottom: 20 }}>
          <strong style={{ color: "#22c55e" }}>✓ {promoteResult.count} file(s) promoted to rules/</strong>
          <div style={{ marginTop: 6, color: "var(--text-secondary)" }}>
            {promoteResult.promoted.map(f => <div key={f} style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{f}</div>)}
          </div>
          <div style={{ marginTop: 8, color: "var(--text-secondary)" }}>
            Restart the FastAPI server to pick up the new rules.
          </div>
        </div>
      )}

      {/* Diff output */}
      {review && (
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Diff — ingestion_output/ vs rules/</div>
          <pre style={{
            fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1.8,
            whiteSpace: "pre-wrap", color: "var(--text-secondary)",
            maxHeight: 400, overflowY: "auto", margin: 0,
          }}>
            {review.split("\n").map((line, i) => {
              const color = line.startsWith("  +") ? "#22c55e"
                          : line.startsWith("  -") ? "var(--error)"
                          : line.startsWith("  ~") ? "#f59e0b"
                          : line.startsWith("  ⚠") ? "#f59e0b"
                          : undefined;
              return <span key={i} style={color ? { color } : {}}>{line + "\n"}</span>;
            })}
          </pre>
        </div>
      )}

      <style>{`@keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }`}</style>
    </div>
  );
}
