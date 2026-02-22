import type { DiceHistoryEntry, DiceSummary } from '../../api/enrollment';

export interface DiceRollResult {
  /** Individual dice values (e.g., ['U', '4', '5']) */
  diceValues: string[];
  /** Numeric total of all dice */
  total: number;
  /** Average score (rounded) */
  average: number;
  /** Final grade label (U, 3, 4, or 5) */
  grade: string;
}

export interface RollTheDiceProps {
  courseId: number;
  courseCode?: string;
  currentScore: number | null;
  diceSummary?: DiceSummary;
  diceHistory?: DiceHistoryEntry[];
  onRollCommitted?: () => Promise<void> | void;
}

export interface GameState {
  isRolling: boolean;
  liveValues: string[];
  averageLabel: string;
  status: 'waiting' | 'rolling' | 'complete';
}

export type GradeKey = 'U' | '3' | '4' | '5';

export const GRADE_KEYS: GradeKey[] = ['U', '3', '4', '5'];

/** Face distribution for dice - polarized for balanced risk */
export function getFaceDistributionForGrade(grade: string): Record<GradeKey, number> {
  // Polarized distribution: more high (5) and low (U) faces, fewer middle (3,4).
  // Creates balanced risk: roughly equal chance to improve or worsen,
  // with a slight bias toward losing for fairness.
  // Distribution: 2U, 1x3, 1x4, 2x5 (4 extreme faces vs 2 middle faces)
  switch (grade) {
    case 'U':
      return { U: 2, '3': 1, '4': 1, '5': 2 };
    case '3':
      return { U: 2, '3': 1, '4': 1, '5': 2 };
    case '4':
      return { U: 2, '3': 1, '4': 1, '5': 2 };
    case '5':
      return { U: 2, '3': 1, '4': 1, '5': 2 };
    default:
      return { U: 2, '3': 1, '4': 1, '5': 2 };
  }
}

export function scoreValue(label: string): number {
  return label === 'U' ? 2 : Number(label);
}

export function scoreToGrade(score: number): string {
  if (score <= 2) return 'U';
  if (score >= 5) return '5';
  return String(score);
}
