import { describe, expect, it } from 'vitest';
import { clearAwardedLines, clearFullLines, collides, emptyGrid, lockPiece, scorePlacement, spawnPiece, type PieceSpec } from '@/games/peractio/logic';
import type { NormalizedQuestion } from '@/games/types';

const question = { id: 'q', type: 'tetris', prompt: 'Place Authority', sample: false, position: 0, blocksAwarded: 1 } as NormalizedQuestion;

function spec(correct: boolean): PieceSpec {
  return { question, label: correct ? 'Authority' : 'Remedy', correct, color: '#fff' };
}

describe('Peractio placement', () => {
  it('scores a correct placement, keeps a wrong one, and pays a set-aside only when the term is wrong', () => {
    expect(scorePlacement({ correct: true, action: 'place', blocksAwarded: 1, levelPosition: 0 })).toMatchObject({ points: 200, keepCells: false, solved: true });
    expect(scorePlacement({ correct: false, action: 'place', blocksAwarded: 1, levelPosition: 0 })).toMatchObject({ points: 0, keepCells: true, solved: false });
    expect(scorePlacement({ correct: false, action: 'set-aside', blocksAwarded: 1, levelPosition: 1 }).points).toBe(50);
    expect(scorePlacement({ correct: true, action: 'set-aside', blocksAwarded: 1, levelPosition: 0 }).missed).toBe(true);
  });

  it('rejects a piece that leaves the well and clears a full line', () => {
    const grid = emptyGrid();
    const piece = spawnPiece(spec(false), 1);
    piece.x = -1;
    expect(collides(grid, piece)).toBe(true);
    const parked = spawnPiece(spec(false), 0);
    parked.y = 15;
    parked.x = 0;
    parked.shape = [[1, 1, 1, 1, 1, 1, 1, 1]];
    const locked = lockPiece(grid, parked);
    const cleared = clearFullLines(locked);
    expect(cleared.cleared).toBe(1);
    expect(cleared.grid).toHaveLength(16);
    expect(cleared.grid[15].every(cell => cell == null)).toBe(true);
    const awarded = clearAwardedLines(locked, 1);
    expect(awarded.cleared).toBe(1);
  });
});
