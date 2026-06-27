import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { listConversions } from "../api/client";

const STATUS_COLORS = {
  success:    "var(--success)",
  failed:     "var(--error)",
  processing: "var(--accent)",
  pending:    "var(--text-secondary)",
};

const STATUS_ICONS = {
  success:    "✓",
  failed:     "✕",
  processing: "⟳",
  pending:    "·",
};

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function relativeTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ConversionCard({ conv, onClick }) {
  const statusColor = STATUS_COLORS[conv.status] || "var(--text-secondary)";
  const icon        = STATUS_ICONS[conv.status] || "·";
  const isSpinning  = conv.status === "processing";

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-bright)",
        borderLeft: `4px solid ${statusColor}`,
        borderRadius: "var(--radius)",
        padding: "16px 18px",
        cursor: "pointer",
        transition: "all .18s ease",
        position: "relative",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#3D444E"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-bright)"; e.currentTarget.style.transform = ""; }}
    >
      {/* Status icon */}
      <div style={{ position: "absolute", top: 14, right: 16, fontSize: 15, color: statusColor, animation: isSpinning ? "spin 1s linear infinite" : "none" }}>
        {icon}
      </div>

      {/* Filename */}
      <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-primary)", fontWeight: 600, marginBottom: 5, paddingRight: 24, wordBreak: "break-all" }}>
        {conv.filename}
      </div>

      {/* Transaction type badge */}
      {conv.transaction_type && (
        <div style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", background: "var(--accent-light)", border: "1px solid var(--accent-border)", borderRadius: 999, fontSize: 10, fontWeight: 700, color: "var(--accent)", letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 8 }}>
          {conv.transaction_type}
        </div>
      )}

      {/* Stats row */}
      {conv.status === "success" ? (
        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>
          <span style={{ color: "var(--success)" }}>{conv.fields_added} added</span>
          <span style={{ margin: "0 5px", opacity: .4 }}>·</span>
          <span>{(conv.fields_carried || 0) + (conv.fields_transformed || 0)} carried/transformed</span>
          {conv.warnings_count > 0 && (
            <><span style={{ margin: "0 5px", opacity: .4 }}>·</span>
            <span style={{ color: "var(--warning)" }}>{conv.warnings_count} warn</span></>
          )}
          {conv.errors_count > 0 && (
            <><span style={{ margin: "0 5px", opacity: .4 }}>·</span>
            <span style={{ color: "var(--error)" }}>{conv.errors_count} err</span></>
          )}
        </div>
      ) : conv.status === "failed" ? (
        <div style={{ fontSize: 11, color: "var(--error)", marginBottom: 6, fontStyle: "italic" }}>
          {conv.error_message ? conv.error_message.slice(0, 80) : "Conversion failed"}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6, fontStyle: "italic" }}>
          {conv.status === "processing" ? "Processing…" : "Pending"}
        </div>
      )}

      {/* Timestamp */}
      <div style={{ fontSize: 10, color: "var(--text-secondary)" }} title={fmtDate(conv.created_at)}>
        {relativeTime(conv.created_at)}
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

const STATUS_OPTIONS = ["all", "success", "failed", "processing", "pending"];

export default function HistoryPage() {
  const navigate = useNavigate();
  const [items,  setItems]  = useState([]);
  const [total,  setTotal]  = useState(0);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error,   setError]  = useState(null);
  const LIMIT = 24;

  const load = useCallback(async (reset = false) => {
    setLoading(true);
    setError(null);
    const off = reset ? 0 : offset;
    try {
      const data = await listConversions({
        limit: LIMIT,
        offset: off,
        status: status !== "all" ? status : undefined,
      });
      setItems(prev => reset ? data.items : [...prev, ...data.items]);
      setTotal(data.total);
      setOffset(off + data.items.length);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [offset, status]);

  useEffect(() => {
    setOffset(0);
    setItems([]);
    load(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const hasMore = items.length < total;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", background: "linear-gradient(135deg, #F1F5F9 30%, #818CF8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 6 }}>
          Conversion History
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {total} total conversions
        </p>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        {STATUS_OPTIONS.map(s => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`btn ${s === status ? "btn-primary" : "btn-secondary"}`}
            style={{ fontSize: 12, padding: "6px 14px", textTransform: s !== "all" ? "capitalize" : undefined }}
          >
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="card" style={{ padding: 16, color: "var(--error)", background: "var(--error-light)", border: "1px solid var(--error)", marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Grid */}
      {items.length === 0 && !loading ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-secondary)" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
          <div>No conversions yet. Run one from the{" "}
            <button className="btn btn-ghost" style={{ fontSize: 13, padding: "2px 4px" }} onClick={() => navigate("/")}>Convert page</button>.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginBottom: 24 }}>
          {items.map(conv => (
            <ConversionCard
              key={conv.id}
              conv={conv}
              onClick={() => navigate(`/history/${conv.id}`)}
            />
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card" style={{ height: 120, opacity: 0.4, background: "var(--bg-elevated)" }} />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <button className="btn btn-secondary" onClick={() => load(false)}>
            Load more ({total - items.length} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
