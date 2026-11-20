import type { ContentItem, CourseContentFile, NormalizedQuestion, TestimonyLine, EvidenceCard } from '@/games/types';

const TYPE_ALIASES: Record<string, string> = {
  true_false: 'true_false',
  truefalse: 'true_false',
  'true-false': 'true_false',
  boolean: 'true_false',
  veritas: 'true_false',
  multiple_choice: 'multiple_choice',
  'multiple-choice': 'multiple_choice',
  mcq: 'multiple_choice',
  multiplix: 'multiple_choice',
  matching: 'matching',
  congruens: 'matching',
  fill_in: 'fill_in',
  'fill-in': 'fill_in',
  fillin: 'fill_in',
  scriptum: 'fill_in',
  reading: 'reading',
  scenario: 'scenario',
  tetris: 'tetris',
  peractio: 'tetris',
  asteroids: 'asteroids',
  displodo: 'asteroids',
  pecu_advo: 'pecu_advo',
  'pecu-advo': 'pecu_advo',
  griffon_juste: 'griffon_juste',
  'griffon-juste': 'griffon_juste',
};

const TEMPLATE_ALIASES: Record<string, string> = {
  peractio: 'peractio',
  tetris: 'peractio',
  displodo: 'displodo',
  asteroids: 'displodo',
  'pecu-advo': 'pecu-advo',
  pecu_advo: 'pecu-advo',
  pecuadvo: 'pecu-advo',
  'griffon-juste': 'griffon-juste',
  griffon_juste: 'griffon-juste',
  griffonjuste: 'griffon-juste',
};

export function canonicalType(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return 'unknown';
  const key = value.trim().toLowerCase();
  return TYPE_ALIASES[key] || key;
}

export function canonicalTemplate(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const key = value.trim().toLowerCase();
  return TEMPLATE_ALIASES[key] || key;
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(item => asString(item) || '').map(item => item.trim()).filter(Boolean);
  if (typeof value === 'string') return value.split('\n').map(item => item.trim()).filter(Boolean);
  return [];
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (/^(true|verum|yes)$/i.test(value.trim())) return true;
    if (/^(false|falsum|no)$/i.test(value.trim())) return false;
  }
  return undefined;
}

function asPairs(value: unknown): { term: string; definition: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const term = asString(record.term) || asString(record.left) || asString(record.prompt);
    const definition = asString(record.definition) || asString(record.right) || asString(record.match) || asString(record.answer);
    if (!term || !definition) return [];
    return [{ term, definition }];
  });
}

function asBlanks(value: unknown): { answer: string; accepted: string[] }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (typeof item === 'string') return [{ answer: item, accepted: [item] }];
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const answer = asString(record.answer) || asString(record.text);
    if (!answer) return [];
    const accepted = asStringList(record.accepted);
    return [{ answer, accepted: accepted.length ? accepted : [answer] }];
  });
}

function asTestimony(value: unknown): TestimonyLine[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const text = asString(record.text);
    if (!text) return [];
    return [{
      id: asString(record.id) || `line-${index + 1}`,
      speaker: asString(record.speaker) || 'Witness',
      text,
      canObject: record.canObject === true || record.can_object === true,
      contradiction: asString(record.contradiction),
      evidenceId: asString(record.evidenceId) || asString(record.evidence_id),
    }];
  });
}

function asEvidence(value: unknown): EvidenceCard[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const label = asString(record.label) || asString(record.name) || asString(record.title);
    const text = asString(record.text) || asString(record.body) || asString(record.description);
    if (!label && !text) return [];
    return [{ id: asString(record.id) || `evidence-${index + 1}`, label: label || text || 'Record', text: text || label || '' }];
  });
}

export interface NormalizeContext {
  id?: string;
  subsectionId?: string | null;
  competencyId?: string | null;
  levelId?: string | null;
  conceptId?: string | null;
  sample?: boolean;
  position?: number;
  templateId?: string;
}

