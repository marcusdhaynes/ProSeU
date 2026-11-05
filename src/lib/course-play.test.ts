import assert from 'node:assert/strict';
import test from 'node:test';
import {
  coursePlayUrl,
  isJurisprudenceCourse,
  JURISPRUDENCE_START_NODE,
} from './course-play';

test('Jurisprudence play starts the first actual lesson and clears stale navigation', () => {
  const query = new URLSearchParams('view=domain&node=major-cases.paradigm-shifting-cases&tab=notes');
  const url = coursePlayUrl(query, 'legal-foundations', {
    slug: 'jurisprudence',
    title: 'Jurisprudence: What Law Is and Why It Binds',
    curriculumCode: 'PSU-1.1',
  });
  const parsed = new URL(url, 'https://example.test');
  assert.equal(parsed.pathname, '/learn');
  assert.equal(parsed.searchParams.get('dom'), 'legal-foundations');
  assert.equal(parsed.searchParams.get('course'), 'jurisprudence');
  assert.equal(parsed.searchParams.get('node'), JURISPRUDENCE_START_NODE);
  assert.equal(parsed.searchParams.has('view'), false);
  assert.equal(parsed.searchParams.get('tab'), 'notes');
});

test('Jurisprudence also starts with a missing catalog curriculum code if the title matches', () => {
  assert.equal(isJurisprudenceCourse({ title: 'Jurisprudence: What Law Is and Why It Binds' }), true);
  assert.equal(isJurisprudenceCourse(null), false);
  const parsed = new URL(coursePlayUrl(new URLSearchParams(), 'foundations', {
    slug: 'law-introduction',
    title: 'Jurisprudence: What Law Is and Why It Binds',
  }), 'https://example.test');
  assert.equal(parsed.searchParams.get('node'), JURISPRUDENCE_START_NODE);
});

test('Other course play icons retain course navigation without opening unrelated Jurisprudence lessons', () => {
  const parsed = new URL(coursePlayUrl(new URLSearchParams('node=core-principles.authority&view=lesson'), 'private-law', {
    slug: 'contracts',
    title: 'Contract Law',
    curriculumCode: 'PSU-2.1',
  }), 'https://example.test');
  assert.equal(parsed.searchParams.get('dom'), 'private-law');
  assert.equal(parsed.searchParams.get('course'), 'contracts');
  assert.equal(parsed.searchParams.has('node'), false);
  assert.equal(parsed.searchParams.has('view'), false);
});
