import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createDraftPracticeAdapter } from './draft-practice';
import { validateLessonDocument } from './lessons';
import type { LessonAdapter } from '@/lib/lesson-adapter';

const filePath = 'lessons/stage-01/PSU-1.1/core_principles.json';
const parsed = validateLessonDocument(JSON.parse(readFileSync(filePath, 'utf8')), {
  filePath, style: 'error', requireAllLevels: true,
});
assert.equal(parsed.ok, true);
const authorityRed = parsed.file!.lessons.find(row =>
  row.subsectionId === 'core-principles.authority' && row.levelId === 'paralegal',
)!;
assert.ok(authorityRed, 'real authored first Jurisprudence lesson exists');

function fakeStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => Array.from(values.keys())[index] ?? null,
    removeItem: key => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}
function liveStub(): LessonAdapter {
  return {
    getCourseTree: async ({ courseId, curriculumCode }) => ({
      courseId, curriculumCode, competencies: [],
    }),
    getLesson: async () => null,
    getProgress: async ({ courseId, subsectionId }) => ({
      courseId, subsectionId, levels: [],
      progress: 0, masteryPercent: 0, updatedAt: null,
    }),
    markSectionUnderstood: async () => { throw Error('draft must not write to Supabase'); },
    submitAnswer: async () => { throw Error('draft answer must not write to Supabase'); },
  };
}

