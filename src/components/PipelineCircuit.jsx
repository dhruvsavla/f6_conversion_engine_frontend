import React from 'react';
import { IconCheck, IconX, IconSpinner } from './Icons';

const STEP_ICONS = {
  reading_rules: '◈',
  parsing:       '⌥',
  detecting:     '◉',
  planning:      '◌',
  mapping:       '⊞',
  assembling:    '⊟',
  validating:    '◈',
  auditing:      '◎',
  loading:       '◉',
  scoring:       '◍',
  persisting:    '◎',
};

const NODE_SIZE = 32;
const COL_WIDTH = 76;
const TRACE_MIN = 12;

export default function PipelineCircuit({ steps = [], isRunning = false }) {
  if (steps.length === 0 && !isRunning) return null;

  const displaySteps = steps.length > 0 ? steps : [
    { id: 'loading', label: 'Starting…', status: 'active' }
  ];

  return (
    <div style={{
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '18px 32px 14px',
      overflowX: 'auto',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        width: 'max-content',
        gap: 0,
      }}>
        {displaySteps.map((step, i) => (
          <React.Fragment key={step.id || i}>
            {/* Node column — fixed width so labels never bleed */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 6, width: COL_WIDTH, flexShrink: 0, overflow: 'hidden',
            }}>
              {/* Circle */}
              <div
                className={step.status === 'active' ? 'node-active' : ''}
                style={{
                  width: NODE_SIZE, height: NODE_SIZE,
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  background:
                    step.status === 'complete' ? 'var(--status-success-bg)'
                  : step.status === 'error'    ? 'var(--status-error-bg)'
                  : step.status === 'active'   ? 'var(--status-info-bg)'
                  : 'var(--bg-raised)',
                  border: `1.5px solid ${
                    step.status === 'complete' ? 'var(--status-success)'
                  : step.status === 'error'    ? 'var(--status-error)'
                  : step.status === 'active'   ? 'var(--status-info)'
                  : 'var(--border-default)'
                  }`,
                  boxShadow:
                    step.status === 'complete' ? 'var(--shadow-glow-green)'
                  : step.status === 'error'    ? 'var(--shadow-glow-red)'
                  : step.status === 'active'   ? 'var(--shadow-glow-blue)'
                  : 'none',
                  transition: 'all var(--transition-slow)',
                }}
              >
                {step.status === 'complete' && <IconCheck size={12} color="var(--status-success)" />}
                {step.status === 'error'    && <IconX     size={12} color="var(--status-error)" />}
                {step.status === 'active'   && <IconSpinner size={12} color="var(--status-info)" />}
                {(step.status === 'pending' || !step.status) && (
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                    {STEP_ICONS[step.id] || (i + 1)}
                  </span>
                )}
              </div>

              {/* Label — clamped to 2 lines, clips at column edge */}
              <span
                title={step.label}
                style={{
                  fontSize: 9, fontFamily: 'var(--font-ui)',
                  fontWeight: 600, letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color:
                    step.status === 'pending' ? 'var(--text-tertiary)'
                  : step.status === 'active'  ? 'var(--status-info)'
                  : step.status === 'complete'? 'var(--text-secondary)'
                  : 'var(--status-error)',
                  textAlign: 'center',
                  width: COL_WIDTH - 4,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: 1.3,
                  maxHeight: '2.6em',
                  wordBreak: 'break-word',
                }}
              >
                {step.label}
              </span>

              {/* Detail line — single line with ellipsis */}
              {step.detail && step.status !== 'pending' && (
                <span
                  title={step.detail}
                  style={{
                    fontSize: 9, color: 'var(--text-tertiary)',
                    textAlign: 'center',
                    width: COL_WIDTH - 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {step.detail}
                </span>
              )}
            </div>

            {/* Trace connector */}
            {i < displaySteps.length - 1 && (
              <div style={{
                width: TRACE_MIN, height: 2, flexShrink: 0,
                background: 'var(--border-subtle)',
                position: 'relative', overflow: 'hidden',
                alignSelf: 'flex-start',
                marginTop: NODE_SIZE / 2,
              }}>
                {step.status === 'complete' && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, bottom: 0, width: '100%',
                    background: 'linear-gradient(90deg, var(--status-success), var(--status-info))',
                    animation: 'traceFill 400ms ease forwards',
                  }} />
                )}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
