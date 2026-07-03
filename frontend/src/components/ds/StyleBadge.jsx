import React from 'react';

/* Vocabulary aligned with the backend's six GDD archetypes (consts/styles.js):
   Striking family = corner-red tint, Wrestling = ember tint, Submission = sunken.
   Legacy ui-kit keys (boxer/wrestler/mma) kept as aliases. */
const STYLES = {
  'boxing':    { label: 'Boxing',    family: 'Striking',   color: 'var(--corner-red)',   bg: 'var(--corner-red-tint)' },
  'boxer':     { label: 'Boxer',     family: 'Striking',   color: 'var(--corner-red)',   bg: 'var(--corner-red-tint)' },
  'muay-thai': { label: 'Muay Thai', family: 'Striking',   color: 'var(--corner-red)',   bg: 'var(--corner-red-tint)' },
  'wrestling': { label: 'Wrestling', family: 'Wrestling',  color: 'var(--ember-strong)',  bg: 'var(--ember-tint)' },
  'wrestler':  { label: 'Wrestler',  family: 'Wrestling',  color: 'var(--ember-strong)',  bg: 'var(--ember-tint)' },
  'judo':      { label: 'Judo',      family: 'Wrestling',  color: 'var(--ember-strong)',  bg: 'var(--ember-tint)' },
  'bjj':       { label: 'BJJ',       family: 'Submission', color: 'var(--ink-secondary)', bg: 'var(--surface-sunken)' },
  'sambo':     { label: 'Sambo',     family: 'Submission', color: 'var(--ink-secondary)', bg: 'var(--surface-sunken)' },
  'mma':       { label: 'MMA',       family: 'Hybrid',     color: 'var(--ink-secondary)', bg: 'var(--surface-sunken)' },
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
