import { useMemo, useState, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

const CHANGE_COLOR = {
  added:       { bg: "var(--status-success-bg)",  color: "var(--status-success)" },
  carried:     { bg: "var(--status-neutral-bg)",  color: "var(--status-neutral)" },
  transformed: { bg: "var(--status-teal-bg)",     color: "var(--status-teal)" },
  removed:     { bg: "var(--status-error-bg)",    color: "var(--status-error)" },
  modified:    { bg: "var(--status-purple-bg)",   color: "var(--status-purple)" },
  missing:     { bg: "var(--status-error-bg)",    color: "var(--status-error)" },
  restored:    { bg: "var(--status-teal-bg)",     color: "var(--status-teal)" },
  dropped:     { bg: "var(--status-neutral-bg)",  color: "var(--status-neutral)" },
};

const SUP_CHARS = ["", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];

function occSup(n) {
  return n > 1 ? (SUP_CHARS[n] || `^${n}`) : "";
}

function ChangeBadge({ type, isLLM }) {
  const c = CHANGE_COLOR[type] || CHANGE_COLOR.carried;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{
        display: "inline-flex", alignItems: "center",
        padding: "2px 8px", borderRadius: "var(--radius-full)",
        background: c.bg, color: c.color,
        fontSize: "var(--text-xs)", fontWeight: 600,
        fontFamily: "var(--font-mono)",
        textTransform: "uppercase", letterSpacing: "0.05em",
        whiteSpace: "nowrap",
      }}>
        {type}
      </span>
      {isLLM && (
        <span style={{
          display: "inline-flex", alignItems: "center",
          padding: "2px 6px", borderRadius: "var(--radius-full)",
          background: "var(--status-purple-bg)", color: "var(--status-purple)",
          fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "0.06em",
        }}>
          AI
        </span>
      )}
    </span>
  );
}

function MonoCell({ children, dim }) {
  return (
    <span style={{
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-sm)",
      color: dim ? "var(--text-tertiary)" : "var(--text-code)",
    }}>
      {children}
    </span>
  );
}

