import React from 'react';

export default function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 16,
      padding: '80px 24px', textAlign: 'center',
    }}>
      {icon && (
        <div style={{ opacity: 0.3, color: 'var(--text-tertiary)' }}>
          {icon}
        </div>
      )}
      <div>
        <div style={{
          fontSize: 'var(--text-lg)', fontWeight: 600,
          color: 'var(--text-secondary)', marginBottom: 6,
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 'var(--text-base)', color: 'var(--text-tertiary)' }}>
            {subtitle}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}
