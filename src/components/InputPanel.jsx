import { useRef, useState } from "react";

const TX_TYPES = [
  { value: "RETAIL",         label: "Retail pharmacy claim (B1)" },
  { value: "SPECIALTY",      label: "Specialty / high cost therapy (B1)" },
  { value: "CONTROLLED",     label: "Controlled substance — DUR (B1)" },
  { value: "COB",            label: "Coordination of benefits (B1+COB)" },
  { value: "REVERSAL",       label: "Claim reversal (B2)" },
  { value: "COMPOUND",       label: "Compound prescription (B1+CMP)" },
  { value: "LTC",            label: "Long-term care (B1)" },
  { value: "MEDICARE_PART_D",label: "Medicare Part D (B1)" },
  { value: "ELIGIBILITY",    label: "Eligibility verification (E1)" },
  { value: "PRIOR_AUTH",     label: "Prior authorization (PA)" },
];

export default function InputPanel({ onConvert, onLoadSample, converting }) {
  const [text, setText] = useState("");
  const [sampleType, setSampleType] = useState("RETAIL");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setText(e.target.result || "");
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  const canConvert = !converting && text.trim().length > 0;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em", marginBottom: 8 }}>
          NCPDP D.0 → F6 Converter
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, maxWidth: 580 }}>
          Paste a D.0 transaction below. The agent reads the rules folder, converts automatically,
          and audits every field decision.
        </p>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        {/* Label row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text-secondary)" }}>
            D.0 Transaction
          </span>
          <button
            onClick={() => fileRef.current.click()}
            style={{ fontSize: 12, background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "3px 10px", cursor: "pointer", color: "var(--text-secondary)" }}
          >
            Upload .txt file
          </button>
          <input ref={fileRef} type="file" accept=".txt,.dat" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
        </div>

        {/* Textarea */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{ position: "relative" }}
        >
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={"HDR|101-A1=610279|102-A2=D0|103-A3=B1|...\nINS|302-C2=ZH48291045|301-C1=RXGRP88|...\n\nPaste a D.0 transaction or drag & drop a .txt file here."}
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: 220,
              padding: "14px 16px",
              fontFamily: "var(--mono)",
              fontSize: 12,
              lineHeight: 1.7,
              background: dragging ? "#1a2d44" : "var(--bg-code)",
              color: "var(--text-code)",
              border: `1.5px solid ${dragging ? "var(--accent)" : "rgba(255,255,255,.08)"}`,
              borderRadius: "var(--radius)",
              resize: "vertical",
              outline: "none",
              transition: "border-color .2s",
            }}
            onFocus={e => { e.target.style.borderColor = "rgba(59,130,246,.5)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,.08)"; }}
          />
          {text && (
            <button
              onClick={() => setText("")}
              style={{ position: "absolute", top: 8, right: 8, background: "rgba(255,255,255,.1)", border: "none", borderRadius: 4, padding: "2px 8px", color: "rgba(255,255,255,.5)", fontSize: 11, cursor: "pointer" }}
            >
              clear
            </button>
          )}
        </div>

        {/* Char count */}
        <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-secondary)", display: "flex", gap: 12 }}>
          {text ? (
            <span>{text.split("\n").filter(l => l.trim()).length} segments · {text.length.toLocaleString()} chars</span>
          ) : (
            <span>Supports pipe-delimited format: SEGMENT|field_id=value|...</span>
          )}
        </div>
      </div>

      {/* Action row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button
          className="btn btn-primary"
          onClick={() => canConvert && onConvert(text)}
          disabled={!canConvert}
          style={{ padding: "10px 28px", fontSize: 15 }}
        >
          {converting ? (
            <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Converting…</>
          ) : "Convert to F6 →"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Load sample:</span>
          <select
            value={sampleType}
            onChange={e => setSampleType(e.target.value)}

            style={{ padding: "6px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12, background: "var(--bg-surface)", fontFamily: "var(--sans)" }}
          >
            {TX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => onLoadSample(sampleType, setText)}>
            Load
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }`}</style>
    </div>
  );
}
