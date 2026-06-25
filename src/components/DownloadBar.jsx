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

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <button
        className="btn btn-primary"
        onClick={() => downloadText(f6Output, filename ? `${filename}_f6.txt` : "output_f6.txt")}
      >
        ⬇ Download converted output
      </button>
      <button
        className="btn btn-secondary"
        onClick={() =>
          downloadText(
            JSON.stringify(auditData, null, 2),
            filename ? `${filename}_audit.json` : "audit_report.json",
            "application/json"
          )
        }
      >
        ⬇ Download change report (JSON)
      </button>
    </div>
  );
}
