/**
 * Grades one template-item payload. Payloads match the audit draft:
 * true_false, multiple_choice, matching, fill_in.
 * True/false carries a 1–2 sentence explanation for each outcome.
 */

export type LessonQuestionType = 'true_false' | 'multiple_choice' | 'matching' | 'fill_in';

export interface GradeResult {
  correct: boolean;
  explanation: string;
}

export function gradeLessonAnswer(questionType: string, payload: Record<string, unknown>, response: unknown): GradeResult {
  switch (questionType) {
    case 'true_false':
      return gradeTrueFalse(payload, response);
    case 'multiple_choice':
      return gradeMultipleChoice(payload, response);
    case 'matching':
      return gradeMatching(payload, response);
    case 'fill_in':
      return gradeFillIn(payload, response);
    default:
      return { correct: false, explanation: 'This question type is not playable yet.' };
  }
}

function gradeTrueFalse(payload: Record<string, unknown>, response: unknown): GradeResult {
  const expected = payload.answer === true;
  const given = readBoolean(response);
  const correct = given === expected;
  const right = text(payload.explanationIfCorrect) || text(payload.explanation);
  const wrong = text(payload.explanationIfWrong) || text(payload.explanation);
  return { correct, explanation: correct ? right : wrong };
}

function gradeMultipleChoice(payload: Record<string, unknown>, response: unknown): GradeResult {
  const correctIndex = typeof payload.correctIndex === 'number' ? payload.correctIndex : -1;
  const given = readIndex(response);
  return { correct: given === correctIndex && correctIndex >= 0, explanation: text(payload.explanation) };
}

function gradeMatching(payload: Record<string, unknown>, response: unknown): GradeResult {
  const expected = readPairs(payload.pairs);
  const given = readPairs(isRecord(response) ? response.pairs : undefined);
  const correct = expected.length > 0 && expected.length === given.length && expected.every(pair =>
    given.some(item => item.term === pair.term && item.definition === pair.definition),
  );
  return { correct, explanation: text(payload.explanation) };
}

function gradeFillIn(payload: Record<string, unknown>, response: unknown): GradeResult {
  const blanks = Array.isArray(payload.blanks) ? payload.blanks : [];
  const given = isRecord(response) && Array.isArray(response.blanks) ? response.blanks.map(item => String(item)) : [];
  const correct = blanks.length > 0 && blanks.every((blank, index) => {
    if (!isRecord(blank)) return false;
    const accepted = acceptedAnswers(blank);
    return accepted.includes(normalizeToken(given[index] ?? ''));
  });
  return { correct, explanation: text(payload.explanation) };
}

function acceptedAnswers(blank: Record<string, unknown>): string[] {
  const list = Array.isArray(blank.accepted) ? blank.accepted.map(item => normalizeToken(String(item))) : [];
  if (typeof blank.answer === 'string') list.push(normalizeToken(blank.answer));
  return list.filter(Boolean);
}

export function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function readBoolean(response: unknown): boolean | null {
  if (typeof response === 'boolean') return response;
  if (isRecord(response) && typeof response.answer === 'boolean') return response.answer;
  return null;
}

function readIndex(response: unknown): number {
  if (typeof response === 'number') return response;
  if (isRecord(response) && typeof response.choiceIndex === 'number') return response.choiceIndex;
  return -1;
}

function readPairs(value: unknown): { term: string; definition: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!isRecord(item) || typeof item.term !== 'string' || typeof item.definition !== 'string') return [];
    return [{ term: item.term, definition: item.definition }];
  });
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
