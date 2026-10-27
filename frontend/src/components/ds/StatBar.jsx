import React from 'react';

/**
 * @param {{ label: string, value: number, size?: 'sm'|'md', showLabel?: boolean }} props
 */
export function StatBar({ label, value, size = 'md', showLabel = true }) {
  const isSmall = size === 'sm';
  const clamp = Math.max(0, Math.min(100, value));

  // Grow the bar from 0 on mount — double rAF so the zero-width frame paints
  // first and the width change actually transitions.
  const [grown, setGrown] = React.useState(false);
  React.useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)));
    return () => cancelAnimationFrame(raf);
  }, []);

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
          width: isSmall ? 62 : 90,
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
          width: `${grown ? clamp : 0}%`,
          height: '100%',
          background: barColor,
          borderRadius: 'var(--radius-full)',
          transition: 'width var(--duration-xslow) var(--ease-out)',
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
