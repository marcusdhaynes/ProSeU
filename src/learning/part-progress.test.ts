import assert from 'node:assert/strict';
import test from 'node:test';
import {
  completedParts, completedPrefix, ringProgress, ringSegmentTier,
  nextPart, readingPart, questionPart, resetRecordFromPart,
  type PartRecord,
} from './part-progress';

const id = 'PSU-1.1/core-principles/authority/paralegal';
function record(): PartRecord {
  return {
    acknowledged: [],
    outcomes: {},
    sectionCount: 3,
    questionCount: 8,
    updatedAt: null,
  };
}
test('the seven ring segments fill ONLY after their own complete reading or two correct answers', () => {
  const data = record();
  assert.deepEqual(completedParts(data, id), Array(7).fill(false));
  data.acknowledged.push(id + '/s1');
  assert.equal(completedPrefix(completedParts(data, id)), 1);
  assert.equal(ringSegmentTier(1, 0), 0);
  assert.equal(ringSegmentTier(0, 0), -1);
  data.acknowledged.push(id + '/s2', id + '/s3');
  assert.equal(completedPrefix(completedParts(data, id)), 3);
  data.outcomes['prefix.q1'] = true;
  assert.equal(completedPrefix(completedParts(data, id)), 3, 'one answer cannot complete practice round');
  data.outcomes['prefix.q2'] = false;
  assert.equal(completedPrefix(completedParts(data, id)), 3, 'incorrect answer cannot complete practice round');
  data.outcomes['prefix.q2'] = true;
  assert.equal(completedPrefix(completedParts(data, id)), 4);
  for (let i = 3; i <= 8; i++) data.outcomes[`prefix.q${i}`] = true;
  assert.equal(completedPrefix(completedParts(data, id)), 7);
  assert.equal(ringProgress({ paralegal: completedParts(data, id) }), 8);
  for (let i = 0; i < 7; i++) assert.equal(ringSegmentTier(8, i), 0);
  assert.equal(ringSegmentTier(9, 0), 1, 'Bachelor begins only after a new completed part');
  assert.equal(ringSegmentTier(9, 1), 0, 'unfinished segment still displays previous completed tier');
});
test('held sub-button 3 resets parts 3–7 and resumes at part 3', () => {
  const data = record();
  data.acknowledged = [id + '/s1', id + '/s2', id + '/s3'];
  for (let i = 1; i <= 8; i++) data.outcomes[`prefix.q${i}`] = true;
  const reset = resetRecordFromPart(data, 2);
  assert.deepEqual(reset.acknowledged, [id + '/s1', id + '/s2']);
  assert.deepEqual(reset.outcomes, {});
  const parts = completedParts(reset, id);
  assert.equal(completedPrefix(parts), 2);
  assert.deepEqual(nextPart({ paralegal: parts }), { levelId: 'paralegal', part: 2, finished: false });
  assert.equal(ringProgress({ paralegal: parts }), 2);
});
test('holding practice part 5 preserves only earlier answered practice pairs', () => {
  const data = record();
  data.acknowledged = [id + '/s1', id + '/s2', id + '/s3'];
  for (let i = 1; i <= 8; i++) data.outcomes[`prefix.q${i}`] = true;
  const reset = resetRecordFromPart(data, 4);
  assert.deepEqual(Object.keys(reset.outcomes), ['prefix.q1', 'prefix.q2']);
  assert.equal(completedPrefix(completedParts(reset, id)), 4);
});
test('resume moves to next tier only after all seven parts in current tier', () => {
  const all = Array(7).fill(true);
  const none = Array(7).fill(false);
  assert.deepEqual(nextPart({ paralegal: all, bachelor: none }), {
    levelId: 'bachelor', part: 0, finished: false,
  });
  assert.equal(ringProgress({ paralegal: all, bachelor: [true, false, false, false, false, false, false] }), 9);
  assert.equal(ringProgress({ paralegal: all, bachelor: all, masters: all, doctorate: all }), 32);
  assert.equal(nextPart({ paralegal: all, bachelor: all, masters: all, doctorate: all }).finished, true);
});
test('all assigned sections of a reading group must be acknowledged', () => {
  assert.deepEqual(Array.from({ length: 6 }, (_, i) => readingPart(i, 6)), [0, 0, 1, 1, 2, 2]);
  const data = { ...record(), sectionCount: 6, acknowledged: [id + '/s1'] };
  assert.equal(completedPrefix(completedParts(data, id)), 0);
  data.acknowledged.push(id + '/s2');
  assert.equal(completedPrefix(completedParts(data, id)), 1);
  assert.deepEqual(Array.from({ length: 8 }, (_, i) => questionPart(i)), [3,3,4,4,5,5,6,6]);
});
