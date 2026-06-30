import { useCallback, useEffect, useRef, useState } from "react";
import { fetchEngineStats, reloadEngineRules } from "../api/client";
import PageHeader from "../components/PageHeader";
import { IconSpinner } from "../components/Icons";

const POLL_MS = 3000;

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtUptime(seconds) {
  if (seconds < 60)   return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function fmtMs(ms) {
  if (!ms && ms !== 0) return '—';
  return `${ms.toFixed(0)}ms`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-md)",
      padding: "14px 20px",
      minWidth: 110,
    }}>
      <div style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: accent || "var(--text-primary)", lineHeight: 1.1 }}>
        {value ?? "—"}
      </div>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase",
      letterSpacing: "0.08em", color: "var(--text-tertiary)", marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

function BusyDot({ busy }) {
  return (
    <span style={{
      display: "inline-block",
      width: 8, height: 8,
      borderRadius: "50%",
      background: busy ? "#10B981" : "var(--border-subtle)",
      boxShadow: busy ? "0 0 0 2px rgba(16,185,129,0.25)" : "none",
      animation: busy ? "pulse 1.5s infinite" : "none",
      verticalAlign: "middle",
    }} />
  );
}

function AgentTable({ agents }) {
  if (!agents || agents.length === 0) {
    return (
      <div style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)", padding: "16px 0" }}>
        No agents running.
      </div>
    );
  }

  const cols = [
    { label: "ID",      key: "agent_id",        width: 48  },
    { label: "Done",    key: "jobs_processed",   width: 72  },
    { label: "Failed",  key: "jobs_failed",      width: 64  },
    { label: "Timeout", key: "jobs_timed_out",   width: 72  },
    { label: "p50",     key: "p50_ms",           width: 72, fmt: fmtMs },
    { label: "p95",     key: "p95_ms",           width: 72, fmt: fmtMs },
    { label: "p99",     key: "p99_ms",           width: 72, fmt: fmtMs },
    { label: "Err%",    key: "error_rate_pct",   width: 64, fmt: v => `${v}%` },
    { label: "Busy",    key: "is_busy",          width: 56  },
  ];

  const thStyle = {
    fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.06em", color: "var(--text-tertiary)",
    padding: "8px 12px", textAlign: "left",
    borderBottom: "1px solid var(--border-subtle)",
    whiteSpace: "nowrap",
  };

  const tdStyle = (highlight) => ({
    fontSize: "var(--text-sm)", color: highlight ? "var(--status-error)" : "var(--text-primary)",
    padding: "9px 12px",
    borderBottom: "1px solid var(--border-subtle)",
    fontFamily: "var(--font-mono)",
    whiteSpace: "nowrap",
  });

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c.key} style={{ ...thStyle, width: c.width }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {agents.map(agent => (
            <tr
              key={agent.agent_id}
              style={{ background: agent.is_busy ? "rgba(16,185,129,0.04)" : "transparent" }}
            >
              {cols.map(c => {
                const raw = agent[c.key];
                if (c.key === "is_busy") {
                  return (
                    <td key={c.key} style={tdStyle(false)}>
                      <BusyDot busy={raw} />
                    </td>
                  );
                }
                const display = c.fmt ? c.fmt(raw) : raw;
                const isError = c.key === "jobs_failed" && raw > 0;
                return <td key={c.key} style={tdStyle(isError)}>{display}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function EngineMonitorPage() {
  const [stats,     setStats]     = useState(null);
  const [error,     setError]     = useState(null);
  const [lastAt,    setLastAt]    = useState(null);
  const [reloading, setReloading] = useState(false);
  const [reloadMsg, setReloadMsg] = useState(null);
  const intervalRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchEngineStats();
      setStats(data);
      setLastAt(new Date());
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, POLL_MS);
    return () => clearInterval(intervalRef.current);
  }, [refresh]);

  async function handleReload() {
    setReloading(true);
    setReloadMsg(null);
    try {
      const result = await reloadEngineRules();
      setReloadMsg(`Reloaded: ${result.total_rules} rules from "${result.rule_set}"`);
      await refresh();
    } catch (e) {
      setReloadMsg(`Failed: ${e.message}`);
    } finally {
      setReloading(false);
    }
  }

  const pool   = stats?.pool   || {};
  const queue  = stats?.queue  || {};
  const cache  = stats?.cache  || {};
  const agents = stats?.agents || [];

  const totalProcessed = pool.total_processed || 0;
  const totalFailed    = pool.total_failed    || 0;
  const errorRate      = pool.error_rate_pct  ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader
        eyebrow="Engine"
        title="Agent Pool Monitor"
        subtitle="Live view of the conversion worker pool — queue depth, agent utilization, and latency percentiles."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {lastAt && (
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
                Updated {lastAt.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={refresh}
              style={{
                background: "transparent",
                border: "1px solid var(--border-default)",
                color: "var(--text-secondary)",
                borderRadius: "var(--radius-md)",
                padding: "5px 12px",
                fontSize: "var(--text-xs)",
                cursor: "pointer",
              }}
            >
              Refresh
            </button>
          </div>
        }
      />

      {error && (
        <div style={{
          margin: "16px 40px", padding: "12px 16px",
          background: "var(--status-error-bg)",
          border: "1px solid var(--status-error)",
          borderLeft: "3px solid var(--status-error)",
          borderRadius: "var(--radius-md)",
          color: "var(--status-error)", fontSize: "var(--text-sm)",
        }}>
          {error} — is the backend running on port 8000?
        </div>
      )}

      <div style={{ padding: "24px 40px", flex: 1, display: "flex", flexDirection: "column", gap: 28 }}>

        {/* ── Pool status bar ─────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 16px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
            background: pool.running ? "#10B981" : "var(--status-error)",
            boxShadow: pool.running ? "0 0 0 3px rgba(16,185,129,0.2)" : "none",
          }} />
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
            {pool.running
              ? `${pool.n_agents} agents running · uptime ${fmtUptime(pool.uptime_seconds || 0)}`
              : "Pool not running"
            }
          </span>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginLeft: "auto" }}>
            Polls every {POLL_MS / 1000}s
          </span>
        </div>

        {/* ── Queue ───────────────────────────────────────────── */}
        <div>
          <SectionLabel>Queue</SectionLabel>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <StatCard label="Depth"   value={queue.depth ?? 0}   />
            <StatCard label="Urgent"  value={queue.urgent ?? 0}  accent={queue.urgent > 0 ? "var(--status-error)"   : undefined} />
            <StatCard label="Normal"  value={queue.normal ?? 0}  accent={queue.normal > 0 ? "var(--accent)"         : undefined} />
            <StatCard label="Bulk"    value={queue.bulk ?? 0}    accent={queue.bulk   > 0 ? "var(--text-secondary)" : undefined} />
          </div>
        </div>

        {/* ── Rule Cache ──────────────────────────────────────── */}
        <div>
          <SectionLabel>Rule Cache</SectionLabel>
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "14px 18px",
            display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
                {cache.rule_set || "No rule set loaded"}
              </div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginTop: 2 }}>
                {cache.total_rules ?? 0} rules · {cache.is_warm ? "warm" : "cold"}
              </div>
            </div>
            <button
              onClick={handleReload}
              disabled={reloading}
              style={{
                marginLeft: "auto",
                display: "flex", alignItems: "center", gap: 6,
                background: "var(--bg-raised)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "6px 14px",
                fontSize: "var(--text-xs)", fontWeight: 500,
                color: "var(--text-secondary)", cursor: reloading ? "not-allowed" : "pointer",
                opacity: reloading ? 0.6 : 1,
              }}
            >
              {reloading && <IconSpinner size={11} />}
              Force Reload Rules
            </button>
          </div>
          {reloadMsg && (
            <div style={{
              marginTop: 8, fontSize: "var(--text-xs)",
              color: reloadMsg.startsWith("Failed") ? "var(--status-error)" : "var(--status-success)",
            }}>
              {reloadMsg}
            </div>
          )}
        </div>

        {/* ── Agent metrics ────────────────────────────────────── */}
        <div>
          <SectionLabel>Agent Metrics (live)</SectionLabel>
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
          }}>
            <AgentTable agents={agents} />
          </div>
        </div>

        {/* ── Pool totals ──────────────────────────────────────── */}
        <div>
          <SectionLabel>Pool Totals</SectionLabel>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <StatCard label="Processed"  value={totalProcessed.toLocaleString()} />
            <StatCard label="Failed"     value={totalFailed}    accent={totalFailed > 0 ? "var(--status-error)" : undefined} />
            <StatCard label="Timed Out"  value={pool.total_timed_out ?? 0} />
            <StatCard label="Error Rate" value={`${errorRate}%`} accent={errorRate > 1 ? "var(--status-error)" : undefined} />
            <StatCard label="Uptime"     value={fmtUptime(pool.uptime_seconds || 0)} />
          </div>
        </div>

      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
