/* @ds-bundle: {"format":3,"namespace":"GymWarsDesignSystem_35c3be","components":[{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"FighterCard","sourcePath":"components/core/FighterCard.jsx"},{"name":"ScoutReport","sourcePath":"components/core/ScoutReport.jsx"},{"name":"StatBar","sourcePath":"components/core/StatBar.jsx"},{"name":"StatusChip","sourcePath":"components/core/StatusChip.jsx"},{"name":"StyleBadge","sourcePath":"components/core/StyleBadge.jsx"},{"name":"TimerBadge","sourcePath":"components/core/TimerBadge.jsx"},{"name":"WeightClassChip","sourcePath":"components/core/WeightClassChip.jsx"}],"sourceHashes":{"components/core/Button.jsx":"e22d80dcb302","components/core/FighterCard.jsx":"784640a518ee","components/core/ScoutReport.jsx":"edff8579cc0e","components/core/StatBar.jsx":"8f5d19f17a60","components/core/StatusChip.jsx":"341f2732f2e5","components/core/StyleBadge.jsx":"4f1995828876","components/core/TimerBadge.jsx":"9799eb1d7b69","components/core/WeightClassChip.jsx":"5feb65b4df84"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.GymWarsDesignSystem_35c3be = window.GymWarsDesignSystem_35c3be || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * @param {{ variant?: 'primary'|'secondary'|'ghost'|'danger'|'tint', size?: 'sm'|'md'|'lg', disabled?: boolean, icon?: React.ReactNode, onClick?: Function, children: React.ReactNode }} props
 */
function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon,
  onClick,
  children,
  ...rest
}) {
  const [hovered, setHovered] = React.useState(false);
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    border: 'none',
    borderRadius: 'var(--radius-button)',
    transition: 'background var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)',
    whiteSpace: 'nowrap',
    lineHeight: 1,
    textDecoration: 'none',
    letterSpacing: '0.01em',
    pointerEvents: disabled ? 'none' : 'auto'
  };
  const sizes = {
    sm: {
      padding: '6px 12px',
      fontSize: '12px',
      height: '30px'
    },
    md: {
      padding: '9px 16px',
      fontSize: '14px',
      height: '38px'
    },
    lg: {
      padding: '11px 20px',
      fontSize: '15px',
      height: '46px'
    }
  };
  const variantMap = {
    primary: {
      background: hovered ? 'var(--ember-strong)' : 'var(--ember)',
      color: '#fff'
    },
    secondary: {
      background: hovered ? 'var(--ember-tint)' : 'transparent',
      color: 'var(--ember-strong)',
      boxShadow: 'inset 0 0 0 1.5px var(--ember)'
    },
    ghost: {
      background: hovered ? 'var(--surface-sunken)' : 'transparent',
      color: 'var(--ink-secondary)',
      boxShadow: 'inset 0 0 0 1.5px var(--line)'
    },
    danger: {
      background: hovered ? '#a82833' : 'var(--corner-red)',
      color: '#fff'
    },
    tint: {
      background: hovered ? 'rgba(255,90,41,0.22)' : 'var(--ember-tint)',
      color: 'var(--ember-strong)'
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    style: {
      ...base,
      ...sizes[size],
      ...variantMap[variant]
    },
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false)
  }, rest), icon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      flexShrink: 0
    }
  }, icon), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/ScoutReport.jsx
