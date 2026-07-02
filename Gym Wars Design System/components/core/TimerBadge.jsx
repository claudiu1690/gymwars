import React from 'react';

/**
 * @param {{ value: string, urgent?: boolean, complete?: boolean, size?: 'sm'|'md'|'lg', label?: string }} props
 */
export function TimerBadge({ value, urgent = false, complete = false, size = 'md', label }) {
  const color = complete
    ? 'var(--win)'
    : urgent
    ? 'var(--corner-red)'
    : 'var(--ember)';

  const bg = complete
    ? 'var(--win-tint)'
    : urgent
    ? 'var(--corner-red-tint)'
    : 'var(--ember-tint)';

  const sizes = {
    sm: { fontSize: '11px', padding: '3px 8px' },
    md: { fontSize: '13px', padding: '4px 10px' },
    lg: { fontSize: '16px', padding: '6px 14px' },
  };

  const s = sizes[size] || sizes.md;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
      {label && (
        <span style={{
          fontFamily: 'var(--font-body)',
          fontSize: '10px',
          fontWeight: 500,
          color: 'var(--ink-muted)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          {label}
        </span>
      )}
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: bg,
        color,
        borderRadius: 'var(--radius-chip)',
        fontFamily: 'var(--font-mono)',
        fontWeight: 500,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        lineHeight: 1,
        ...s,
      }}>
        {complete ? '✓ ' : ''}{value}
      </span>
    </div>
  );
}
