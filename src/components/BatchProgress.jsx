import { useEffect, useRef, useState } from "react";
import { getBatchStatus } from "../api/client";
import { IconSpinner } from './Icons';

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

    setJob(null);
    setFetchError(null);

    async function poll() {
      try {
        const data = await getBatchStatus(jobId);
        setJob(data);
        if (data.status === "completed" || data.status === "error") {
          clearInterval(intervalRef.current);
          if (onDone) onDone(data);
        }
      } catch (e) {
        setFetchError(e.message);
        clearInterval(intervalRef.current);
      }
    }

    poll();
    intervalRef.current = setInterval(poll, 1000);

    return () => clearInterval(intervalRef.current);
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!jobId) return null;

  const progress  = job?.progress  ?? 0;
  const total     = job?.total     ?? 0;
  const done      = (job?.successful ?? 0) + (job?.failed ?? 0);
  const status    = job?.status    ?? "pending";
  const isRunning = status === "pending" || status === "processing";

  const barColor =
    status === "error"
      ? "var(--status-error)"
      : status === "completed" && (job?.failed ?? 0) > 0
      ? "var(--status-warn)"
      : status === "completed"
      ? "var(--status-success)"
      : "var(--accent)";

  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-md)",
      padding: "16px 20px",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
          {isRunning ? (
            <><IconSpinner size={14} color="var(--accent)" /> Batch processing…</>
          ) : status === "error" ? (
            "Batch failed"
          ) : (
            "Batch complete"
          )}
        </span>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
          {jobId.slice(0, 8)}…
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 6,
        background: "var(--bg-raised)",
        borderRadius: "var(--radius-full)",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${progress}%`,
          background: isRunning
            ? "linear-gradient(90deg, var(--accent), var(--status-teal))"
            : barColor,
          borderRadius: "var(--radius-full)",
          transition: "width .4s ease",
          animation: isRunning ? "shimmer 1.5s ease infinite" : "none",
          backgroundSize: "200% 100%",
        }} />
      </div>

      {/* Summary text */}
      <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", display: "flex", gap: 16, flexWrap: "wrap" }}>
        {fetchError ? (
          <span style={{ color: "var(--status-error)" }}>Poll error: {fetchError}</span>
        ) : job ? (
          <>
            <span>{done} / {total} claims processed</span>
            <span style={{ color: "var(--status-success)" }}>{job.successful} successful</span>
            {job.failed > 0 && (
              <span style={{ color: "var(--status-warn)" }}>{job.failed} failed</span>
            )}
            <span style={{ marginLeft: "auto" }}>{progress}%</span>
          </>
        ) : (
          <span>Initialising…</span>
        )}
      </div>

      {/* Per-claim errors */}
      {job?.errors?.length > 0 && (
        <details style={{ marginTop: 4 }}>
          <summary style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", cursor: "pointer", userSelect: "none" }}>
            {job.errors.length} claim error{job.errors.length !== 1 ? "s" : ""} — expand for details
          </summary>
          <ul style={{
            margin: "8px 0 0", padding: "0 0 0 16px",
            fontSize: "var(--text-xs)", color: "var(--status-warn)",
            lineHeight: 1.8, fontFamily: "var(--font-mono)",
          }}>
            {job.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