try { (() => {
/**
 * @param {{ region: string, styleLean: string, rarityRevealed?: boolean, rarityTier?: string, statRanges: { striking: [number,number], grappling: [number,number], submissions: [number,number], conditioning: [number,number] }, pityCount: number, pityMax: number, guaranteedTier?: string, onSign?: Function, onPass?: Function }} props
 */
function ScoutReport({
  region,
  styleLean,
  rarityRevealed = false,
  rarityTier = 'prospect',
  statRanges,
  pityCount = 0,
  pityMax = 7,
  guaranteedTier = 'Contender+',
  onSign,
  onPass
}) {
  const rarityColors = {
    journeyman: '#8B8E94',
    prospect: '#3E8E5A',
    contender: '#2563EB',
    elite: '#7C3AED',
    legend: '#D4A017'
  };
  const rarityGlows = {
    journeyman: '0 0 0 2px #8B8E94',
    prospect: '0 0 0 2px #3E8E5A, 0 0 10px rgba(62,142,90,0.25)',
    contender: '0 0 0 2px #2563EB, 0 0 12px rgba(37,99,235,0.30)',
    elite: '0 0 0 2px #7C3AED, 0 0 14px rgba(124,58,237,0.35)',
    legend: '0 0 0 2px #D4A017, 0 0 18px rgba(212,160,23,0.45)'
  };
  const pityPercent = Math.min(100, pityCount / pityMax * 100);
  const remaining = pityMax - pityCount;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface)',
      borderRadius: 'var(--radius-card)',
      boxShadow: rarityRevealed ? rarityGlows[rarityTier] : 'var(--shadow-sm)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: '10px',
      fontWeight: 600,
      color: 'var(--ink-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em'
    }
  }, "Scout Report"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: '13px',
      fontWeight: 500,
      color: 'var(--ink)',
      marginTop: 2
    }
  }, region, " \xB7 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-secondary)'
    }
  }, styleLean, " lean"))), rarityRevealed ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: '12px',
      fontWeight: 700,
      color: rarityColors[rarityTier] || '#888',
      background: 'transparent',
      padding: '3px 8px',
      border: `1.5px solid ${rarityColors[rarityTier] || '#888'}`,
      borderRadius: 'var(--radius-chip)',
      textTransform: 'capitalize',
      letterSpacing: '0.03em'
    }
  }, rarityTier.charAt(0).toUpperCase() + rarityTier.slice(1)) : /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: '12px',
      fontWeight: 600,
      color: 'var(--ink-muted)',
      background: 'var(--surface-sunken)',
      padding: '3px 8px',
      borderRadius: 'var(--radius-chip)'
    }
  }, "? Rarity")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      background: 'var(--surface-sunken)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 12px'
    }
  }, Object.entries(statRanges).map(([stat, [lo, hi]]) => /*#__PURE__*/React.createElement("div", {
    key: stat,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: '11px',
      color: 'var(--ink-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      width: 72,
      flexShrink: 0
    }
  }, stat), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 4,
      background: 'var(--line)',
      borderRadius: 'var(--radius-full)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: `${lo}%`,
      width: `${hi - lo}%`,
      height: '100%',
      background: 'var(--ink-muted)',
      borderRadius: 'var(--radius-full)',
      opacity: 0.5
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      color: 'var(--ink-secondary)',
      width: 52,
      textAlign: 'right',
      flexShrink: 0
    }
  }, lo, "\u2013", hi)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: '11px',
      color: 'var(--ink-muted)'
    }
  }, "Guaranteed ", guaranteedTier, " within ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--ink)',
      fontFamily: 'var(--font-mono)'
    }
  }, remaining), " scout", remaining !== 1 ? 's' : ''), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      color: 'var(--ink-muted)'
    }
  }, pityCount, "/", pityMax)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 5,
      background: 'var(--surface-sunken)',
      borderRadius: 'var(--radius-full)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${pityPercent}%`,
      height: '100%',
      background: 'var(--ember)',
      borderRadius: 'var(--radius-full)',
      transition: 'width 400ms var(--ease-out)'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onSign,
    style: {
      flex: 1,
      padding: '9px',
      fontFamily: 'var(--font-body)',
      fontSize: '13px',
      fontWeight: 600,
      background: 'var(--ember)',
      color: '#fff',
      border: 'none',
      borderRadius: 'var(--radius-button)',
      cursor: 'pointer'
    }
  }, "Sign"), /*#__PURE__*/React.createElement("button", {
    onClick: onPass,
    style: {
      flex: 1,
      padding: '9px',
      fontFamily: 'var(--font-body)',
      fontSize: '13px',
      fontWeight: 600,
      background: 'transparent',
      color: 'var(--ink-secondary)',
      border: '1.5px solid var(--line)',
      borderRadius: 'var(--radius-button)',
      cursor: 'pointer'
    }
  }, "Pass")));
}
Object.assign(__ds_scope, { ScoutReport });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/ScoutReport.jsx", error: String((e && e.message) || e) }); }