export function normalizeContentItem(item: ContentItem | Record<string, unknown>, context: NormalizeContext = {}): NormalizedQuestion | null {
  const record = item as Record<string, unknown>;
  const type = canonicalType(record.questionType ?? record.question_type ?? record.type ?? context.templateId);
  const templateId = canonicalTemplate(record.templateId ?? record.template_id ?? context.templateId);
  const prompt = asString(record.prompt) || asString(record.PM) || asString(record.statement) || '';
  const options = asStringList(record.options ?? record.choices);
  const correctIndex = typeof record.correctIndex === 'number'
    ? record.correctIndex
    : typeof record.correct === 'number'
      ? record.correct
      : undefined;
  const pairs = asPairs(record.pairs);
  const blanks = asBlanks(record.blanks);
  const testimony = asTestimony(record.testimony);
  const evidence = asEvidence(record.evidence);
  const acceptedAnswers = asStringList(record.acceptedAnswers ?? record.accepted_answers);
  const distractors = asStringList(record.distractors);
  const correctTexts = [
    ...asStringList(record.correctTexts),
    ...(asString(record.correctAnswer) ? [asString(record.correctAnswer) as string] : []),
    ...(typeof record.correct === 'string' ? [record.correct] : []),
  ];
  const answer = asBoolean(record.answer);
  const explanation = asString(record.explanation) || asString(record.DT);
  const hasBody = Boolean(prompt || pairs.length || testimony.length || blanks.length || acceptedAnswers.length || options.length);
  if (!hasBody) return null;
  return {
    id: context.id || asString(record.id) || `item-${context.position ?? 0}`,
    type: type === 'unknown' && templateId ? canonicalType(templateId) : type,
    prompt,
    explanation,
    answer,
    options: options.length ? options : undefined,
    correctIndex,
    correctTexts: correctTexts.length ? correctTexts : undefined,
    pairs: pairs.length ? pairs : undefined,
    blanks: blanks.length ? blanks : undefined,
    acceptedAnswers: acceptedAnswers.length ? acceptedAnswers : undefined,
    blocksAwarded: typeof record.blocksAwarded === 'number' ? record.blocksAwarded : typeof record.blocks_awarded === 'number' ? record.blocks_awarded : undefined,
    distractors: distractors.length ? distractors : undefined,
    testimony: testimony.length ? testimony : undefined,
    evidence: evidence.length ? evidence : undefined,
    sample: Boolean(context.sample || record.sample),
    conceptId: context.conceptId ?? null,
    subsectionId: context.subsectionId ?? asString(record.subsectionId) ?? asString(record.subsection_id) ?? asString(record.subsection) ?? null,
    competencyId: context.competencyId ?? asString(record.competencyId) ?? asString(record.competency) ?? null,
    levelId: context.levelId ?? asString(record.levelId) ?? asString(record.level_id) ?? asString(record.level) ?? null,
    templateId,
    position: context.position ?? (typeof record.position === 'number' ? record.position : 0),
  };
}

export function normalizeConceptRow(row: {
  id: string;
  title?: string | null;
  principle_code?: string | null;
  content?: Record<string, unknown> | null;
}): NormalizedQuestion | null {
  const content = row.content || {};
  const prompt = asString(content.PM) || asString(content.PR) || (row.title ? `Identify the correct response for: ${row.title}` : '');
  const correct = asStringList(content.RC);
  const incorrect = asStringList(content.RI);
  if (!prompt && !correct.length) return null;
  const options = [...correct.slice(0, 1), ...incorrect].filter(Boolean).slice(0, 4);
  return normalizeContentItem({
    id: row.id,
    type: options.length > 1 ? 'multiple_choice' : 'fill_in',
    prompt,
    options: options.length > 1 ? options : undefined,
    correctIndex: options.length > 1 ? 0 : undefined,
    acceptedAnswers: correct.slice(0, 1),
    distractors: incorrect,
    explanation: asString(content.DT),
    competency: asString(content.MS),
    subsection: asString(content.PN) || asString(row.principle_code),
  }, {
    id: `concept-${row.id}`,
    conceptId: row.id,
    subsectionId: asString(row.principle_code) || asString(content.PN) || null,
    competencyId: asString(content.MS) || null,
  });
}

export function questionsFromCourseFile(file: CourseContentFile): NormalizedQuestion[] {
  const questions: NormalizedQuestion[] = [];
  file.lessons.forEach((lesson, lessonIndex) => {
    const buckets = [
      ...(lesson.questions || []).map(item => ({ item, from: 'question' as const })),
      ...(lesson.games || []).map(item => ({ item, from: 'game' as const })),
    ];
    buckets.forEach(({ item }, itemIndex) => {
      const normalized = normalizeContentItem(item, {
        subsectionId: lesson.subsectionId,
        competencyId: lesson.competencyId,
        levelId: lesson.levelId,
        sample: Boolean(file.sample || item.sample),
        position: lessonIndex * 100 + itemIndex,
        templateId: item.templateId || item.template_id,
      });
      if (!normalized) return;
      questions.push(normalized);
    });
  });
  return questions;
}

const GAME_TEMPLATES = new Set(['peractio', 'displodo', 'pecu-advo', 'griffon-juste']);

function isGeneric(question: NormalizedQuestion): boolean {
  return ['true_false', 'multiple_choice', 'matching', 'fill_in', 'reading', 'scenario', 'unknown'].includes(question.type);
}

/** Keep this game's items plus ordinary questions. Leave other games' items out. */
export function filterToTemplate(questions: NormalizedQuestion[], templateId: string): NormalizedQuestion[] {
  return questions.filter(question => {
    if (question.templateId && GAME_TEMPLATES.has(question.templateId) && question.templateId !== templateId) return false;
    const typeTemplate = canonicalTemplate(question.type);
    if (!question.templateId && typeTemplate && GAME_TEMPLATES.has(typeTemplate) && typeTemplate !== templateId && !isGeneric(question)) {
      return false;
    }
    if (question.templateId === templateId) return true;
    if (typeTemplate === templateId) return true;
    return isGeneric(question);
  });
}
