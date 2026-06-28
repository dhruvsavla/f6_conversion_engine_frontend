import { IconDownload } from './Icons';

export default function DownloadBar({ f6Output, auditData, filename }) {
  function downloadText(content, name, mime = "text/plain") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  const btnStyle = {
    display: "flex", alignItems: "center", gap: 6,
    background: "transparent",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-secondary)",
    borderRadius: "var(--radius-md)",
    padding: "7px 14px",
    fontSize: "var(--text-sm)",
    cursor: "pointer",
    transition: "border-color var(--transition-fast), color var(--transition-fast)",
  };

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <button
        style={btnStyle}
        onClick={() => downloadText(f6Output, filename ? `${filename}_f6.txt` : "output_f6.txt")}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-primary)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
      >
        <IconDownload size={14} />
        Download F6
      </button>
      <button
        style={btnStyle}
        onClick={() =>
          downloadText(
            JSON.stringify(auditData, null, 2),
            filename ? `${filename}_audit.json` : "audit_report.json",
            "application/json"
          )
        }
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-primary)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
      >
        <IconDownload size={14} />
        Download audit JSON
      </button>
    </div>
  );
}
