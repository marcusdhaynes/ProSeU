import { describe, expect, it } from 'vitest';
import { levelPositionForRingUnits, ringUnits } from '@/games/catalog';
import { levelsFromCatalog } from '@/games/catalog';
import { computeFillRatio } from '@/games/progress';

describe('progress fill', () => {
  it('uses the audit weights and zero denominators', () => {
    expect(computeFillRatio({ sectionsTotal: 0, sectionsAcknowledged: 0, questionsAnswered: 0, questionsCorrect: 0 })).toBe(0);
    expect(computeFillRatio({ sectionsTotal: 0, sectionsAcknowledged: 0, questionsAnswered: 5, questionsCorrect: 5 })).toBe(0.6);
    expect(computeFillRatio({ sectionsTotal: 4, sectionsAcknowledged: 4, questionsAnswered: 4, questionsCorrect: 2 })).toBe(0.7);
  });

  it('maps fill onto the 0–32 ring and reads tier thresholds from level data', () => {
    const levels = levelsFromCatalog();
    expect(ringUnits(0)).toBe(0);
    expect(ringUnits(1)).toBe(32);
    expect(ringUnits(0.6)).toBe(19);
    expect(levelPositionForRingUnits(0, levels)).toBe(-1);
    expect(levelPositionForRingUnits(1, levels)).toBe(0);
    expect(levelPositionForRingUnits(9, levels)).toBe(1);
    expect(levelPositionForRingUnits(17, levels)).toBe(2);
    expect(levelPositionForRingUnits(25, levels)).toBe(3);
    expect(levels.map(level => level.name)).toEqual(['Paralegal', 'Bachelor of Law', 'Masters', 'Doctorate']);
  });
});