function ExpandedRow({ entry, showConditions }) {
  const colCount = showConditions ? 9 : 8;
  return (
    <tr>
      <td colSpan={colCount} style={{ padding: 0 }}>
        <div style={{
          background: "var(--bg-overlay)",
          borderTop: "1px solid var(--border-subtle)",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "12px 24px",
          display: "flex",
          gap: 32,
          flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Rule Applied
            </div>
            <code style={{ fontSize: "var(--text-sm)", color: "var(--accent-bright)", fontFamily: "var(--font-mono)" }}>
              {entry.rule_applied || "—"}
            </code>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Notes
            </div>
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{entry.notes || "No notes."}</span>
          </div>
          <div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Segment
            </div>
            <code style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-mono)", color: "var(--text-code)" }}>
              {entry.segment}{entry.occurrence > 1 ? occSup(entry.occurrence) : ""}
            </code>
          </div>
          {entry.condition_evaluated && (
            <div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Condition
              </div>
              <code style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-mono)", color: entry.condition_result ? "var(--status-success)" : "var(--status-error)" }}>
                {entry.condition_expression || "—"}
              </code>
              <span style={{ marginLeft: 6, fontSize: "var(--text-xs)", color: entry.condition_result ? "var(--status-success)" : "var(--status-error)" }}>
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

  const selectStyle = {
    padding: "5px 8px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-subtle)",
    fontSize: "var(--text-sm)",
    fontFamily: "var(--font-ui)",
    background: "var(--bg-input)",
    color: "var(--text-secondary)",
  };

  const thStyle = {
    padding: "8px 12px",
    textAlign: "left",
    fontWeight: 600,
    fontSize: "var(--text-xs)",
    background: "var(--bg-raised)",
    color: "var(--text-tertiary)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    position: "sticky",
    top: 0,
    zIndex: 10,
    whiteSpace: "nowrap",
    borderBottom: "1px solid var(--border-subtle)",
  };

  const tdStyle = {
    padding: "8px 12px",
    fontSize: "var(--text-sm)",
    whiteSpace: "nowrap",
  };

  function renderRow(entry, i, isExpanded) {
    const sup = occSup(entry.occurrence || 1);
    return (
      <>
        <tr
          key={`r-${i}`}
          onClick={() => setExpandedRow(isExpanded ? null : i)}
          style={{
            background: isExpanded ? "var(--status-info-bg)" : "transparent",
            cursor: "pointer",
            transition: "background var(--transition-fast)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
          onMouseEnter={e => !isExpanded && (e.currentTarget.style.background = "var(--bg-raised)")}
          onMouseLeave={e => !isExpanded && (e.currentTarget.style.background = "transparent")}
        >
          <td style={tdStyle}>
            <code style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-code)" }}>
              {entry.segment}
              {sup && <span style={{ fontSize: 9, verticalAlign: "super", marginLeft: 1 }}>{sup}</span>}
            </code>
          </td>
          <td style={tdStyle}><MonoCell>{entry.from_field_id || "—"}</MonoCell></td>
          <td style={{ ...tdStyle, color: "var(--text-tertiary)", fontSize: 14 }}>→</td>
          <td style={tdStyle}><MonoCell>{entry.to_field_id || "—"}</MonoCell></td>
          <td style={{ ...tdStyle, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{entry.field_name}</span>
          </td>
          <td style={tdStyle}><ChangeBadge type={entry.change_type} isLLM={entry.rule_applied?.startsWith("LLM:")} /></td>
          <td style={{ ...tdStyle, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>
            <MonoCell dim>{entry.old_value || <span style={{ opacity: 0.35 }}>—</span>}</MonoCell>
          </td>
          <td style={{ ...tdStyle, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis" }}>
            <MonoCell>{entry.new_value || <span style={{ opacity: 0.35 }}>—</span>}</MonoCell>
          </td>
          {showConditions && (
            <td style={{ ...tdStyle, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
              {entry.condition_evaluated ? (
                <span style={{ fontSize: "var(--text-xs)", color: entry.condition_result ? "var(--status-success)" : "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                  {entry.condition_result ? "✓ " : "✗ "}{entry.condition_expression}
                </span>
              ) : (
                <span style={{ opacity: 0.3, fontSize: "var(--text-xs)" }}>—</span>
              )}
            </td>
          )}
        </tr>
        {isExpanded && <ExpandedRow key={`exp-${i}`} entry={entry} showConditions={showConditions} />}
      </>
    );
  }

  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
    }}>
      {/* Filter bar */}
      <div style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        alignItems: "center",
        padding: "10px 14px",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-raised)",
      }}>
        {!segmentFilter && (
          <select value={localSegFilter} onChange={e => setLocalSegFilter(e.target.value)} style={selectStyle}>
            {segments.map(s => <option key={s} value={s}>{s === "ALL" ? "Segment: ALL" : s}</option>)}
          </select>
        )}
        {!changeTypeFilter && (
          <select value={localTypeFilter} onChange={e => setLocalTypeFilter(e.target.value)} style={selectStyle}>
            {changeTypes.map(t => <option key={t} value={t}>{t === "ALL" ? "Change type: ALL" : t}</option>)}
          </select>
        )}
        <input
          type="text"
          placeholder="Search fields, values…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...selectStyle, width: 200 }}
        />
        {hasConditions && (
          <button
            onClick={() => setShowConditions(v => !v)}
            style={{
              padding: "5px 10px",
              borderRadius: "var(--radius-sm)",
              border: `1px solid ${showConditions ? "var(--accent)" : "var(--border-subtle)"}`,
              fontSize: "var(--text-xs)",
              fontFamily: "var(--font-ui)",
              background: showConditions ? "var(--status-info-bg)" : "transparent",
              color: showConditions ? "var(--accent-bright)" : "var(--text-tertiary)",
              cursor: "pointer",
            }}
          >
            {showConditions ? "Hide conditions" : "Show conditions"}
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
          {filtered.length.toLocaleString()} rows
        </span>
      </div>

      {/* Table */}
      <div ref={parentRef} style={{ maxHeight: 480, overflowY: "auto", overflowX: "auto" }}>
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
                <td colSpan={showConditions ? 9 : 8} style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)", fontSize: "var(--text-base)" }}>
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
