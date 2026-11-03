/**
 * Lesson content contract.
 *
 * Two file layouts are accepted.
 *
 * 1. One competency file, the shape written for Stage I:
 *    lessons/stage-01/PSU-1.1/core_principles.json
 *    { key, name, subsections: [{ key, name, levels: { red|yellow|orange|black: lesson } }] }
 *    The course code comes from the path (a PSU-x.y directory or filename)
 *    or from the question ids. Level colors map to the stored level ids
 *    (red -> paralegal, yellow -> bachelor, orange -> masters, black -> doctorate).
 *    Underscores in competency keys map to hyphens (core_principles -> core-principles).
 *
 * 2. One course file:
 *    { curriculumCode, competencies: [ competency file, ... ] }
 *    or { curriculumCode, lessons: [ { competencyId, subsectionId, levelId, ... } ] }
 *    or { curriculumCode, units: { "PSU-1.1/core-principles/authority/red": lesson } }
 *
 * Field names used by the competency files are accepted as-is:
 * title, body_md, audio_script, video, example, focus, choices, answer_index,
 * pairs as [left, right], fill-in answer + accept.
 * True/false may use explanation, or explanation_if_true and explanation_if_false.
 */

import {
  COURSE_CODE, LEVELS, lessonId, parseUnitKey,
  resolveCompetency, resolveLevel, resolveSubsection,
  type LevelId,
} from './taxonomy';
import { TEMPLATE_FOR_TYPE, type ActivityType } from './payload';
import { countSentences, countWords } from './text';

export type StyleMode = 'off' | 'warn' | 'error';

export type Issue = { severity: 'error' | 'warning'; path: string; message: string };

export type NormalizedSection = {
  position: number;
  heading: string;
  body: string;
  example: string | null;
  audioScript: string;
  audioUrl: string | null;
  videoUrl: string | null;
  estimatedReadingSeconds: number;
  defaultOpen: boolean;
};

export type NormalizedQuestion = {
  stableKey: string;
  questionType: ActivityType;
  templateId: string;
  prompt: string;
  explanation: string | null;
  explanationIfTrue: string | null;
  explanationIfFalse: string | null;
  explanationIfCorrect: string | null;
  explanationIfWrong: string | null;
  answer?: boolean;
  options?: string[];
  correctIndex?: number;
  pairs?: { term: string; definition: string }[];
  blanks?: { answer: string; accepted: string[] }[];
  caseSensitive?: boolean;
};

export type NormalizedLesson = {
  id: string;
  sourceKey: string;
  courseCode: string;
  competencyId: string;
  competencyKey: string;
  subsectionId: string;
  subsectionKey: string;
  levelId: LevelId;
  levelKey: string;
  focus: string;
  summary: string;
  videoUrl: string | null;
  checklist: string[];
  sections: NormalizedSection[];
  questions: NormalizedQuestion[];
  status: 'draft' | 'published' | 'archived';
  version: number;
};

export type NormalizedCourseFile = {
  courseCode: string;
  sourceEdition: string | null;
  placeholder: boolean;
  lessons: NormalizedLesson[];
};

export type LessonValidation = {
  ok: boolean;
  file: NormalizedCourseFile | null;
  issues: Issue[];
};

type Loose = Record<string, unknown>;

