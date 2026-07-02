export interface FighterStats {
  striking: number;
  grappling: number;
  submissions: number;
  conditioning: number;
}

export interface FighterStatus {
  type: 'in-camp' | 'fight-ready' | 'fatigued' | 'shielded' | 'retiring';
  countdown?: string;
}

export interface FighterCardProps {
  /** Layout variant */
  variant?: 'compact' | 'grid' | 'detail';
  /** Fighter name — rendered ALL-CAPS in Archivo Black */
  name: string;
  /** Weight class string */
  weightClass: string;
  /** Fighting style archetype */
  style: 'boxer' | 'muay-thai' | 'wrestler' | 'judo' | 'mma' | 'bjj';
  /** Fighter age in game-years */
  age: number;
  /** Career phase affects color coding */
  careerPhase: 'Rising' | 'Prime' | 'Declining';
  /** Four core stats 0–100 */
  stats: FighterStats;
  /** Career record */
  record: { wins: number; losses: number };
  /** Rarity tier controls glow/border treatment */
  rarity: 'journeyman' | 'prospect' | 'contender' | 'elite' | 'legend';
  /** Current status strip */
  status: FighterStatus;
}

/**
 * @startingPoint section="Core" subtitle="The hero component — compact, grid, and detail variants" viewport="380x520"
 */
export declare function FighterCard(props: FighterCardProps): JSX.Element;