// components/core/StatBar.jsx
try { (() => {
/**
 * @param {{ label: string, value: number, size?: 'sm'|'md', showLabel?: boolean }} props
 */
function StatBar({
  label,
  value,
  size = 'md',
  showLabel = true
}) {
  const isSmall = size === 'sm';
  const clamp = Math.max(0, Math.min(100, value));
  const colorMap = {
    high: 'var(--ember)',
    medium: 'var(--ink-secondary)',
    low: 'var(--warn)'
  };
  const barColor = clamp >= 60 ? colorMap.high : clamp >= 35 ? colorMap.medium : colorMap.low;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: isSmall ? 5 : 7
    }
  }, showLabel && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: isSmall ? '10px' : '11px',
      color: 'var(--ink-muted)',
      width: isSmall ? 52 : 68,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      flexShrink: 0,
      lineHeight: 1
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: isSmall ? 4 : 5,
      background: 'var(--surface-sunken)',
      borderRadius: 'var(--radius-full)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${clamp}%`,
      height: '100%',
      background: barColor,
      borderRadius: 'var(--radius-full)',
      transition: 'width 400ms var(--ease-out)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: isSmall ? '11px' : '12px',
      fontWeight: 500,
      color: 'var(--ink)',
      width: 24,
      textAlign: 'right',
      flexShrink: 0,
      lineHeight: 1
    }
  }, clamp));
}
Object.assign(__ds_scope, { StatBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/StatBar.jsx", error: String((e && e.message) || e) }); }

// components/core/StatusChip.jsx
try { (() => {
/**
 * @param {{ status: 'in-camp'|'fight-ready'|'fatigued'|'shielded'|'retiring', countdown?: string, size?: 'sm'|'md' }} props
 */
function StatusChip({
  status,
  countdown,
  size = 'md'
}) {
  const isSmall = size === 'sm';
  const config = {
    'in-camp': {
      label: countdown ? `In Camp ${countdown}` : 'In Camp',
      bg: 'var(--ember-tint)',
      color: 'var(--ember-strong)',
      dot: 'var(--ember)'
    },
    'fight-ready': {
      label: 'Fight Ready',
      bg: 'var(--win-tint)',
      color: 'var(--win)',
      dot: 'var(--win)'
    },
    'fatigued': {
      label: 'Fatigued',
      bg: 'var(--warn-tint)',
      color: 'var(--warn)',
      dot: 'var(--warn)'
    },
    'shielded': {
      label: countdown ? `Shielded ${countdown}` : 'Shielded',
      bg: 'var(--surface-sunken)',
      color: 'var(--ink-secondary)',
      dot: 'var(--ink-muted)'
    },
    'retiring': {
      label: 'Retiring',
      bg: 'var(--surface-sunken)',
      color: 'var(--ink-muted)',
      dot: 'var(--ink-muted)'
    }
  };
  const c = config[status] || config['fight-ready'];
  return /*#__PURE__*/React.createElement("div", {
    style: {
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
      lineHeight: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: isSmall ? 5 : 6,
      height: isSmall ? 5 : 6,
      borderRadius: '50%',
      background: c.dot,
      flexShrink: 0
    }
  }), c.label);
}
Object.assign(__ds_scope, { StatusChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/StatusChip.jsx", error: String((e && e.message) || e) }); }

// components/core/StyleBadge.jsx
try { (() => {
const STYLES = {
  'boxer': {
    label: 'Boxer',
    family: 'Striker',
    color: 'var(--corner-red)',
    bg: 'var(--corner-red-tint)'
  },
  'muay-thai': {
    label: 'Muay Thai',
    family: 'Striker',
    color: 'var(--corner-red)',
    bg: 'var(--corner-red-tint)'
  },
  'wrestler': {
    label: 'Wrestler',
    family: 'Grappler',
    color: 'var(--ember-strong)',
    bg: 'var(--ember-tint)'
  },
  'judo': {
    label: 'Judo',
    family: 'Grappler',
    color: 'var(--ember-strong)',
    bg: 'var(--ember-tint)'
  },
  'mma': {
    label: 'MMA',
    family: 'Hybrid',
    color: 'var(--ink-secondary)',
    bg: 'var(--surface-sunken)'
  },
  'bjj': {
    label: 'BJJ',
    family: 'Hybrid',
    color: 'var(--ink-secondary)',
    bg: 'var(--surface-sunken)'
  }
};

/**
 * @param {{ style: 'boxer'|'muay-thai'|'wrestler'|'judo'|'mma'|'bjj', showFamily?: boolean }} props
 */
function StyleBadge({
  style,
  showFamily = false
}) {
  const key = (style || '').toLowerCase().replace(/\s+/g, '-');
  const cfg = STYLES[key] || {
    label: style,
    family: '',
    color: 'var(--ink-secondary)',
    bg: 'var(--surface-sunken)'
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
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
      lineHeight: 1
    }
  }, cfg.label, showFamily && /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: 0.6,
      fontWeight: 400
    }
  }, "\xB7 ", cfg.family));
}
Object.assign(__ds_scope, { StyleBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/StyleBadge.jsx", error: String((e && e.message) || e) }); }

// components/core/TimerBadge.jsx
try { (() => {
/**
 * @param {{ value: string, urgent?: boolean, complete?: boolean, size?: 'sm'|'md'|'lg', label?: string }} props
 */
function TimerBadge({
  value,
  urgent = false,
  complete = false,
  size = 'md',
  label
}) {
  const color = complete ? 'var(--win)' : urgent ? 'var(--corner-red)' : 'var(--ember)';
  const bg = complete ? 'var(--win-tint)' : urgent ? 'var(--corner-red-tint)' : 'var(--ember-tint)';
  const sizes = {
    sm: {
      fontSize: '11px',
      padding: '3px 8px'
    },
    md: {
      fontSize: '13px',
      padding: '4px 10px'
    },
    lg: {
      fontSize: '16px',
      padding: '6px 14px'
    }
  };
  const s = sizes[size] || sizes.md;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 2
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: '10px',
      fontWeight: 500,
      color: 'var(--ink-muted)',
      letterSpacing: '0.06em',
      textTransform: 'uppercase'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
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
      ...s
    }
  }, complete ? '✓ ' : '', value));
}
Object.assign(__ds_scope, { TimerBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/TimerBadge.jsx", error: String((e && e.message) || e) }); }

// components/core/WeightClassChip.jsx
try { (() => {
const CLASSES = {
  'flyweight': {
    label: 'FLY',
    full: 'Flyweight'
  },
  'bantamweight': {
    label: 'BW',
    full: 'Bantamweight'
  },
  'featherweight': {
    label: 'FTH',
    full: 'Featherweight'
  },
  'lightweight': {
    label: 'LW',
    full: 'Lightweight'
  },
  'welterweight': {
    label: 'WW',
    full: 'Welterweight'
  },
  'middleweight': {
    label: 'MW',
    full: 'Middleweight'
  },
  'light-heavyweight': {
    label: 'LHW',
    full: 'Light Heavyweight'
  },
  'heavyweight': {
    label: 'HW',
    full: 'Heavyweight'
  }
};

/**
 * @param {{ weightClass: string, variant?: 'short'|'full' }} props
 */
function WeightClassChip({
  weightClass,
  variant = 'short'
}) {
  const key = weightClass.toLowerCase().replace(/\s+/g, '-');
  const cfg = CLASSES[key] || {
    label: weightClass.slice(0, 3).toUpperCase(),
    full: weightClass
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
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
      textTransform: 'uppercase'
    }
  }, variant === 'short' ? cfg.label : cfg.full);
}
Object.assign(__ds_scope, { WeightClassChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/WeightClassChip.jsx", error: String((e && e.message) || e) }); }

// components/core/FighterCard.jsx
try { (() => {
const RARITY_GLOWS = {
  journeyman: '0 0 0 2px #8B8E94',
  prospect: '0 0 0 2px #3E8E5A, 0 0 10px rgba(62,142,90,0.25)',
  contender: '0 0 0 2px #2563EB, 0 0 12px rgba(37,99,235,0.30)',
  elite: '0 0 0 2px #7C3AED, 0 0 14px rgba(124,58,237,0.35)',
  legend: '0 0 0 2px #D4A017, 0 0 18px rgba(212,160,23,0.45)'
};
const RARITY_COLORS = {
  journeyman: '#8B8E94',
  prospect: '#3E8E5A',
  contender: '#2563EB',
  elite: '#7C3AED',
  legend: '#D4A017'
};
const PHASE_COLORS = {
  Rising: {
    color: 'var(--win)',
    bg: 'var(--win-tint)'
  },
  Prime: {
    color: 'var(--ember-strong)',
    bg: 'var(--ember-tint)'
  },
  Declining: {
    color: 'var(--warn)',
    bg: 'var(--warn-tint)'
  }
};
function Portrait({
  rarity = 'journeyman',
  size = 56
}) {
  const color = RARITY_COLORS[rarity] || RARITY_COLORS.journeyman;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'var(--surface-sunken)',
      boxShadow: RARITY_GLOWS[rarity] || RARITY_GLOWS.journeyman,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: size * 0.52,
    height: size * 0.52,
    viewBox: "0 0 24 24",
    fill: "none"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "8.5",
    r: "3.5",
    fill: color,
    opacity: "0.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8",
    stroke: color,
    strokeWidth: "1.5",
    strokeLinecap: "round",
    opacity: "0.5"
  })));
}

/** Compact list row */
function CompactCard({
  name,
  weightClass,
  style,
  stats,
  record,
  rarity,
  status,
  careerPhase
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: 'var(--surface)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 12px',
      boxShadow: RARITY_GLOWS[rarity] || RARITY_GLOWS.journeyman
    }
  }, /*#__PURE__*/React.createElement(Portrait, {
    rarity: rarity,
    size: 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: '14px',
      color: 'var(--ink)',
      letterSpacing: '0.03em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginTop: 3,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.WeightClassChip, {
    weightClass: weightClass
  }), /*#__PURE__*/React.createElement(__ds_scope.StyleBadge, {
    style: style
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '13px',
      fontWeight: 500,
      color: 'var(--ink)',
      whiteSpace: 'nowrap',
      flexShrink: 0
    }
  }, record.wins, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-muted)'
    }
  }, "\u2013"), record.losses), /*#__PURE__*/React.createElement(__ds_scope.StatusChip, {
    status: status.type,
    countdown: status.countdown,
    size: "sm"
  }));
}

/** Grid card */
function GridCard({
  name,
  weightClass,
  style,
  age,
  careerPhase,
  stats,
  record,
  rarity,
  status
}) {
  const phase = PHASE_COLORS[careerPhase] || PHASE_COLORS.Prime;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface)',
      borderRadius: 'var(--radius-card)',
      boxShadow: RARITY_GLOWS[rarity] || RARITY_GLOWS.journeyman,
      padding: '14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement(Portrait, {
    rarity: rarity,
    size: 56
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: '16px',
      color: 'var(--ink)',
      letterSpacing: '0.03em',
      textTransform: 'uppercase',
      lineHeight: 1.1
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginTop: 5,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.WeightClassChip, {
    weightClass: weightClass
  }), /*#__PURE__*/React.createElement(__ds_scope.StyleBadge, {
    style: style
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      marginTop: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: '11px',
      color: 'var(--ink-muted)'
    }
  }, "Age ", age), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '10px',
      color: 'var(--ink-muted)'
    }
  }, "\xB7"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: '11px',
      fontWeight: 600,
      color: phase.color
    }
  }, careerPhase)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 5,
      padding: '8px 0',
      borderTop: '1px solid var(--line)',
      borderBottom: '1px solid var(--line)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.StatBar, {
    label: "Striking",
    value: stats.striking,
    size: "sm"
  }), /*#__PURE__*/React.createElement(__ds_scope.StatBar, {
    label: "Grappling",
    value: stats.grappling,
    size: "sm"
  }), /*#__PURE__*/React.createElement(__ds_scope.StatBar, {
    label: "Subs",
    value: stats.submissions,
    size: "sm"
  }), /*#__PURE__*/React.createElement(__ds_scope.StatBar, {
    label: "Condition",
    value: stats.conditioning,
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '13px',
      fontWeight: 500,
      color: 'var(--ink)'
    }
  }, record.wins, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--win)',
      fontWeight: 600
    }
  }, "W"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-muted)',
      margin: '0 2px'
    }
  }, "\u2013"), record.losses, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--corner-red)',
      fontWeight: 600
    }
  }, "L")), /*#__PURE__*/React.createElement(__ds_scope.StatusChip, {
    status: status.type,
    countdown: status.countdown,
    size: "sm"
  })));
}

