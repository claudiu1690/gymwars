import React from 'react';
import { StatBar } from './StatBar.jsx';
import { StatusChip } from './StatusChip.jsx';
import { WeightClassChip } from './WeightClassChip.jsx';
import { StyleBadge } from './StyleBadge.jsx';

const RARITY_GLOWS = {
  journeyman: '0 0 0 2px #8B8E94',
  prospect:   '0 0 0 2px #3E8E5A, 0 0 10px rgba(62,142,90,0.25)',
  contender:  '0 0 0 2px #2563EB, 0 0 12px rgba(37,99,235,0.30)',
  elite:      '0 0 0 2px #7C3AED, 0 0 14px rgba(124,58,237,0.35)',
  legend:     '0 0 0 2px #D4A017, 0 0 18px rgba(212,160,23,0.45)',
};

const RARITY_COLORS = {
  journeyman: '#8B8E94',
  prospect:   '#3E8E5A',
  contender:  '#2563EB',
  elite:      '#7C3AED',
  legend:     '#D4A017',
};

const PHASE_COLORS = {
  Rising:    { color: 'var(--win)',   bg: 'var(--win-tint)' },
  Prime:     { color: 'var(--ember-strong)', bg: 'var(--ember-tint)' },
  Declining: { color: 'var(--warn)',  bg: 'var(--warn-tint)' },
};

function Portrait({ rarity = 'journeyman', size = 56 }) {
  const color = RARITY_COLORS[rarity] || RARITY_COLORS.journeyman;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--surface-sunken)',
      boxShadow: RARITY_GLOWS[rarity] || RARITY_GLOWS.journeyman,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8.5" r="3.5" fill={color} opacity="0.5" />
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      </svg>
    </div>
  );
}

/** Compact list row */
function CompactCard({ name, weightClass, style, stats, record, rarity, status, careerPhase }) {
  return (
    <div className={rarity === 'legend' ? 'card-lift glow-legend' : 'card-lift'} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--surface)', borderRadius: 'var(--radius-md)',
      padding: '10px 12px', boxShadow: RARITY_GLOWS[rarity] || RARITY_GLOWS.journeyman,
    }}>
      <Portrait rarity={rarity} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--ink)', letterSpacing: '0.03em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
          <WeightClassChip weightClass={weightClass} />
          <StyleBadge style={style} />
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {record.wins}<span style={{ color: 'var(--ink-muted)' }}>–</span>{record.losses}
      </div>
      <StatusChip status={status.type} countdown={status.countdown} size="sm" />
    </div>
  );
}

/** Grid card */
function GridCard({ name, weightClass, style, age, careerPhase, stats, record, rarity, status }) {
  const phase = PHASE_COLORS[careerPhase] || PHASE_COLORS.Prime;
  return (
    <div className={rarity === 'legend' ? 'card-lift glow-legend' : 'card-lift'} style={{
      background: 'var(--surface)', borderRadius: 'var(--radius-card)',
      boxShadow: RARITY_GLOWS[rarity] || RARITY_GLOWS.journeyman,
      padding: '14px', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Portrait rarity={rarity} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--ink)', letterSpacing: '0.03em', textTransform: 'uppercase', lineHeight: 1.1 }}>
            {name}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
            <WeightClassChip weightClass={weightClass} />
            <StyleBadge style={style} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--ink-muted)' }}>Age {age}</span>
            <span style={{ fontSize: '10px', color: 'var(--ink-muted)' }}>·</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 600, color: phase.color }}>{careerPhase}</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '8px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <StatBar label="Striking"    value={stats.striking}    size="sm" />
        <StatBar label="Grappling"   value={stats.grappling}   size="sm" />
        <StatBar label="Subs"        value={stats.submissions} size="sm" />
        <StatBar label="Condition"   value={stats.conditioning} size="sm" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>
          {record.wins}<span style={{ color: 'var(--win)', fontWeight: 600 }}>W</span>
          <span style={{ color: 'var(--ink-muted)', margin: '0 2px' }}>–</span>
          {record.losses}<span style={{ color: 'var(--corner-red)', fontWeight: 600 }}>L</span>
        </span>
        <StatusChip status={status.type} countdown={status.countdown} size="sm" />
      </div>
    </div>
  );
}

/** Detail header */
function DetailCard({ name, weightClass, style, age, careerPhase, stats, record, rarity, status }) {
  const phase = PHASE_COLORS[careerPhase] || PHASE_COLORS.Prime;
  return (
    <div className={rarity === 'legend' ? 'glow-legend' : undefined} style={{
      background: 'var(--surface)', borderRadius: 'var(--radius-card)',
      boxShadow: RARITY_GLOWS[rarity] || RARITY_GLOWS.journeyman,
      padding: '20px',
    }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <Portrait rarity={rarity} size={80} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--ink)', letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1 }}>
            {name}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <WeightClassChip weightClass={weightClass} variant="full" />
            <StyleBadge style={style} showFamily />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink-muted)' }}>Age {age}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: phase.color, background: phase.bg, borderRadius: 'var(--radius-chip)', padding: '2px 7px' }}>{careerPhase}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Record</div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 600, color: 'var(--ink)' }}>
                <span style={{ color: 'var(--win)' }}>{record.wins}W</span>
                <span style={{ color: 'var(--ink-muted)', margin: '0 3px', fontSize: '16px' }}>–</span>
                <span style={{ color: 'var(--corner-red)' }}>{record.losses}L</span>
              </span>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <StatusChip status={status.type} countdown={status.countdown} />
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 16, padding: '14px 0', borderTop: '1px solid var(--line)' }}>
        <StatBar label="Striking"    value={stats.striking}     />
        <StatBar label="Grappling"   value={stats.grappling}    />
        <StatBar label="Submissions" value={stats.submissions}  />
        <StatBar label="Conditioning" value={stats.conditioning} />
      </div>
    </div>
  );
}

/**
 * @param {{ variant?: 'compact'|'grid'|'detail', name: string, weightClass: string, style: string, age: number, careerPhase: 'Rising'|'Prime'|'Declining', stats: { striking: number, grappling: number, submissions: number, conditioning: number }, record: { wins: number, losses: number }, rarity: 'journeyman'|'prospect'|'contender'|'elite'|'legend', status: { type: string, countdown?: string } }} props
 */
export function FighterCard({ variant = 'grid', ...props }) {
  if (variant === 'compact') return <CompactCard {...props} />;
  if (variant === 'detail')  return <DetailCard  {...props} />;
  return <GridCard {...props} />;
}
