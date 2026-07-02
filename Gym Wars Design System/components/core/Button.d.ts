export interface ButtonProps {
  /** Visual style of the button */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'tint';
  /** Size preset */
  size?: 'sm' | 'md' | 'lg';
  /** Disables interaction and dims the button */
  disabled?: boolean;
  /** Optional leading icon node */
  icon?: React.ReactNode;
  /** Click handler */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}

/**
 * @startingPoint section="Core" subtitle="Primary, secondary, ghost, danger — sm/md/lg" viewport="600x200"
 */
export declare function Button(props: ButtonProps): JSX.Element;
