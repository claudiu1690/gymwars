import React from 'react';

/**
 * @param {{ variant?: 'primary'|'secondary'|'ghost'|'danger'|'tint', size?: 'sm'|'md'|'lg', disabled?: boolean, icon?: React.ReactNode, onClick?: Function, children: React.ReactNode }} props
 */
export function Button({ variant = 'primary', size = 'md', disabled = false, icon, onClick, children, ...rest }) {
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
    transition: 'background var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out), transform var(--duration-instant) var(--ease-out)',
    whiteSpace: 'nowrap',
    lineHeight: 1,
    textDecoration: 'none',
    letterSpacing: '0.01em',
    pointerEvents: disabled ? 'none' : 'auto',
  };

  const sizes = {
    sm: { padding: '6px 12px', fontSize: '12px', height: '30px' },
    md: { padding: '9px 16px', fontSize: '14px', height: '38px' },
    lg: { padding: '11px 20px', fontSize: '15px', height: '46px' },
  };

  const variantMap = {
    primary: {
      background: hovered ? 'var(--ember-strong)' : 'var(--ember)',
      color: '#fff',
    },
    secondary: {
      background: hovered ? 'var(--ember-tint)' : 'transparent',
      color: 'var(--ember-strong)',
      boxShadow: 'inset 0 0 0 1.5px var(--ember)',
    },
    ghost: {
      background: hovered ? 'var(--surface-sunken)' : 'transparent',
      color: 'var(--ink-secondary)',
      boxShadow: 'inset 0 0 0 1.5px var(--line)',
    },
    danger: {
      background: hovered ? '#a82833' : 'var(--corner-red)',
      color: '#fff',
    },
    tint: {
      background: hovered ? 'rgba(255,90,41,0.22)' : 'var(--ember-tint)',
      color: 'var(--ember-strong)',
    },
  };

  return (
    <button
      className="pressable"
      style={{ ...base, ...sizes[size], ...variantMap[variant] }}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...rest}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>}
      {children}
    </button>
  );
}
