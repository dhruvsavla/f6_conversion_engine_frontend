import { useEffect, useRef, useState } from "react";
import { getBatchStatus } from "../api/client";

/**
 * Polls a batch job every 1 s and renders a progress bar + summary.
 * Stops polling once status is 'completed' or 'error'.
 */
export default function BatchProgress({ jobId, onDone }) {
  const [job, setJob] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!jobId) return;

    // Reset whenever a new job starts
    setJob(null);
    setFetchError(null);

    async function poll() {
      try {
        const data = await getBatchStatus(jobId);
        setJob(data);
        // Stop polling once the job reaches a terminal state
        if (data.status === "completed" || data.status === "error") {
          clearInterval(intervalRef.current);
          if (onDone) onDone(data);
        }
      } catch (e) {
        setFetchError(e.message);
        clearInterval(intervalRef.current);
      }
    }

    poll(); // fetch immediately on mount so there's no 1 s blank delay
    intervalRef.current = setInterval(poll, 1000);

    return () => clearInterval(intervalRef.current);
  }, [jobId]); // re-run only when jobId changes

  if (!jobId) return null;

  const progress  = job?.progress  ?? 0;
  const total     = job?.total     ?? 0;
  const done      = (job?.successful ?? 0) + (job?.failed ?? 0);
  const status    = job?.status    ?? "pending";
  const isRunning = status === "pending" || status === "processing";

  // Colour the bar: green when complete, red if any failures, blue while running
  const barColor =
    status === "error"
      ? "var(--error)"
      : status === "completed" && (job?.failed ?? 0) > 0
      ? "var(--warning)"
      : status === "completed"
      ? "var(--success)"
      : "var(--accent)";

  return (
    <div
      style={{
        maxWidth: 860,
        margin: "0 auto 0",
        padding: "0 24px 24px",
      }}
    >
      <div
        className="card"
        style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}
      >
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {isRunning ? (
              <>
                <span style={{ display: "inline-block", animation: "spin 1s linear infinite", marginRight: 6 }}>⟳</span>
                Batch processing…
              </>
            ) : status === "error" ? (
              "Batch failed"
            ) : (
              "Batch complete"
            )}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--mono)" }}>
            {jobId.slice(0, 8)}…
          </span>
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: 8,
            background: "rgba(255,255,255,.08)",
            borderRadius: 99,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: barColor,
              borderRadius: 99,
              transition: "width .4s ease, background .4s ease",
            }}
          />
        </div>

        {/* Summary text */}
        <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", gap: 16, flexWrap: "wrap" }}>
          {fetchError ? (
            <span style={{ color: "var(--error)" }}>Poll error: {fetchError}</span>
          ) : job ? (
            <>
              <span>
                {done} / {total} claims processed
              </span>
              <span style={{ color: "var(--success)" }}>
                {job.successful} successful
              </span>
              {job.failed > 0 && (
                <span style={{ color: "var(--warning)" }}>
                  {job.failed} failed
                </span>
              )}
              <span style={{ marginLeft: "auto" }}>{progress}%</span>
            </>
          ) : (
            <span>Initialising…</span>
          )}
        </div>

        {/* Per-claim errors (collapsed unless there are failures) */}
        {job?.errors?.length > 0 && (
          <details style={{ marginTop: 4 }}>
            <summary
              style={{ fontSize: 11, color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }}
            >
              {job.errors.length} claim error{job.errors.length !== 1 ? "s" : ""} — expand for details
            </summary>
            <ul
              style={{
                margin: "8px 0 0",
                padding: "0 0 0 16px",
                fontSize: 11,
                color: "var(--warning)",
                lineHeight: 1.8,
                fontFamily: "var(--mono)",
              }}
            >
              {job.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <style>{`@keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }`}</style>
    </div>
  );
}
