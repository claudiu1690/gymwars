import React from 'react';

const CLASSES = {
  'flyweight':        { label: 'FLY',  full: 'Flyweight' },
  'bantamweight':     { label: 'BW',   full: 'Bantamweight' },
  'featherweight':    { label: 'FTH',  full: 'Featherweight' },
  'lightweight':      { label: 'LW',   full: 'Lightweight' },
  'welterweight':     { label: 'WW',   full: 'Welterweight' },
  'middleweight':     { label: 'MW',   full: 'Middleweight' },
  'light-heavyweight':{ label: 'LHW',  full: 'Light Heavyweight' },
  'heavyweight':      { label: 'HW',   full: 'Heavyweight' },
};

/**
 * @param {{ weightClass: string, variant?: 'short'|'full' }} props
 */
export function WeightClassChip({ weightClass, variant = 'short' }) {
  const key = weightClass.toLowerCase().replace(/\s+/g, '-');
  const cfg = CLASSES[key] || { label: weightClass.slice(0, 3).toUpperCase(), full: weightClass };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      background: 'var(--surface-sunken)',
      color: 'var(--ink-secondary)',
      borderRadius: 'var(--radius-chip)',
      padding: '3px 8px',
      fontFamily: 'var(--font-body)',
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
      lineHeight: 1,
      textTransform: 'uppercase',
    }}>
      {variant === 'short' ? cfg.label : cfg.full}
    </span>
  );
}
