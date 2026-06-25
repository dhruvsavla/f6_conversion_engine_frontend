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
import RulesPage from "./components/RulesPage";

import { convertStream, fetchSample } from "./api/client";

// ── Sidebar navigation ──────────────────────────────────────
function Sidebar({ rulesLoaded }) {
  const navigate = useNavigate();
  const location = useLocation();
  const current = location.pathname;

  const items = [
    { path: "/", label: "Convert", icon: "⇌" },
    { path: "/rules", label: "Rules", icon: "⚙" },
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
  const [steps, setSteps] = useState([]);
  const [result, setResult] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState(null);
  const [changeTypeFilter, setChangeTypeFilter] = useState(null);

  async function handleConvert(d0Text) {
    setError(null);
    setResult(null);
    setSteps([]);
    setChangeTypeFilter(null);
    setIsConverting(true);

    try {
      await convertStream(d0Text, {
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
        onResult: (data) => setResult(data),
        onError: (msg) => setError(msg),
      });
    } catch (e) {
      setError(e.message || "Conversion failed. Is the backend running on port 8000?");
    } finally {
      setIsConverting(false);
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
  }

  const showPipeline = steps.length > 0 || isConverting;

  return (
    <div className="main-content">
      {showPipeline && <PipelineSteps steps={steps} isRunning={isConverting} />}

      {!result && !isConverting && (
        <InputPanel
          onConvert={handleConvert}
          onLoadSample={handleLoadSample}
          converting={isConverting}
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
            <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-secondary)" }}>
              {result.audit.entries.length} fields audited
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

// ── Rules page wrapper ──────────────────────────────────────
function RulesPageWrapper() {
  return (
    <div className="main-content">
      <RulesPage />
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
          <Route path="/" element={<ConverterPage />} />
          <Route path="/rules" element={<RulesPageWrapper />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function SidebarWithLocation() {
  return <Sidebar rulesLoaded={null} />;
}
