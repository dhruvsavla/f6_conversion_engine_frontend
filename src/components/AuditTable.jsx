import { useMemo, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

const CHANGE_COLOR = {
  carried: { bg: "var(--carried-light)", color: "var(--carried)" },
  transformed: { bg: "var(--transformed-light)", color: "var(--transformed)" },
  added: { bg: "var(--success-light)", color: "var(--success)" },
  removed: { bg: "var(--error-light)", color: "var(--error)" },
  modified: { bg: "var(--modified-light)", color: "var(--modified)" },
  missing: { bg: "var(--warning-light)", color: "var(--warning)" },
};

const SUP_CHARS = ["", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];

function occSup(n) {
  return n > 1 ? (SUP_CHARS[n] || `^${n}`) : "";
}

function ChangeBadge({ type }) {
  const c = CHANGE_COLOR[type] || CHANGE_COLOR.carried;
  return (
    <span
      className="badge"
      style={{ background: c.bg, color: c.color, fontSize: 10, padding: "2px 7px" }}
    >
      {type}
    </span>
  );
}

function MonoCell({ children, dim }) {
  return (
    <span
      className="mono"
      style={{ fontSize: 11, color: dim ? "var(--text-secondary)" : "var(--text)" }}
    >
      {children}
    </span>
  );
}

function ExpandedRow({ entry, showConditions }) {
  return (
    <tr>
      <td colSpan={showConditions ? 9 : 8} style={{ padding: 0 }}>
        <div
          style={{
            background: "var(--bg-elevated)",
            borderTop: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
            padding: "12px 24px",
            display: "flex",
            gap: 32,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600, marginBottom: 2 }}>
              RULE APPLIED
            </div>
            <code style={{ fontSize: 12, color: "var(--accent)", fontFamily: "var(--mono)" }}>
              {entry.rule_applied || "—"}
            </code>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600, marginBottom: 2 }}>
              NOTES
            </div>
            <span style={{ fontSize: 12, color: "var(--text)" }}>{entry.notes || "No notes."}</span>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600, marginBottom: 2 }}>
              SEGMENT
            </div>
            <code style={{ fontSize: 12, fontFamily: "var(--mono)" }}>
              {entry.segment}{entry.occurrence > 1 ? occSup(entry.occurrence) : ""}
            </code>
          </div>
          {entry.condition_evaluated && (
            <div>
              <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600, marginBottom: 2 }}>
                CONDITION
              </div>
              <code style={{ fontSize: 12, fontFamily: "var(--mono)", color: entry.condition_result ? "var(--success)" : "var(--error)" }}>
                {entry.condition_expression || "—"}
              </code>
              <span style={{ marginLeft: 6, fontSize: 10, color: entry.condition_result ? "var(--success)" : "var(--error)" }}>
                {entry.condition_result ? "✓ passed" : "✗ skipped"}
              </span>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function AuditTable({ entries, segmentFilter, changeTypeFilter }) {
  const [search, setSearch] = useState("");
  const [localSegFilter, setLocalSegFilter] = useState("ALL");
  const [localTypeFilter, setLocalTypeFilter] = useState("ALL");
  const [expandedRow, setExpandedRow] = useState(null);
  const [showConditions, setShowConditions] = useState(false);
  const parentRef = useRef();

  const effectiveSegFilter = segmentFilter || localSegFilter;
  const effectiveTypeFilter = changeTypeFilter || localTypeFilter;

  const segments = useMemo(() => {
    const s = new Set(entries.map(e => e.segment));
    return ["ALL", ...Array.from(s).sort()];
  }, [entries]);

  const hasConditions = useMemo(
    () => entries.some(e => e.condition_evaluated),
    [entries]
  );

  const changeTypes = ["ALL", "carried", "transformed", "added", "removed", "modified", "missing"];

  const filtered = useMemo(() => {
    let r = entries;
    if (effectiveSegFilter !== "ALL") r = r.filter(e => e.segment === effectiveSegFilter);
    if (effectiveTypeFilter !== "ALL") r = r.filter(e => e.change_type === effectiveTypeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(e =>
        e.field_name.toLowerCase().includes(q) ||
        e.from_field_id.toLowerCase().includes(q) ||
        e.to_field_id.toLowerCase().includes(q) ||
        e.old_value.toLowerCase().includes(q) ||
        e.new_value.toLowerCase().includes(q) ||
        e.segment.toLowerCase().includes(q)
      );
    }
    return r;
  }, [entries, effectiveSegFilter, effectiveTypeFilter, search]);

  const useVirtual = filtered.length > 200;
  const rowH = 38;

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowH,
    overscan: 10,
    enabled: useVirtual,
  });

  const colStyle = {
    padding: "8px 10px",
    textAlign: "left",
    borderBottom: "1px solid var(--border)",
    fontSize: 12,
    whiteSpace: "nowrap",
  };

  const thStyle = {
    ...colStyle,
    fontWeight: 600,
    fontSize: 11,
    background: "var(--bg-elevated)",
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    position: "sticky",
    top: 0,
    zIndex: 2,
  };

  function renderRow(entry, i, isExpanded) {
    const bg = i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)";
    const sup = occSup(entry.occurrence || 1);
    return (
      <>
        <tr
          key={`r-${i}`}
          onClick={() => setExpandedRow(isExpanded ? null : i)}
          style={{
            background: isExpanded ? "var(--accent-light)" : bg,
            cursor: "pointer",
            transition: "background .1s",
          }}
          onMouseEnter={e => !isExpanded && (e.currentTarget.style.background = "rgba(99,102,241,.07)")}
          onMouseLeave={e => !isExpanded && (e.currentTarget.style.background = bg)}
        >
          <td style={colStyle}>
            <code style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600 }}>
              {entry.segment}
              {sup && <span style={{ fontSize: 9, verticalAlign: "super", marginLeft: 1 }}>{sup}</span>}
            </code>
          </td>
          <td style={colStyle}><MonoCell>{entry.from_field_id || "—"}</MonoCell></td>
          <td style={{ ...colStyle, color: "var(--text-secondary)", fontSize: 14 }}>→</td>
          <td style={colStyle}><MonoCell>{entry.to_field_id || "—"}</MonoCell></td>
          <td style={{ ...colStyle, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
            <span style={{ fontSize: 12 }}>{entry.field_name}</span>
          </td>
          <td style={colStyle}><ChangeBadge type={entry.change_type} /></td>
          <td style={{ ...colStyle, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>
            <MonoCell dim>{entry.old_value || <span style={{ opacity: 0.35 }}>—</span>}</MonoCell>
          </td>
          <td style={{ ...colStyle, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis" }}>
            <MonoCell>{entry.new_value || <span style={{ opacity: 0.35 }}>—</span>}</MonoCell>
          </td>
          {showConditions && (
            <td style={{ ...colStyle, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
              {entry.condition_evaluated ? (
                <span style={{ fontSize: 10, color: entry.condition_result ? "var(--success)" : "var(--text-secondary)", fontFamily: "var(--mono)" }}>
                  {entry.condition_result ? "✓ " : "✗ "}{entry.condition_expression}
                </span>
              ) : (
                <span style={{ opacity: 0.3, fontSize: 10 }}>—</span>
              )}
            </td>
          )}
        </tr>
        {isExpanded && <ExpandedRow key={`exp-${i}`} entry={entry} showConditions={showConditions} />}
      </>
    );
  }

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        {!segmentFilter && (
          <select
            value={localSegFilter}
            onChange={e => setLocalSegFilter(e.target.value)}
            style={{
              padding: "5px 8px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              fontSize: 12,
              fontFamily: "var(--sans)",
              background: "var(--bg-surface)",
              color: "var(--text)",
            }}
          >
            {segments.map(s => <option key={s} value={s}>{s === "ALL" ? "Segment: ALL" : s}</option>)}
          </select>
        )}
        {!changeTypeFilter && (
          <select
            value={localTypeFilter}
            onChange={e => setLocalTypeFilter(e.target.value)}
            style={{
              padding: "5px 8px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              fontSize: 12,
              fontFamily: "var(--sans)",
              background: "var(--bg-surface)",
              color: "var(--text)",
            }}
          >
            {changeTypes.map(t => <option key={t} value={t}>{t === "ALL" ? "Change type: ALL" : t}</option>)}
          </select>
        )}
        <input
          type="text"
          placeholder="Search fields, values…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: "5px 10px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            fontSize: 12,
            fontFamily: "var(--sans)",
            background: "var(--surface)",
            width: 200,
          }}
        />
        {hasConditions && (
          <button
            onClick={() => setShowConditions(v => !v)}
            style={{
              padding: "5px 10px",
              borderRadius: "var(--radius-sm)",
              border: `1px solid ${showConditions ? "var(--accent)" : "var(--border)"}`,
              fontSize: 11,
              fontFamily: "var(--sans)",
              background: showConditions ? "var(--accent-light)" : "var(--surface)",
              color: showConditions ? "var(--accent)" : "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            {showConditions ? "Hide conditions" : "Show conditions"}
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-secondary)" }}>
          {filtered.length.toLocaleString()} rows
        </span>
      </div>

      {/* Table */}
      <div
        ref={parentRef}
        style={{ maxHeight: 480, overflowY: "auto", overflowX: "auto" }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "auto" }}>
          <thead>
            <tr>
              <th style={thStyle}>Seg</th>
              <th style={thStyle}>From</th>
              <th style={{ ...thStyle, width: 20 }}></th>
              <th style={thStyle}>To</th>
              <th style={thStyle}>Field</th>
              <th style={thStyle}>Change</th>
              <th style={thStyle}>Old Value</th>
              <th style={thStyle}>New Value</th>
              {showConditions && <th style={thStyle}>Condition</th>}
            </tr>
          </thead>
          <tbody>
            {useVirtual ? (
              virtualizer.getVirtualItems().map(vr => {
                const entry = filtered[vr.index];
                const isExpanded = expandedRow === vr.index;
                return renderRow(entry, vr.index, isExpanded);
              })
            ) : (
              filtered.map((entry, i) => renderRow(entry, i, expandedRow === i))
            )}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={showConditions ? 9 : 8} style={{ textAlign: "center", padding: 32, color: "var(--text-secondary)", fontSize: 13 }}>
                  No entries match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
