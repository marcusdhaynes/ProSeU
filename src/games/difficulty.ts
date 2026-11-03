import type { MasteryLevel } from '@/games/types';

export interface Difficulty {
  /** Milliseconds between falling-block steps. */
  dropMs: number;
  /** Multiplier on drifting targets. */
  rockSpeed: number;
  lives: number;
  /** Wrong options added beside a correct one, when the item does not list its own. */
  distractorCap: number;
  timeLimitSec: number;
  hearts: number;
}

const TABLE: Difficulty[] = [
  { dropMs: 980, rockSpeed: 0.55, lives: 4, distractorCap: 1, timeLimitSec: 90, hearts: 4 },
  { dropMs: 760, rockSpeed: 0.9, lives: 3, distractorCap: 2, timeLimitSec: 75, hearts: 3 },
  { dropMs: 540, rockSpeed: 1.25, lives: 3, distractorCap: 3, timeLimitSec: 60, hearts: 3 },
  { dropMs: 380, rockSpeed: 1.6, lives: 2, distractorCap: 3, timeLimitSec: 45, hearts: 2 },
];

/** Scale speed, lives, and time from the level's position in the course tree. */
export function difficultyForLevel(level: Pick<MasteryLevel, 'position'> | null | undefined): Difficulty {
  const index = Math.max(0, Math.min(TABLE.length - 1, level?.position ?? 0));
  return { ...TABLE[index] };
}
