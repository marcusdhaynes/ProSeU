import assert from 'node:assert/strict';
import test from 'node:test';
import { MASTERY_LEVELS, MASTERY_MAP, MASTERY_SECTIONS, competencyDisplayName } from './mastery-catalog';
import { competencyMasteryPercent, levelFillRatio, nextLessonLabel, nodeProgressFromLevels, segmentTierIndex, tierIndexForProgress, type LevelActivity } from './lesson-progress';

function activity(partial: Partial<LevelActivity> & Pick<LevelActivity, 'levelId'>): LevelActivity {
  return {
    sectionsAcknowledged: 0,
    sectionsTotal: 4,
    questionsCorrect: 0,
    questionsAnswered: 0,
    questionsTotal: 8,
    ...partial,
  };
}

test('fill ratio weights sections at 0.4 and correct answers at 0.6', () => {
  assert.equal(levelFillRatio(activity({ levelId: 'paralegal', sectionsAcknowledged: 4, questionsCorrect: 0 })), 0.4);
  assert.equal(levelFillRatio(activity({ levelId: 'paralegal', sectionsAcknowledged: 0, questionsCorrect: 8, questionsAnswered: 8 })), 0.6);
  assert.equal(levelFillRatio(activity({ levelId: 'paralegal', sectionsAcknowledged: 4, questionsCorrect: 8, questionsAnswered: 8 })), 1);
  assert.equal(levelFillRatio(activity({ levelId: 'paralegal', sectionsTotal: 0, questionsTotal: 0 })), 0);
});

test('one acknowledgement lights the paralegal threshold without filling a segment', () => {
  const progress = nodeProgressFromLevels([
    activity({ levelId: 'paralegal', sectionsAcknowledged: 1 }),
  ]);
  assert.equal(progress, 1);
  assert.equal(tierIndexForProgress(progress), 0);
  assert.equal(segmentTierIndex(progress, 0), -1);
});

test('a finished level fills its 8 points and the next threshold starts the next color', () => {
  const done = (levelId: LevelActivity['levelId']): LevelActivity => activity({
    levelId,
    sectionsAcknowledged: 4,
    questionsCorrect: 8,
    questionsAnswered: 8,
  });
  assert.equal(nodeProgressFromLevels([done('paralegal')]), 8);
  assert.equal(tierIndexForProgress(8), 0);
  assert.equal(segmentTierIndex(8, 6), 0);

  const startedBachelor = nodeProgressFromLevels([
    done('paralegal'),
    activity({ levelId: 'bachelor', sectionsAcknowledged: 1 }),
  ]);
  assert.equal(startedBachelor, 9);
  assert.equal(tierIndexForProgress(startedBachelor), 1);
  assert.equal(MASTERY_LEVELS[1].threshold, 9);

  assert.equal(nodeProgressFromLevels([done('paralegal'), done('bachelor')]), 16);
  assert.equal(tierIndexForProgress(17), 2);
  assert.equal(MASTERY_LEVELS[2].threshold, 17);
  assert.equal(tierIndexForProgress(25), 3);
  assert.equal(MASTERY_LEVELS[3].threshold, 25);

  const all = nodeProgressFromLevels(MASTERY_LEVELS.map(level => done(level.id)));
  assert.equal(all, 32);
  assert.equal(tierIndexForProgress(all), 3);
  assert.equal(segmentTierIndex(all, 6), 3);
  assert.equal(nextLessonLabel(32), 'Review');
  assert.equal(nextLessonLabel(9), 'Bachelor of Law');
  assert.equal(nextLessonLabel(0), 'Start track');
});

test('later levels do not paint until the earlier level is complete', () => {
  const progress = nodeProgressFromLevels([
    activity({ levelId: 'paralegal', sectionsAcknowledged: 1 }),
    activity({ levelId: 'bachelor', sectionsAcknowledged: 4, questionsCorrect: 8, questionsAnswered: 8 }),
  ]);
  assert.ok(progress < 9);
  assert.equal(tierIndexForProgress(progress), 0);
});

test('competency mastery is the mean of its nodes, not a hardcoded zero', () => {
  assert.equal(competencyMasteryPercent([0, 0, 0, 0, 0, 0, 0]), 0);
  assert.equal(competencyMasteryPercent([1, 0, 0, 0, 0, 0, 0]), 1);
  assert.equal(competencyMasteryPercent([8, 0, 0, 0, 0, 0, 0]), 4);
  assert.equal(competencyMasteryPercent([32, 32, 32, 32, 32, 32, 32]), 100);
});

test('display names change while stored competency keys stay put', () => {
  assert.equal(competencyDisplayName('Procedural Framework'), 'Procedural Frameworks');
  assert.equal(competencyDisplayName('Practical Skills'), 'Practical Application');
  assert.equal(competencyDisplayName('Core Principles'), 'Core Principles');
  assert.deepEqual(Object.keys(MASTERY_MAP), MASTERY_SECTIONS.map(section => section.key));
  assert.ok(MASTERY_MAP['Decision Standards'].includes('Burden of Proof'));
  assert.ok(MASTERY_MAP['Major Cases'].includes('Authority-Defining Cases'));
  assert.ok(MASTERY_MAP['Policy Debates'].includes('Individual vs State Power'));
  assert.ok(MASTERY_MAP['Practical Skills'].includes('Issue Spotting'));
  assert.equal(MASTERY_MAP['Core Principles'][0], 'Authority');
  for (const section of MASTERY_SECTIONS) assert.equal(section.principles.length, 7);
});
