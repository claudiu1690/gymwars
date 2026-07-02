export interface WeightClassChipProps {
  /** Weight class name — full or abbreviated accepted (e.g. "Lightweight", "lightweight", "LW") */
  weightClass: string;
  /** 'short' shows the abbreviation (LW), 'full' shows the full name */
  variant?: 'short' | 'full';
}

export declare function WeightClassChip(props: WeightClassChipProps): JSX.Element;
