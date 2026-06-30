import { useEffect, useState } from "react";
import { fetchRulesSummary } from "../api/client";

function SegmentTag({ seg, count }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "var(--status-info-bg)", color: "var(--status-info)", borderRadius: 999, fontSize: 11, fontWeight: 500, fontFamily: "var(--font-mono)" }}>
      {seg}
      <span style={{ opacity: .7 }}>({count})</span>
    </span>
  );
}

function TxCard({ detail }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ overflow: "hidden", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", padding: "14px 18px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13, color: "var(--accent)" }}>{detail.transaction_type}</span>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{detail.description}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            {detail.segments.length} segments · {detail.total_field_rules} rules
          </span>
          <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && (
        <div style={{ padding: "0 18px 16px", borderTop: "1px solid var(--border-subtle)" }}>
          <div style={{ marginBottom: 10, marginTop: 12 }}>
            <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{detail.file}</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {detail.segments.map(s => (
              <SegmentTag key={s.segment} seg={s.segment} count={s.rule_count} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RulesPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    fetchRulesSummary()
      .then(setSummary)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4, letterSpacing: "-.02em", color: "var(--text-primary)" }}>Rules Library</h1>
          {summary && (
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {summary.files.length} files · {summary.total_rules} field rules · {summary.transaction_types.length} transaction types
            </p>
          )}
        </div>
        <button
          onClick={load}
          style={{
            fontSize: 12, padding: "6px 14px",
            background: "var(--bg-surface)", border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)", color: "var(--text-secondary)",
            cursor: "pointer", fontFamily: "var(--font-ui)",
          }}
        >
          ⟳ Reload rules
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-secondary)" }}>Loading rules…</div>
      )}

      {error && (
        <div style={{ padding: 18, color: "var(--status-error)", background: "var(--status-error-bg)", border: "1px solid var(--status-error)", borderRadius: "var(--radius-lg)" }}>
          Failed to load rules: {error}
        </div>
      )}

      {summary && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
            {summary.details.map(d => <TxCard key={d.transaction_type} detail={d} />)}
          </div>

          <div style={{ padding: 20, background: "var(--status-info-bg)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)" }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", marginBottom: 8 }}>How to add rules</div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 10 }}>
              Drop a new <code style={{ background: "var(--bg-raised)", padding: "1px 5px", borderRadius: 3, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>.json</code> file in the{" "}
              <code style={{ background: "var(--bg-raised)", padding: "1px 5px", borderRadius: 3, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>rules/</code> folder on the backend.
              The agent picks it up automatically on the next conversion — no restart needed.
              Each file must include a <code style={{ fontFamily: "var(--font-mono)", color: "var(--status-teal)" }}>"transaction_type"</code> key and follow the rule schema.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {summary.files.map(f => (
                <span key={f} style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "2px 8px", background: "var(--bg-raised)", borderRadius: 999, color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>{f}</span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
