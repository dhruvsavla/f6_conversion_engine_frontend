import { useMemo, useState } from "react";

/**
 * Renders the F6 output with inline diff highlighting.
 * - Added fields → green
 * - Transformed/modified fields → amber
 * - Removed fields (~~...~~) → red strikethrough
 * - Carried → dim white
 * - Segment name → blue bold
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
      if (info.change_type === "added")       cls = "field-added";
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
    <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
      <div style={{ padding: "6px 14px", fontWeight: 600, fontSize: 11, color: accent, background: accent + "14", borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: ".04em" }}>
        {title}
      </div>
      <div style={{ maxHeight: 380, overflowY: "auto", overflowX: "auto", background: "var(--bg-code)", padding: "10px 0" }}>
        {lines.map((line, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", fontFamily: "var(--mono)", fontSize: 11.5, lineHeight: 1.65 }}>
            <span style={{ minWidth: 36, textAlign: "right", paddingRight: 10, color: "rgba(255,255,255,.2)", userSelect: "none", flexShrink: 0 }}>
              {i + 1}
            </span>
            <span style={{ flex: 1, padding: "0 12px", wordBreak: "break-all", whiteSpace: "pre-wrap" }}>
              {auditIndex ? renderF6Line(line, auditIndex) : (
                <span style={{ color: "rgba(255,255,255,.7)" }}>{line || " "}</span>
              )}
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
    <div className="card" style={{ overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>D.0 → F6 Output</span>
        <button onClick={copyF6} className="btn btn-secondary" style={{ fontSize: 12, padding: "4px 12px" }}>
          {copied ? "✓ Copied" : "Copy F6"}
        </button>
      </div>
      <div style={{ display: "flex", borderTop: "1px solid var(--border)" }}>
        <CodePane title="D.0 Input" content={d0Input} accent="var(--error)" />
        <div style={{ width: 1, background: "var(--border)", flexShrink: 0 }} />
        <CodePane title="F6 Output" content={f6Output} accent="var(--success)" auditIndex={auditIndex} />
      </div>
      {/* Legend */}
      <div style={{ padding: "8px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 16, flexWrap: "wrap", background: "var(--bg-elevated)" }}>
        {[
          { cls: "field-added", label: "added" },
          { cls: "field-transformed", label: "transformed" },
          { cls: "field-modified", label: "modified" },
          { cls: "field-removed", label: "removed" },
          { cls: "field-carried", label: "carried" },
        ].map(({ cls, label }) => (
          <span key={cls} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
            <span className={cls} style={{ fontFamily: "var(--mono)", background: "var(--bg-code)", padding: "0 4px", borderRadius: 2 }}>■</span>
            <span style={{ color: "var(--text-secondary)" }}>{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