/** Detail header */
function DetailCard({
  name,
  weightClass,
  style,
  age,
  careerPhase,
  stats,
  record,
  rarity,
  status
}) {
  const phase = PHASE_COLORS[careerPhase] || PHASE_COLORS.Prime;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface)',
      borderRadius: 'var(--radius-card)',
      boxShadow: RARITY_GLOWS[rarity] || RARITY_GLOWS.journeyman,
      padding: '20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement(Portrait, {
    rarity: rarity,
    size: 80
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: '28px',
      color: 'var(--ink)',
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
      lineHeight: 1
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginTop: 8,
      flexWrap: 'wrap',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.WeightClassChip, {
    weightClass: weightClass,
    variant: "full"
  }), /*#__PURE__*/React.createElement(__ds_scope.StyleBadge, {
    style: style,
    showFamily: true
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: '12px',
      color: 'var(--ink-muted)'
    }
  }, "Age ", age), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: '12px',
      fontWeight: 600,
      color: phase.color,
      background: phase.bg,
      borderRadius: 'var(--radius-chip)',
      padding: '2px 7px'
    }
  }, careerPhase)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: '10px',
      color: 'var(--ink-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      marginBottom: 2
    }
  }, "Record"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '20px',
      fontWeight: 600,
      color: 'var(--ink)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--win)'
    }
  }, record.wins, "W"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-muted)',
      margin: '0 3px',
      fontSize: '16px'
    }
  }, "\u2013"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--corner-red)'
    }
  }, record.losses, "L"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.StatusChip, {
    status: status.type,
    countdown: status.countdown
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 7,
      marginTop: 16,
      padding: '14px 0',
      borderTop: '1px solid var(--line)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.StatBar, {
    label: "Striking",
    value: stats.striking
  }), /*#__PURE__*/React.createElement(__ds_scope.StatBar, {
    label: "Grappling",
    value: stats.grappling
  }), /*#__PURE__*/React.createElement(__ds_scope.StatBar, {
    label: "Submissions",
    value: stats.submissions
  }), /*#__PURE__*/React.createElement(__ds_scope.StatBar, {
    label: "Conditioning",
    value: stats.conditioning
  })));
}