function isObject(value: unknown): value is Loose {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function nullableText(value: unknown): string | null {
  if (value == null || value === '') return null;
  return typeof value === 'string' ? value.trim() || null : null;
}

export function courseCodeFromPath(filePath: string | undefined): string | null {
  if (!filePath) return null;
  const match = filePath.match(/PSU-[1-9]\.[1-8]/);
  return match ? match[0] : null;
}

function push(issues: Issue[], severity: Issue['severity'], path: string, message: string) {
  issues.push({ severity, path, message });
}

function styleSeverity(mode: StyleMode): Issue['severity'] | null {
  if (mode === 'off') return null;
  return mode === 'error' ? 'error' : 'warning';
}

const MEDIA = /^(https:\/\/\S+|(?:audio|video)\/[A-Za-z0-9._~/-]+)$/;

function checkMedia(issues: Issue[], path: string, url: string | null) {
  if (url && !MEDIA.test(url)) {
    push(issues, 'error', path, 'Media values must be https URLs or audio/ and video/ storage paths.');
  }
}

function normalizePairs(raw: unknown): { term: string; definition: string }[] | null {
  if (!Array.isArray(raw)) return null;
  const pairs: { term: string; definition: string }[] = [];
  for (const item of raw) {
    if (Array.isArray(item) && item.length === 2 && item.every(part => typeof part === 'string')) {
      pairs.push({ term: item[0].trim(), definition: item[1].trim() });
    } else if (isObject(item) && typeof item.term === 'string' && typeof item.definition === 'string') {
      pairs.push({ term: item.term.trim(), definition: item.definition.trim() });
    } else {
      return null;
    }
  }
  return pairs;
}

function explanationPair(raw: Loose): {
  explanation: string | null;
  explanationIfTrue: string | null;
  explanationIfFalse: string | null;
  explanationIfCorrect: string | null;
  explanationIfWrong: string | null;
} {
  return {
    explanation: text(raw.explanation) || null,
    explanationIfTrue: text(raw.explanation_if_true ?? raw.explanationIfTrue) || null,
    explanationIfFalse: text(raw.explanation_if_false ?? raw.explanationIfFalse) || null,
    explanationIfCorrect: text(raw.explanation_if_correct ?? raw.explanationIfCorrect) || null,
    explanationIfWrong: text(raw.explanation_if_wrong ?? raw.explanationIfWrong) || null,
  };
}

function normalizeQuestion(raw: unknown, index: number, sourceKey: string, issues: Issue[], path: string): NormalizedQuestion | null {
  if (!isObject(raw)) {
    push(issues, 'error', path, 'Question must be an object.');
    return null;
  }
  const questionType = text(raw.type ?? raw.questionType) as ActivityType;
  if (!questionType || !(questionType in TEMPLATE_FOR_TYPE)) {
    push(issues, 'error', path, `Unknown question type "${questionType || ''}".`);
    return null;
  }
  const templateId = text(raw.templateId ?? raw.template) || TEMPLATE_FOR_TYPE[questionType];
  if (templateId !== TEMPLATE_FOR_TYPE[questionType]) {
    push(issues, 'error', path, `templateId ${templateId} does not match ${questionType} (${TEMPLATE_FOR_TYPE[questionType]}).`);
  }
  const stableKey = text(raw.id ?? raw.key) || `${sourceKey}.q${index + 1}`;
  const copy = explanationPair(raw);
  const prompt = text(raw.prompt);
  const base = { stableKey, questionType, templateId, prompt, ...copy };
  if (!prompt && questionType !== 'matching') {
    push(issues, 'error', path, 'Question needs a prompt.');
  }
  if (questionType === 'true_false') {
    if (typeof raw.answer !== 'boolean') push(issues, 'error', path, 'True/false answer must be a boolean.');
    if (!copy.explanation && !(copy.explanationIfTrue && copy.explanationIfFalse) && !(copy.explanationIfCorrect && copy.explanationIfWrong)) {
      push(issues, 'error', path, 'True/false needs explanation, a true/false pair, or explanationIfCorrect and explanationIfWrong.');
    }
    return { ...base, answer: raw.answer === true };
  }
  if (questionType === 'multiple_choice') {
    const options = (Array.isArray(raw.choices) ? raw.choices : Array.isArray(raw.options) ? raw.options : [])
      .map(option => text(option));
    const correctIndex = typeof raw.answer_index === 'number' ? raw.answer_index
      : typeof raw.correctIndex === 'number' ? raw.correctIndex
      : typeof raw.correct === 'number' ? raw.correct
      : -1;
    if (options.length < 2 || options.some(option => !option)) push(issues, 'error', path, 'Multiple choice needs at least two choices.');
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      push(issues, 'error', path, 'answer_index is outside the choices.');
    }
    if (!copy.explanation) push(issues, 'error', path, 'Multiple choice needs an explanation.');
    return { ...base, options, correctIndex };
  }
  if (questionType === 'matching') {
    const pairs = normalizePairs(raw.pairs);
    if (!pairs || pairs.length < 2 || pairs.some(pair => !pair.term || !pair.definition)) {
      push(issues, 'error', path, 'Matching needs at least two [term, definition] pairs.');
    }
    return { ...base, pairs: pairs ?? [] };
  }
  if (questionType === 'fill_in') {
    let blanks: { answer: string; accepted: string[] }[] = [];
    if (Array.isArray(raw.blanks)) {
      blanks = raw.blanks.map(blank => {
        const row = isObject(blank) ? blank : {};
        const answer = text(row.answer);
        const accepted = Array.isArray(row.accepted) ? row.accepted.map(text).filter(Boolean) : [];
        return { answer, accepted: accepted.length ? accepted : (answer ? [answer] : []) };
      });
    } else if (typeof raw.answer === 'string' || Array.isArray(raw.accept)) {
      const answer = text(raw.answer);
      const accepted = Array.isArray(raw.accept) ? raw.accept.map(text).filter(Boolean) : [];
      blanks = [{ answer: answer || accepted[0] || '', accepted: accepted.length ? accepted : (answer ? [answer] : []) }];
    }
    if (blanks.length < 1 || blanks.some(blank => !blank.answer || blank.accepted.length < 1)) {
      push(issues, 'error', path, 'Fill-in needs an answer and an accept list.');
    }
    if (!copy.explanation) push(issues, 'error', path, 'Fill-in needs an explanation.');
    return { ...base, blanks, caseSensitive: raw.caseSensitive === true };
  }
  return base;
}

