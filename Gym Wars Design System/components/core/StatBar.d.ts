export interface StatBarProps {
  /** Stat label (e.g. "Striking", "Grappling") */
  label: string;
  /** 0–100 integer value */
  value: number;
  /** Display size — sm for use inside compact FighterCard */
  size?: 'sm' | 'md';
  /** Whether to show the text label on the left */
  showLabel?: boolean;
}

export declare function StatBar(props: StatBarProps): JSX.Element;
