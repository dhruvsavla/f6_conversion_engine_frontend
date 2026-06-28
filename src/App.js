import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import "./styles/global.css";

// Components
import InputPanel from "./components/InputPanel";
import PipelineCircuit from "./components/PipelineCircuit";
import OutputPanel from "./components/OutputPanel";
import ValidationFindings from "./components/ValidationFindings";
import AuditSummaryBar from "./components/AuditSummaryBar";
import AuditTable from "./components/AuditTable";
import DownloadBar from "./components/DownloadBar";
import TransactionBadge from "./components/TransactionBadge";
import IngestionPage from "./components/IngestionPage";
import BatchUpload from "./components/BatchUpload";
import BatchProgress from "./components/BatchProgress";
import PageHeader from "./components/PageHeader";
import { ToastProvider } from "./components/Toast";
import {
  IconConvert, IconValidate, IconHistory, IconBatch,
  IconRules, IconIngest, IconReverse, IconArrowRight, IconDatabase
} from "./components/Icons";

// Pages
import HistoryPage from "./pages/HistoryPage";
import ConversionDetailPage from "./pages/ConversionDetailPage";
import BatchesPage from "./pages/BatchesPage";
import RulesPage from "./pages/RulesPage";
import ReverseConverterPage from "./pages/ReverseConverterPage";
import ValidatorPage from "./pages/ValidatorPage";

// API
import { convertBatch, convertStream, convertHexStream, fetchSample, fetchStats } from "./api/client";

// ── Nav items ──────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: "/",         label: "Convert",   Icon: IconConvert  },
  { to: "/reverse",  label: "Reverse",   Icon: IconReverse  },
  { to: "/validate", label: "Validate",  Icon: IconValidate },
  { to: "/history",  label: "History",   Icon: IconHistory  },
  { to: "/batches",  label: "Batches",   Icon: IconBatch    },
  { to: "/rules",    label: "Rules",     Icon: IconRules    },
  { to: "/ingest",   label: "Ingest",    Icon: IconIngest   },
];

