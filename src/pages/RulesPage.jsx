import { useEffect, useState, useCallback } from "react";
import {
  listRuleSets, activateRuleSet,
  listRules, updateRule, deleteRule,
} from "../api/client";

const SEGMENTS = ["HDR","INS","PAT","CLM","PRE","PRI","DUR","COB","CMP","PA","CLN"];
const TX_TYPES  = ["RETAIL","SPECIALTY","COB","CONTROLLED","REVERSAL","COMPOUND","LTC","MEDICARE_PART_D","ELIGIBILITY","PRIOR_AUTH"];

function RuleSetCard({ rs, onActivate }) {
  return (
    <div
      className="card"
      style={{
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
        borderColor: rs.is_active ? "var(--accent-border)" : undefined,
        background: rs.is_active ? "linear-gradient(90deg, rgba(99,102,241,.08) 0%, transparent 100%)" : undefined,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
          {rs.name}
          {rs.is_active && (
            <span style={{ fontSize: 10, padding: "1px 7px", background: "var(--accent)", color: "#fff", borderRadius: 999, fontWeight: 700, letterSpacing: ".04em" }}>
              ACTIVE
            </span>
          )}
        </div>
        {rs.description && (
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{rs.description}</div>
        )}
        <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 3, fontFamily: "var(--mono)" }}>
          v{rs.version}
          {rs.source_pdf && <> · {rs.source_pdf}</>}
          {rs.created_at && <> · {new Date(rs.created_at).toLocaleDateString()}</>}
        </div>
      </div>
      <div>
        {rs.is_active ? (
          <span style={{ fontSize: 11, color: "var(--success)" }}>✓ In use</span>
        ) : (
          <button className="btn btn-secondary" onClick={() => onActivate(rs.id)} style={{ fontSize: 11, padding: "5px 12px" }}>
            Activate
          </button>
        )}
      </div>
    </div>
  );
}

function EditableCell({ value, field, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);

  function commit() {
    setEditing(false);
    if (draft !== value) onChange(draft);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        style={{ width: "100%", background: "var(--bg-elevated)", border: "1px solid var(--accent)", borderRadius: 4, padding: "2px 6px", color: "var(--text)", fontFamily: field === "field_id" ? "var(--mono)" : undefined, fontSize: 11 }}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Click to edit"
      style={{ cursor: "text", display: "block", minWidth: 40 }}
    >
      {value || <span style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>—</span>}
    </span>
  );
}

