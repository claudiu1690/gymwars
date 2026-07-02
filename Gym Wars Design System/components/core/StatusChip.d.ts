export interface StatusChipProps {
  /** Current fighter status */
  status: 'in-camp' | 'fight-ready' | 'fatigued' | 'shielded' | 'retiring';
  /** Countdown string shown for in-camp / shielded (e.g. "3d 12h") */
  countdown?: string;
  /** Display size */
  size?: 'sm' | 'md';
}

export declare function StatusChip(props: StatusChipProps): JSX.Element;
