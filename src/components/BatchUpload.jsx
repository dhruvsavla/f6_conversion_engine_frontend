import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { uploadBatch } from "../api/client";

const ACCEPTED = [".txt", ".d0", ".ncpdp", ".dat"];

export default function BatchUpload() {
  const navigate = useNavigate();
  const [files,    setFiles]    = useState([]);
  const [drag,     setDrag]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const inputRef = useRef(null);

  function addFiles(fileList) {
    const arr = Array.from(fileList);
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...arr.filter(f => !names.has(f.name))];
    });
    setError(null);
  }

  function onDrop(e) {
    e.preventDefault();
    setDrag(false);
    addFiles(e.dataTransfer.files);
  }

  function onDragOver(e) { e.preventDefault(); setDrag(true); }
  function onDragLeave() { setDrag(false); }

  function removeFile(name) {
    setFiles(prev => prev.filter(f => f.name !== name));
  }

  async function handleUpload() {
    if (!files.length) return;
    setLoading(true);
    setError(null);
    try {
      const result = await uploadBatch(files);
      navigate(`/batches`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: "20px auto 0", padding: "0 24px" }}>
      <div
        className="card"
        style={{
          padding: "22px 24px",
          background: drag ? "rgba(99,102,241,.08)" : "var(--bg-surface)",
          borderColor: drag ? "var(--accent)" : "var(--border-bright)",
          borderStyle: drag ? "dashed" : "solid",
          transition: "all .18s ease",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 2 }}>
              Batch Upload
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              Drop multiple D.0 files to process them as a batch job
            </div>
          </div>
          {files.length > 0 && (
            <button
              className="btn btn-ghost"
              onClick={() => { setFiles([]); setError(null); }}
              style={{ fontSize: 11 }}
            >
              Clear all
            </button>
          )}
        </div>

        {/* Drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          style={{
            border: "1.5px dashed var(--border-bright)",
            borderRadius: "var(--radius)",
            padding: "24px 16px",
            textAlign: "center",
            cursor: "pointer",
            background: drag ? "rgba(99,102,241,.06)" : "rgba(0,0,0,.12)",
            transition: "all .18s ease",
            marginBottom: files.length ? 12 : 0,
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-border)"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-bright)"}
        >
          <div style={{ fontSize: 22, marginBottom: 6 }}>📂</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {drag ? "Release to add files" : "Click or drag files here"}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 4, opacity: .7 }}>
            {ACCEPTED.join(", ")} accepted
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            style={{ display: "none" }}
            accept={ACCEPTED.join(",")}
            onChange={e => addFiles(e.target.files)}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14, maxHeight: 140, overflowY: "auto" }}>
            {files.map(f => (
              <div
                key={f.name}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 10px", background: "var(--bg-elevated)", borderRadius: 6, fontSize: 11 }}
              >
                <span style={{ fontFamily: "var(--mono)", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {f.name}
                </span>
                <span style={{ color: "var(--text-secondary)", marginLeft: 12, flexShrink: 0, marginRight: 8 }}>
                  {(f.size / 1024).toFixed(1)} KB
                </span>
                <button
                  onClick={e => { e.stopPropagation(); removeFile(f.name); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 12, padding: "0 2px", lineHeight: 1 }}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div style={{ padding: "8px 12px", background: "var(--error-light)", border: "1px solid var(--error)", borderRadius: 6, color: "var(--error)", fontSize: 12, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            {files.length > 0 ? `${files.length} file${files.length !== 1 ? "s" : ""} ready` : "No files selected"}
          </div>
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={files.length === 0 || loading}
            style={{ fontSize: 12, padding: "8px 18px", opacity: files.length === 0 ? .5 : 1 }}
          >
            {loading ? "Uploading…" : `Upload ${files.length || ""} File${files.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
