/**
 * Internal coverage map. Two files:
 *
 * entry-to-course.json
 *   { "M-0043C9": { "primary": "PSU-9.6", "secondary": ["PSU-8.5"], "confidence": "high" } }
 *   Any `reason` field is discarded and is never stored, logged, or returned.
 *
 * course-topics.json
 *   { "PSU-1.1": { "title", "entry_count", "topics": [{ "topic", "competencies", "subsections", "entry_ids" }] } }
 *   `thin_competencies` and any notes are discarded the same way.
 *
 * Lesson rows can later point at a topic through proseu_lesson_topics.
 * Students never receive these rows.
 */

import { COURSE_CODE, SOURCE_ENTRY_ID, resolveCompetency, resolveSubsectionName } from './taxonomy';
import type { Issue } from './lessons';

const CONFIDENCE = new Set(['high', 'medium', 'low']);

export type EntryLink = {
  sourceEntryId: string;
  courseCode: string;
  role: 'primary' | 'secondary';
  confidence: 'high' | 'medium' | 'low';
};

export type CoverageTopic = {
  id: string;
  courseCode: string;
  title: string;
  position: number;
  competencyIds: string[];
  subsectionIds: string[];
  entryIds: string[];
};

export type CoverageValidation = {
  ok: boolean;
  issues: Issue[];
  entries: { id: string; confidence: 'high' | 'medium' | 'low' }[];
  links: EntryLink[];
  topics: CoverageTopic[];
  ignoredReasonCount: number;
  ignoredNotesCount: number;
  unknownCourseCodes: string[];
  unknownCompetencies: string[];
  unknownSubsections: string[];
  subsectionMismatchCount: number;
  confidence: Record<string, number>;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function slug(title: string): string {
  const value = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return value || 'topic';
}

export function isEntryMap(input: unknown): input is Record<string, unknown> {
  if (!isObject(input)) return false;
  const keys = Object.keys(input);
  if (!keys.length) return false;
  return keys.every(key => SOURCE_ENTRY_ID.test(key));
}

export function isCourseTopics(input: unknown): input is Record<string, unknown> {
  if (!isObject(input)) return false;
  const keys = Object.keys(input);
  if (!keys.length || !keys.every(key => COURSE_CODE.test(key))) return false;
  return keys.every(key => isObject(input[key]) && Array.isArray((input[key] as { topics?: unknown }).topics));
}

export function validateEntryMap(input: unknown): CoverageValidation {
  const empty = emptyResult();
  if (!isObject(input)) {
    empty.issues.push({ severity: 'error', path: '', message: 'Entry map must be a JSON object keyed by M- ids.' });
    empty.ok = false;
    return empty;
  }
  const unknown = new Set<string>();
  for (const [id, raw] of Object.entries(input)) {
    if (!SOURCE_ENTRY_ID.test(id)) {
      empty.issues.push({ severity: 'error', path: id, message: 'Source entry id must look like M-XXXXXX.' });
      continue;
    }
    if (!isObject(raw)) {
      empty.issues.push({ severity: 'error', path: id, message: 'Entry mapping must be an object.' });
      continue;
    }
    if ('reason' in raw && raw.reason != null && String(raw.reason).trim() !== '') empty.ignoredReasonCount += 1;
    const confidence = typeof raw.confidence === 'string' ? raw.confidence : '';
    if (!CONFIDENCE.has(confidence)) {
      empty.issues.push({ severity: 'error', path: id, message: 'Confidence must be high, medium, or low.' });
      continue;
    }
    const level = confidence as EntryLink['confidence'];
    empty.confidence[level] = (empty.confidence[level] ?? 0) + 1;
    const primary = typeof raw.primary === 'string' ? raw.primary : '';
    if (!COURSE_CODE.test(primary)) {
      unknown.add(primary || '(missing)');
      empty.issues.push({ severity: 'error', path: id, message: `Unknown primary course code "${primary}".` });
    } else {
      empty.links.push({ sourceEntryId: id, courseCode: primary, role: 'primary', confidence: level });
    }
    const secondary = Array.isArray(raw.secondary) ? raw.secondary : null;
    if (!secondary) {
      empty.issues.push({ severity: 'error', path: id, message: 'secondary must be an array of course codes.' });
    } else {
      for (const code of secondary) {
        if (typeof code !== 'string' || !COURSE_CODE.test(code)) {
          unknown.add(String(code));
          empty.issues.push({ severity: 'error', path: id, message: `Unknown secondary course code "${String(code)}".` });
        } else if (code === primary) {
          empty.issues.push({ severity: 'error', path: id, message: `Primary course ${code} is also listed as secondary.` });
        } else {
          empty.links.push({ sourceEntryId: id, courseCode: code, role: 'secondary', confidence: level });
        }
      }
    }
    empty.entries.push({ id, confidence: level });
  }
  empty.unknownCourseCodes = [...unknown].sort();
  empty.ok = !empty.issues.some(issue => issue.severity === 'error');
  return empty;
}

export function validateCourseTopics(input: unknown): CoverageValidation {
  const empty = emptyResult();
  if (!isCourseTopics(input)) {
    empty.issues.push({ severity: 'error', path: '', message: 'Course topics must be an object keyed by PSU course code.' });
    empty.ok = false;
    return empty;
  }
  const unknownCourses = new Set<string>();
  const unknownCompetencies = new Set<string>();
  const unknownSubsections = new Set<string>();
  for (const [courseCode, raw] of Object.entries(input)) {
    if (!COURSE_CODE.test(courseCode)) unknownCourses.add(courseCode);
    if (!isObject(raw) || !Array.isArray(raw.topics)) continue;
    if ('thin_competencies' in raw) empty.ignoredNotesCount += 1;
    const seenTitles = new Set<string>();
    raw.topics.forEach((topicRaw, index) => {
      if (!isObject(topicRaw)) {
        empty.issues.push({ severity: 'error', path: `${courseCode}.topics[${index}]`, message: 'Topic must be an object.' });
        return;
      }
      const title = typeof topicRaw.topic === 'string' ? topicRaw.topic.trim() : '';
      if (!title) {
        empty.issues.push({ severity: 'error', path: `${courseCode}.topics[${index}]`, message: 'Topic needs a topic title.' });
        return;
      }
      if (seenTitles.has(title.toLowerCase())) {
        empty.issues.push({ severity: 'error', path: `${courseCode}.topics[${index}]`, message: `Duplicate topic "${title}".` });
      }
      seenTitles.add(title.toLowerCase());
      const competencyIds: string[] = [];
      const names = Array.isArray(topicRaw.competencies) ? topicRaw.competencies : [];
      for (const name of names) {
        const resolved = typeof name === 'string' ? resolveCompetency(name) : undefined;
        if (!resolved) unknownCompetencies.add(String(name));
        else if (!competencyIds.includes(resolved.id)) competencyIds.push(resolved.id);
      }
      const subsectionIds: string[] = [];
      const subsectionNames = Array.isArray(topicRaw.subsections) ? topicRaw.subsections : [];
      for (const name of subsectionNames) {
        if (typeof name !== 'string') {
          unknownSubsections.add(String(name));
          continue;
        }
        const matches = resolveSubsectionName(name, competencyIds);
        if (matches.length === 0) unknownSubsections.add(name);
        else if (matches.length > 1) {
          empty.issues.push({ severity: 'error', path: `${courseCode}.topics[${index}]`, message: `Subsection "${name}" matches more than one row.` });
        } else {
          if (!subsectionIds.includes(matches[0].id)) subsectionIds.push(matches[0].id);
          if (competencyIds.length && !competencyIds.includes(matches[0].competencyId)) empty.subsectionMismatchCount += 1;
        }
      }
      const entryIds = Array.isArray(topicRaw.entry_ids) ? topicRaw.entry_ids.filter((id): id is string => typeof id === 'string') : [];
      for (const id of entryIds) {
        if (!SOURCE_ENTRY_ID.test(id)) {
          empty.issues.push({ severity: 'error', path: `${courseCode}.topics[${index}]`, message: `Bad entry id ${id}.` });
        }
      }
      empty.topics.push({
        id: `${courseCode}/${slug(title)}`,
        courseCode,
        title,
        position: index,
        competencyIds,
        subsectionIds,
        entryIds,
      });
    });
    const linked = (raw.topics as unknown[]).reduce<number>((sum, topic) => {
      if (!isObject(topic) || !Array.isArray(topic.entry_ids)) return sum;
      return sum + topic.entry_ids.length;
    }, 0);
    if (typeof raw.entry_count === 'number' && raw.entry_count !== linked) {
      empty.issues.push({
        severity: 'warning',
        path: courseCode,
        message: `entry_count is ${raw.entry_count} but topics list ${linked} entry ids.`,
      });
    }
  }
  empty.unknownCourseCodes = [...unknownCourses].sort();
  empty.unknownCompetencies = [...unknownCompetencies].sort();
  empty.unknownSubsections = [...unknownSubsections].sort();
  for (const code of empty.unknownCourseCodes) {
    empty.issues.push({ severity: 'error', path: code, message: `Unknown course code ${code}.` });
  }
  for (const name of empty.unknownCompetencies) {
    empty.issues.push({ severity: 'error', path: name, message: `Unknown competency name "${name}".` });
  }
  for (const name of empty.unknownSubsections) {
    empty.issues.push({ severity: 'error', path: name, message: `Unknown subsection name "${name}".` });
  }
  if (empty.subsectionMismatchCount > 0) {
    empty.issues.push({
      severity: 'warning',
      path: 'subsections',
      message: `${empty.subsectionMismatchCount} subsection tags sit outside the competencies listed on the same topic. They are still linked to the canonical subsection.`,
    });
  }
  empty.ok = !empty.issues.some(issue => issue.severity === 'error');
  return empty;
}

export function crossCheckCoverage(entries: CoverageValidation, topics: CoverageValidation): Issue[] {
  const known = new Set(entries.entries.map(entry => entry.id));
  const linked = new Set(topics.topics.flatMap(topic => topic.entryIds));
  const issues: Issue[] = [];
  const missing = [...linked].filter(id => !known.has(id));
  const unlinked = [...known].filter(id => !linked.has(id));
  if (missing.length) {
    issues.push({ severity: 'error', path: 'topics', message: `${missing.length} topic entry ids are missing from the entry map.` });
  }
  if (unlinked.length) {
    issues.push({ severity: 'warning', path: 'entries', message: `${unlinked.length} mapped entries are not linked from any topic.` });
  }
  const seen = new Map<string, string>();
  for (const topic of topics.topics) {
    for (const id of topic.entryIds) {
      const previous = seen.get(id);
      if (previous && previous !== topic.id) {
        issues.push({ severity: 'error', path: id, message: `Entry is listed on both ${previous} and ${topic.id}.` });
      }
      seen.set(id, topic.id);
    }
  }
  return issues;
}

/** Safe summary. Never includes reason text or topic prose beyond titles already in the source titles. */
export function coverageSummary(entries: CoverageValidation | null, topics: CoverageValidation | null, cross: Issue[] = []) {
  return {
    entries: entries?.entries.length ?? 0,
    primaryLinks: entries?.links.filter(link => link.role === 'primary').length ?? 0,
    secondaryLinks: entries?.links.filter(link => link.role === 'secondary').length ?? 0,
    confidence: entries?.confidence ?? {},
    ignoredReasonFields: entries?.ignoredReasonCount ?? 0,
    unknownCourseCodes: entries?.unknownCourseCodes ?? [],
    courses: new Set(topics?.topics.map(topic => topic.courseCode) ?? []).size,
    topics: topics?.topics.length ?? 0,
    topicEntryLinks: topics?.topics.reduce((sum, topic) => sum + topic.entryIds.length, 0) ?? 0,
    ignoredNoteFields: topics?.ignoredNotesCount ?? 0,
    unknownTopicCourseCodes: topics?.unknownCourseCodes ?? [],
    unknownCompetencies: topics?.unknownCompetencies ?? [],
    unknownSubsections: topics?.unknownSubsections ?? [],
    subsectionMismatchCount: topics?.subsectionMismatchCount ?? 0,
    crossCheck: cross.map(issue => issue.message),
    errors: [
      ...(entries?.issues.filter(issue => issue.severity === 'error') ?? []),
      ...(topics?.issues.filter(issue => issue.severity === 'error') ?? []),
      ...cross.filter(issue => issue.severity === 'error'),
    ].length,
    warnings: [
      ...(entries?.issues.filter(issue => issue.severity === 'warning') ?? []),
      ...(topics?.issues.filter(issue => issue.severity === 'warning') ?? []),
      ...cross.filter(issue => issue.severity === 'warning'),
    ].length,
  };
}

function emptyResult(): CoverageValidation {
  return {
    ok: true,
    issues: [],
    entries: [],
    links: [],
    topics: [],
    ignoredReasonCount: 0,
    ignoredNotesCount: 0,
    unknownCourseCodes: [],
    unknownCompetencies: [],
    unknownSubsections: [],
    subsectionMismatchCount: 0,
    confidence: { high: 0, medium: 0, low: 0 },
  };
}