function RuleRow({ rule, onUpdate, onDelete }) {
  const [saving,  setSaving]  = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm]  = useState(false);

  async function handleUpdate(field, val) {
    setSaving(true);
    try {
      await onUpdate(rule.id, { [field]: val });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm) { setConfirm(true); return; }
    setDeleting(true);
    try {
      await onDelete(rule.id);
    } finally {
      setDeleting(false);
      setConfirm(false);
    }
  }

  return (
    <tr
      style={{ borderBottom: "1px solid var(--border)", opacity: saving || deleting ? .6 : 1 }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,.04)"}
      onMouseLeave={e => { e.currentTarget.style.background = ""; setConfirm(false); }}
    >
      <td style={{ padding: "6px 10px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--cyan)", whiteSpace: "nowrap" }}>
        <EditableCell value={rule.field_id} field="field_id" onChange={v => handleUpdate("field_id", v)} />
      </td>
      <td style={{ padding: "6px 10px", fontSize: 11, color: "var(--text)" }}>
        <EditableCell value={rule.description || ""} field="description" onChange={v => handleUpdate("description", v)} />
      </td>
      <td style={{ padding: "6px 10px", fontSize: 10, color: "var(--text-secondary)", fontFamily: "var(--mono)", whiteSpace: "nowrap" }}>
        {rule.segment_id}
      </td>
      <td style={{ padding: "6px 10px", fontSize: 10, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
        {rule.transaction_type}
      </td>
      <td style={{ padding: "6px 10px", fontSize: 10 }}>
        <span style={{ padding: "1px 7px", borderRadius: 999, background: "var(--accent-light)", color: "var(--accent)", fontWeight: 700, fontFamily: "var(--mono)" }}>
          {rule.action}
        </span>
      </td>
      <td style={{ padding: "6px 10px", textAlign: "right" }}>
        <button
          onClick={handleDelete}
          style={{ background: "none", border: `1px solid ${confirm ? "var(--error)" : "var(--border)"}`, borderRadius: 4, cursor: "pointer", color: confirm ? "var(--error)" : "var(--text-secondary)", fontSize: 10, padding: "2px 7px" }}
          title={confirm ? "Click again to confirm" : "Delete rule"}
          disabled={deleting}
        >
          {confirm ? "Sure?" : "✕"}
        </button>
      </td>
    </tr>
  );
}

export default function RulesPage() {
  const [ruleSets, setRuleSets] = useState([]);
  const [rules,    setRules]    = useState([]);
  const [activeSetId, setActiveSetId] = useState(null);
  const [search,   setSearch]   = useState("");
  const [segFilter, setSegFilter] = useState("");
  const [txFilter,  setTxFilter]  = useState("");
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  async function loadRuleSets() {
    const data = await listRuleSets();
    const items = data.items || [];
    setRuleSets(items);
    const active = items.find(r => r.is_active);
    if (active) setActiveSetId(active.id);
    return active?.id || items[0]?.id || null;
  }

  const loadRules = useCallback(async (ruleSetId) => {
    if (!ruleSetId) return;
    const params = { ruleSetId };
    if (txFilter)  params.transactionType = txFilter;
    if (segFilter) params.segmentId = segFilter;
    if (search)    params.search = search;
    const data = await listRules(params);
    setRules(data.items || []);
  }, [txFilter, segFilter, search]);

  async function init() {
    setLoading(true);
    setError(null);
    try {
      const id = await loadRuleSets();
      await loadRules(id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { init(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeSetId) loadRules(activeSetId).catch(() => {});
  }, [activeSetId, loadRules]);

  async function handleActivate(id) {
    try {
      await activateRuleSet(id);
      const newId = id;
      const items = ruleSets.map(r => ({ ...r, is_active: r.id === newId }));
      setRuleSets(items);
      setActiveSetId(newId);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleUpdateRule(ruleId, data) {
    await updateRule(ruleId, data);
    setRules(prev => prev.map(r => r.id === ruleId ? { ...r, ...data } : r));
  }

  async function handleDeleteRule(ruleId) {
    await deleteRule(ruleId);
    setRules(prev => prev.filter(r => r.id !== ruleId));
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", background: "linear-gradient(135deg, #F1F5F9 30%, #818CF8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 6 }}>
          Rules Library
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {rules.length} rules · {ruleSets.length} rule set{ruleSets.length !== 1 ? "s" : ""}
        </p>
      </div>

      {error && (
        <div className="card" style={{ padding: 14, color: "var(--error)", background: "var(--error-light)", border: "1px solid var(--error)", marginBottom: 18, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Rule sets */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {ruleSets.map(rs => (
          <RuleSetCard key={rs.id} rs={rs} onActivate={handleActivate} />
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search field ID or description…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === "Enter" && loadRules(activeSetId)}
          style={{ flex: "1 1 200px", minWidth: 160, padding: "7px 12px", background: "var(--bg-surface)", border: "1px solid var(--border-bright)", borderRadius: 6, color: "var(--text)", fontSize: 12 }}
        />
        <select
          value={segFilter}
          onChange={e => setSegFilter(e.target.value)}
          style={{ padding: "7px 10px", background: "var(--bg-surface)", border: "1px solid var(--border-bright)", borderRadius: 6, color: "var(--text)", fontSize: 12 }}
        >
          <option value="">All segments</option>
          {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={txFilter}
          onChange={e => setTxFilter(e.target.value)}
          style={{ padding: "7px 10px", background: "var(--bg-surface)", border: "1px solid var(--border-bright)", borderRadius: 6, color: "var(--text)", fontSize: 12 }}
        >
          <option value="">All types</option>
          {TX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn btn-secondary" onClick={() => loadRules(activeSetId)} style={{ fontSize: 12, padding: "7px 14px" }}>
          Filter
        </button>
        {(search || segFilter || txFilter) && (
          <button className="btn btn-ghost" onClick={() => { setSearch(""); setSegFilter(""); setTxFilter(""); }} style={{ fontSize: 12 }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* Rules table */}
      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-secondary)" }}>Loading rules…</div>
        ) : rules.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-secondary)" }}>
            No rules found. {ruleSets.length === 0 ? "No rule sets imported yet." : "Try clearing the filters."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-elevated)" }}>
                  {["Field ID", "Description", "Segment", "Tx Type", "Action", ""].map(h => (
                    <th key={h} style={{ padding: "9px 10px", textAlign: "left", fontWeight: 600, fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map(rule => (
                  <RuleRow
                    key={rule.id}
                    rule={rule}
                    onUpdate={handleUpdateRule}
                    onDelete={handleDeleteRule}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-secondary)" }}>
        Click any Field ID or Description cell to edit inline. Changes are saved immediately.
      </div>
    </div>
  );
}
