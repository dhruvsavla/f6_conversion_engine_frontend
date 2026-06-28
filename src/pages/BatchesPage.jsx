import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { listBatches, getBatch } from "../api/client";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { IconBatch, IconSpinner } from "../components/Icons";

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function ProgressBar({ value, total, shimmer = false }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ height: 6, background: "var(--bg-raised)", borderRadius: "var(--radius-full)", overflow: "hidden", marginTop: 8 }}>
      <div style={{
        height: "100%", width: `${pct}%`,
        background: shimmer
          ? "linear-gradient(90deg, var(--accent), var(--status-teal))"
          : "var(--status-success)",
        borderRadius: "var(--radius-full)",
        transition: "width .3s ease",
        backgroundSize: shimmer ? "200% 100%" : undefined,
        animation: shimmer ? "shimmer 1.5s ease infinite" : undefined,
      }} />
    </div>
  );
}

function BatchCard({ batch, onClick, isOpen }) {
  const completed = batch.completed_files || 0;
  const failed    = batch.failed_files    || 0;
  const done      = completed + failed;
  const total     = batch.total_files || 0;
  const isActive  = batch.status === "processing";

  const statusColor = {
    complete:   "var(--status-success)",
    partial:    "var(--status-warn)",
    processing: "var(--status-info)",
    failed:     "var(--status-error)",
    pending:    "var(--status-neutral)",
  }[batch.status] || "var(--status-neutral)";

  const accentColor = statusColor;

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: `1px solid ${isOpen ? "var(--border-default)" : "var(--border-subtle)"}`,
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        cursor: "pointer",
        transition: "all var(--transition-fast)",
        position: "relative",
      }}
      onClick={onClick}
    >
      {/* Left accent */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: accentColor,
      }} />

      <div style={{ padding: "14px 18px 14px 20px" }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: "var(--text-md)", color: "var(--text-primary)", marginBottom: 2 }}>
              {batch.name}
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
              {batch.id?.slice(0, 12)}…
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {isActive && (
              <span className="pulse" style={{ fontSize: "var(--text-xs)", color: "var(--status-info)" }}>
                ● LIVE
              </span>
            )}
            <span style={{ fontSize: "var(--text-xs)", color: statusColor, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {batch.status}
            </span>
          </div>
        </div>

        {/* Progress */}
        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", marginBottom: 2 }}>
          {done} / {total} file{total !== 1 ? "s" : ""}
          {total > 0 && ` · ${Math.round((done / total) * 100)}%`}
        </div>
        <ProgressBar value={done} total={total} shimmer={isActive} />

        {/* Stats pills */}
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {completed > 0 && (
            <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--status-success)" }}>
              {completed} done
            </span>
          )}
          {failed > 0 && (
            <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--status-error)" }}>
              {failed} failed
            </span>
          )}
          {total - done > 0 && isActive && (
            <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--status-info)" }}>
              {total - done} remaining
            </span>
          )}
        </div>

        {/* Date */}
        <div style={{ marginTop: 8, fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
          {fmtDate(batch.created_at)}
          {batch.completed_at && ` → ${fmtDate(batch.completed_at)}`}
        </div>
      </div>

      {/* Expand indicator */}
      <div style={{
        borderTop: "1px solid var(--border-subtle)",
        padding: "6px 18px",
        background: isOpen ? "var(--status-info-bg)" : undefined,
        fontSize: "var(--text-xs)",
        color: isOpen ? "var(--accent-bright)" : "var(--text-tertiary)",
        textAlign: "center",
      }}>
        {isOpen ? "▲ Hide conversions" : "▼ Show conversions"}
      </div>
    </div>
  );
}

