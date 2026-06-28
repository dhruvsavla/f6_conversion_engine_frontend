import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { listConversions } from "../api/client";
import TransactionBadge from "../components/TransactionBadge";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { SkeletonCard } from "../components/Skeleton";
import { IconHistory } from "../components/Icons";

const STATUS_COLORS = {
  success:    "var(--status-success)",
  failed:     "var(--status-error)",
  processing: "var(--status-info)",
  pending:    "var(--status-neutral)",
};

const STATUS_OPTIONS = ["all", "success", "failed", "processing", "pending"];

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

function StatusPill({ status }) {
  const color = STATUS_COLORS[status] || "var(--status-neutral)";
  const bgMap = {
    success:    "var(--status-success-bg)",
    failed:     "var(--status-error-bg)",
    processing: "var(--status-info-bg)",
    pending:    "var(--status-neutral-bg)",
  };
  const bg = bgMap[status] || "var(--status-neutral-bg)";
  return (
    <span style={{
      padding: "2px 8px", borderRadius: "var(--radius-full)",
      background: bg, color, fontSize: "var(--text-xs)",
      fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      {status}
    </span>
  );
}

function ConversionCard({ conv, onClick }) {
  const statusColor = STATUS_COLORS[conv.status] || "var(--status-neutral)";

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "14px 20px 14px 23px",
        cursor: "pointer",
        transition: "all var(--transition-normal)",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "var(--border-default)";
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "var(--border-subtle)";
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: statusColor,
      }} />

      {/* Row 1: badge + filename + status */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        {conv.transaction_type && <TransactionBadge type={conv.transaction_type} />}
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)",
          color: "var(--text-code)", flex: 1, minWidth: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          wordBreak: "break-all",
        }}>
          {conv.filename}
        </span>
        <StatusPill status={conv.status} />
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border-subtle)", margin: "8px 0" }} />

      {/* Row 2: counts + timestamp */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {conv.status === "success" ? (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--status-success)" }}>{conv.fields_added} added</span>
            {" · "}
            <span>{(conv.fields_carried || 0) + (conv.fields_transformed || 0)} carried/transformed</span>
            {conv.warnings_count > 0 && <><span style={{ opacity: 0.4 }}> · </span><span style={{ color: "var(--status-warn)" }}>{conv.warnings_count} warn</span></>}
            {conv.errors_count > 0 && <><span style={{ opacity: 0.4 }}> · </span><span style={{ color: "var(--status-error)" }}>{conv.errors_count} err</span></>}
          </span>
        ) : conv.status === "failed" ? (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--status-error)", fontStyle: "italic" }}>
            {conv.error_message ? conv.error_message.slice(0, 80) : "Conversion failed"}
          </span>
        ) : (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontStyle: "italic" }}>
            {conv.status === "processing" ? "Processing…" : "Pending"}
          </span>
        )}
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginLeft: "auto" }} title={fmtDate(conv.created_at)}>
          {relativeTime(conv.created_at)}
        </span>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [items,   setItems]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [offset,  setOffset]  = useState(0);
  const [status,  setStatus]  = useState("all");
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
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
  }, [offset, status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setOffset(0);
    setItems([]);
    load(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const hasMore = items.length < total;

  const filterBtnStyle = (s) => ({
    padding: "5px 12px",
    borderRadius: "var(--radius-full)",
    border: `1px solid ${status === s ? "var(--accent)" : "var(--border-subtle)"}`,
    background: status === s ? "var(--status-info-bg)" : "transparent",
    color: status === s ? "var(--accent-bright)" : "var(--text-secondary)",
    fontSize: "var(--text-xs)", fontWeight: 600,
    cursor: "pointer", textTransform: s !== "all" ? "capitalize" : undefined,
    transition: "all var(--transition-fast)",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader
        eyebrow="History"
        title="Conversion History"
        subtitle={`${total} total conversions`}
      />

      <div style={{ padding: "20px 40px", flex: 1 }}>
        {/* Filter bar */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          {STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => setStatus(s)} style={filterBtnStyle(s)}>
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: "12px 16px", marginBottom: 16,
            background: "var(--status-error-bg)",
            border: "1px solid var(--status-error)",
            borderLeft: "3px solid var(--status-error)",
            borderRadius: "var(--radius-md)",
            color: "var(--status-error)", fontSize: "var(--text-sm)",
          }}>
            {error}
          </div>
        )}

        {/* Empty state */}
        {items.length === 0 && !loading && (
          <EmptyState
            icon={<IconHistory size={48} />}
            title="No conversions yet"
            subtitle="Run a conversion from the Convert page."
            action={
              <button
                onClick={() => navigate("/")}
                style={{
                  background: "linear-gradient(135deg, #2563EB, #7C3AED)",
                  color: "#fff", border: "none",
                  borderRadius: "var(--radius-md)",
                  padding: "8px 20px", fontSize: "var(--text-sm)",
                  fontWeight: 600, cursor: "pointer",
                }}
              >
                Go to Convert
              </button>
            }
          />
        )}

        {/* Loading skeleton */}
        {loading && items.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Grid */}
        {items.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 10, marginBottom: 20 }}>
            {items.map(conv => (
              <ConversionCard
                key={conv.id}
                conv={conv}
                onClick={() => navigate(`/history/${conv.id}`)}
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <button
              onClick={() => load(false)}
              style={{
                background: "transparent",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
                borderRadius: "var(--radius-md)",
                padding: "8px 20px", fontSize: "var(--text-sm)",
                cursor: "pointer",
              }}
            >
              Load more ({total - items.length} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
