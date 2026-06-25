import { useEffect, useState } from "react";
import { fetchRulesSummary } from "../api/client";

function SegmentTag({ seg, count }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "var(--blue-light)", color: "var(--blue-pill)", borderRadius: 999, fontSize: 11, fontWeight: 500, fontFamily: "var(--mono)" }}>
      {seg}
      <span style={{ opacity: .7 }}>({count})</span>
    </span>
  );
}

function TxCard({ detail }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", padding: "14px 18px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 13, color: "var(--accent)" }}>{detail.transaction_type}</span>
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
        <div style={{ padding: "0 18px 16px", borderTop: "1px solid var(--border)" }}>
          <div style={{ marginBottom: 10, marginTop: 12 }}>
            <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--mono)" }}>{detail.file}</span>
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
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Rules Library</h1>
          {summary && (
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {summary.files.length} files · {summary.total_rules} field rules · {summary.transaction_types.length} transaction types
            </p>
          )}
        </div>
        <button className="btn btn-secondary" onClick={load} style={{ fontSize: 12 }}>
          ⟳ Reload rules
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-secondary)" }}>Loading rules…</div>
      )}

      {error && (
        <div className="card" style={{ padding: 18, color: "var(--error)", background: "var(--error-light)", border: "1px solid var(--error)" }}>
          Failed to load rules: {error}
        </div>
      )}

      {summary && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
            {summary.details.map(d => <TxCard key={d.transaction_type} detail={d} />)}
          </div>

          <div className="card" style={{ padding: 20, background: "linear-gradient(135deg, #0D1B2A 0%, #0F2744 100%)" }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#fff", marginBottom: 8 }}>How to add rules</div>
            <p style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.7, marginBottom: 10 }}>
              Drop a new <code style={{ background: "rgba(255,255,255,.1)", padding: "1px 5px", borderRadius: 3, fontFamily: "var(--mono)" }}>.json</code> file in the{" "}
              <code style={{ background: "rgba(255,255,255,.1)", padding: "1px 5px", borderRadius: 3, fontFamily: "var(--mono)" }}>rules/</code> folder on the backend.
              The agent picks it up automatically on the next conversion — no restart needed.
              Each file must include a <code style={{ fontFamily: "var(--mono)", color: "#7dd3fc" }}>"transaction_type"</code> key and follow the rule schema.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {summary.files.map(f => (
                <span key={f} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "2px 8px", background: "rgba(255,255,255,.08)", borderRadius: 999, color: "#94A3B8" }}>{f}</span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
