import assert from 'node:assert/strict';
import test from 'node:test';
import { gradeLessonAnswer } from './lesson-grade';
import { createMockLessonAdapter } from './lesson-adapter';
import { MOCK_LESSON } from './mock-lesson';

const course = { courseId: 'founding-psu-1-1', curriculumCode: 'PSU-1.1' };

function words(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function sentences(value: string): number {
  return value.split(/[.!?]+/).map(part => part.trim()).filter(Boolean).length;
}

test('the mock lesson matches the content-writer shape and exercises every slot', () => {
  assert.ok(sentences(MOCK_LESSON.summary) >= 2 && sentences(MOCK_LESSON.summary) <= 3);
  assert.ok(MOCK_LESSON.checklist.length >= 3 && MOCK_LESSON.checklist.length <= 5);
  assert.ok(MOCK_LESSON.sections.length >= 3 && MOCK_LESSON.sections.length <= 5);
  for (const section of MOCK_LESSON.sections) {
    const count = words(section.body);
    assert.ok(count >= 60 && count <= 150, `${section.id} has ${count} words`);
    assert.equal(section.defaultOpen, true);
  }
  assert.equal(MOCK_LESSON.sections.filter(section => section.audioUrl).length, 1);
  assert.equal(MOCK_LESSON.sections.filter(section => section.videoUrl).length, 1);
  assert.ok(MOCK_LESSON.sections.some(section => !section.audioUrl && !section.videoUrl));
  const counts = MOCK_LESSON.questions.reduce<Record<string, number>>((total, question) => {
    total[question.questionType] = (total[question.questionType] ?? 0) + 1;
    return total;
  }, {});
  assert.ok(MOCK_LESSON.questions.length >= 8);
  assert.equal(counts.true_false, 2);
  assert.equal(counts.multiple_choice, 3);
  assert.equal(counts.matching, 1);
  assert.equal(counts.fill_in, 2);
  for (const question of MOCK_LESSON.questions.filter(item => item.questionType === 'true_false')) {
    for (const key of ['explanationIfCorrect', 'explanationIfWrong'] as const) {
      const text = String(question.payload[key]);
      const count = sentences(text);
      assert.ok(count >= 1 && count <= 2, `${question.id} ${key}`);
    }
  }
});

test('true/false explanations differ for a right and a wrong answer', () => {
  const payload = MOCK_LESSON.questions[0].payload;
  const right = gradeLessonAnswer('true_false', payload, { answer: false });
  const wrong = gradeLessonAnswer('true_false', payload, { answer: true });
  assert.equal(right.correct, true);
  assert.equal(wrong.correct, false);
  assert.notEqual(right.explanation, wrong.explanation);
  assert.match(right.explanation, /authority/i);
});

test('multiple choice, matching, and fill-in grade the audit payload shapes', () => {
  const choice = MOCK_LESSON.questions.find(question => question.id === 'q-mc-stop');
  assert.ok(choice);
  assert.equal(gradeLessonAnswer('multiple_choice', choice.payload, { choiceIndex: 1 }).correct, true);
  assert.equal(gradeLessonAnswer('multiple_choice', choice.payload, { choiceIndex: 0 }).correct, false);

  const matching = MOCK_LESSON.questions.find(question => question.id === 'q-match');
  assert.ok(matching);
  const pairs = matching.payload.pairs as { term: string; definition: string }[];
  assert.equal(gradeLessonAnswer('matching', matching.payload, { pairs: [...pairs].reverse() }).correct, true);
  assert.equal(gradeLessonAnswer('matching', matching.payload, { pairs: [{ term: pairs[0].term, definition: pairs[1].definition }] }).correct, false);

  const fill = MOCK_LESSON.questions.find(question => question.id === 'q-fill-rule');
  assert.ok(fill);
  assert.equal(gradeLessonAnswer('fill_in', fill.payload, { blanks: [' Law '] }).correct, true);
  assert.equal(gradeLessonAnswer('fill_in', fill.payload, { blanks: ['threat'] }).correct, false);
});

test('acknowledgements and correct answers move the stored progress row', async () => {
  const adapter = createMockLessonAdapter();
  const before = await adapter.getProgress({ courseId: course.courseId, subsectionId: MOCK_LESSON.subsectionId });
  assert.equal(before.progress, 0);
  assert.equal(before.levels[0].fillRatio, 0);

  const marked = await adapter.markSectionUnderstood({ ...course, subsectionId: MOCK_LESSON.subsectionId, levelId: 'paralegal', sectionId: 'sec-force' });
  assert.equal(marked.levels[0].sectionsAcknowledged, 1);
  assert.equal(marked.progress, 1);
  const again = await adapter.markSectionUnderstood({ ...course, subsectionId: MOCK_LESSON.subsectionId, levelId: 'paralegal', sectionId: 'sec-force' });
  assert.equal(again.levels[0].sectionsAcknowledged, 1);

  const lesson = await adapter.getLesson({ ...course, subsectionId: MOCK_LESSON.subsectionId, levelId: 'paralegal' });
  assert.ok(lesson);
  assert.equal(lesson.sections[0].understood, true);
  assert.equal(lesson.sections[1].understood, false);

  let latest = marked;
  for (const section of lesson.sections.slice(1)) {
    latest = await adapter.markSectionUnderstood({ ...course, subsectionId: MOCK_LESSON.subsectionId, levelId: 'paralegal', sectionId: section.id });
  }
  for (const question of lesson.questions) {
    const response = responseFor(question.questionType, question.payload);
    latest = (await adapter.submitAnswer({
      ...course,
      subsectionId: MOCK_LESSON.subsectionId,
      levelId: 'paralegal',
      questionId: question.id,
      response,
    })).progress;
  }
  assert.equal(latest.levels[0].sectionsAcknowledged, 4);
  assert.equal(latest.levels[0].questionsCorrect, 8);
  assert.equal(latest.levels[0].questionsAnswered, 8);
  assert.equal(latest.levels[0].fillRatio, 1);
  assert.equal(latest.progress, 8);

  const wrong = await adapter.submitAnswer({
    ...course,
    subsectionId: MOCK_LESSON.subsectionId,
    levelId: 'paralegal',
    questionId: 'q-tf-force',
    response: { answer: true },
  });
  assert.equal(wrong.correct, false);
  assert.match(wrong.explanation, /Force and authority/);
  assert.equal(wrong.progress.levels[0].questionsCorrect, 7);
  assert.ok(wrong.progress.progress < 8);

  const missing = await adapter.getLesson({ ...course, subsectionId: 'core-principles.rights', levelId: 'paralegal' });
  assert.equal(missing, null);
  const higher = await adapter.getLesson({ ...course, subsectionId: MOCK_LESSON.subsectionId, levelId: 'bachelor' });
  assert.equal(higher, null);
});

function responseFor(type: string, payload: Record<string, unknown>): unknown {
  if (type === 'true_false') return { answer: payload.answer };
  if (type === 'multiple_choice') return { choiceIndex: payload.correctIndex };
  if (type === 'matching') return { pairs: payload.pairs };
  if (type === 'fill_in') {
    const blanks = payload.blanks as { answer: string }[];
    return { blanks: blanks.map(blank => blank.answer) };
  }
  return {};
}
