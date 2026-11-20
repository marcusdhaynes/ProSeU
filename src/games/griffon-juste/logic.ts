import type { EvidenceCard, NormalizedQuestion, TestimonyLine } from '@/games/types';
import { normalizeText, playableChoices } from '@/games/scoring';

export interface Hearing {
  lines: TestimonyLine[];
  evidence: EvidenceCard[];
}

export interface Presentation {
  correct: boolean;
  points: number;
  explanation: string;
}

export function questionsToHearing(questions: NormalizedQuestion[]): Hearing {
  const lines: TestimonyLine[] = [];
  const evidence: EvidenceCard[] = [];
  const seenEvidence = new Set<string>();
  for (const question of questions) {
    if (question.testimony?.length) {
      lines.push(...question.testimony);
      for (const card of question.evidence || []) {
        if (seenEvidence.has(card.id)) continue;
        seenEvidence.add(card.id);
        evidence.push(card);
      }
      continue;
    }
    const choices = playableChoices(question, 2).filter(choice => choice.label.trim());
    const right = choices.find(choice => choice.correct);
    const wrong = choices.find(choice => !choice.correct);
    if (!right) continue;
    const evidenceId = `${question.id}-record`;
    if (!seenEvidence.has(evidenceId)) {
      seenEvidence.add(evidenceId);
      evidence.push({
        id: evidenceId,
        label: right.label,
        text: question.explanation || right.label,
      });
    }
    if (wrong) {
      lines.push({
        id: `${question.id}-claim`,
        speaker: 'Witness',
        text: question.prompt ? `${question.prompt} The answer is ${wrong.label}.` : wrong.label,
        canObject: true,
        contradiction: question.explanation || `The record says: ${right.label}.`,
        evidenceId,
      });
    } else {
      lines.push({
        id: `${question.id}-claim`,
        speaker: 'Witness',
        text: question.prompt || right.label,
        canObject: true,
        contradiction: question.explanation || `The record says: ${right.label}.`,
        evidenceId,
      });
    }
  }
  return { lines, evidence };
}

export function presentEvidence(line: TestimonyLine, evidence: EvidenceCard | null, levelPosition = 0): Presentation {
  const multiplier = 1 + Math.max(0, levelPosition) * 0.25;
  if (!line.canObject) {
    return { correct: false, points: 0, explanation: 'Nothing in that statement contradicts the record.' };
  }
  if (!evidence) {
    return { correct: false, points: 0, explanation: line.contradiction || 'Present the record that contradicts the statement.' };
  }
  if (line.evidenceId) {
    const correct = evidence.id === line.evidenceId;
    return {
      correct,
      points: correct ? Math.round(150 * multiplier) : 0,
      explanation: correct
        ? (line.contradiction || evidence.text)
        : 'That record does not contradict this statement.',
    };
  }
  const label = normalizeText(evidence.label);
  const blob = normalizeText(`${evidence.label} ${evidence.text}`);
  const contradiction = normalizeText(line.contradiction || '');
  const correct = Boolean(contradiction) && (contradiction.includes(label) || blob.includes(contradiction));
  return {
    correct,
    points: correct ? Math.round(150 * multiplier) : 0,
    explanation: correct ? (line.contradiction || evidence.text) : 'That record does not contradict this statement.',
  };
}

export function hearingComplete(lines: TestimonyLine[], foundIds: string[]): boolean {
  const needed = lines.filter(line => line.canObject).map(line => line.id);
  if (!needed.length) return lines.length > 0 && foundIds.length > 0;
  return needed.every(id => foundIds.includes(id));
}
