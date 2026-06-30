import { useMemo, useState } from "react";
import { IconCopy, IconCheck } from './Icons';

/**
 * Renders the F6 output with inline diff highlighting.
 */
function renderF6Line(line, auditIndex) {
  const tokens = line.split("|");
  return tokens.map((token, i) => {
    if (i === 0) {
      return <span key={i} className="seg-label">{token}</span>;
    }

    // Removed field
    if (token.startsWith("~~") && token.endsWith("~~")) {
      return (
        <span key={i} className="field-removed">
          |{token.slice(2, -2)}
        </span>
      );
    }

    const eqIdx = token.indexOf("=");
    const fieldId = eqIdx >= 0 ? token.slice(0, eqIdx) : token;
    const info = auditIndex[fieldId];

    let cls = "field-carried";
    if (info) {
      if (info.change_type === "added")           cls = "field-added";
      else if (info.change_type === "transformed") cls = "field-transformed";
      else if (info.change_type === "modified")   cls = "field-modified";
      else if (info.change_type === "removed")    cls = "field-removed";
    }

    return <span key={i} className={cls}>|{token}</span>;
  });
}

function CodePane({ title, content, accent, auditIndex = null }) {
  const lines = content ? content.split("\n") : [];
  return (
    <div style={{ flex: 1, minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{
        padding: "8px 16px",
        background: "var(--bg-raised)",
        borderBottom: "1px solid var(--border-subtle)",
        fontSize: "var(--text-xs)",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "var(--text-tertiary)",
        flexShrink: 0,
      }}>
        {title}
      </div>
      <div style={{
        height: 280, overflowY: "auto", overflowX: "auto",
        background: "var(--bg-code)", padding: "12px 0",
      }}>
        {lines.map((line, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start",
            fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", lineHeight: 1.65,
          }}>
            <span style={{
              minWidth: 36, textAlign: "right", paddingRight: 10,
              color: "var(--text-muted)", userSelect: "none", flexShrink: 0,
              fontSize: "var(--text-xs)",
            }}>
              {i + 1}
            </span>
            <span style={{ flex: 1, padding: "0 12px", wordBreak: "break-all", whiteSpace: "pre-wrap", color: "var(--text-code)" }}>
              {auditIndex ? renderF6Line(line, auditIndex) : (line || " ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OutputPanel({ d0Input, f6Output, auditEntries }) {
  const [copied, setCopied] = useState(false);

  const auditIndex = useMemo(() => {
    const idx = {};
    for (const e of (auditEntries || [])) {
      const fid = e.to_field_id || e.from_field_id;
      if (fid) idx[fid] = e;
    }
    return idx;
  }, [auditEntries]);

  function copyF6() {
    navigator.clipboard.writeText(f6Output || "").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 16px",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-raised)",
      }}>
        <span style={{ fontWeight: 600, fontSize: "var(--text-base)", color: "var(--text-secondary)" }}>
          D.0 → F6 Output
        </span>
        <button
          onClick={copyF6}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "transparent", border: "1px solid var(--border-subtle)",
            color: copied ? "var(--status-success)" : "var(--text-secondary)",
            borderRadius: "var(--radius-sm)", padding: "4px 10px",
            fontSize: "var(--text-xs)", cursor: "pointer",
            transition: "all var(--transition-fast)",
          }}
        >
          {copied ? <IconCheck size={12} color="var(--status-success)" /> : <IconCopy size={12} />}
          {copied ? "Copied" : "Copy F6"}
        </button>
      </div>

      {/* Two-column diff */}
      <div style={{ display: "flex", borderTop: "1px solid var(--border-subtle)" }}>
        <CodePane title="D.0 Input" content={d0Input} accent="var(--status-error)" />
        <div style={{ width: 1, background: "var(--border-subtle)", flexShrink: 0 }} />
        <CodePane title="F6 Output" content={f6Output} accent="var(--status-success)" auditIndex={auditIndex} />
      </div>

      {/* Legend */}
      <div style={{
        padding: "8px 16px", borderTop: "1px solid var(--border-subtle)",
        display: "flex", gap: 16, flexWrap: "wrap",
        background: "var(--bg-raised)",
      }}>
        {[
          { cls: "field-added",       label: "added" },
          { cls: "field-transformed", label: "transformed" },
          { cls: "field-modified",    label: "modified" },
          { cls: "field-removed",     label: "removed" },
          { cls: "field-carried",     label: "carried" },
        ].map(({ cls, label }) => (
          <span key={cls} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "var(--text-xs)" }}>
            <span className={cls} style={{ fontFamily: "var(--font-mono)", background: "var(--bg-code)", padding: "0 4px", borderRadius: 2 }}>■</span>
            <span style={{ color: "var(--text-tertiary)" }}>{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