function normalizeSection(raw: unknown, position: number, issues: Issue[], path: string): NormalizedSection | null {
  if (!isObject(raw)) {
    push(issues, 'error', path, 'Section must be an object.');
    return null;
  }
  const heading = text(raw.title ?? raw.heading);
  const body = text(raw.body_md ?? raw.body);
  const audioScript = text(raw.audio_script ?? raw.audioScript);
  const audioUrl = nullableText(raw.audio_url ?? raw.audioUrl);
  const videoUrl = nullableText(raw.video ?? raw.video_url ?? raw.videoUrl);
  if (!heading) push(issues, 'error', path, 'Section needs a title.');
  if (!body) push(issues, 'error', path, 'Section needs body_md.');
  checkMedia(issues, path, audioUrl);
  checkMedia(issues, path, videoUrl);
  const estimated = typeof raw.estimatedReadingSeconds === 'number'
    ? raw.estimatedReadingSeconds
    : Math.max(1, Math.round((countWords(body) / 200) * 60));
  return {
    position,
    heading,
    body,
    example: nullableText(raw.example),
    audioScript,
    audioUrl,
    videoUrl,
    estimatedReadingSeconds: estimated,
    defaultOpen: raw.defaultOpen !== false && raw.default_open !== false,
  };
}

function applyStyle(lesson: NormalizedLesson, issues: Issue[], path: string, mode: StyleMode) {
  const severity = styleSeverity(mode);
  if (!severity) return;
  const sentences = countSentences(lesson.summary);
  if (sentences < 2 || sentences > 3) {
    push(issues, severity, `${path}.summary`, `Summary should be 2–3 sentences (found ${sentences}).`);
  }
  if (lesson.checklist.length < 3 || lesson.checklist.length > 5) {
    push(issues, severity, `${path}.checklist`, `Checklist should have 3–5 items (found ${lesson.checklist.length}).`);
  }
  lesson.checklist.forEach((item, index) => {
    if (!/^i can\b/i.test(item)) push(issues, severity, `${path}.checklist[${index}]`, 'Checklist items should start with "I can".');
  });
  if (lesson.sections.length < 3 || lesson.sections.length > 5) {
    push(issues, severity, `${path}.sections`, `A lesson should have 3–5 sections (found ${lesson.sections.length}).`);
  }
  lesson.sections.forEach((section, index) => {
    const words = countWords(section.body);
    if (words < 60 || words > 150) {
      push(issues, severity, `${path}.sections[${index}].body_md`, `Section body should be 60–150 words (found ${words}).`);
    }
    if (!section.audioScript) {
      push(issues, severity, `${path}.sections[${index}].audio_script`, 'Section needs an audio_script.');
    }
  });
  const counts: Record<string, number> = {};
  for (const question of lesson.questions) counts[question.questionType] = (counts[question.questionType] ?? 0) + 1;
  const expect: [ActivityType, number][] = [
    ['true_false', 2], ['multiple_choice', 3], ['matching', 1], ['fill_in', 2],
  ];
  for (const [type, minimum] of expect) {
    if ((counts[type] ?? 0) < minimum) {
      push(issues, severity, `${path}.questions`, `Need at least ${minimum} ${type} questions (found ${counts[type] ?? 0}).`);
    }
  }
  if (lesson.questions.length < 8) {
    push(issues, severity, `${path}.questions`, `Need at least 8 questions (found ${lesson.questions.length}).`);
  }
  for (const question of lesson.questions) {
    if (question.questionType === 'true_false') {
      for (const [label, value] of [
        ['explanation', question.explanation],
        ['explanation_if_true', question.explanationIfTrue],
        ['explanation_if_false', question.explanationIfFalse],
        ['explanationIfCorrect', question.explanationIfCorrect],
        ['explanationIfWrong', question.explanationIfWrong],
      ] as const) {
        if (!value) continue;
        const found = countSentences(value);
        if (found < 1 || found > 2) {
          push(issues, severity, `${path}.questions.${question.stableKey}.${label}`, `True/false ${label} should be 1–2 sentences (found ${found}).`);
        }
      }
      if ((question.explanationIfTrue || question.explanationIfFalse) && !(question.explanationIfTrue && question.explanationIfFalse)) {
        push(issues, severity, `${path}.questions.${question.stableKey}`, 'explanation_if_true and explanation_if_false should be provided together.');
      }
    }
    if (question.questionType === 'multiple_choice' && question.options && question.options.length !== 4) {
      push(issues, severity, `${path}.questions.${question.stableKey}`, 'Multiple choice should have 4 choices.');
    }
    if (question.questionType === 'matching' && question.pairs && (question.pairs.length < 4 || question.pairs.length > 6)) {
      push(issues, severity, `${path}.questions.${question.stableKey}`, 'Matching should have 4–6 pairs.');
    }
    if (question.questionType === 'fill_in' && question.blanks && question.blanks.length !== 1) {
      push(issues, severity, `${path}.questions.${question.stableKey}`, 'Fill-in should have one blank.');
    }
  }
}

