import type { CompetencyNode, NormalizedQuestion } from '@/games/types';
import { expandForPlay } from '@/games/scoring';

export const TILE = { floor: 0, wall: 1, encounter: 3, exit: 4 } as const;

export interface RoomEncounter {
  id: string;
  x: number;
  y: number;
  question: NormalizedQuestion;
  creature: string;
}

export interface AreaRoom {
  competency: CompetencyNode;
  map: number[][];
  encounters: RoomEncounter[];
}

const CREATURES = ['Quillfox', 'Sealbear', 'Docketowl', 'Writnewt', 'Gavelpup', 'Lexmoth', 'Briefbat'];

export function creatureName(index: number): string {
  return CREATURES[Math.abs(index) % CREATURES.length];
}

export function buildRoom(encounterCount: number): { map: number[][]; spots: { x: number; y: number }[] } {
  const rows = 9;
  const cols = 10;
  const map: number[][] = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => {
    if (y === 0 || x === 0 || y === rows - 1 || x === cols - 1) return TILE.wall;
    return TILE.floor;
  }));
  const spots: { x: number; y: number }[] = [];
  for (let y = 2; y < rows - 1 && spots.length < encounterCount; y += 2) {
    for (let x = 2; x < cols - 1 && spots.length < encounterCount; x += 3) {
      map[y][x] = TILE.encounter;
      spots.push({ x, y });
    }
  }
  map[rows - 2][cols - 2] = TILE.exit;
  return { map, spots };
}

export function canStep(map: number[][], x: number, y: number): boolean {
  const cell = map[y]?.[x];
  return cell === TILE.floor || cell === TILE.encounter || cell === TILE.exit;
}

export function areasFromQuestions(competencies: CompetencyNode[], questions: NormalizedQuestion[]): AreaRoom[] {
  const expanded = questions.flatMap(expandForPlay);
  return [...competencies].sort((a, b) => a.position - b.position).map(competency => {
    const owned = expanded.filter(question =>
      question.competencyId === competency.id
      || question.competencyId === competency.name
      || competency.subsections.some(subsection => subsection.id === question.subsectionId || subsection.name === question.subsectionId),
    );
    const { map, spots } = buildRoom(Math.max(owned.length, 0));
    const encounters: RoomEncounter[] = owned.slice(0, spots.length).map((question, index) => ({
      id: question.id,
      x: spots[index].x,
      y: spots[index].y,
      question,
      creature: creatureName(competency.position + index),
    }));
    return { competency, map, encounters };
  });
}

export function areaUnlocked(index: number, clearedAreaIndexes: number[]): boolean {
  if (index <= 0) return true;
  return clearedAreaIndexes.includes(index - 1);
}

export function resolveTurn(correct: boolean, hearts: number): { hearts: number; cleared: boolean; lost: boolean } {
  if (correct) return { hearts, cleared: true, lost: false };
  const next = hearts - 1;
  return { hearts: next, cleared: false, lost: next <= 0 };
}
