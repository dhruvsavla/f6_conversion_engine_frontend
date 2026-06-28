import React from 'react';

export function SkeletonLine({ width = '100%', height = 14, style = {} }) {
  return (
    <div className="shimmer-bar" style={{
      width, height, borderRadius: 'var(--radius-sm)', ...style,
    }} />
  );
}

export function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <SkeletonLine width={60} height={20} />
        <SkeletonLine width={200} height={14} />
        <div style={{ marginLeft: 'auto' }}>
          <SkeletonLine width={70} height={20} />
        </div>
      </div>
      <SkeletonLine width="80%" height={12} />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', gap: 16, alignItems: 'center',
        }}>
          <SkeletonLine width={60} height={12} />
          <SkeletonLine width={80} height={12} />
          <SkeletonLine width={160} height={12} />
          <SkeletonLine width={100} height={12} />
          <SkeletonLine width={120} height={12} />
        </div>
      ))}
    </div>
  );
}
