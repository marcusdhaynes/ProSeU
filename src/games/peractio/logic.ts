import type { NormalizedQuestion } from '@/games/types';
import { expandForPlay, playableChoices } from '@/games/scoring';

export const COLS = 8;
export const ROWS = 16;

export const SHAPES: number[][][] = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 0], [1, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
  [[1, 1, 0], [0, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
];

export const PIECE_COLORS = ['#ff4b4b', '#ff9600', '#ffc800', '#58cc02', '#1cb0f6', '#ce82ff', '#ff66aa'];

export type Cell = { color: string } | null;
export type Grid = Cell[][];

export interface Piece {
  shape: number[][];
  color: string;
  label: string;
  correct: boolean;
  questionId: string;
  question: NormalizedQuestion;
  x: number;
  y: number;
}

export interface PieceSpec {
  question: NormalizedQuestion;
  label: string;
  correct: boolean;
  color: string;
}

export function emptyGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null));
}

export function rotateShape(shape: number[][]): number[][] {
  const height = shape.length;
  const width = shape[0]?.length ?? 0;
  const next: number[][] = [];
  for (let x = 0; x < width; x += 1) {
    const row: number[] = [];
    for (let y = height - 1; y >= 0; y -= 1) row.push(shape[y][x] ?? 0);
    next.push(row);
  }
  return next;
}

export function collides(grid: Grid, piece: Pick<Piece, 'x' | 'y' | 'shape'>, ox = 0, oy = 0, shape = piece.shape): boolean {
  for (let y = 0; y < shape.length; y += 1) {
    for (let x = 0; x < shape[y].length; x += 1) {
      if (!shape[y][x]) continue;
      const gx = piece.x + x + ox;
      const gy = piece.y + y + oy;
      if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
      if (gy >= 0 && grid[gy][gx]) return true;
    }
  }
  return false;
}

export function spawnPiece(spec: PieceSpec, index: number): Piece {
  const shape = SHAPES[Math.abs(index) % SHAPES.length].map(row => row.slice());
  const width = shape[0].length;
  return {
    shape,
    color: spec.color,
    label: spec.label,
    correct: spec.correct,
    questionId: spec.question.id,
    question: spec.question,
    x: Math.max(0, Math.floor((COLS - width) / 2)),
    y: 0,
  };
}

export function moved(piece: Piece, ox: number, oy: number, shape = piece.shape): Piece {
  return { ...piece, shape, x: piece.x + ox, y: piece.y + oy };
}

export function lockPiece(grid: Grid, piece: Piece): Grid {
  const next = grid.map(row => row.slice());
  piece.shape.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (!cell) return;
      const gy = piece.y + y;
      const gx = piece.x + x;
      if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) next[gy][gx] = { color: piece.color };
    });
  });
  return next;
}

export function clearFullLines(grid: Grid): { grid: Grid; cleared: number } {
  const kept = grid.filter(row => row.some(cell => cell == null));
  const cleared = ROWS - kept.length;
  while (kept.length < ROWS) kept.unshift(Array.from({ length: COLS }, () => null));
  return { grid: kept, cleared };
}

/** Remove up to `count` rows, preferring full rows, then the lowest occupied row. */
export function clearAwardedLines(grid: Grid, count: number): { grid: Grid; cleared: number } {
  if (count <= 0) return { grid, cleared: 0 };
  const next = grid.map(row => row.slice());
  let cleared = 0;
  for (let n = 0; n < count; n += 1) {
    let target = -1;
    for (let y = ROWS - 1; y >= 0; y -= 1) {
      if (next[y].every(cell => cell)) { target = y; break; }
    }
    if (target < 0) {
      for (let y = ROWS - 1; y >= 0; y -= 1) {
        if (next[y].some(cell => cell)) { target = y; break; }
      }
    }
    if (target < 0) break;
    next.splice(target, 1);
    next.unshift(Array.from({ length: COLS }, () => null));
    cleared += 1;
  }
  return { grid: next, cleared };
}

export interface PlacementScore {
  points: number;
  /** Wrong placements stay on the board. Correct placements and set-asides do not. */
  keepCells: boolean;
  linesToAward: number;
  /** True when this action resolves the question as a miss (set aside the right term). */
  missed: boolean;
  solved: boolean;
}

export function scorePlacement(args: {
  correct: boolean;
  action: 'place' | 'set-aside';
  blocksAwarded: number;
  levelPosition: number;
}): PlacementScore {
  const multiplier = 1 + Math.max(0, args.levelPosition) * 0.25;
  if (args.action === 'set-aside') {
    if (args.correct) return { points: 0, keepCells: false, linesToAward: 0, missed: true, solved: false };
    return { points: Math.round(40 * multiplier), keepCells: false, linesToAward: 0, missed: false, solved: false };
  }
  if (!args.correct) return { points: 0, keepCells: true, linesToAward: 0, missed: false, solved: false };
  const awarded = Math.max(0, args.blocksAwarded || 0);
  return {
    points: Math.round((100 + awarded * 100) * multiplier),
    keepCells: false,
    linesToAward: awarded,
    missed: false,
    solved: true,
  };
}

export function buildPieceQueue(questions: NormalizedQuestion[], distractorCap: number): PieceSpec[] {
  const queue: PieceSpec[] = [];
  let colorIndex = 0;
  for (const question of questions.flatMap(expandForPlay)) {
    const choices = playableChoices(question, distractorCap).filter(choice => choice.label.trim());
    for (const choice of choices) {
      queue.push({
        question,
        label: choice.label,
        correct: choice.correct,
        color: PIECE_COLORS[colorIndex % PIECE_COLORS.length],
      });
      colorIndex += 1;
    }
  }
  return queue;
}

export function dropDistance(grid: Grid, piece: Piece): number {
  let distance = 0;
  while (!collides(grid, piece, 0, distance + 1)) distance += 1;
  return distance;
}