// ── Command rail sidebar ───────────────────────────────────────
function Sidebar({ expanded, onExpand, onCollapse }) {
  const [stats, setStats] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats().then(s => setStats(s)).catch(() => {});
  }, []);

  return (
    <nav
      onMouseEnter={onExpand}
      onMouseLeave={onCollapse}
      style={{
        width: expanded ? "var(--rail-expanded)" : "var(--rail-collapsed)",
        transition: "width var(--transition-slow)",
        background: "var(--rail-bg)",
        borderRight: "1px solid var(--rail-border)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "fixed",
        left: 0, top: 0,
        zIndex: 100,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{
        padding: "16px 14px",
        display: "flex", alignItems: "center", gap: 12,
        height: 60, flexShrink: 0,
      }}>
        <div style={{
          width: 28, height: 28, flexShrink: 0,
          background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
          borderRadius: 6,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, color: "#fff",
          fontFamily: "var(--font-mono)",
          boxShadow: "var(--shadow-glow-blue)",
        }}>
          Rx
        </div>
        <span style={{
          fontSize: 15, fontWeight: 700, color: "var(--text-primary)",
          letterSpacing: "-0.01em", whiteSpace: "nowrap",
          opacity: expanded ? 1 : 0,
          transition: "opacity var(--transition-normal)",
        }}>
          ClaimConvert
        </span>
      </div>

      <div style={{ height: 1, background: "var(--rail-border)", margin: "0 10px", flexShrink: 0 }} />

      {/* Nav items */}
      <div style={{ flex: 1, paddingTop: 8, paddingBottom: 8, display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
        {NAV_ITEMS.map(item => {
          const isActive = location.pathname === item.to ||
            (item.to !== "/" && location.pathname.startsWith(item.to));
          return (
            <div
              key={item.to}
              onClick={() => navigate(item.to)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
                margin: "0 6px",
                background: isActive ? "var(--status-info-bg)" : "transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                userSelect: "none",
              }}
            >
              <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20 }}>
                <item.Icon
                  size={20}
                  color={isActive ? "var(--accent-bright)" : "#9BBDD8"}
                />
              </div>
              <span style={{
                fontSize: 14,
                fontWeight: isActive ? 700 : 500,
                opacity: expanded ? 1 : 0,
                transition: "opacity var(--transition-normal)",
                color: isActive ? "var(--accent-bright)" : "var(--text-secondary)",
                minWidth: 0,
              }}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stats strip */}
      <div style={{
        borderTop: "1px solid var(--rail-border)",
        padding: "12px 14px",
        flexShrink: 0,
        minHeight: 52,
        display: "flex",
        alignItems: "center",
      }}>
        {/* Collapsed: centered db icon */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          width: "100%",
        }}>
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 20 }}>
            <IconDatabase size={14} color="#5A7090" />
          </div>
          <div style={{
            opacity: expanded ? 1 : 0,
            transition: "opacity var(--transition-normal)",
            minWidth: 0, overflow: "hidden",
          }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", lineHeight: 1.3, whiteSpace: "nowrap" }}>
              {stats?.total_conversions ?? "—"} conversions
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                background: stats ? "var(--status-success)" : "var(--status-neutral)",
                boxShadow: stats ? "var(--shadow-glow-green)" : "none",
              }} />
              <span style={{
                fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                maxWidth: 140,
              }}>
                {stats?.active_rule_set ?? "No rule set"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

// ── Main layout ────────────────────────────────────────────────
function Layout({ children }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>
      <Sidebar
        expanded={expanded}
        onExpand={() => setExpanded(true)}
        onCollapse={() => setExpanded(false)}
      />
      <main style={{
        flex: 1,
        marginLeft: expanded ? "var(--rail-expanded)" : "var(--rail-collapsed)",
        transition: "margin-left var(--transition-slow)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}>
        {children}
      </main>
    </div>
  );
}

// ── Converter page ─────────────────────────────────────────────
function ConverterPage() {
  const navigate = useNavigate();
  const [steps, setSteps] = useState([]);
  const [result, setResult] = useState(null);
  const [conversionId, setConversionId] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState(null);
  const [changeTypeFilter, setChangeTypeFilter] = useState(null);
  const [batchJobId, setBatchJobId] = useState(null);

  function _streamCallbacks() {
    return {
      onStep: (stepData) => {
        setSteps(prev => {
          const idx = prev.findIndex(s => s.id === stepData.id);
          if (idx >= 0) { const next = [...prev]; next[idx] = stepData; return next; }
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
    setError(null); setResult(null); setSteps([]);
    setChangeTypeFilter(null); setIsConverting(true);
    try { await convertStream(d0Text, _streamCallbacks()); }
    catch (e) { setError(e.message || "Conversion failed. Is the backend running on port 8000?"); }
    finally { setIsConverting(false); }
  }

  async function handleConvertHex(rawBytes) {
    setError(null); setResult(null); setSteps([]);
    setChangeTypeFilter(null); setIsConverting(true);
    try { await convertHexStream(rawBytes, _streamCallbacks()); }
    catch (e) { setError(e.message || "Conversion failed."); }
    finally { setIsConverting(false); }
  }

  async function handleBatch(text) {
    setError(null); setBatchJobId(null);
    try { const jobId = await convertBatch(text); setBatchJobId(jobId); }
    catch (e) { setError(e.message || "Failed to submit batch."); }
  }

  async function handleLoadSample(type, setText) {
    try { setText(await fetchSample(type)); }
    catch (e) { setError("Failed to load sample: " + e.message); }
  }

  function handleNewConversion() {
    setResult(null); setSteps([]); setError(null);
    setChangeTypeFilter(null); setBatchJobId(null); setConversionId(null);
  }

  const showPipeline = steps.length > 0 || isConverting;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader
        eyebrow="Convert"
        title="D.0 → F6 Converter"
        subtitle="Paste a D.0 transaction. The agent converts every field and logs a complete audit trail."
        actions={result && conversionId && (
          <button
            onClick={() => navigate(`/history/${conversionId}`)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "transparent", border: "1px solid var(--border-default)",
              color: "var(--text-secondary)", borderRadius: "var(--radius-md)",
              padding: "6px 14px", fontSize: "var(--text-sm)", cursor: "pointer",
            }}
          >
            View in History <IconArrowRight size={13} />
          </button>
        )}
      />

      {showPipeline && <PipelineCircuit steps={steps} isRunning={isConverting} />}

      {error && (
        <div style={{
          margin: "16px 40px",
          padding: "12px 16px",
          background: "var(--status-error-bg)",
          border: "1px solid var(--status-error)",
          borderLeft: "3px solid var(--status-error)",
          borderRadius: "var(--radius-md)",
          color: "var(--status-error)", fontSize: "var(--text-sm)",
        }}>
          {error}
        </div>
      )}

      {!result && !isConverting && (
        <div style={{ padding: "24px 40px", flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
          <InputPanel
            onConvert={handleConvert}
            onConvertHex={handleConvertHex}
            onBatch={handleBatch}
            onLoadSample={handleLoadSample}
            converting={isConverting}
          />
          <BatchUpload />
          {batchJobId && <BatchProgress jobId={batchJobId} onDone={() => {}} />}
        </div>
      )}

      {isConverting && !result && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          flex: 1, color: "var(--text-tertiary)", fontSize: "var(--text-sm)",
        }}>
          Converting…
        </div>
      )}

      {result && (
        <div style={{ padding: "24px 40px", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={handleNewConversion}
              style={{
                background: "transparent", border: "none",
                color: "var(--text-secondary)", cursor: "pointer",
                fontSize: "var(--text-sm)", padding: "4px 0",
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              ← New conversion
            </button>
            <TransactionBadge type={result.transaction_type} />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginLeft: "auto" }}>
              {result.audit.entries.length} fields audited
            </span>
          </div>

          <DownloadBar f6Output={result.f6_output} auditData={result.audit} filename="conversion" />
          <OutputPanel d0Input={result.d0_input} f6Output={result.f6_output} auditEntries={result.audit.entries} />
          <ValidationFindings findings={result.audit.findings} />
          <AuditSummaryBar summary={result.audit.summary} activeFilter={changeTypeFilter} onFilter={setChangeTypeFilter} />
          <AuditTable entries={result.audit.entries} changeTypeFilter={changeTypeFilter} />
        </div>
      )}
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Layout>
          <Routes>
            <Route path="/"            element={<ConverterPage />} />
            <Route path="/reverse"     element={<ReverseConverterPage />} />
            <Route path="/validate"    element={<ValidatorPage />} />
            <Route path="/history"     element={<HistoryPage />} />
            <Route path="/history/:id" element={<ConversionDetailPage />} />
            <Route path="/batches"     element={<BatchesPage />} />
            <Route path="/rules"       element={<RulesPage />} />
            <Route path="/ingest"      element={<IngestionPage />} />
          </Routes>
        </Layout>
      </ToastProvider>
    </BrowserRouter>
  );
}