function lessonFromLevel(
  raw: unknown,
  ctx: { courseCode: string; competencyId: string; competencyKey: string; subsectionId: string; subsectionKey: string; levelKey: string },
  issues: Issue[],
  path: string,
  style: StyleMode,
): NormalizedLesson | null {
  if (!isObject(raw)) {
    push(issues, 'error', path, 'Level lesson must be an object.');
    return null;
  }
  const level = resolveLevel(ctx.levelKey);
  if (!level) {
    push(issues, 'error', path, `Unknown level "${ctx.levelKey}". Use red, yellow, orange, or black.`);
    return null;
  }
  const sourceKey = `${ctx.courseCode}.${ctx.competencyKey}.${ctx.subsectionKey}.${ctx.levelKey}`;
  const id = lessonId(ctx.courseCode, ctx.competencyId, ctx.subsectionKey.includes('.') ? ctx.subsectionKey.split('.').pop()! : ctx.subsectionKey, level.id);
  const checklist = Array.isArray(raw.checklist) ? raw.checklist.map(text).filter(Boolean) : [];
  const sections = (Array.isArray(raw.sections) ? raw.sections : []).map((section, index) =>
    normalizeSection(section, index + 1, issues, `${path}.sections[${index}]`),
  ).filter((section): section is NormalizedSection => !!section);
  const questionRows = Array.isArray(raw.questions)
    ? raw.questions.map((question, index) => ({ question, path: `${path}.questions[${index}]`, index }))
    : [];
  const questions = questionRows.map(row =>
    normalizeQuestion(row.question, row.index, sourceKey, issues, row.path),
  ).filter((question): question is NormalizedQuestion => !!question);
  const seen = new Set<string>();
  for (const question of questions) {
    if (seen.has(question.stableKey)) push(issues, 'error', path, `Duplicate question id ${question.stableKey}.`);
    seen.add(question.stableKey);
    if (question.stableKey.startsWith('PSU-') && !question.stableKey.startsWith(`${ctx.courseCode}.`)) {
      push(issues, 'error', path, `Question id ${question.stableKey} is not in ${ctx.courseCode}.`);
    }
  }
  const videoUrl = nullableText(raw.video ?? raw.videoUrl);
  checkMedia(issues, path, videoUrl);
  const lesson: NormalizedLesson = {
    id,
    sourceKey,
    courseCode: ctx.courseCode,
    competencyId: ctx.competencyId,
    competencyKey: ctx.competencyKey,
    subsectionId: ctx.subsectionId,
    subsectionKey: ctx.subsectionKey,
    levelId: level.id,
    levelKey: ctx.levelKey,
    focus: text(raw.focus),
    summary: text(raw.summary),
    videoUrl,
    checklist,
    sections,
    questions,
    status: raw.status === 'published' || raw.status === 'archived' ? raw.status : 'draft',
    version: typeof raw.version === 'number' && raw.version >= 1 ? Math.floor(raw.version) : 1,
  };
  if (!lesson.summary) push(issues, 'error', `${path}.summary`, 'Lesson needs a summary.');
  applyStyle(lesson, issues, path, style);
  return lesson;
}

