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

function isHexBuffer(buffer) {
  const bytes = new Uint8Array(buffer, 0, Math.min(512, buffer.byteLength));
  for (const b of bytes) {
    if (b === 0x1c || b === 0x1e) return true;
  }
  return false;
}

function decodeHexPreview(buffer) {
  const text = new TextDecoder("iso-8859-1").decode(buffer);
  return text.replace(/\x1e/g, "\n").replace(/\x1c/g, "|").replace(/\x1d/g, "=");
}

export default function InputPanel({ onConvert, onConvertHex, onBatch, onLoadSample, converting }) {
  const [text, setText] = useState("");
  const [hexMeta, setHexMeta] = useState(null);   // {name, size, bytes: ArrayBuffer}
  const [showPreview, setShowPreview] = useState(false);
  const [sampleType, setSampleType] = useState("RETAIL");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target.result;
      if (isHexBuffer(buffer)) {
        setHexMeta({ name: file.name, size: file.size, bytes: buffer });
        setText("");
        setShowPreview(false);
      } else {
        const textDecoder = new TextDecoder("utf-8");
        setText(textDecoder.decode(buffer));
        setHexMeta(null);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  function clearAll() {
    setText("");
    setHexMeta(null);
    setShowPreview(false);
  }

  const isHexMode = hexMeta !== null;
  const canConvert = !converting && (text.trim().length > 0 || isHexMode);
  // Batch only makes sense for pipe-format text (not binary hex streams)
  const canBatch = !converting && !isHexMode && text.trim().length > 0;

  function handleConvertClick() {
    if (!canConvert) return;
    if (isHexMode) {
      onConvertHex && onConvertHex(hexMeta.bytes, hexMeta.name);
    } else {
      onConvert(text);
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.03em", marginBottom: 8, background: "linear-gradient(135deg, #F1F5F9 30%, #818CF8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          NCPDP D.0 → F6 Converter
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, maxWidth: 580 }}>
          Paste a D.0 transaction below, or upload a pipe-delimited .txt file or a binary NCPDP hex stream.
          The agent reads the rules folder, converts automatically, and audits every field decision.
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
            Upload file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.dat,.x12,.bin,"
            style={{ display: "none" }}
            onChange={e => handleFile(e.target.files[0])}
          />
        </div>

        {/* Hex mode banner */}
        {isHexMode ? (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                background: "var(--accent-light)",
                border: "1.5px solid var(--accent-border)",
                borderRadius: "var(--radius)",
                borderBottomLeftRadius: showPreview ? 0 : undefined,
                borderBottomRightRadius: showPreview ? 0 : undefined,
              }}
            >
              <span style={{ fontSize: 18 }}>⬡</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--cyan)" }}>Binary hex format detected</div>
                <div style={{ fontSize: 11, color: "rgba(34,211,238,.6)", fontFamily: "var(--mono)" }}>
                  {hexMeta.name} · {hexMeta.size.toLocaleString()} bytes
                </div>
              </div>
              <button
                onClick={() => setShowPreview(v => !v)}
                style={{ fontSize: 11, background: "rgba(99,102,241,.18)", border: "1px solid var(--accent-border)", borderRadius: "var(--radius-sm)", padding: "4px 10px", cursor: "pointer", color: "var(--cyan)" }}
              >
                {showPreview ? "Hide preview" : "Preview decoded"}
              </button>
              <button
                onClick={clearAll}
                style={{ fontSize: 11, background: "rgba(255,255,255,.06)", border: "none", borderRadius: 4, padding: "4px 10px", color: "rgba(255,255,255,.4)", cursor: "pointer" }}
              >
                clear
              </button>
            </div>
            {showPreview && (
              <pre
                style={{
                  margin: 0,
                  padding: "12px 16px",
                  background: "var(--bg-code)",
                  border: "1.5px solid var(--accent-border)",
                  borderTop: "1px solid rgba(99,102,241,.2)",
                  borderRadius: "0 0 var(--radius) var(--radius)",
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  color: "var(--cyan)",
                  maxHeight: 200,
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {decodeHexPreview(hexMeta.bytes)}
              </pre>
            )}
          </div>
        ) : (
          /* Textarea (pipe mode) */
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{ position: "relative" }}
          >
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={"HDR|101-A1=610279|102-A2=D0|103-A3=B1|...\nINS|302-C2=ZH48291045|301-C1=RXGRP88|...\n\nPaste a D.0 transaction or drag & drop a .txt/.dat file here."}
              spellCheck={false}
              style={{
                width: "100%",
                minHeight: 220,
                padding: "14px 16px",
                fontFamily: "var(--mono)",
                fontSize: 12,
                lineHeight: 1.7,
                background: dragging ? "rgba(99,102,241,.08)" : "var(--bg-code)",
                color: "var(--text-code)",
                border: `1.5px solid ${dragging ? "var(--accent)" : "rgba(255,255,255,.08)"}`,
                borderRadius: "var(--radius)",
                resize: "vertical",
                outline: "none",
                transition: "border-color .2s",
              }}
              onFocus={e => { e.target.style.borderColor = "rgba(99,102,241,.5)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,.08)"; }}
            />
            {text && (
              <button
                onClick={clearAll}
                style={{ position: "absolute", top: 8, right: 8, background: "rgba(255,255,255,.1)", border: "none", borderRadius: 4, padding: "2px 8px", color: "rgba(255,255,255,.5)", fontSize: 11, cursor: "pointer" }}
              >
                clear
              </button>
            )}
          </div>
        )}

        {/* Char / byte count */}
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-secondary)", display: "flex", gap: 12 }}>
          {isHexMode ? (
            <span>Binary NCPDP hex stream · separators: FS=0x1C GS=0x1D RS=0x1E (latin-1 encoded)</span>
          ) : text ? (
            <span>{text.split("\n").filter(l => l.trim()).length} segments · {text.length.toLocaleString()} chars</span>
          ) : (
            <span>Supports pipe-delimited format: SEGMENT|field_id=value|... · or drop a binary hex file</span>
          )}
        </div>
      </div>

      {/* Action row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button
          className="btn btn-primary"
          onClick={handleConvertClick}
          disabled={!canConvert}
          style={{ padding: "10px 28px", fontSize: 15 }}
        >
          {converting ? (
            <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Converting…</>
          ) : "Convert to F6 →"}
        </button>

        {/* Batch button — pipe mode only; disabled for hex streams */}
        <button
          className="btn btn-secondary"
          onClick={() => canBatch && onBatch && onBatch(text)}
          disabled={!canBatch}
          title="Process as multi-claim batch (claims separated by blank lines)"
          style={{ padding: "10px 20px", fontSize: 14 }}
        >
          Process as Batch
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
