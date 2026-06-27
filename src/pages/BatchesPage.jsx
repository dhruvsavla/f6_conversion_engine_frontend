import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { listBatches, getBatch } from "../api/client";

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function ProgressBar({ value, total, color = "var(--accent)" }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden", marginTop: 6 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width .3s ease" }} />
    </div>
  );
}

function StatusPill({ count, label, color }) {
  if (!count) return null;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, marginRight: 8 }}>
      {count} {label}
    </span>
  );
}

function BatchCard({ batch, onClick, isOpen }) {
  const done = (batch.completed_count || 0) + (batch.failed_count || 0);
  const total = batch.total_files || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const isActive = batch.status === "processing";

  const statusColor = {
    completed: "var(--success)",
    processing: "var(--accent)",
    failed:     "var(--error)",
    pending:    "var(--text-secondary)",
  }[batch.status] || "var(--text-secondary)";

  return (
    <div
      className="card"
      style={{ overflow: "hidden", cursor: "pointer", border: isOpen ? "1px solid var(--accent-border)" : undefined }}
      onClick={onClick}
    >
      <div style={{ padding: "14px 18px" }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)", marginBottom: 2 }}>
              {batch.name}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", fontFamily: "var(--mono)" }}>
              {batch.id?.slice(0, 12)}…
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {isActive && (
              <span style={{ fontSize: 10, color: "var(--accent)", animation: "pulse 1.5s ease-in-out infinite" }}>
                ● LIVE
              </span>
            )}
            <span style={{ fontSize: 12, color: statusColor, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>
              {batch.status}
            </span>
          </div>
        </div>

        {/* Progress */}
        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 2 }}>
          {done} / {total} files · {pct}%
        </div>
        <ProgressBar
          value={done}
          total={total}
          color={batch.status === "failed" ? "var(--error)" : batch.status === "completed" ? "var(--success)" : "var(--accent)"}
        />

        {/* Status pills */}
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap" }}>
          <StatusPill count={batch.completed_count} label="done" color="var(--success)" />
          <StatusPill count={batch.failed_count}    label="failed" color="var(--error)" />
          <StatusPill count={batch.processing_count} label="processing" color="var(--accent)" />
          <StatusPill count={batch.pending_count}   label="pending" color="var(--text-secondary)" />
        </div>

        {/* Date */}
        <div style={{ marginTop: 8, fontSize: 10, color: "var(--text-secondary)" }}>
          {fmtDate(batch.created_at)}
          {batch.completed_at && ` → ${fmtDate(batch.completed_at)}`}
        </div>
      </div>

      {/* Expand indicator */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "6px 18px", background: isOpen ? "var(--accent-light)" : undefined, fontSize: 11, color: isOpen ? "var(--accent)" : "var(--text-secondary)", textAlign: "center" }}>
        {isOpen ? "▲ Hide conversions" : "▼ Show conversions"}
      </div>
    </div>
  );
}

function BatchDetail({ batchId }) {
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getBatch(batchId)
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [batchId]);

  if (loading) return <div style={{ padding: "14px 18px", color: "var(--text-secondary)", fontSize: 12 }}>Loading…</div>;
  if (!detail?.conversions?.length) return <div style={{ padding: "14px 18px", color: "var(--text-secondary)", fontSize: 12 }}>No conversions yet.</div>;

  return (
    <div style={{ borderTop: "1px solid var(--border)", maxHeight: 320, overflowY: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "var(--bg-elevated)" }}>
            {["Filename", "Status", "Type", "Created"].map(h => (
              <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {detail.conversions.map(c => {
            const statusColor = { success: "var(--success)", failed: "var(--error)", processing: "var(--accent)", pending: "var(--text-secondary)" }[c.status];
            return (
              <tr
                key={c.id}
                onClick={() => navigate(`/history/${c.id}`)}
                style={{ cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,.05)"}
                onMouseLeave={e => e.currentTarget.style.background = ""}
              >
                <td style={{ padding: "7px 12px", fontFamily: "var(--mono)", color: "var(--text)", wordBreak: "break-all" }}>{c.filename}</td>
                <td style={{ padding: "7px 12px", color: statusColor, fontWeight: 700, textTransform: "uppercase", fontSize: 10, letterSpacing: ".04em" }}>{c.status}</td>
                <td style={{ padding: "7px 12px", color: "var(--text-secondary)" }}>{c.transaction_type || "—"}</td>
                <td style={{ padding: "7px 12px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{fmtDate(c.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function BatchesPage() {
  const navigate         = useNavigate();
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
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", background: "linear-gradient(135deg, #F1F5F9 30%, #818CF8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 6 }}>
            Batch Jobs
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {batches.length} batch{batches.length !== 1 ? "es" : ""} total
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={load} style={{ fontSize: 12 }}>⟳ Refresh</button>
          <button className="btn btn-primary" onClick={() => navigate("/")} style={{ fontSize: 12 }}>+ New Batch</button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: 14, color: "var(--error)", background: "var(--error-light)", border: "1px solid var(--error)", marginBottom: 20, fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading && batches.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card" style={{ height: 96, opacity: 0.4, background: "var(--bg-elevated)" }} />
          ))}
        </div>
      )}

      {!loading && batches.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-secondary)" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
          <div>No batches yet. Upload files from the{" "}
            <button className="btn btn-ghost" style={{ fontSize: 13, padding: "2px 4px" }} onClick={() => navigate("/")}>Convert page</button>.
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {batches.map(batch => (
          <div key={batch.id}>
            <BatchCard
              batch={batch}
              onClick={() => toggle(batch.id)}
              isOpen={openId === batch.id}
            />
            {openId === batch.id && <BatchDetail batchId={batch.id} />}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }
      `}</style>
    </div>
  );
}