function competencyLessons(raw: Loose, courseCode: string, issues: Issue[], style: StyleMode, requireAllLevels: boolean): NormalizedLesson[] {
  const competencyKey = text(raw.key ?? raw.competencyId ?? raw.competency);
  const competency = resolveCompetency(competencyKey);
  if (!competency) {
    push(issues, 'error', 'key', `Unknown competency "${competencyKey}".`);
    return [];
  }
  const subsections = Array.isArray(raw.subsections) ? raw.subsections : [];
  if (!subsections.length) push(issues, 'error', 'subsections', 'Competency file has no subsections.');
  const lessons: NormalizedLesson[] = [];
  subsections.forEach((subsectionRaw, index) => {
    if (!isObject(subsectionRaw)) {
      push(issues, 'error', `subsections[${index}]`, 'Subsection must be an object.');
      return;
    }
    const subsectionKey = text(subsectionRaw.key ?? subsectionRaw.subsectionId);
    const subsection = resolveSubsection(competency.id, subsectionKey);
    if (!subsection) {
      push(issues, 'error', `subsections[${index}].key`, `Unknown subsection "${subsectionKey}" under ${competency.name}.`);
      return;
    }
    const slug = subsection.slug;
    const levels = isObject(subsectionRaw.levels) ? subsectionRaw.levels : null;
    if (!levels) {
      push(issues, 'error', `subsections[${index}].levels`, 'Subsection needs a levels object.');
      return;
    }
    const present = new Set<string>();
    for (const [levelKey, levelRaw] of Object.entries(levels)) {
      const lesson = lessonFromLevel(levelRaw, {
        courseCode,
        competencyId: competency.id,
        competencyKey,
        subsectionId: subsection.id,
        subsectionKey: slug,
        levelKey,
      }, issues, `subsections[${index}].levels.${levelKey}`, style);
      if (lesson) {
        lessons.push(lesson);
        present.add(lesson.levelId);
      }
    }
    const missing = LEVELS.filter(level => !present.has(level.id)).map(level => level.aliases[0] ?? level.id);
    if (missing.length) {
      const severity = requireAllLevels ? 'error' : 'warning';
      push(issues, severity, `subsections[${index}]`, `Missing levels: ${missing.join(', ')}.`);
    }
  });
  return lessons;
}

function auditLessons(raw: Loose, courseCode: string, issues: Issue[], style: StyleMode): NormalizedLesson[] {
  const lessons: NormalizedLesson[] = [];
  const rows: { path: string; value: unknown; hinted?: ReturnType<typeof parseUnitKey> }[] = [];
  if (Array.isArray(raw.lessons)) {
    raw.lessons.forEach((value, index) => rows.push({ path: `lessons[${index}]`, value }));
  }
  if (isObject(raw.units)) {
    for (const [key, value] of Object.entries(raw.units)) {
      rows.push({ path: `units.${key}`, value, hinted: parseUnitKey(key) });
    }
  }
  rows.forEach(row => {
    if (!isObject(row.value)) {
      push(issues, 'error', row.path, 'Lesson must be an object.');
      return;
    }
    const competency = resolveCompetency(text(row.value.competencyId ?? row.value.competency ?? row.hinted?.competency ?? ''));
    const level = resolveLevel(text(row.value.levelId ?? row.value.level ?? row.hinted?.level ?? ''));
    if (!competency || !level) {
      push(issues, 'error', row.path, 'Lesson needs a known competency and level.');
      return;
    }
    const subsection = resolveSubsection(competency.id, text(row.value.subsectionId ?? row.value.subsection ?? row.hinted?.subsection ?? ''));
    if (!subsection) {
      push(issues, 'error', row.path, 'Lesson subsection does not belong to that competency.');
      return;
    }
    const wrapped = {
      ...row.value,
      sections: row.value.sections,
      questions: row.value.questions,
      checklist: row.value.checklist,
      summary: row.value.summary,
    };
    const lesson = lessonFromLevel(wrapped, {
      courseCode: row.hinted?.courseCode || courseCode,
      competencyId: competency.id,
      competencyKey: competency.id,
      subsectionId: subsection.id,
      subsectionKey: subsection.slug,
      levelKey: level.id,
    }, issues, row.path, style);
    if (lesson) lessons.push(lesson);
  });
  return lessons;
}

