import { useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import "./styles/global.css";

import InputPanel from "./components/InputPanel";
import PipelineSteps from "./components/PipelineSteps";
import OutputPanel from "./components/OutputPanel";
import ValidationFindings from "./components/ValidationFindings";
import AuditSummaryBar from "./components/AuditSummaryBar";
import AuditTable from "./components/AuditTable";
import DownloadBar from "./components/DownloadBar";
import TransactionBadge from "./components/TransactionBadge";
import IngestionPage from "./components/IngestionPage";
import BatchUpload from "./components/BatchUpload";

import HistoryPage from "./pages/HistoryPage";
import ConversionDetailPage from "./pages/ConversionDetailPage";
import BatchesPage from "./pages/BatchesPage";
import RulesPage from "./pages/RulesPage";
import ReverseConverterPage from "./pages/ReverseConverterPage";
import ValidatorPage from "./pages/ValidatorPage";

import { convertBatch, convertStream, convertHexStream, fetchSample } from "./api/client";
import BatchProgress from "./components/BatchProgress";

// ── Sidebar navigation ──────────────────────────────────────
function Sidebar({ rulesLoaded }) {
  const navigate = useNavigate();
  const location = useLocation();
  const current = location.pathname;

  const items = [
    { path: "/",         label: "D.0 → F6",  icon: "⇌" },
    { path: "/reverse",  label: "F6 → D.0",  icon: "⇄" },
    { path: "/validate", label: "Validate",  icon: "✓" },
    { path: "/history",  label: "History",   icon: "◷" },
    { path: "/batches",  label: "Batches",   icon: "⊞" },
    { path: "/rules",    label: "Rules",     icon: "⚙" },
    { path: "/ingest",   label: "Ingest",    icon: "↑" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">Rx</div>
        <div>
          <div className="sidebar-brand-text">D.0 → F6</div>
          <div className="sidebar-brand-sub">NCPDP Converter</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map(item => (
          <button
            key={item.path}
            className={`sidebar-nav-item${current === item.path ? " active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div>Rules folder</div>
        {rulesLoaded != null && (
          <div className="sidebar-footer-badge">
            {rulesLoaded} files loaded
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Converter page ──────────────────────────────────────────
function ConverterPage() {
  const navigate = useNavigate();
  const [steps, setSteps] = useState([]);
  const [result, setResult] = useState(null);
  const [conversionId, setConversionId] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState(null);
  const [changeTypeFilter, setChangeTypeFilter] = useState(null);
  const [batchJobId, setBatchJobId] = useState(null);  // null = no active batch

  function _streamCallbacks(fileName) {
    return {
      onStep: (stepData) => {
        setSteps(prev => {
          const idx = prev.findIndex(s => s.id === stepData.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = stepData;
            return next;
          }
          return [...prev, stepData];
        });
      },
      onResult: (data) => {
        setResult(data);
        if (data.conversion_id) setConversionId(data.conversion_id);
      },
      onError: (msg) => setError(msg),
    };
  }

  async function handleConvert(d0Text) {
    setError(null);
    setResult(null);
    setSteps([]);
    setChangeTypeFilter(null);
    setIsConverting(true);

    try {
      await convertStream(d0Text, _streamCallbacks());
    } catch (e) {
      setError(e.message || "Conversion failed. Is the backend running on port 8000?");
    } finally {
      setIsConverting(false);
    }
  }

  async function handleConvertHex(rawBytes, fileName) {
    setError(null);
    setResult(null);
    setSteps([]);
    setChangeTypeFilter(null);
    setIsConverting(true);

    try {
      await convertHexStream(rawBytes, _streamCallbacks(fileName));
    } catch (e) {
      setError(e.message || "Conversion failed. Is the backend running on port 8000?");
    } finally {
      setIsConverting(false);
    }
  }

  async function handleBatch(text) {
    setError(null);
    setBatchJobId(null);
    try {
      const jobId = await convertBatch(text);
      setBatchJobId(jobId);
    } catch (e) {
      setError(e.message || "Failed to submit batch.");
    }
  }

  async function handleLoadSample(type, setText) {
    try {
      const text = await fetchSample(type);
      setText(text);
    } catch (e) {
      setError("Failed to load sample: " + e.message);
    }
  }

  function handleNewConversion() {
    setResult(null);
    setSteps([]);
    setError(null);
    setChangeTypeFilter(null);
    setBatchJobId(null);
    setConversionId(null);
  }

  const showPipeline = steps.length > 0 || isConverting;

  return (
    <div className="main-content">
      {showPipeline && <PipelineSteps steps={steps} isRunning={isConverting} />}

      {!result && !isConverting && (
        <>
          <InputPanel
            onConvert={handleConvert}
            onConvertHex={handleConvertHex}
            onBatch={handleBatch}
            onLoadSample={handleLoadSample}
            converting={isConverting}
          />
          <BatchUpload />
        </>
      )}

      {/* Batch progress bar — shown above the output panel whenever a batch is active */}
      {batchJobId && (
        <BatchProgress
          jobId={batchJobId}
          onDone={() => {}}
        />
      )}

      {isConverting && !result && (
        <div style={{ textAlign: "center", padding: 80, color: "var(--text-secondary)" }}>
          <div style={{ fontSize: 13 }}>Converting…</div>
        </div>
      )}

      {error && (
        <div style={{ maxWidth: 860, margin: "0 auto 0", padding: "0 24px 24px" }}>
          <div style={{ padding: "12px 18px", background: "var(--error-light)", border: "1px solid var(--error)", borderRadius: "var(--radius)", color: "var(--error)", fontSize: 13 }}>
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {result && (
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "24px 20px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <button className="btn btn-ghost" onClick={handleNewConversion} style={{ fontSize: 13 }}>
              ← New conversion
            </button>
            <TransactionBadge type={result.transaction_type} />
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
              {conversionId && (
                <button
                  className="btn btn-secondary"
                  onClick={() => navigate(`/history/${conversionId}`)}
                  style={{ fontSize: 12 }}
                >
                  View in History →
                </button>
              )}
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {result.audit.entries.length} fields audited
              </span>
            </div>
          </div>

          {/* Downloads */}
          <div style={{ marginBottom: 20 }}>
            <DownloadBar
              f6Output={result.f6_output}
              auditData={result.audit}
              filename="conversion"
            />
          </div>

          {/* Output panel */}
          <div style={{ marginBottom: 20 }}>
            <OutputPanel
              d0Input={result.d0_input}
              f6Output={result.f6_output}
              auditEntries={result.audit.entries}
            />
          </div>

          {/* Validation */}
          <div style={{ marginBottom: 20 }}>
            <ValidationFindings findings={result.audit.findings} />
          </div>

          {/* Audit */}
          <div style={{ marginBottom: 8 }}>
            <AuditSummaryBar
              summary={result.audit.summary}
              activeFilter={changeTypeFilter}
              onFilter={setChangeTypeFilter}
            />
          </div>
          <AuditTable
            entries={result.audit.entries}
            changeTypeFilter={changeTypeFilter}
          />
        </div>
      )}
    </div>
  );
}

// ── Root app with sidebar layout ────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <SidebarWithLocation />
        <Routes>
          <Route path="/"            element={<ConverterPage />} />
          <Route path="/reverse"    element={<ReverseConverterPage />} />
          <Route path="/validate"   element={<ValidatorPage />} />
          <Route path="/history"    element={<div className="main-content"><HistoryPage /></div>} />
          <Route path="/history/:id" element={<div className="main-content"><ConversionDetailPage /></div>} />
          <Route path="/batches"    element={<div className="main-content"><BatchesPage /></div>} />
          <Route path="/rules"      element={<div className="main-content"><RulesPage /></div>} />
          <Route path="/ingest"     element={<div className="main-content"><IngestionPage /></div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function SidebarWithLocation() {
  return <Sidebar rulesLoaded={null} />;
}