test('Play path opens authored Jurisprudence reading and questions in preview, not certified mode', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true, value: fakeStorage(),
  });
  try {
    const load = async (subsectionId: string, levelId: string) =>
      subsectionId === authorityRed.subsectionId && levelId === authorityRed.levelId
        ? authorityRed : null;
    const adapter = createDraftPracticeAdapter(liveStub(), load);
    const input = {
      courseId: 'sample-course-id', curriculumCode: 'PSU-1.1',
      subsectionId: 'core-principles.authority', levelId: 'paralegal' as const,
    };
    const lesson = await adapter.getLesson(input);
    assert.ok(lesson);
    assert.equal(lesson.preview, true);
    assert.ok(lesson.sections.length >= 3);
    assert.equal(lesson.questions.length, 8);
    assert.equal('answer' in lesson.questions[0].payload, false);
    assert.equal('correctIndex' in lesson.questions[0].payload, false);

    const afterRead = await adapter.markSectionUnderstood({
      ...input, sectionId: lesson.sections[0].id,
    });
    assert.equal(afterRead.preview, true);
    assert.equal(afterRead.levels[0].sectionsAcknowledged, 1);
    assert.ok(afterRead.progress > 0);

    const first = authorityRed.questions[0];
    const response = first.questionType === 'true_false' ? { answer: first.answer } : {};
    const feedback = await adapter.submitAnswer({
      ...input, questionId: lesson.questions[0].id, response,
    });
    assert.equal(feedback.correct, true);
    assert.ok(feedback.explanation.length > 0);
    assert.equal(feedback.progress.levels[0].questionsAnswered, 1);
    assert.equal(feedback.progress.levels[0].questionsCorrect, 1);

    const recreated = createDraftPracticeAdapter(liveStub(), load);
    const resumed = await recreated.getLesson(input);
    assert.equal(resumed?.sections[0].understood, true);
    assert.equal((await recreated.getProgress({
      courseId: input.courseId, subsectionId: input.subsectionId,
    })).levels[0].questionsAnswered, 1);
    const otherCourse = await recreated.getLesson({
      ...input, curriculumCode: 'PSU-1.2',
    });
    assert.equal(otherCourse, null);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('all 28 Practical Application draft lessons load and all four exercise types accept valid answers', async () => {
  const sourceFiles = [
    'practical_skills_issue_spotting.json',
    'practical_skills_rule_extraction.json',
    'practical_skills_burden_manipulation.json',
    'practical_skills_evidence_structuring.json',
    'practical_skills_argument_construction.json',
    'practical_skills_procedural_leverage.json',
    'practical_skills_judicial_psychology.json',
  ];
  const rows = new Map<string, NonNullable<typeof parsed.file>['lessons'][number]>();
  for (const filename of sourceFiles) {
    const fullPath = `lessons/stage-01/PSU-1.1/${filename}`;
    const result = validateLessonDocument(JSON.parse(readFileSync(fullPath, 'utf8')), {
      filePath: fullPath, style: 'error', requireAllLevels: true,
    });
    assert.deepEqual(result.issues, [], `Invalid Practical Application file ${filename}`);
    for (const row of result.file!.lessons) rows.set(`${row.subsectionId}/${row.levelId}`, row);
  }
  assert.equal(rows.size, 28);
  const adapter = createDraftPracticeAdapter(liveStub(), async (subsection, level) =>
    rows.get(`${subsection}/${level}`) ?? null);
  for (const row of rows.values()) {
    const input = {
      courseId: 'test-jurisprudence',
      curriculumCode: 'PSU-1.1',
      subsectionId: row.subsectionId,
      levelId: row.levelId,
    };
    const lesson = await adapter.getLesson(input);
    assert.ok(lesson, `Could not open ${row.id}`);
    assert.equal(lesson.preview, true);
    assert.equal(lesson.sections.length, 3);
    assert.equal(lesson.questions.length, 8);
    assert.deepEqual(new Set(lesson.questions.map(q => q.questionType)),
      new Set(['true_false', 'multiple_choice', 'matching', 'fill_in']));
    for (const normalized of row.questions) {
      const shown = lesson.questions.find(q => q.id === normalized.stableKey)!;
      assert.ok(shown);
      assert.equal('answer' in shown.payload, false);
      assert.equal('correctIndex' in shown.payload, false);
      let response: Record<string, unknown>;
      switch (normalized.questionType) {
        case 'true_false':
          response = { answer: normalized.answer };
          break;
        case 'multiple_choice':
          response = { choiceIndex: normalized.correctIndex };
          break;
        case 'matching':
          response = { pairs: normalized.pairs };
          break;
        case 'fill_in':
          response = { blanks: normalized.blanks?.map(blank => blank.answer) };
          break;
        default:
          throw new Error(`Unexpected exercise ${normalized.questionType}`);
      }
      const answer = await adapter.submitAnswer({ ...input, questionId: normalized.stableKey, response });
      assert.equal(answer.correct, true, `Correct exercise rejected: ${normalized.stableKey}`);
      assert.ok(answer.explanation.trim().length > 0, `Feedback missing: ${normalized.stableKey}`);
      assert.equal(answer.progress.preview, true);
    }
  }
});

test('admin draft reset from segment 3 clears 3–7 and all higher levels, then center resumes at 3', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: fakeStorage() });
  try {
    const file = parsed.file!;
    const rows = new Map(file.lessons.filter(row => row.subsectionId === 'core-principles.authority')
      .map(row => [row.levelId, row]));
    const adapter = createDraftPracticeAdapter(liveStub(), async (subsection, level) =>
      subsection === 'core-principles.authority' ? rows.get(level) ?? null : null);
    const base = { courseId: 'test-course', curriculumCode: 'PSU-1.1', subsectionId: 'core-principles.authority' };
    for (const levelId of ['paralegal', 'bachelor'] as const) {
      const lesson = await adapter.getLesson({ ...base, levelId });
      assert.ok(lesson);
      for (const section of lesson.sections) {
        await adapter.markSectionUnderstood({ ...base, levelId, sectionId: section.id });
      }
      for (const question of rows.get(levelId)!.questions) {
        let response: Record<string, unknown>;
        if (question.questionType === 'true_false') response = { answer: question.answer };
        else if (question.questionType === 'multiple_choice') response = { choiceIndex: question.correctIndex };
        else if (question.questionType === 'matching') response = { pairs: question.pairs };
        else response = { blanks: question.blanks?.map(blank => blank.answer) };
        const graded = await adapter.submitAnswer({ ...base, levelId, questionId: question.stableKey, response });
        assert.equal(graded.correct, true);
      }
    }
    const fully = await adapter.getProgress({ courseId: base.courseId, subsectionId: base.subsectionId });
    assert.equal(fully.progress, 16, 'two complete mastery levels contribute exactly 16');
    const reset = await adapter.resetProgress!({ ...base, levelId: 'paralegal', fromPart: 2 });
    assert.equal(reset.progress, 2, 'only completed reading parts 1 and 2 remain');
    assert.deepEqual(reset.partsByLevel?.paralegal, [true, true, false, false, false, false, false]);
    assert.deepEqual(reset.partsByLevel?.bachelor, Array(7).fill(false));
    const resumed = await adapter.getLesson({ ...base, levelId: 'paralegal' });
    assert.ok(resumed);
    assert.equal(resumed.sections[2].understood, false);
    const cleared = await adapter.resetProgress!({ ...base });
    assert.equal(cleared.progress, 0, 'holding center clears all seven parts in all levels');
    assert.equal(cleared.partsByLevel?.paralegal?.some(Boolean), false);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
