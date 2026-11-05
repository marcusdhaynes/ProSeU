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
