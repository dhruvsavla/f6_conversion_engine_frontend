import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { uploadBatch } from "../api/client";
import { IconUpload, IconX } from './Icons';

const ACCEPTED = [".txt", ".d0", ".ncpdp", ".dat"];

export default function BatchUpload() {
  const navigate = useNavigate();
  const [files,   setFiles]   = useState([]);
  const [drag,    setDrag]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
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
      await uploadBatch(files);
      navigate(`/batches`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: "100%" }}>
      <div style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px",
          background: "var(--bg-raised)",
          borderBottom: "1px solid var(--border-subtle)",
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: "var(--text-md)", color: "var(--text-primary)", marginBottom: 2 }}>
              Batch Upload
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
              Drop multiple D.0 files to process them as a batch job
            </div>
          </div>
          {files.length > 0 && (
            <button
              onClick={() => { setFiles([]); setError(null); }}
              style={{
                background: "none", border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)", padding: "3px 10px",
                color: "var(--text-tertiary)", fontSize: "var(--text-xs)", cursor: "pointer",
              }}
            >
              Clear all
            </button>
          )}
        </div>

        <div style={{ padding: "16px" }}>
          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => inputRef.current?.click()}
            style={{
              background: drag ? "var(--status-info-bg)" : "var(--bg-code)",
              border: `2px dashed ${drag ? "var(--accent)" : "var(--border-subtle)"}`,
              borderRadius: "var(--radius-lg)",
              padding: "28px 16px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all var(--transition-normal)",
              marginBottom: files.length ? 12 : 0,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ color: drag ? "var(--accent-bright)" : "var(--text-tertiary)", opacity: drag ? 1 : 0.5 }}>
                <IconUpload size={24} color="currentColor" />
              </div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)" }}>
                {drag ? "Release to add files" : "Click or drag files here"}
              </div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", opacity: 0.6 }}>
                {ACCEPTED.join(", ")} accepted
              </div>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12, maxHeight: 140, overflowY: "auto" }}>
              {files.map(f => (
                <div
                  key={f.name}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "5px 10px",
                    background: "var(--bg-raised)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)", fontSize: "var(--text-sm)",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-code)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.name}
                  </span>
                  <span style={{ color: "var(--text-tertiary)", marginLeft: 12, flexShrink: 0, marginRight: 8 }}>
                    {(f.size / 1024).toFixed(1)} KB
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); removeFile(f.name); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: "0 2px", lineHeight: 1 }}
                    title="Remove"
                  >
                    <IconX size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div style={{
              padding: "8px 12px",
              background: "var(--status-error-bg)",
              border: "1px solid var(--status-error)",
              borderRadius: "var(--radius-sm)",
              color: "var(--status-error)", fontSize: "var(--text-sm)", marginBottom: 12,
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
              {files.length > 0 ? `${files.length} file${files.length !== 1 ? "s" : ""} ready` : "No files selected"}
            </div>
            <button
              onClick={handleUpload}
              disabled={files.length === 0 || loading}
              style={{
                background: files.length > 0 && !loading ? "linear-gradient(135deg, #2563EB, #7C3AED)" : "var(--bg-raised)",
                color: files.length > 0 && !loading ? "#fff" : "var(--text-tertiary)",
                border: "none", borderRadius: "var(--radius-md)",
                padding: "8px 18px", fontSize: "var(--text-sm)", fontWeight: 600,
                cursor: files.length > 0 && !loading ? "pointer" : "not-allowed",
                opacity: files.length === 0 ? 0.5 : 1,
              }}
            >
              {loading ? "Uploading…" : `Upload ${files.length || ""} File${files.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
