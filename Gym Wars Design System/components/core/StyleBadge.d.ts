export interface StyleBadgeProps {
  /** One of the 6 fighting archetypes across 3 families */
  style: 'boxer' | 'muay-thai' | 'wrestler' | 'judo' | 'mma' | 'bjj';
  /** Whether to append the family label (e.g. "Boxer · Striker") */
  showFamily?: boolean;
}

export declare function StyleBadge(props: StyleBadgeProps): JSX.Element;