export function validateLessonDocument(input: unknown, options: {
  filePath?: string;
  courseCode?: string;
  style?: StyleMode;
  requireAllLevels?: boolean;
} = {}): LessonValidation {
  const issues: Issue[] = [];
  if (!isObject(input)) {
    return { ok: false, file: null, issues: [{ severity: 'error', path: '', message: 'Content file must be a JSON object.' }] };
  }
  const style = options.style ?? 'warn';
  const requireAllLevels = options.requireAllLevels === true;
  let courseCode = text(input.curriculumCode ?? input.courseCode ?? options.courseCode) || courseCodeFromPath(options.filePath) || '';
  if (courseCode && !COURSE_CODE.test(courseCode)) {
    push(issues, 'error', 'curriculumCode', `Course code "${courseCode}" is not PSU-1.1 through PSU-9.8.`);
    courseCode = '';
  }
  let lessons: NormalizedLesson[] = [];
  if (Array.isArray(input.subsections) || (input.key && !input.curriculumCode)) {
    if (!courseCode) push(issues, 'error', '', 'Competency file needs a PSU code in the path or in question ids.');
    else lessons = competencyLessons(input, courseCode, issues, style, requireAllLevels);
  } else if (Array.isArray(input.competencies)) {
    if (!courseCode) push(issues, 'error', 'curriculumCode', 'Course file needs curriculumCode.');
    input.competencies.forEach((competency, index) => {
      if (!isObject(competency)) {
        push(issues, 'error', `competencies[${index}]`, 'Competency must be an object.');
        return;
      }
      if (courseCode) lessons.push(...competencyLessons(competency, courseCode, issues, style, requireAllLevels));
    });
  } else if (Array.isArray(input.lessons) || isObject(input.units)) {
    if (!courseCode) push(issues, 'error', 'curriculumCode', 'Course file needs curriculumCode.');
    else lessons = auditLessons(input, courseCode, issues, style);
  } else {
    push(issues, 'error', '', 'Unrecognized lesson file. Expected subsections, competencies, lessons, or units.');
  }
  if (!courseCode) {
    const fromQuestion = lessons.map(lesson => lesson.courseCode).find(Boolean);
    if (fromQuestion) courseCode = fromQuestion;
  }
  const ids = new Set<string>();
  const questionIds = new Set<string>();
  for (const lesson of lessons) {
    if (ids.has(lesson.id)) push(issues, 'error', lesson.id, 'Duplicate lesson.');
    ids.add(lesson.id);
    for (const question of lesson.questions) {
      if (questionIds.has(question.stableKey)) push(issues, 'error', question.stableKey, 'Duplicate question id.');
      questionIds.add(question.stableKey);
    }
    if (courseCode && lesson.courseCode !== courseCode) {
      push(issues, 'error', lesson.id, `Lesson course ${lesson.courseCode} does not match ${courseCode}.`);
    }
  }
  const file: NormalizedCourseFile | null = courseCode ? {
    courseCode,
    sourceEdition: text(input.sourceEdition) || null,
    placeholder: input.placeholder === true,
    lessons,
  } : null;
  return { ok: !issues.some(issue => issue.severity === 'error'), file, issues };
}

export function lessonCounts(file: NormalizedCourseFile | null) {
  const lessons = file?.lessons ?? [];
  return {
    courseCode: file?.courseCode ?? null,
    lessons: lessons.length,
    sections: lessons.reduce((sum, lesson) => sum + lesson.sections.length, 0),
    questions: lessons.reduce((sum, lesson) => sum + lesson.questions.length, 0),
    competencies: new Set(lessons.map(lesson => lesson.competencyId)).size,
  };
}
