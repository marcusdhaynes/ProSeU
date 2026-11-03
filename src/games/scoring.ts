import type { NormalizedQuestion } from '@/games/types';

export interface Choice {
  id: string;
  label: string;
  correct: boolean;
}

export interface GradeResult {
  correct: boolean;
  points: number;
  explanation?: string;
  /** False when the question type is not one the scorer understands and it has no answer key. */
  recognized: boolean;
}

export type AnswerResponse =
  | { kind: 'choice'; label: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'text'; value: string }
  | { kind: 'pairs'; pairs: { term: string; definition: string }[] }
  | { kind: 'evidence'; evidenceId?: string; label?: string }
  | { kind: 'continue' };

export function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[“”"'`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = normalizeText(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value.trim());
  }
  return out;
}

export function textMatches(expected: string, given: string): boolean {
  return normalizeText(expected) === normalizeText(given);
}

export function isAcceptedText(question: NormalizedQuestion, given: string): boolean {
  const accepted = [
    ...(question.acceptedAnswers || []),
    ...(question.correctTexts || []),
    ...(question.blanks || []).flatMap(blank => [blank.answer, ...(blank.accepted || [])]),
  ];
  if (question.correctIndex != null && question.options?.[question.correctIndex]) {
    accepted.push(question.options[question.correctIndex]);
  }
  return accepted.some(answer => textMatches(answer, given));
}

/** One prompt per pair so matching items can be played one term at a time. */
export function expandForPlay(question: NormalizedQuestion): NormalizedQuestion[] {
  if (question.type === 'matching' && question.pairs && question.pairs.length > 1) {
    return question.pairs.map((pair, index) => ({
      ...question,
      id: `${question.id}#${index}`,
      prompt: question.prompt ? `${question.prompt} — ${pair.term}` : `Match: ${pair.term}`,
      pairs: [pair],
      distractors: unique([
        ...question.pairs!.filter((_, pairIndex) => pairIndex !== index).map(item => item.definition),
        ...(question.distractors || []),
      ]),
    }));
  }
  return [question];
}

export function playableChoices(question: NormalizedQuestion, distractorCap = 3): Choice[] {
  const cap = Math.max(0, distractorCap);
  if (question.type === 'true_false') {
    const answer = question.answer === true;
    return [
      { id: `${question.id}-true`, label: 'True', correct: answer },
      { id: `${question.id}-false`, label: 'False', correct: !answer },
    ];
  }
  if (question.options && question.options.length) {
    return question.options.map((label, index) => ({
      id: `${question.id}-opt-${index}`,
      label,
      correct: question.correctIndex != null
        ? index === question.correctIndex
        : (question.correctTexts || []).some(text => textMatches(text, label)),
    }));
  }
  if (question.pairs && question.pairs.length) {
    const focus = question.pairs[0];
    const labels = unique([
      focus.definition,
      ...question.pairs.slice(1).map(pair => pair.definition),
      ...(question.distractors || []).slice(0, cap),
    ]);
    return labels.map((label, index) => ({
      id: `${question.id}-pair-${index}`,
      label,
      correct: textMatches(label, focus.definition),
    }));
  }
  const accepted = unique([
    ...(question.acceptedAnswers || []),
    ...(question.correctTexts || []),
    ...(question.blanks || []).flatMap(blank => [blank.answer, ...(blank.accepted || [])]),
  ]);
  const correctLabel = accepted[0];
  const wrong = unique(question.distractors || []).filter(label => !correctLabel || !textMatches(label, correctLabel)).slice(0, Math.max(1, cap));
  if (!correctLabel) return wrong.map((label, index) => ({ id: `${question.id}-no-${index}`, label, correct: false }));
  return [
    { id: `${question.id}-ok`, label: correctLabel, correct: true },
    ...wrong.map((label, index) => ({ id: `${question.id}-no-${index}`, label, correct: false })),
  ];
}

function pointsFor(correct: boolean, levelPosition: number, base: number): number {
  if (!correct) return 0;
  const multiplier = 1 + Math.max(0, levelPosition) * 0.25;
  return Math.round(base * multiplier);
}

function gradeText(question: NormalizedQuestion, given: string, levelPosition: number): GradeResult {
  if (question.type === 'fill_in' && question.blanks && question.blanks.length > 1) {
    const parts = given.split('|').map(part => part.trim());
    const correct = question.blanks.every((blank, index) => {
      const accepted = unique([blank.answer, ...(blank.accepted || [])]);
      return accepted.some(answer => textMatches(answer, parts[index] || ''));
    });
    return { correct, points: pointsFor(correct, levelPosition, 100), explanation: question.explanation, recognized: true };
  }
  const hasKey = Boolean(
    question.acceptedAnswers?.length
    || question.correctTexts?.length
    || question.blanks?.length
    || (question.correctIndex != null && question.options?.length),
  );
  if (!hasKey) {
    return { correct: false, points: 0, explanation: question.explanation, recognized: false };
  }
  const correct = isAcceptedText(question, given);
  return { correct, points: pointsFor(correct, levelPosition, 100), explanation: question.explanation, recognized: true };
}

export function gradeAnswer(question: NormalizedQuestion, response: AnswerResponse, levelPosition = 0): GradeResult {
  const explanation = question.explanation;
  if (question.type === 'reading') {
    return { correct: true, points: pointsFor(true, levelPosition, 25), explanation, recognized: true };
  }
  if (question.type === 'matching' && (response.kind === 'choice' || response.kind === 'text')) {
    const given = response.kind === 'choice' ? response.label : response.value;
    const expected = question.pairs?.[0]?.definition;
    const correct = Boolean(expected && textMatches(expected, given));
    return { correct, points: pointsFor(correct, levelPosition, 100), explanation, recognized: true };
  }
  if (question.type === 'true_false') {
    const expected = question.answer === true;
    const given = response.kind === 'boolean'
      ? response.value
      : response.kind === 'choice' || response.kind === 'text'
        ? normalizeText(response.kind === 'choice' ? response.label : response.value) === 'true'
        : null;
    if (given == null) return { correct: false, points: 0, explanation, recognized: true };
    const correct = given === expected;
    return { correct, points: pointsFor(correct, levelPosition, 100), explanation, recognized: true };
  }
  if (question.type === 'matching' && response.kind === 'pairs') {
    const expected = question.pairs || [];
    const correct = expected.length > 0 && expected.every(pair =>
      response.pairs.some(given => textMatches(given.term, pair.term) && textMatches(given.definition, pair.definition)),
    );
    return { correct, points: pointsFor(correct, levelPosition, 100), explanation, recognized: true };
  }
  if (response.kind === 'choice') return gradeText(question, response.label, levelPosition);
  if (response.kind === 'text') return gradeText(question, response.value, levelPosition);
  if (response.kind === 'boolean') {
    return gradeText(question, response.value ? 'true' : 'false', levelPosition);
  }
  if (response.kind === 'evidence') {
    const label = response.label || '';
    if (question.evidence?.length && response.evidenceId) {
      const card = question.evidence.find(item => item.id === response.evidenceId);
      const linked = (question.testimony || []).find(line => line.canObject && line.evidenceId === response.evidenceId);
      const correct = Boolean(card && linked);
      return { correct, points: pointsFor(correct, levelPosition, 150), explanation: linked?.contradiction || explanation, recognized: true };
    }
    if (label) return gradeText(question, label, levelPosition);
  }
  return { correct: false, points: 0, explanation, recognized: false };
}