/**
 * @param {{ variant?: 'compact'|'grid'|'detail', name: string, weightClass: string, style: string, age: number, careerPhase: 'Rising'|'Prime'|'Declining', stats: { striking: number, grappling: number, submissions: number, conditioning: number }, record: { wins: number, losses: number }, rarity: 'journeyman'|'prospect'|'contender'|'elite'|'legend', status: { type: string, countdown?: string } }} props
 */
function FighterCard({
  variant = 'grid',
  ...props
}) {
  if (variant === 'compact') return /*#__PURE__*/React.createElement(CompactCard, props);
  if (variant === 'detail') return /*#__PURE__*/React.createElement(DetailCard, props);
  return /*#__PURE__*/React.createElement(GridCard, props);
}
Object.assign(__ds_scope, { FighterCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/FighterCard.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.FighterCard = __ds_scope.FighterCard;

__ds_ns.ScoutReport = __ds_scope.ScoutReport;

__ds_ns.StatBar = __ds_scope.StatBar;

__ds_ns.StatusChip = __ds_scope.StatusChip;

__ds_ns.StyleBadge = __ds_scope.StyleBadge;

__ds_ns.TimerBadge = __ds_scope.TimerBadge;

__ds_ns.WeightClassChip = __ds_scope.WeightClassChip;

})();
