/**
 * PSU-1.1 authoring coverage gate.
 *
 * Validates all 49 subsection x 4 level slots without publishing drafts.
 * This proves structural completeness, not academic accuracy, live visibility,
 * server-side grading, or equivalence to a law university's curriculum.
 *
 * Run: npx tsx scripts/verify-jurisprudence-complete.ts
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SUBSECTIONS, LEVELS } from '../src/learning/taxonomy';
import { validateLessonDocument } from '../src/learning/lessons';

const root = 'lessons/stage-01/PSU-1.1';
const files = readdirSync(root).filter(filename => filename.endsWith('.json')).sort();
const expected = new Set(SUBSECTIONS.map(item =>
  `PSU-1.1/${item.competencyId}/${item.slug}`));
const found = new Map<string, Set<string>>();
const questionIds = new Set<string>();
const lessonIds = new Set<string>();
const issues: string[] = [];
let sections = 0;
let questions = 0;
let checkedFiles = 0;
let completed = 0;

for (const filename of files) {
  const path = join(root, filename);
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    issues.push(`${filename}: invalid JSON: ${String(error)}`);
    continue;
  }
  const validation = validateLessonDocument(json, {
    filePath: path, style: 'error', requireAllLevels: true,
  });
  checkedFiles++;
  for (const issue of validation.issues) {
    issues.push(`${filename}: ${issue.path}: ${issue.message}`);
  }
  if (!validation.file) {
    issues.push(`${filename}: could not normalize lesson file`);
    continue;
  }
  if (validation.file.courseCode !== 'PSU-1.1') {
    issues.push(`${filename}: source mapped to another course`);
    continue;
  }
  for (const lesson of validation.file.lessons) {
    const key = `${lesson.courseCode}/${lesson.competencyId}/${lesson.subsectionKey}`;
    if (!expected.has(key)) {
      issues.push(`${filename}: unexpected canonical subsection ${key}`);
    }
    if (lessonIds.has(lesson.id)) issues.push(`${filename}: duplicate lesson ${lesson.id}`);
    lessonIds.add(lesson.id);
    if (lesson.status !== 'draft') issues.push(`${filename}: unreviewed lesson was marked ${lesson.status}`);
    const levels = found.get(key) || new Set<string>();
    if (levels.has(lesson.levelId)) issues.push(`${filename}: duplicate ${key}/${lesson.levelId}`);
    levels.add(lesson.levelId);
    found.set(key, levels);
    completed++;
    sections += lesson.sections.length;
    questions += lesson.questions.length;
    for (const question of lesson.questions) {
      if (questionIds.has(question.stableKey)) issues.push(`${filename}: duplicate question ID ${question.stableKey}`);
      questionIds.add(question.stableKey);
    }
  }
}

for (const key of expected) {
  const levels = found.get(key);
  if (!levels) {
    issues.push(`Missing every level of ${key}`);
    continue;
  }
  for (const level of LEVELS) {
    if (!levels.has(level.id)) issues.push(`Missing ${key}/${level.id}`);
  }
}
if (expected.size !== 49) issues.push(`Taxonomy unexpectedly has ${expected.size} rather than 49 subsections`);
if (completed !== 196) issues.push(`Expected 196 authored lessons; found ${completed}`);
if (questions !== 1568) issues.push(`Expected 1,568 questions; found ${questions}`);
if (sections < 588) issues.push(`Expected at least three readings per lesson; found ${sections}`);

// The local learning player must be able to resolve every authored subsection.
// Core Principles uses one multi-subsection file and the other six competencies
// use one named source per subsection.
const previewMap = readFileSync('src/learning/draft-practice.ts', 'utf8');
for (const subsection of SUBSECTIONS) {
  const id = subsection.id;
  if (subsection.competencyId === 'core-principles') {
    if (!previewMap.includes("'core-principles': 'core_principles.json'")) {
      issues.push('Core Principles multi-subsection file is missing from the preview loader');
    }
  } else if (!previewMap.includes(`'${id}': '`)) {
    issues.push(`Draft practice player cannot resolve ${id}`);
  }
}
const playRouting = readFileSync('src/lib/course-play.ts', 'utf8');
if (!playRouting.includes("JURISPRUDENCE_START_NODE = 'core-principles.authority'")) {
  issues.push('Play action does not start the real first Jurisprudence subsection');
}

console.log(JSON.stringify({
  course: 'PSU-1.1',
  status: 'drafts — requires independent academic approval',
  competencies: 7,
  subsections: expected.size,
  files: checkedFiles,
  lessons: completed,
  sections,
  questions,
  uniqueQuestionKeys: questionIds.size,
  previewMappedSubsections: SUBSECTIONS.length,
  issues,
  verified: issues.length === 0,
  caveat: 'This is authoring/format/navigation coverage, not verified publication or a live Supabase test.',
}, null, 2));
if (issues.length) process.exitCode = 1;
