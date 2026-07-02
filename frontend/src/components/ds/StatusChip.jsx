import React from 'react';

/**
 * @param {{ status: 'in-camp'|'fight-ready'|'fatigued'|'shielded'|'retiring', countdown?: string, size?: 'sm'|'md' }} props
 */
export function StatusChip({ status, countdown, size = 'md' }) {
  const isSmall = size === 'sm';

  const config = {
    'in-camp': {
      label: countdown ? `In Camp ${countdown}` : 'In Camp',
      bg: 'var(--ember-tint)',
      color: 'var(--ember-strong)',
      dot: 'var(--ember)',
    },
    'fight-ready': {
      label: 'Fight Ready',
      bg: 'var(--win-tint)',
      color: 'var(--win)',
      dot: 'var(--win)',
    },
    'fatigued': {
      label: 'Fatigued',
      bg: 'var(--warn-tint)',
      color: 'var(--warn)',
      dot: 'var(--warn)',
    },
    'shielded': {
      label: countdown ? `Shielded ${countdown}` : 'Shielded',
      bg: 'var(--surface-sunken)',
      color: 'var(--ink-secondary)',
      dot: 'var(--ink-muted)',
    },
    'retiring': {
      label: 'Retiring',
      bg: 'var(--surface-sunken)',
      color: 'var(--ink-muted)',
      dot: 'var(--ink-muted)',
    },
  };

  const c = config[status] || config['fight-ready'];

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      background: c.bg,
      color: c.color,
      borderRadius: 'var(--radius-chip)',
      padding: isSmall ? '3px 8px' : '4px 10px',
      fontFamily: 'var(--font-body)',
      fontSize: isSmall ? '11px' : '12px',
      fontWeight: 600,
      letterSpacing: '0.01em',
      whiteSpace: 'nowrap',
      lineHeight: 1,
    }}>
      <span style={{
        width: isSmall ? 5 : 6,
        height: isSmall ? 5 : 6,
        borderRadius: '50%',
        background: c.dot,
        flexShrink: 0,
      }} />
      {c.label}
    </div>
  );
}
