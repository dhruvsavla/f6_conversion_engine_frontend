import { useEffect, useState, useCallback } from "react";
import {
  listRuleSets, activateRuleSet,
  listRules, updateRule, deleteRule,
} from "../api/client";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { IconRules, IconTrash, IconSearch } from "../components/Icons";

const SEGMENTS = ["HDR","INS","PAT","CLM","PRE","PRI","DUR","COB","CMP","PA","CLN"];
const TX_TYPES  = ["RETAIL","SPECIALTY","COB","CONTROLLED","REVERSAL","COMPOUND","LTC","MEDICARE_PART_D","ELIGIBILITY","PRIOR_AUTH"];

const ACTION_COLORS = {
  carry:     { color: "var(--status-neutral)", bg: "var(--status-neutral-bg)" },
  transform: { color: "var(--status-teal)",    bg: "var(--status-teal-bg)" },
  add:       { color: "var(--status-success)", bg: "var(--status-success-bg)" },
  remove:    { color: "var(--status-error)",   bg: "var(--status-error-bg)" },
  modify:    { color: "var(--status-purple)",  bg: "var(--status-purple-bg)" },
  cases:     { color: "var(--status-info)",    bg: "var(--status-info-bg)" },
};

function ActionBadge({ action }) {
  const c = ACTION_COLORS[action?.toLowerCase()] || ACTION_COLORS.carry;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: "var(--radius-full)",
      background: c.bg, color: c.color,
      fontSize: "var(--text-xs)", fontWeight: 600,
      fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      {action}
    </span>
  );
}

function RuleSetCard({ rs, onActivate }) {
  return (
    <div style={{
      background: "var(--bg-surface)",
      border: `1px solid ${rs.is_active ? "var(--accent)" : "var(--border-subtle)"}`,
      borderRadius: "var(--radius-md)",
      padding: "12px 16px",
      display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "var(--text-md)", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
          {rs.name}
          {rs.is_active && (
            <span style={{
              fontSize: "var(--text-xs)", padding: "1px 7px",
              background: "var(--accent)", color: "#fff",
              borderRadius: "var(--radius-full)", fontWeight: 700, letterSpacing: "0.05em",
            }}>
              ACTIVE
            </span>
          )}
        </div>
        {rs.description && (
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginTop: 2 }}>{rs.description}</div>
        )}
        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginTop: 3, fontFamily: "var(--font-mono)" }}>
          v{rs.version}
          {rs.source_pdf && <> · {rs.source_pdf}</>}
          {rs.created_at && <> · {new Date(rs.created_at).toLocaleDateString()}</>}
        </div>
      </div>
      <div>
        {rs.is_active ? (
          <span style={{ fontSize: "var(--text-sm)", color: "var(--status-success)" }}>✓ In use</span>
        ) : (
          <button
            onClick={() => onActivate(rs.id)}
            style={{
              background: "transparent", border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)", borderRadius: "var(--radius-sm)",
              padding: "5px 12px", fontSize: "var(--text-sm)", cursor: "pointer",
            }}
          >
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
        style={{
          width: "100%", background: "var(--bg-input)",
          border: "1px solid var(--border-focus)", borderRadius: "var(--radius-sm)",
          padding: "2px 6px", color: "var(--text-primary)",
          fontFamily: field === "field_id" ? "var(--font-mono)" : undefined,
          fontSize: "var(--text-sm)",
        }}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Click to edit"
      style={{ cursor: "text", display: "block", minWidth: 40 }}
    >
      {value || <span style={{ color: "var(--text-tertiary)", fontStyle: "italic" }}>—</span>}
    </span>
  );
}