function BatchDetail({ batchId }) {
  const navigate = useNavigate();
  const [detail,  setDetail]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getBatch(batchId)
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [batchId]);

  if (loading) return (
    <div style={{ padding: "14px 18px", color: "var(--text-tertiary)", fontSize: "var(--text-sm)", display: "flex", gap: 6 }}>
      <IconSpinner size={13} color="var(--accent)" /> Loading…
    </div>
  );
  if (!detail?.conversions?.length) return (
    <div style={{ padding: "14px 18px", color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>
      No conversions yet.
    </div>
  );

  const statusColors = {
    success:    "var(--status-success)",
    failed:     "var(--status-error)",
    processing: "var(--status-info)",
    pending:    "var(--status-neutral)",
  };

  return (
    <div style={{ borderTop: "1px solid var(--border-subtle)", maxHeight: 320, overflowY: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
        <thead>
          <tr style={{ background: "var(--bg-raised)" }}>
            {["Filename", "Status", "Type", "Created"].map(h => (
              <th key={h} style={{
                padding: "8px 12px", textAlign: "left", fontWeight: 600,
                color: "var(--text-tertiary)", fontSize: "var(--text-xs)",
                textTransform: "uppercase", letterSpacing: "0.08em",
                borderBottom: "1px solid var(--border-subtle)", whiteSpace: "nowrap",
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {detail.conversions.map(c => {
            const statusColor = statusColors[c.status] || "var(--status-neutral)";
            return (
              <tr
                key={c.id}
                onClick={() => navigate(`/history/${c.id}`)}
                style={{ cursor: "pointer", borderBottom: "1px solid var(--border-subtle)" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-raised)"}
                onMouseLeave={e => e.currentTarget.style.background = ""}
              >
                <td style={{ padding: "7px 12px", fontFamily: "var(--font-mono)", color: "var(--text-code)", wordBreak: "break-all" }}>{c.filename}</td>
                <td style={{ padding: "7px 12px", color: statusColor, fontWeight: 600, textTransform: "uppercase", fontSize: "var(--text-xs)", letterSpacing: "0.05em" }}>{c.status}</td>
                <td style={{ padding: "7px 12px", color: "var(--text-tertiary)" }}>{c.transaction_type || "—"}</td>
                <td style={{ padding: "7px 12px", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>{fmtDate(c.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function BatchesPage() {
  const navigate          = useNavigate();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [openId,  setOpenId]  = useState(null);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await listBatches({ limit: 50 });
      setBatches(data.items || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Live-poll while any batch is processing
  useEffect(() => {
    const hasActive = batches.some(b => b.status === "processing");
    if (hasActive) {
      pollRef.current = setInterval(load, 3000);
    } else {
      clearInterval(pollRef.current);
    }
    return () => clearInterval(pollRef.current);
  }, [batches, load]);

  function toggle(id) {
    setOpenId(prev => prev === id ? null : id);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader
        eyebrow="Batches"
        title="Batch Jobs"
        subtitle={`${batches.length} batch${batches.length !== 1 ? "es" : ""} total`}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={load}
              style={{
                background: "transparent", border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)", borderRadius: "var(--radius-md)",
                padding: "6px 12px", fontSize: "var(--text-sm)", cursor: "pointer",
              }}
            >
              ⟳ Refresh
            </button>
            <button
              onClick={() => navigate("/")}
              style={{
                background: "linear-gradient(135deg, #2563EB, #7C3AED)",
                color: "#fff", border: "none", borderRadius: "var(--radius-md)",
                padding: "6px 14px", fontSize: "var(--text-sm)", fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + New Batch
            </button>
          </div>
        }
      />

      <div style={{ padding: "20px 40px", flex: 1 }}>
        {error && (
          <div style={{
            padding: "12px 16px", marginBottom: 16,
            background: "var(--status-error-bg)",
            border: "1px solid var(--status-error)",
            borderRadius: "var(--radius-md)",
            color: "var(--status-error)", fontSize: "var(--text-sm)",
          }}>
            {error}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && batches.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{
                height: 120, background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
                opacity: 0.5,
              }} className="shimmer-bar" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && batches.length === 0 && (
          <EmptyState
            icon={<IconBatch size={48} />}
            title="No batches yet"
            subtitle="Upload files from the Convert page."
            action={
              <button
                onClick={() => navigate("/")}
                style={{
                  background: "linear-gradient(135deg, #2563EB, #7C3AED)",
                  color: "#fff", border: "none", borderRadius: "var(--radius-md)",
                  padding: "8px 20px", fontSize: "var(--text-sm)", fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Go to Convert
              </button>
            }
          />
        )}

        {/* Batch list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {batches.map(batch => (
            <div key={batch.id} style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
            }}>
              <BatchCard
                batch={batch}
                onClick={() => toggle(batch.id)}
                isOpen={openId === batch.id}
              />
              {openId === batch.id && <BatchDetail batchId={batch.id} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
