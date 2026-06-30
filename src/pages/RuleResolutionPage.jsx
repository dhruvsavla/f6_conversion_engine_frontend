import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { IconCheck, IconX, IconWarn, IconSpinner, IconResolution } from '../components/Icons';
import { useToast } from '../components/Toast';
import { getFlaggedRules, resolveRule, resolveAllAuto, getResolutionHistory } from '../api/client';

// ── Inline mini-components ──────────────────────────────────────────────────

function Badge({ type, children }) {
  const map = {
    error:   { bg: 'var(--status-error-bg)',   color: 'var(--status-error)',   border: 'rgba(239,68,68,0.3)'   },
    warn:    { bg: 'var(--status-warn-bg)',     color: 'var(--status-warn)',    border: 'rgba(245,158,11,0.3)'  },
    success: { bg: 'var(--status-success-bg)', color: 'var(--status-success)', border: 'rgba(16,185,129,0.3)'  },
    info:    { bg: 'var(--status-info-bg)',     color: 'var(--status-info)',    border: 'rgba(59,130,246,0.3)'  },
    neutral: { bg: 'var(--bg-raised)',          color: 'var(--text-secondary)', border: 'var(--border-default)' },
  };
  const s = map[type] || map.neutral;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 'var(--radius-full)',
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      fontSize: 'var(--text-xs)', fontWeight: 700,
      letterSpacing: '0.05em', textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function IssueRow({ issue }) {
  const isInvalid = issue.startsWith('INVALID');
  const color     = isInvalid ? 'var(--status-error)' : 'var(--status-warn)';
  const bg        = isInvalid ? 'var(--status-error-bg)' : 'var(--status-warn-bg)';
  const Icon      = isInvalid ? IconX : IconWarn;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 14px',
      background: bg,
      border: `1px solid ${color}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 'var(--radius-md)',
      marginBottom: 6,
    }}>
      <Icon size={13} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
        {issue}
      </span>
    </div>
  );
}

const TX_TYPES = ['RETAIL','SPECIALTY','CONTROLLED','COB','REVERSAL','COMPOUND','LTC','MEDICARE_PART_D','ELIGIBILITY','PRIOR_AUTH'];
const SEGMENTS = ['HDR','INS','PAT','CLM','PRE','PRI','DUR','COB','CMP','PA','CLN','WRK','DOC'];

// ── Rule editor card ────────────────────────────────────────────────────────

function RuleEditorCard({ entry, index, total, onResolved }) {
  const { rule, segment_id, issues = [], _review_reason, _correct_segment,
          _has_invalid, _auto_fixable, _id } = entry;

  const [editedJson,    setEditedJson]    = useState(JSON.stringify(rule, null, 2));
  const [jsonError,     setJsonError]     = useState(null);
  const [serverErrors,  setServerErrors]  = useState([]);
  const [targetSegment, setTargetSegment] = useState(_correct_segment || segment_id || 'CLM');
  const [txType,        setTxType]        = useState('RETAIL');
  const [approving,     setApproving]     = useState(false);
  const [rejecting,     setRejecting]     = useState(false);
  const [showReject,    setShowReject]    = useState(false);
  const [rejectReason,  setRejectReason]  = useState('');
  const toast = useToast();

  function handleJsonChange(value) {
    setEditedJson(value);
    setServerErrors([]);
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch (e) {
      setJsonError(e.message);
    }
  }

  async function handleApprove() {
    let parsed;
    if (_auto_fixable) {
      parsed = rule;
    } else {
      if (jsonError) { toast.error('Fix the JSON syntax error before approving'); return; }
      try { parsed = JSON.parse(editedJson); }
      catch (e) { setJsonError(e.message); return; }
    }

    setApproving(true);
    setServerErrors([]);
    try {
      const result = await resolveRule({
        entry_id:         _id,
        resolution:       'approve',
        segment_id:       targetSegment,
        transaction_type: txType,
        corrected_rule:   parsed,
      });
      if (result.warnings?.length) {
        toast.warn(`Merged with ${result.warnings.length} warning(s)`);
      } else {
        toast.success(`Rule ${parsed.field_id} merged into "${result.merged_into}" ✓`);
      }
      onResolved();
    } catch (err) {
      if (err.status === 422 && err.data?.issues) {
        setServerErrors(err.data.issues);
        toast.error('Rule still has errors — see below');
      } else {
        toast.error(`Merge failed: ${err.message}`);
      }
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) { toast.warn('Please provide a reason for rejection'); return; }
    setRejecting(true);
    try {
      const result = await resolveRule({
        entry_id:         _id,
        resolution:       'reject',
        rejection_reason: rejectReason,
      });
      toast.success(`Rule rejected (${result.remaining} remaining)`);
      onResolved();
    } catch (e) {
      toast.error(`Rejection failed: ${e.message}`);
    } finally {
      setRejecting(false);
    }
  }

  const statusType  = _has_invalid ? 'error' : 'warn';
  const statusLabel = _has_invalid ? 'INVALID' : 'WARN ONLY';
  const borderColor = _has_invalid ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)';
  const accentColor = _has_invalid ? 'var(--status-error)' : 'var(--status-warn)';

  const selectStyle = {
    background: 'var(--bg-raised)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    padding: '6px 10px',
    cursor: 'pointer',
    outline: 'none',
  };

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: `1px solid ${borderColor}`,
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        <Badge type={statusType}>{statusLabel}</Badge>
        {_auto_fixable && <Badge type="info">AUTO-APPROVABLE</Badge>}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>{targetSegment}</span>
          {' · '}
          <span style={{ color: 'var(--accent-bright)', fontWeight: 600 }}>
            {rule?.field_id || '—'}
          </span>
          {rule?.field_name && (
            <span style={{ color: 'var(--text-secondary)' }}>{' · '}{rule.field_name}</span>
          )}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {index} / {total}
        </span>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Original validation errors */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8 }}>
            Validation Errors ({issues.length})
          </div>
          {issues.map((issue, i) => <IssueRow key={i} issue={issue} />)}
        </div>

        {/* Server errors after re-validation */}
        {serverErrors.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--status-error)', marginBottom: 8 }}>
              Still Failing After Edit ({serverErrors.length})
            </div>
            {serverErrors.map((err, i) => <IssueRow key={i} issue={err} />)}
          </div>
        )}

        {/* Review reason */}
        {_review_reason && (
          <div style={{
            background: 'var(--status-info-bg)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderLeft: '3px solid var(--status-info)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--status-info)', marginBottom: 6 }}>
              Why It Was Flagged
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
              {_review_reason}
            </p>
          </div>
        )}

        {/* JSON editor — only for non-auto-fixable rules */}
        {!_auto_fixable && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              Edit JSON
              {jsonError
                ? <Badge type="error">Syntax Error</Badge>
                : <Badge type="neutral">JSON</Badge>
              }
            </div>
            <textarea
              value={editedJson}
              onChange={e => handleJsonChange(e.target.value)}
              style={{
                width: '100%', minHeight: 260,
                background: 'var(--bg-code)',
                border: `1px solid ${jsonError ? 'var(--status-error)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-code)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12, lineHeight: 1.7,
                padding: '14px 16px',
                resize: 'vertical', outline: 'none',
                transition: 'border-color var(--transition-fast)',
              }}
              spellCheck={false}
            />
            {jsonError && (
              <div style={{ marginTop: 5, fontSize: 11, color: 'var(--status-error)', fontFamily: 'var(--font-mono)' }}>
                {jsonError}
              </div>
            )}

            {/* Segment + tx type selectors */}
            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                  Target Segment
                </label>
                <select value={targetSegment} onChange={e => setTargetSegment(e.target.value)} style={selectStyle}>
                  {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                  Transaction Type
                </label>
                <select value={txType} onChange={e => setTxType(e.target.value)} style={selectStyle}>
                  {TX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Action row */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
          {/* Approve button */}
          <button
            onClick={handleApprove}
            disabled={approving || (!_auto_fixable && !!jsonError)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: (approving || (!_auto_fixable && jsonError))
                ? 'var(--bg-raised)'
                : 'linear-gradient(135deg, #059669, #0891B2)',
              color: (approving || (!_auto_fixable && jsonError)) ? 'var(--text-muted)' : '#fff',
              border: 'none', borderRadius: 'var(--radius-md)',
              padding: '8px 18px', fontSize: 'var(--text-sm)', fontWeight: 600,
              cursor: (approving || (!_auto_fixable && jsonError)) ? 'not-allowed' : 'pointer',
              boxShadow: (!_auto_fixable && jsonError) ? 'none' : '0 4px 16px rgba(5,150,105,0.25)',
              transition: 'all var(--transition-fast)',
            }}
          >
            {approving ? <IconSpinner size={13} color="currentColor" /> : <IconCheck size={13} color="currentColor" />}
            {_auto_fixable ? 'Approve as-is' : 'Approve & Merge'}
          </button>

          {/* Reject flow */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {!showReject ? (
              <button
                onClick={() => setShowReject(true)}
                style={{
                  background: 'transparent', border: '1px solid rgba(239,68,68,0.3)',
                  color: 'var(--status-error)', borderRadius: 'var(--radius-md)',
                  padding: '7px 14px', fontSize: 'var(--text-sm)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <IconX size={12} color="var(--status-error)" />
                Reject
              </button>
            ) : (
              <>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection…"
                  onKeyDown={e => e.key === 'Enter' && handleReject()}
                  autoFocus
                  style={{
                    width: 260, padding: '7px 10px', fontSize: 12,
                    background: 'var(--bg-input)',
                    border: '1px solid var(--status-error)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)', outline: 'none',
                  }}
                />
                <button
                  onClick={handleReject}
                  disabled={rejecting}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'var(--status-error-bg)',
                    border: '1px solid var(--status-error)',
                    color: 'var(--status-error)',
                    borderRadius: 'var(--radius-md)',
                    padding: '7px 12px', fontSize: 'var(--text-sm)',
                    fontWeight: 600, cursor: rejecting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {rejecting ? <IconSpinner size={12} color="currentColor" /> : null}
                  Confirm Reject
                </button>
                <button
                  onClick={() => { setShowReject(false); setRejectReason(''); }}
                  style={{
                    background: 'transparent', border: 'none',
                    color: 'var(--text-secondary)', cursor: 'pointer',
                    fontSize: 'var(--text-sm)', padding: '7px 4px',
                  }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Resolution history view ─────────────────────────────────────────────────

function HistoryView({ onBack }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getResolutionHistory(100).then(d => setHistory(d.history || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function relTime(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  const resColor = {
    approve:      'var(--status-success)',
    approve_auto: 'var(--status-teal)',
    reject:       'var(--status-error)',
    cleared:      'var(--status-neutral)',
  };

  return (
    <div>
      <div style={{ padding: '16px 40px', borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 'var(--text-sm)', padding: 0 }}
        >
          ← Back to flagged rules
        </button>
      </div>
      <div style={{ padding: '20px 40px' }}>
        <div style={{ marginBottom: 16, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)' }}>
          Resolution History
        </div>
        {loading && <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>Loading…</div>}
        {!loading && history.length === 0 && (
          <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>No resolutions recorded yet.</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {history.map((h, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 16px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: resColor[h.resolution] || 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 90 }}>
                {h.resolution?.replace('_', ' ')}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-bright)' }}>
                {h.field_id || '—'}
              </span>
              {h.segment_id && (
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  {h.segment_id}
                </span>
              )}
              {h.transaction_type && (
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{h.transaction_type}</span>
              )}
              {h.rejection_reason && (
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  "{h.rejection_reason}"
                </span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {relTime(h.resolved_at)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function RuleResolutionPage() {
  const [flagged,       setFlagged]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [stats,         setStats]         = useState(null);
  const [autoApproving, setAutoApproving] = useState(false);
  const [showHistory,   setShowHistory]   = useState(false);
  const toast    = useToast();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFlaggedRules();
      setFlagged(data.flagged || []);
      setStats({ total: data.total, invalid: data.invalid_count, warnOnly: data.warn_only_count });
    } catch (e) {
      toast.error('Failed to load flagged rules');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  async function handleAutoApproveAll() {
    setAutoApproving(true);
    try {
      const result = await resolveAllAuto({ transaction_type: 'RETAIL' });
      toast.success(result.message);
      load();
    } catch (e) {
      toast.error('Auto-approve failed: ' + e.message);
    } finally {
      setAutoApproving(false);
    }
  }

  if (showHistory) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <PageHeader eyebrow="Rule Resolution" title="Resolution History" />
        <HistoryView onBack={() => setShowHistory(false)} />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <PageHeader
          eyebrow="Rule Resolution"
          title="Flagged Rules Review"
          subtitle="Review and correct AI extraction errors before merging to the live rule engine."
        />
        <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2].map(i => (
            <div key={i} style={{ height: 180, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', opacity: 0.5 }} className="shimmer-bar" />
          ))}
        </div>
      </div>
    );
  }

  const autoApprovable = flagged.filter(e => e._auto_fixable);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <PageHeader
        eyebrow="Rule Resolution"
        title="Flagged Rules Review"
        subtitle="Review and correct AI extraction errors before merging to the live rule engine."
        actions={
          <button
            onClick={() => setShowHistory(true)}
            style={{
              background: 'transparent', border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)',
              padding: '6px 14px', fontSize: 'var(--text-sm)', cursor: 'pointer',
            }}
          >
            View history →
          </button>
        }
      />

      {flagged.length === 0 ? (
        <EmptyState
          icon={<IconResolution size={48} color="var(--status-success)" />}
          title="All rules are clean"
          subtitle="The AI extraction pipeline produced no flagged rules. You're good to go."
          action={
            <button
              onClick={() => navigate('/rules')}
              style={{
                background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                color: '#fff', border: 'none', borderRadius: 'var(--radius-md)',
                padding: '8px 20px', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer',
              }}
            >
              View live rules →
            </button>
          }
        />
      ) : (
        <>
          {/* Summary bar */}
          <div style={{
            padding: '14px 40px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{flagged.length}</span> rule{flagged.length !== 1 ? 's' : ''} need review
            </span>
            {stats?.invalid > 0 && <Badge type="error">{stats.invalid} INVALID</Badge>}
            {stats?.warnOnly > 0 && <Badge type="warn">{stats.warnOnly} warn-only</Badge>}
            {autoApprovable.length > 0 && (
              <button
                onClick={handleAutoApproveAll}
                disabled={autoApproving}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--status-teal-bg)',
                  border: '1px solid var(--status-teal)',
                  color: 'var(--status-teal)',
                  borderRadius: 'var(--radius-md)',
                  padding: '5px 14px', fontSize: 'var(--text-sm)', fontWeight: 600,
                  cursor: autoApproving ? 'not-allowed' : 'pointer',
                }}
              >
                {autoApproving && <IconSpinner size={12} color="currentColor" />}
                Auto-approve {autoApprovable.length} passing rule{autoApprovable.length !== 1 ? 's' : ''} →
              </button>
            )}
          </div>

          {/* Rule cards */}
          <div style={{ padding: '24px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {flagged.map((entry, idx) => (
              <RuleEditorCard
                key={entry._id}
                entry={entry}
                index={idx + 1}
                total={flagged.length}
                onResolved={load}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
