import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { coverageSummary, validateCourseTopics, validateEntryMap } from './coverage';
import { levelFillRatio, nodeProgressFromLevels } from './fill';
import { lessonCounts, validateLessonDocument } from './lessons';
import { lessonImportRows } from './plan';
import { playerExplanation } from './payload';

const lessonPath = 'lessons/stage-01/PSU-1.1/core_principles.json';

test('core principles file loads and meets the style guide', () => {
  const raw = JSON.parse(readFileSync(lessonPath, 'utf8'));
  const result = validateLessonDocument(raw, { filePath: lessonPath, style: 'error', requireAllLevels: true });
  const errors = result.issues.filter(issue => issue.severity === 'error');
  assert.deepEqual(errors, [], errors.map(issue => `${issue.path}: ${issue.message}`).join('\n'));
  assert.equal(result.issues.filter(issue => issue.severity === 'warning').length, 0);
  const counts = lessonCounts(result.file);
  assert.equal(counts.courseCode, 'PSU-1.1');
  assert.equal(counts.lessons, 28);
  assert.equal(counts.sections, 87);
  assert.equal(counts.questions, 224);
  const rows = lessonImportRows(result.file!);
  const first = rows[0].activities[0];
  assert.equal(first.questionType, 'true_false');
  assert.equal((first.answer as { answer: boolean }).answer, true);
  assert.equal('answer' in first.payload, false);
});

test('true/false explanation pair and correct/wrong pair', () => {
  assert.equal(playerExplanation({
    correct: true,
    studentAnswer: true,
    explanation: 'Shared.',
    explanationIfTrue: null,
    explanationIfFalse: null,
    explanationIfCorrect: null,
    explanationIfWrong: null,
  }), 'Shared.');
  assert.equal(playerExplanation({
    correct: false,
    studentAnswer: true,
    explanation: 'Shared.',
    explanationIfTrue: 'If true.',
    explanationIfFalse: 'If false.',
    explanationIfCorrect: null,
    explanationIfWrong: null,
  }), 'If true.');
  assert.equal(playerExplanation({
    correct: false,
    studentAnswer: false,
    explanation: 'Shared.',
    explanationIfTrue: null,
    explanationIfFalse: null,
    explanationIfCorrect: 'Right.',
    explanationIfWrong: 'Wrong.',
  }), 'Wrong.');
});

test('a true/false explanation pair is accepted and the answer stays off the public payload', () => {
  const result = validateLessonDocument({
    curriculumCode: 'PSU-1.1',
    lessons: [{
      competencyId: 'CP',
      subsectionId: 'authority',
      levelId: 'red',
      summary: 'One sentence here. Another sentence here.',
      checklist: ['I can name it', 'I can use it', 'I can test it'],
      sections: [1, 2, 3].map(index => ({
        title: `Section ${index}`,
        body_md: Array.from({ length: 70 }, () => 'word').join(' '),
        audio_script: 'Read this aloud.',
        video: null,
      })),
      questions: [{
        type: 'true_false',
        prompt: 'A statute is a command backed only by force.',
        answer: false,
        explanation_if_true: 'Force alone is not authority.',
        explanation_if_false: 'The statement treats law as mere force.',
      }],
    }],
  }, { style: 'off' });
  assert.equal(result.ok, true, result.issues.map(issue => issue.message).join('; '));
  const item = lessonImportRows(result.file!)[0].activities[0];
  assert.equal('answer' in item.payload, false);
  assert.equal(item.explanationIfTrue, 'Force alone is not authority.');
});

test('coverage import drops reason text and resolves short subsection names', () => {
  const secret = 'SECRET_REASON_DO_NOT_LEAK';
  const entries = validateEntryMap({
    'M-00AAAA': { primary: 'PSU-1.1', secondary: ['PSU-1.2'], confidence: 'low', reason: secret },
    'M-00AAAB': { primary: 'PSU-9.9', secondary: [], confidence: 'high' },
  });
  const topics = validateCourseTopics({
    'PSU-1.1': {
      title: 'Jurisprudence',
      entry_count: 1,
      thin_competencies: ['note that must not be stored'],
      topics: [{
        topic: 'Authority',
        competencies: ['Core Principles'],
        subsections: ['Authority-Defining', 'Authority'],
        entry_ids: ['M-00AAAA'],
      }],
    },
  });
  const dumped = JSON.stringify({ entries, topics, summary: coverageSummary(entries, topics) });
  assert.equal(dumped.includes(secret), false);
  assert.equal(dumped.includes('must not be stored'), false);
  assert.deepEqual(entries.unknownCourseCodes, ['PSU-9.9']);
  assert.deepEqual(topics.unknownSubsections, []);
  assert.equal(topics.topics[0].subsectionIds.includes('major-cases.authority-defining-cases'), true);
});

test('fill uses authored questions for the 60 percent share', () => {
  assert.equal(levelFillRatio({
    sectionsAcknowledged: 0, sectionsTotal: 3, questionsCorrect: 1, questionsAnswered: 1, questionsTotal: 8,
  }), 0.075);
  assert.equal(levelFillRatio({
    sectionsAcknowledged: 3, sectionsTotal: 3, questionsCorrect: 8, questionsAnswered: 8, questionsTotal: 8,
  }), 1);
  const progress = nodeProgressFromLevels([
    { levelId: 'paralegal', fillRatio: 1 },
    { levelId: 'bachelor', fillRatio: 0 },
  ]);
  assert.equal(progress, 8);
});
