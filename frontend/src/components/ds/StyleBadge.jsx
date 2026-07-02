import React from 'react';

const STYLES = {
  'boxer':    { label: 'Boxer',     family: 'Striker',  color: 'var(--corner-red)',   bg: 'var(--corner-red-tint)' },
  'muay-thai':{ label: 'Muay Thai', family: 'Striker',  color: 'var(--corner-red)',   bg: 'var(--corner-red-tint)' },
  'wrestler': { label: 'Wrestler',  family: 'Grappler', color: 'var(--ember-strong)',  bg: 'var(--ember-tint)' },
  'judo':     { label: 'Judo',      family: 'Grappler', color: 'var(--ember-strong)',  bg: 'var(--ember-tint)' },
  'mma':      { label: 'MMA',       family: 'Hybrid',   color: 'var(--ink-secondary)', bg: 'var(--surface-sunken)' },
  'bjj':      { label: 'BJJ',       family: 'Hybrid',   color: 'var(--ink-secondary)', bg: 'var(--surface-sunken)' },
};

/**
 * @param {{ style: 'boxer'|'muay-thai'|'wrestler'|'judo'|'mma'|'bjj', showFamily?: boolean }} props
 */
export function StyleBadge({ style, showFamily = false }) {
  const key = (style || '').toLowerCase().replace(/\s+/g, '-');
  const cfg = STYLES[key] || { label: style, family: '', color: 'var(--ink-secondary)', bg: 'var(--surface-sunken)' };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      background: cfg.bg,
      borderRadius: 'var(--radius-chip)',
      padding: '3px 8px',
      fontFamily: 'var(--font-body)',
      fontSize: '11px',
      fontWeight: 600,
      color: cfg.color,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
      lineHeight: 1,
    }}>
      {cfg.label}
      {showFamily && (
        <span style={{ opacity: 0.6, fontWeight: 400 }}>· {cfg.family}</span>
      )}
    </span>
  );
}
