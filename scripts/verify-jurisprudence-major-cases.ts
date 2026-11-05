/**
 * Verify the full PSU-1.1 Major Cases authoring matrix.
 *
 * This is a content/format QA gate, NOT peer-reviewed legal accuracy,
 * university-equivalence signoff, Supabase publication, or an end-to-end test.
 *
 * Run: npx tsx scripts/verify-jurisprudence-major-cases.ts
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SUBSECTIONS, LEVELS } from '../src/learning/taxonomy';
import { validateLessonDocument } from '../src/learning/lessons';

const paths: Record<string, string> = {
  'authority-defining-cases': 'major_cases_authority.json',
  'rights-defining-cases': 'major_cases_rights.json',
  'limits-of-power-cases': 'major_cases_limits_of_power.json',
  'procedure-defining-cases': 'major_cases_procedure.json',
  'liability-expansion-cases': 'major_cases_liability_expansion.json',
  'liability-restriction-cases': 'major_cases_liability_restriction.json',
  'paradigm-shifting-cases': 'major_cases_paradigm.json',
};
const issues: string[] = [];
const canonical = SUBSECTIONS.filter(s => s.competencyId === 'major-cases');
if (canonical.length !== 7) issues.push(`Expected 7 canonical Major Cases subsections, got ${canonical.length}`);
const ids = new Set<string>();
const questionIds = new Set<string>();
const totals = { files: 0, lessons: 0, sections: 0, questions: 0 };
const expectedTypes = { true_false: 2, multiple_choice: 3, matching: 1, fill_in: 2 };
for (const subsection of canonical) {
  const filename = paths[subsection.slug];
  if (!filename) {
    issues.push(`No Major Cases lesson file for ${subsection.slug}`);
    continue;
  }
  const filePath = resolve('lessons/stage-01/PSU-1.1', filename);
  let raw: any;
  try { raw = JSON.parse(readFileSync(filePath, 'utf8')); }
  catch (error) { issues.push(`${filename}: ${String(error)}`); continue; }
  totals.files++;
  if (raw.key !== 'major_cases' || raw.subsections?.length !== 1 ||
      raw.subsections?.[0]?.key !== subsection.slug) {
    issues.push(`${filename}: wrong competency/subsection`);
    continue;
  }
  const parsed = validateLessonDocument(raw, {
    filePath, style: 'error', requireAllLevels: true,
  });
  for (const issue of parsed.issues) {
    issues.push(`${filename} / ${issue.path}: ${issue.message}`);
  }
  if (!parsed.ok || parsed.file?.lessons?.length !== 4) {
    issues.push(`${filename}: failed strict importer contract or missing mastery level`);
  }
  const levels = raw.subsections[0].levels;
  for (const level of LEVELS) {
    const key = level.aliases.find(alias => ['red', 'yellow', 'orange', 'black'].includes(alias));
    const data = key ? levels[key] : undefined;
    if (!data) { issues.push(`${filename}: missing ${level.id}`); continue; }
    const unitId = `PSU-1.1/major-cases/${subsection.slug}/${level.id}`;
    if (ids.has(unitId)) issues.push(`duplicate lesson ID ${unitId}`);
    ids.add(unitId);
    totals.lessons++;
    if (data.status !== 'draft') issues.push(`${unitId}: unreviewed lessons must stay draft`);
    if (typeof data.focus !== 'string' || data.focus.length < 25 ||
        typeof data.summary !== 'string' || data.summary.length < 80) {
      issues.push(`${unitId}: focus or narrative summary too short`);
    }
    if (!Array.isArray(data.checklist) || data.checklist.length !== 3 ||
        data.checklist.some((x: string) => !x.startsWith('I can '))) {
      issues.push(`${unitId}: expected 3 actionable student learning outcomes`);
    }
    if (!Array.isArray(data.sections) || data.sections.length !== 3) {
      issues.push(`${unitId}: expected 3 progressive reading sections`);
    }
    for (const section of data.sections || []) {
      totals.sections++;
      const words = (section.body_md || '').trim().split(/\s+/).length;
      if (words < 60 || words > 150) issues.push(`${unitId}: section length ${words}`);
      if (section.audio_script !== section.body_md) {
        issues.push(`${unitId}: audio script differs from current section`);
      }
    }
    if (!Array.isArray(data.questions) || data.questions.length !== 8) {
      issues.push(`${unitId}: expected eight assessments`);
    }
    const typeCounts: Record<string, number> = {};
    for (const question of data.questions || []) {
      totals.questions++;
      typeCounts[question.type] = (typeCounts[question.type] || 0) + 1;
      if (!question.id?.startsWith(`PSU-1.1.major_cases.${subsection.slug}.${key}.`)) {
        issues.push(`${unitId}: invalid stable question id ${question.id}`);
      }
      if (questionIds.has(question.id)) issues.push(`duplicate question key: ${question.id}`);
      questionIds.add(question.id);
      if (question.type === 'multiple_choice' && (
          question.choices?.length !== 4 || !Number.isInteger(question.answer_index) ||
          question.answer_index < 0 || question.answer_index > 3 || !question.explanation)) {
        issues.push(`${unitId}: invalid four-choice question ${question.id}`);
      }
      if (question.type === 'true_false' && (
          typeof question.answer !== 'boolean' ||
          !question.explanation_if_true || !question.explanation_if_false)) {
        issues.push(`${unitId}: missing true/false explanation`);
      }
      if (question.type === 'matching' && question.pairs?.length !== 4) {
        issues.push(`${unitId}: matching activity must have 4 distinct pairs`);
      }
      if (question.type === 'fill_in' && (!question.answer || !question.accept?.includes(question.answer))) {
        issues.push(`${unitId}: missing accepted answer`);
      }
    }
    for (const [type, expected] of Object.entries(expectedTypes)) {
      if ((typeCounts[type] || 0) !== expected) {
        issues.push(`${unitId}: expected ${expected} ${type} questions, got ${typeCounts[type] || 0}`);
      }
    }
  }
}
const expected = { files: 7, lessons: 28, sections: 84, questions: 224 };
for (const [field, count] of Object.entries(expected)) {
  if (totals[field as keyof typeof totals] !== count) {
    issues.push(`Expected ${count} ${field}, got ${totals[field as keyof typeof totals]}`);
  }
}
console.log(JSON.stringify({
  course: 'PSU-1.1', competency: 'Major Cases',
  ...totals, status: 'draft only', issues,
  verified: issues.length === 0,
  note: 'Academic accuracy review and production publish remain separate mandatory steps.',
}, null, 2));
if (issues.length) process.exitCode = 1;
