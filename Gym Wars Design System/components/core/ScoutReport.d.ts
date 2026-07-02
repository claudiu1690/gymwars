export interface StatRanges {
  striking: [number, number];
  grappling: [number, number];
  submissions: [number, number];
  conditioning: [number, number];
}

export interface ScoutReportProps {
  /** Region the fighter was scouted from */
  region: string;
  /** Fighting style lean — may differ from actual style */
  styleLean: string;
  /** Whether rarity has been revealed yet (after timer) */
  rarityRevealed?: boolean;
  /** Rarity tier shown only when rarityRevealed is true */
  rarityTier?: 'journeyman' | 'prospect' | 'contender' | 'elite' | 'legend';
  /** Noisy stat ranges — not exact values */
  statRanges: StatRanges;
  /** Current pity counter (scouts since last Contender+) */
  pityCount: number;
  /** Max pity before guaranteed */
  pityMax: number;
  /** Guaranteed tier label shown in pity progress (compliance requirement) */
  guaranteedTier?: string;
  onSign?: () => void;
  onPass?: () => void;
}

export declare function ScoutReport(props: ScoutReportProps): JSX.Element;
