export interface TimerBadgeProps {
  /** Human-readable countdown string e.g. "3d 12h", "45m 30s" */
  value: string;
  /** True when timer is near expiry — renders in corner-red */
  urgent?: boolean;
  /** True when timer has completed — renders in win-green with checkmark */
  complete?: boolean;
  /** Size preset */
  size?: 'sm' | 'md' | 'lg';
  /** Optional overline label above the badge */
  label?: string;
}

export declare function TimerBadge(props: TimerBadgeProps): JSX.Element;
