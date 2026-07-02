import React from 'react';

/**
 * @param {{ label: string, value: number, size?: 'sm'|'md', showLabel?: boolean }} props
 */
export function StatBar({ label, value, size = 'md', showLabel = true }) {
  const isSmall = size === 'sm';
  const clamp = Math.max(0, Math.min(100, value));

  const colorMap = {
    high:   'var(--ember)',
    medium: 'var(--ink-secondary)',
    low:    'var(--warn)',
  };
  const barColor = clamp >= 60 ? colorMap.high : clamp >= 35 ? colorMap.medium : colorMap.low;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: isSmall ? 5 : 7 }}>
      {showLabel && (
        <span style={{
          fontFamily: 'var(--font-body)',
          fontSize: isSmall ? '10px' : '11px',
          color: 'var(--ink-muted)',
          width: isSmall ? 52 : 68,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          flexShrink: 0,
          lineHeight: 1,
        }}>
          {label}
        </span>
      )}
      <div style={{
        flex: 1,
        height: isSmall ? 4 : 5,
        background: 'var(--surface-sunken)',
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${clamp}%`,
          height: '100%',
          background: barColor,
          borderRadius: 'var(--radius-full)',
          transition: 'width 400ms var(--ease-out)',
        }} />
      </div>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: isSmall ? '11px' : '12px',
        fontWeight: 500,
        color: 'var(--ink)',
        width: 24,
        textAlign: 'right',
        flexShrink: 0,
        lineHeight: 1,
      }}>
        {clamp}
      </span>
    </div>
  );
}
