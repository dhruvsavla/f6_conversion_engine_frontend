import { useMemo, useState } from "react";
import { IconCopy, IconCheck, IconDownload } from "./Icons";

// Maps reverse change_type → CSS class (defined in global.css)
const CHANGE_CLASS = {
  carried:     "field-carried",
  transformed: "field-transformed",
  restored:    "field-added",    // green — recovered from ~~strikethrough~~
  dropped:     "field-removed",  // red — F6-only, no D.0 equivalent
  missing:     "field-removed",  // red — couldn't be reversed
};

function renderF6Line(line, auditIndex) {
  const tokens = line.split("|");
  return tokens.map((token, i) => {
    if (i === 0) return <span key={i} className="seg-label">{token}</span>;

    // ~~field=value~~ — deprecated D.0 field preserved for restoration
    if (token.startsWith("~~") && token.endsWith("~~")) {
      return (
        <span key={i} className="field-added" title="Deprecated D.0 field — will be restored in output">
          |{token.slice(2, -2)}
        </span>
      );
    }

    const eqIdx  = token.indexOf("=");
    const fieldId = eqIdx >= 0 ? token.slice(0, eqIdx) : token;
    const info    = auditIndex[fieldId];
    const cls     = info ? (CHANGE_CLASS[info.change_type] || "field-carried") : "field-carried";
    return <span key={i} className={cls}>|{token}</span>;
  });
}

function renderD0Line(line, auditIndex) {
  const tokens = line.split("|");
  return tokens.map((token, i) => {
    if (i === 0) return <span key={i} className="seg-label">{token}</span>;
    const eqIdx  = token.indexOf("=");
    const fieldId = eqIdx >= 0 ? token.slice(0, eqIdx) : token;
    const info    = auditIndex[fieldId];
    const cls     = info ? (CHANGE_CLASS[info.change_type] || "field-carried") : "field-carried";
    return <span key={i} className={cls}>|{token}</span>;
  });
}

function CodePane({ title, lines, auditIndex, renderFn, actions }) {
  return (
    <div style={{ flex: 1, minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{
        padding: "8px 16px",
        background: "var(--bg-raised)",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: "var(--text-xs)", fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.08em",
        color: "var(--text-tertiary)", flexShrink: 0,
      }}>
        <span>{title}</span>
        {actions}
      </div>
      <div style={{
        height: 320, overflowY: "auto", overflowX: "auto",
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
              {renderFn ? renderFn(line, auditIndex) : (line || " ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReverseOutputPanel({ f6Input, d0Output, auditEntries, conversionId }) {
  const [copied, setCopied] = useState(false);

  const auditIndex = useMemo(() => {
    const idx = {};
    for (const e of (auditEntries || [])) {
      const fid = e.to_field_id || e.from_field_id;
      if (fid) idx[fid] = e;
    }
    return idx;
  }, [auditEntries]);

  function copyD0() {
    navigator.clipboard.writeText(d0Output || "").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadD0() {
    const blob = new Blob([d0Output || ""], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `d0_output_${conversionId?.slice(0, 8) || "result"}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const f6Lines = (f6Input  || "").split("\n");
  const d0Lines = (d0Output || "").split("\n");

  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
      boxShadow: "var(--shadow-sm)",
    }}>
      {/* Panel header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-raised)",
      }}>
        <span style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--text-secondary)", letterSpacing: "-0.01em" }}>
          F6 → D.0 Diff
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={copyD0}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: copied ? "var(--status-success-bg)" : "transparent",
              border: `1px solid ${copied ? "var(--status-success)" : "var(--border-default)"}`,
              color: copied ? "var(--status-success)" : "var(--text-secondary)",
              borderRadius: "var(--radius-sm)", padding: "4px 10px",
              fontSize: "var(--text-xs)", cursor: "pointer",
              transition: "all var(--transition-fast)",
            }}
          >
            {copied ? <IconCheck size={12} color="var(--status-success)" /> : <IconCopy size={12} />}
            {copied ? "Copied" : "Copy D.0"}
          </button>
          <button
            onClick={downloadD0}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "transparent", border: "1px solid var(--border-default)",
              color: "var(--text-secondary)", borderRadius: "var(--radius-sm)",
              padding: "4px 10px", fontSize: "var(--text-xs)", cursor: "pointer",
            }}
          >
            <IconDownload size={12} /> Download
          </button>
        </div>
      </div>

      {/* Side-by-side panes */}
      <div style={{ display: "flex" }}>
        <CodePane
          title="F6 Input"
          lines={f6Lines}
          auditIndex={auditIndex}
          renderFn={renderF6Line}
        />
        <div style={{ width: 1, background: "var(--border-subtle)", flexShrink: 0 }} />
        <CodePane
          title="D.0 Output"
          lines={d0Lines}
          auditIndex={auditIndex}
          renderFn={renderD0Line}
        />
      </div>

      {/* Legend */}
      <div style={{
        padding: "8px 16px", borderTop: "1px solid var(--border-subtle)",
        display: "flex", gap: 20, flexWrap: "wrap",
        background: "var(--bg-raised)",
      }}>
        {[
          { cls: "field-added",       label: "restored" },
          { cls: "field-transformed", label: "transformed" },
          { cls: "field-removed",     label: "dropped" },
          { cls: "field-carried",     label: "carried" },
        ].map(({ cls, label }) => (
          <span key={cls} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "var(--text-xs)" }}>
            <span className={cls} style={{ fontFamily: "var(--font-mono)", background: "var(--bg-code)", padding: "0 4px", borderRadius: 2 }}>■</span>
            <span style={{ color: "var(--text-tertiary)" }}>{label}</span>
          </span>
        ))}
        <span style={{ marginLeft: "auto", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          {f6Lines.length} → {d0Lines.length} segments
        </span>
      </div>
    </div>
  );
}
