import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { IconCheck, IconX, IconWarn, IconInfo } from './Icons';

const ToastContext = createContext(null);

const TOAST_STYLES = {
  success: { border: 'var(--status-success)', bg: 'var(--status-success-bg)', icon: IconCheck, iconColor: 'var(--status-success)' },
  error:   { border: 'var(--status-error)',   bg: 'var(--status-error-bg)',   icon: IconX,     iconColor: 'var(--status-error)'   },
  warn:    { border: 'var(--status-warn)',     bg: 'var(--status-warn-bg)',    icon: IconWarn,  iconColor: 'var(--status-warn)'    },
  info:    { border: 'var(--status-info)',     bg: 'var(--status-info-bg)',    icon: IconInfo,  iconColor: 'var(--status-info)'    },
};

function ToastItem({ toast, onDismiss }) {
  const s = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
  const Icon = s.icon;

  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div className="fade-in" style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      background: 'var(--bg-overlay)',
      border: `1px solid ${s.border}`,
      borderLeft: `3px solid ${s.border}`,
      borderRadius: 'var(--radius-md)',
      padding: '12px 14px',
      boxShadow: 'var(--shadow-lg)',
      maxWidth: 360,
      pointerEvents: 'auto',
    }}>
      <Icon size={14} color={s.iconColor} style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', flex: 1, lineHeight: 1.5 }}>
        {toast.message}
      </span>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-tertiary)', padding: 0, flexShrink: 0,
        }}
      >
        <IconX size={12} color="var(--text-tertiary)" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const add = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t.slice(-3), { id, type, message }]);
  }, []);

  const toast = {
    success: (m) => add('success', m),
    error:   (m) => add('error', m),
    warn:    (m) => add('warn', m),
    info:    (m) => add('info', m),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24,
        display: 'flex', flexDirection: 'column', gap: 8,
        zIndex: 9999, pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext) || {
    success: () => {}, error: () => {}, warn: () => {}, info: () => {},
  };
}
