import React from 'react';

/**
 * @param {{ region: string, styleLean: string, rarityRevealed?: boolean, rarityTier?: string, statRanges: { striking: [number,number], grappling: [number,number], submissions: [number,number], conditioning: [number,number] }, pityCount: number, pityMax: number, guaranteedTier?: string, onSign?: Function, onPass?: Function }} props
 */
export function ScoutReport({ region, styleLean, rarityRevealed = false, rarityTier = 'prospect', statRanges, pityCount = 0, pityMax = 7, guaranteedTier = 'Contender+', onSign, onPass }) {
  const rarityColors = {
    journeyman: '#8B8E94', prospect: '#3E8E5A', contender: '#2563EB', elite: '#7C3AED', legend: '#D4A017',
  };
  const rarityGlows = {
    journeyman: '0 0 0 2px #8B8E94',
    prospect:   '0 0 0 2px #3E8E5A, 0 0 10px rgba(62,142,90,0.25)',
    contender:  '0 0 0 2px #2563EB, 0 0 12px rgba(37,99,235,0.30)',
    elite:      '0 0 0 2px #7C3AED, 0 0 14px rgba(124,58,237,0.35)',
    legend:     '0 0 0 2px #D4A017, 0 0 18px rgba(212,160,23,0.45)',
  };

  const pityPercent = Math.min(100, (pityCount / pityMax) * 100);
  const remaining = pityMax - pityCount;

  // Reveal ceremony — bars sweep in after the card pops (double rAF so the
  // zero-width frame paints first and the change transitions).
  const [grown, setGrown] = React.useState(false);
  React.useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="anim-pop" style={{
      background: 'var(--surface)', borderRadius: 'var(--radius-card)',
      boxShadow: rarityRevealed ? rarityGlows[rarityTier] : 'var(--shadow-sm)',
      padding: '16px', display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Scout Report</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginTop: 2 }}>
            {region} · <span style={{ color: 'var(--ink-secondary)' }}>{styleLean} lean</span>
          </div>
        </div>
        {rarityRevealed ? (
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
            color: rarityColors[rarityTier] || '#888',
            background: 'transparent', padding: '3px 8px',
            border: `1.5px solid ${rarityColors[rarityTier] || '#888'}`,
            borderRadius: 'var(--radius-chip)', textTransform: 'capitalize', letterSpacing: '0.03em',
          }}>
            {rarityTier.charAt(0).toUpperCase() + rarityTier.slice(1)}
          </span>
        ) : (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--ink-muted)', background: 'var(--surface-sunken)', padding: '3px 8px', borderRadius: 'var(--radius-chip)' }}>
            ? Rarity
          </span>
        )}
      </div>

      {/* Noisy stat ranges */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
        {Object.entries(statRanges).map(([stat, [lo, hi]]) => (
          <div key={stat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', width: 90, flexShrink: 0 }}>{stat}</span>
            <div style={{ flex: 1, height: 4, background: 'var(--line)', borderRadius: 'var(--radius-full)', position: 'relative' }}>
              <div style={{
                position: 'absolute', left: `${lo}%`, width: grown ? `${hi - lo}%` : 0,
                height: '100%', background: 'var(--ink-muted)', borderRadius: 'var(--radius-full)', opacity: 0.5,
                transition: 'width var(--duration-xslow) var(--ease-out) 150ms',
              }} />
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-secondary)', width: 52, textAlign: 'right', flexShrink: 0 }}>{lo}–{hi}</span>
          </div>
        ))}
      </div>

      {/* Pity progress */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--ink-muted)' }}>
            Guaranteed {guaranteedTier} within <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{remaining}</strong> scout{remaining !== 1 ? 's' : ''}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-muted)' }}>{pityCount}/{pityMax}</span>
        </div>
        <div style={{ height: 5, background: 'var(--surface-sunken)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
          <div style={{ width: `${grown ? pityPercent : 0}%`, height: '100%', background: 'var(--ember)', borderRadius: 'var(--radius-full)', transition: 'width var(--duration-xslow) var(--ease-out) 250ms' }} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onSign} className="pressable" style={{
          flex: 1, padding: '9px', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
          background: 'var(--ember)', color: '#fff', border: 'none', borderRadius: 'var(--radius-button)', cursor: 'pointer',
        }}>Sign</button>
        <button onClick={onPass} className="pressable" style={{
          flex: 1, padding: '9px', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
          background: 'transparent', color: 'var(--ink-secondary)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-button)', cursor: 'pointer',
        }}>Pass</button>
      </div>
    </div>
  );
}
