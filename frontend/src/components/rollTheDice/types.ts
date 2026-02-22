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

/** Face distribution for dice based on current grade - favors improvement */
export function getFaceDistributionForGrade(grade: string): Record<GradeKey, number> {
  switch (grade) {
    case 'U':
      // From U, higher chance to improve (3,4,5 faces dominate)
      return { U: 1, '3': 2, '4': 2, '5': 1 };
    case '3':
      // From 3, moderate improvement chance
      return { U: 1, '3': 1, '4': 2, '5': 2 };
    case '4':
      // From 4, slight improvement chance
      return { U: 1, '3': 1, '4': 1, '5': 3 };
    case '5':
      // Already max, keep it good
      return { U: 0, '3': 1, '4': 2, '5': 3 };
    default:
      // Default balanced distribution
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
