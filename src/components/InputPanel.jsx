import { useRef, useState } from "react";
import { IconUpload, IconSpinner } from './Icons';

const TX_TYPES = [
  { value: "RETAIL",          label: "Retail pharmacy claim (B1)" },
  { value: "SPECIALTY",       label: "Specialty / high cost therapy (B1)" },
  { value: "CONTROLLED",      label: "Controlled substance — DUR (B1)" },
  { value: "COB",             label: "Coordination of benefits (B1+COB)" },
  { value: "REVERSAL",        label: "Claim reversal (B2)" },
  { value: "COMPOUND",        label: "Compound prescription (B1+CMP)" },
  { value: "LTC",             label: "Long-term care (B1)" },
  { value: "MEDICARE_PART_D", label: "Medicare Part D (B1)" },
  { value: "ELIGIBILITY",     label: "Eligibility verification (E1)" },
  { value: "PRIOR_AUTH",      label: "Prior authorization (PA)" },
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
  const [hexMeta, setHexMeta] = useState(null);
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
    <div style={{ width: "100%" }}>
      {/* Textarea card */}
      <div style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
      }}>
        {/* Label row */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 16px",
          background: "var(--bg-raised)",
          borderBottom: "1px solid var(--border-subtle)",
        }}>
          <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
            D.0 Transaction
          </span>
          <button
            onClick={() => fileRef.current.click()}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              fontSize: "var(--text-xs)", background: "none",
              border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)",
              padding: "3px 10px", cursor: "pointer", color: "var(--text-secondary)",
            }}
          >
            <IconUpload size={11} />
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
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 16px",
              background: "var(--status-info-bg)",
              border: "1px solid var(--status-info)",
              borderRadius: 0,
            }}>
              <span style={{ fontSize: 16, color: "var(--status-teal)" }}>⬡</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--status-teal)" }}>Binary hex format detected</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                  {hexMeta.name} · {hexMeta.size.toLocaleString()} bytes
                </div>
              </div>
              <button
                onClick={() => setShowPreview(v => !v)}
                style={{
                  fontSize: "var(--text-xs)", background: "var(--status-teal-bg)",
                  border: "1px solid var(--status-teal)", borderRadius: "var(--radius-sm)",
                  padding: "4px 10px", cursor: "pointer", color: "var(--status-teal)",
                }}
              >
                {showPreview ? "Hide preview" : "Preview decoded"}
              </button>
              <button
                onClick={clearAll}
                style={{
                  fontSize: "var(--text-xs)", background: "transparent",
                  border: "none", padding: "4px 10px", color: "var(--text-tertiary)", cursor: "pointer",
                }}
              >
                clear
              </button>
            </div>
            {showPreview && (
              <pre style={{
                margin: 0, padding: "12px 16px",
                background: "var(--bg-code)",
                fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)",
                color: "var(--status-teal)", maxHeight: 200,
                overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all",
              }}>
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
                width: "100%", minHeight: 220,
                padding: "14px 16px",
                fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)",
                lineHeight: 1.7,
                background: dragging ? "var(--status-info-bg)" : "var(--bg-code)",
                color: "var(--text-code)",
                border: `1.5px solid ${dragging ? "var(--accent)" : "transparent"}`,
                borderRadius: 0, resize: "vertical", outline: "none",
                transition: "border-color var(--transition-normal)",
              }}
              onFocus={e => { e.target.style.borderColor = "var(--border-focus)"; }}
              onBlur={e => { e.target.style.borderColor = "transparent"; }}
            />
            {text && (
              <button
                onClick={clearAll}
                style={{
                  position: "absolute", top: 8, right: 8,
                  background: "var(--bg-raised)", border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)", padding: "2px 8px",
                  color: "var(--text-tertiary)", fontSize: "var(--text-xs)", cursor: "pointer",
                }}
              >
                clear
              </button>
            )}
          </div>
        )}

        {/* Char / byte count + bottom toolbar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 16px",
          background: "var(--bg-raised)",
          borderTop: "1px solid var(--border-subtle)",
        }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
            {isHexMode ? (
              "Binary NCPDP hex stream · separators: FS=0x1C GS=0x1D RS=0x1E"
            ) : text ? (
              `${text.split("\n").filter(l => l.trim()).length} segments · ${text.length.toLocaleString()} chars`
            ) : (
              "Supports pipe-delimited format: SEGMENT|field_id=value|..."
            )}
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Sample type selector */}
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>Load sample:</span>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {TX_TYPES.slice(0, 4).map(t => (
                <button
                  key={t.value}
                  onClick={() => setSampleType(t.value)}
                  style={{
                    padding: "2px 8px",
                    borderRadius: "var(--radius-full)",
                    border: `1px solid ${sampleType === t.value ? "var(--accent)" : "var(--border-subtle)"}`,
                    background: sampleType === t.value ? "var(--status-info-bg)" : "transparent",
                    color: sampleType === t.value ? "var(--accent-bright)" : "var(--text-secondary)",
                    fontSize: "var(--text-xs)", cursor: "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  {t.value}
                </button>
              ))}
              <select
                value={sampleType}
                onChange={e => setSampleType(e.target.value)}
                style={{
                  padding: "2px 6px", borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)", fontSize: "var(--text-xs)",
                  background: "var(--bg-input)", color: "var(--text-secondary)",
                }}
              >
                {TX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <button
              onClick={() => onLoadSample(sampleType, setText)}
              style={{
                padding: "3px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: "var(--text-xs)", cursor: "pointer",
              }}
            >
              Load
            </button>
          </div>
        </div>
      </div>

      {/* Action row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <button
          onClick={handleConvertClick}
          disabled={!canConvert}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: canConvert ? "linear-gradient(135deg, #2563EB, #7C3AED)" : "var(--bg-raised)",
            color: canConvert ? "#fff" : "var(--text-tertiary)",
            border: "none", borderRadius: "var(--radius-md)",
            height: 44, padding: "0 28px",
            fontSize: "var(--text-md)", fontWeight: 600,
            cursor: canConvert ? "pointer" : "not-allowed",
            boxShadow: canConvert ? "0 4px 20px rgba(59,130,246,0.4)" : "none",
            transition: "all var(--transition-normal)",
            opacity: canConvert ? 1 : 0.5,
          }}
        >
          {converting ? (
            <><IconSpinner size={14} color="#fff" /> Converting…</>
          ) : "Convert to F6 →"}
        </button>

        <button
          onClick={() => canBatch && onBatch && onBatch(text)}
          disabled={!canBatch}
          title="Process as multi-claim batch (claims separated by blank lines)"
          style={{
            height: 44, padding: "0 20px",
            background: "transparent",
            border: "1px solid var(--border-subtle)",
            color: canBatch ? "var(--text-secondary)" : "var(--text-tertiary)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-md)",
            cursor: canBatch ? "pointer" : "not-allowed",
            opacity: canBatch ? 1 : 0.5,
            transition: "all var(--transition-fast)",
          }}
        >
          Process as Batch
        </button>
      </div>
    </div>
  );
}
