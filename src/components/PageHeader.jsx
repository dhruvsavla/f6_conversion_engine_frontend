import React from 'react';

export default function PageHeader({ eyebrow, title, subtitle, actions, children }) {
  return (
    <div style={{
      padding: '28px 40px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'transparent',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap',
    }}>
      <div>
        {eyebrow && (
          <div style={{
            fontSize: 'var(--text-xs)', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--accent-bright)', marginBottom: 4,
          }}>
            {eyebrow}
          </div>
        )}
        <h1 style={{
          fontSize: 'var(--text-2xl)', fontWeight: 700,
          letterSpacing: '-0.02em', color: 'var(--text-primary)',
          marginBottom: subtitle ? 6 : 0,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: 'var(--text-md)', fontWeight: 450, color: 'var(--text-secondary)',
            lineHeight: 1.6, maxWidth: 520,
          }}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