function RuleRow({ rule, onUpdate, onDelete }) {
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirm,  setConfirm]  = useState(false);

  async function handleUpdate(field, val) {
    setSaving(true);
    try { await onUpdate(rule.id, { [field]: val }); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm) { setConfirm(true); return; }
    setDeleting(true);
    try { await onDelete(rule.id); }
    finally { setDeleting(false); setConfirm(false); }
  }

  const tdStyle = {
    padding: "7px 12px",
    borderBottom: "1px solid var(--border-subtle)",
    fontSize: "var(--text-sm)",
  };

  return (
    <tr
      style={{ opacity: saving || deleting ? 0.6 : 1 }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-raised)"}
      onMouseLeave={e => { e.currentTarget.style.background = ""; setConfirm(false); }}
    >
      <td style={{ ...tdStyle, fontFamily: "var(--font-mono)", color: "var(--text-code)", whiteSpace: "nowrap" }}>
        <EditableCell value={rule.field_id} field="field_id" onChange={v => handleUpdate("field_id", v)} />
      </td>
      <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>
        <EditableCell value={rule.description || ""} field="description" onChange={v => handleUpdate("description", v)} />
      </td>
      <td style={{ ...tdStyle, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
        {rule.segment_id}
      </td>
      <td style={{ ...tdStyle, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
        {rule.transaction_type}
      </td>
      <td style={tdStyle}>
        <ActionBadge action={rule.action} />
      </td>
      <td style={{ ...tdStyle, textAlign: "right" }}>
        <button
          onClick={handleDelete}
          style={{
            background: "none",
            border: `1px solid ${confirm ? "var(--status-error)" : "var(--border-subtle)"}`,
            borderRadius: "var(--radius-sm)", cursor: "pointer",
            color: confirm ? "var(--status-error)" : "var(--text-tertiary)",
            fontSize: "var(--text-xs)", padding: "2px 7px",
            display: "flex", alignItems: "center", gap: 3,
          }}
          title={confirm ? "Click again to confirm" : "Delete rule"}
          disabled={deleting}
        >
          <IconTrash size={11} color={confirm ? "var(--status-error)" : "var(--text-tertiary)"} />
          {confirm ? "Sure?" : ""}
        </button>
      </td>
    </tr>
  );
}

const inputStyle = {
  padding: "7px 10px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border-subtle)",
  fontSize: "var(--text-sm)",
  background: "var(--bg-input)",
  color: "var(--text-primary)",
};

export default function RulesPage() {
  const [ruleSets,    setRuleSets]    = useState([]);
  const [rules,       setRules]       = useState([]);
  const [activeSetId, setActiveSetId] = useState(null);
  const [search,      setSearch]      = useState("");
  const [segFilter,   setSegFilter]   = useState("");
  const [txFilter,    setTxFilter]    = useState("");
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

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

  const activeSet = ruleSets.find(r => r.is_active);

  const thStyle = {
    padding: "9px 12px", textAlign: "left", fontWeight: 600,
    fontSize: "var(--text-xs)", color: "var(--text-tertiary)",
    textTransform: "uppercase", letterSpacing: "0.08em",
    borderBottom: "1px solid var(--border-subtle)",
    background: "var(--bg-raised)", whiteSpace: "nowrap",
    position: "sticky", top: 0, zIndex: 10,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader
        eyebrow="Rules"
        title="Rules Library"
        subtitle={activeSet ? `Active: ${activeSet.name} · ${rules.length} rules` : `${rules.length} rules · ${ruleSets.length} rule set${ruleSets.length !== 1 ? "s" : ""}`}
      />

      <div style={{ padding: "20px 40px", flex: 1 }}>
        {error && (
          <div style={{
            padding: "12px 16px", marginBottom: 16,
            background: "var(--status-error-bg)", border: "1px solid var(--status-error)",
            borderLeft: "3px solid var(--status-error)", borderRadius: "var(--radius-md)",
            color: "var(--status-error)", fontSize: "var(--text-sm)",
          }}>
            {error}
          </div>
        )}

        {/* Rule sets */}
        {ruleSets.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {ruleSets.map(rs => (
              <RuleSetCard key={rs.id} rs={rs} onActivate={handleActivate} />
            ))}
          </div>
        )}

        {/* Filter bar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 200px", minWidth: 160 }}>
            <IconSearch size={13} color="var(--text-tertiary)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Search field ID or description…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && loadRules(activeSetId)}
              style={{ ...inputStyle, width: "100%", paddingLeft: 30 }}
            />
          </div>
          <select value={segFilter} onChange={e => setSegFilter(e.target.value)} style={inputStyle}>
            <option value="">All segments</option>
            {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={txFilter} onChange={e => setTxFilter(e.target.value)} style={inputStyle}>
            <option value="">All types</option>
            {TX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            onClick={() => loadRules(activeSetId)}
            style={{
              ...inputStyle, cursor: "pointer",
              background: "transparent", color: "var(--text-secondary)",
            }}
          >
            Filter
          </button>
          {(search || segFilter || txFilter) && (
            <button
              onClick={() => { setSearch(""); setSegFilter(""); setTxFilter(""); }}
              style={{
                background: "none", border: "none",
                color: "var(--text-tertiary)", fontSize: "var(--text-sm)", cursor: "pointer",
              }}
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* Rules table */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)", overflow: "hidden",
        }}>
          {loading ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-tertiary)" }}>
              Loading rules…
            </div>
          ) : rules.length === 0 ? (
            <EmptyState
              icon={<IconRules size={40} />}
              title="No rules found"
              subtitle={ruleSets.length === 0 ? "No rule sets imported yet." : "Try clearing the filters."}
            />
          ) : (
            <div style={{ overflowX: "auto", maxHeight: 520 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Field ID", "Description", "Segment", "Tx Type", "Action", ""].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
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

        <div style={{ marginTop: 8, fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
          Click any Field ID or Description cell to edit inline. Changes are saved immediately.
        </div>
      </div>
    </div>
  );
}
