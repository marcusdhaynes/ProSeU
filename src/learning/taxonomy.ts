/**
 * Canonical mastery taxonomy.
 *
 * Display names for two competencies differ from the strings stored on
 * existing concept records (`Procedural Framework`, `Practical Skills`).
 * `id` and `legacyName` stay compatible with those strings and with the
 * ids suggested in docs/learning-system/AUDIT.md. `name` is what students
 * should see. The Learn page still has the old lists; the UI agent owns
 * that change. This module does not render anything.
 */

export const LEVEL_IDS = ['paralegal', 'bachelor', 'masters', 'doctorate'] as const;
export type LevelId = (typeof LEVEL_IDS)[number];

export const TIER_KEYS = ['basic', 'electrum', 'orichalcum', 'adamantine'] as const;
export type TierKey = (typeof TIER_KEYS)[number];

export type LevelDef = {
  id: LevelId;
  position: number;
  tierKey: TierKey;
  /** Degree name shown to students. */
  name: string;
  audience: string;
  /**
   * Candidate paint. Paralegal stores the proposed red, but
   * `useCompetencyColor` is true until design decides whether Basic
   * renders as that red or as the competency color (today's ring).
   */
  colorHex: string;
  shadowHex: string | null;
  useCompetencyColor: boolean;
  /** Node-badge threshold on the 0–32 ring. Matches DuolingoNode. */
  fillThreshold: number;
  /** Accepted in content files and unit keys. Stored id is `id`. */
  aliases: readonly string[];
};

export const LEVELS: readonly LevelDef[] = [
  {
    id: 'paralegal', position: 0, tierKey: 'basic', name: 'Paralegal', audience: 'Associate',
    colorHex: '#ff4b4b', shadowHex: null, useCompetencyColor: true, fillThreshold: 1,
    aliases: ['red', 'basic', 'associate'],
  },
  {
    id: 'bachelor', position: 1, tierKey: 'electrum', name: 'Bachelor of Law', audience: 'Bachelor',
    colorHex: '#FFD54F', shadowHex: '#B29500', useCompetencyColor: false, fillThreshold: 9,
    aliases: ['yellow', 'electrum'],
  },
  {
    id: 'masters', position: 2, tierKey: 'orichalcum', name: 'Masters', audience: 'Masters',
    colorHex: '#FF4500', shadowHex: '#8B0000', useCompetencyColor: false, fillThreshold: 17,
    aliases: ['orange', 'orichalcum', 'master'],
  },
  {
    id: 'doctorate', position: 3, tierKey: 'adamantine', name: 'Doctorate', audience: 'Doctorate',
    colorHex: '#1a1a1a', shadowHex: '#000000', useCompetencyColor: false, fillThreshold: 25,
    aliases: ['black', 'adamantine'],
  },
];

export type CompetencyDef = {
  id: string;
  code: string;
  position: number;
  name: string;
  legacyName: string;
  /** File keys and shortened labels that must still resolve. Underscores are folded to hyphens before matching. */
  aliases: readonly string[];
  definition: string;
  colorHex: string;
};

export const COMPETENCIES: readonly CompetencyDef[] = [
  { id: 'core-principles', code: 'CP', position: 0, name: 'Core Principles', legacyName: 'Core Principles', aliases: ['core_principles'], definition: 'Foundational concepts and state-individual relationships.', colorHex: '#ff4b4b' },
  { id: 'major-doctrines', code: 'MD', position: 1, name: 'Major Doctrines', legacyName: 'Major Doctrines', aliases: ['major_doctrines'], definition: 'Key rules, standards, and legal definitions.', colorHex: '#ff9600' },
  { id: 'procedural-framework', code: 'PF', position: 2, name: 'Procedural Frameworks', legacyName: 'Procedural Framework', aliases: ['procedural_framework', 'procedural_frameworks', 'procedural-frameworks'], definition: 'Steps for application, enforcement, and adjudication.', colorHex: '#e6b400' },
  { id: 'decision-standards', code: 'DS', position: 3, name: 'Decision Standards', legacyName: 'Decision Standards', aliases: ['decision_standards'], definition: 'The lens through which the court decides outcomes.', colorHex: '#58cc02' },
  { id: 'major-cases', code: 'MC', position: 4, name: 'Major Cases', legacyName: 'Major Cases', aliases: ['major_cases'], definition: 'Landmark judicial decisions and their impacts.', colorHex: '#1cb0f6' },
  { id: 'policy-debates', code: 'PD', position: 5, name: 'Policy Debates', legacyName: 'Policy Debates', aliases: ['policy_debates'], definition: 'Controversies, reforms, and competing arguments.', colorHex: '#9333ea' },
  { id: 'practical-skills', code: 'PA', position: 6, name: 'Practical Application', legacyName: 'Practical Skills', aliases: ['practical_skills', 'practical_application', 'practical-application'], definition: 'Real-world application, drafting, and advocacy.', colorHex: '#ff66aa' },
];

export type SubsectionDef = {
  id: string;
  competencyId: string;
  slug: string;
  position: number;
  name: string;
  snippet: string;
  /** Short labels used by the coverage map, such as "Authority-Defining". */
  aliases: readonly string[];
};

function subsection(competencyId: string, position: number, slug: string, name: string, snippet: string, aliases: readonly string[] = []): SubsectionDef {
  return { id: `${competencyId}.${slug}`, competencyId, slug, position, name, snippet, aliases };
}

export const SUBSECTIONS: readonly SubsectionDef[] = [
  subsection('core-principles', 0, 'authority', 'Authority', 'WHO HAS LEGAL POWER...'),
  subsection('core-principles', 1, 'rights', 'Rights', 'WHO IS PROTECTED...'),
  subsection('core-principles', 2, 'duties', 'Duties', 'WHO IS OBLIGATED...'),
  subsection('core-principles', 3, 'harm', 'Harm', 'WHAT COUNTS AS INJURY...'),
  subsection('core-principles', 4, 'causation', 'Causation', 'LEGAL RESPONSIBILITY LINK...'),
  subsection('core-principles', 5, 'remedy', 'Remedy', 'LEGAL CONSEQUENCES...'),
  subsection('core-principles', 6, 'legitimacy', 'Legitimacy', 'WHY AUTHORITY IS VALID...'),

  subsection('major-doctrines', 0, 'jurisdiction-doctrines', 'Jurisdiction Doctrines', 'AUTHORITY SCOPE DEFINED...'),
  subsection('major-doctrines', 1, 'liability-doctrines', 'Liability Doctrines', 'CONDITIONS FOR RESPONSIBILITY...'),
  subsection('major-doctrines', 2, 'defense-doctrines', 'Defense Doctrines', 'VALID EXCUSES...'),
  subsection('major-doctrines', 3, 'remedy-doctrines', 'Remedy Doctrines', 'AVAILABLE RELIEF...'),
  subsection('major-doctrines', 4, 'procedural-doctrines', 'Procedural Doctrines', 'CASE PROGRESSION RULES...'),
  subsection('major-doctrines', 5, 'constitutional-doctrines', 'Constitutional Doctrines', 'RIGHTS AND STRUCTURE...'),
  subsection('major-doctrines', 6, 'equity-doctrines', 'Equity Doctrines', 'FAIRNESS-BASED RULES...'),

  subsection('procedural-framework', 0, 'jurisdiction-establishment', 'Jurisdiction Establishment', 'COURT AUTHORITY CONFIRMED...'),
  subsection('procedural-framework', 1, 'pleading', 'Pleading', 'CLAIMS AND DEFENSES STATED...'),
  subsection('procedural-framework', 2, 'motion-practice', 'Motion Practice', 'ISSUES RESOLVED EARLY...'),
  subsection('procedural-framework', 3, 'discovery', 'Discovery', 'EVIDENCE OBTAINED...'),
  subsection('procedural-framework', 4, 'pre-trial-resolution', 'Pre-trial Resolution', 'SETTLEMENT OR DISMISSAL...'),
  subsection('procedural-framework', 5, 'adjudication', 'Adjudication', 'CASE DECIDED...'),
  subsection('procedural-framework', 6, 'appeal-and-review', 'Appeal and Review', 'DECISION REVIEWED...'),

  subsection('decision-standards', 0, 'burden-of-proof', 'Burden of Proof', 'WHO MUST PROVE...'),
  subsection('decision-standards', 1, 'standard-of-proof', 'Standard of Proof', 'HOW MUCH PROOF...'),
  subsection('decision-standards', 2, 'standard-of-review', 'Standard of Review', 'APPELLATE REVIEW...'),
  subsection('decision-standards', 3, 'level-of-scrutiny', 'Level of Scrutiny', 'RIGHTS PROTECTION...'),
  subsection('decision-standards', 4, 'evidentiary-weight', 'Evidentiary Weight', 'EVALUATING EVIDENCE...'),
  subsection('decision-standards', 5, 'deference-doctrines', 'Deference Doctrines', 'WHEN COURTS DEFER...'),
  subsection('decision-standards', 6, 'balancing-tests', 'Balancing Tests', 'WEIGHING INTERESTS...'),

  subsection('major-cases', 0, 'authority-defining-cases', 'Authority-Defining Cases', 'WHO HOLDS AUTHORITY...', ['Authority-Defining']),
  subsection('major-cases', 1, 'rights-defining-cases', 'Rights-Defining Cases', 'SCOPE OF RIGHTS...', ['Rights-Defining']),
  subsection('major-cases', 2, 'limits-of-power-cases', 'Limits-of-Power Cases', 'BOUNDARIES ENFORCED...', ['Limits-of-Power']),
  subsection('major-cases', 3, 'procedure-defining-cases', 'Procedure-Defining Cases', 'PROCESS REQUIREMENTS...', ['Procedure-Defining']),
  subsection('major-cases', 4, 'liability-expansion-cases', 'Liability-Expansion Cases', 'SCOPE BROADENED...', ['Liability-Expansion']),
  subsection('major-cases', 5, 'liability-restriction-cases', 'Liability-Restriction Cases', 'SCOPE NARROWED...', ['Liability-Restriction']),
  subsection('major-cases', 6, 'paradigm-shifting-cases', 'Paradigm-Shifting Cases', 'FRAMEWORK CHANGED...', ['Paradigm-Shifting']),

  subsection('policy-debates', 0, 'individual-vs-state-power', 'Individual vs State Power', 'BALANCE OF POWER...'),
  subsection('policy-debates', 1, 'fairness-vs-efficiency', 'Fairness vs Efficiency', 'JUSTICE VS SYSTEM...'),
  subsection('policy-debates', 2, 'predictability-vs-flexibility', 'Predictability vs Flexibility', 'CONSISTENCY VS ADAPTATION...'),
  subsection('policy-debates', 3, 'centralization-vs-decentralization', 'Centralization vs Decentralization', 'POWER DISTRIBUTION...'),
  subsection('policy-debates', 4, 'formalism-vs-pragmatism', 'Formalism vs Pragmatism', 'STRICT VS PRACTICAL...'),
  subsection('policy-debates', 5, 'stability-vs-evolution', 'Stability vs Evolution', 'CONTINUITY VS CHANGE...'),
  subsection('policy-debates', 6, 'liberty-vs-security', 'Liberty vs Security', 'FREEDOM VS SAFETY...'),

  subsection('practical-skills', 0, 'issue-spotting', 'Issue Spotting', 'IDENTIFYING PROBLEMS...'),
  subsection('practical-skills', 1, 'rule-extraction', 'Rule Extraction', 'DERIVING RULES...'),
  subsection('practical-skills', 2, 'burden-manipulation', 'Burden Manipulation', 'SHIFTING PROOF...'),
  subsection('practical-skills', 3, 'evidence-structuring', 'Evidence Structuring', 'ORGANIZING RECORDS...'),
  subsection('practical-skills', 4, 'argument-construction', 'Argument Construction', 'LOGICAL REASONING...'),
  subsection('practical-skills', 5, 'procedural-leverage', 'Procedural Leverage', 'USING PROCESS...'),
  subsection('practical-skills', 6, 'judicial-psychology-navigation', 'Judicial Psychology Navigation', 'UNDERSTANDING TENDENCIES...'),
];

const byId = new Map(COMPETENCIES.map(row => [row.id, row]));

export function competencyById(id: string): CompetencyDef | undefined {
  return byId.get(id);
}

function foldKey(input: string): string {
  return input.trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, ' ');
}

export function resolveCompetency(input: string): CompetencyDef | undefined {
  const needle = foldKey(input);
  const spaced = input.trim().toLowerCase();
  return COMPETENCIES.find(row =>
    row.id === needle ||
    row.code.toLowerCase() === needle ||
    row.name.toLowerCase() === spaced ||
    row.legacyName.toLowerCase() === spaced ||
    row.aliases.some(alias => foldKey(alias) === needle || alias.toLowerCase() === spaced),
  );
}

export function resolveSubsection(competencyId: string, input: string): SubsectionDef | undefined {
  return resolveSubsectionName(input, [competencyId])[0];
}

/** Match a coverage-map or lesson label. Prefer the given competencies, then the full catalog. */
export function resolveSubsectionName(input: string, competencyIds?: readonly string[]): SubsectionDef[] {
  const needle = foldKey(input);
  const spaced = input.trim().toLowerCase();
  const match = (row: SubsectionDef) =>
    row.id.toLowerCase() === needle ||
    row.slug === needle ||
    row.name.toLowerCase() === spaced ||
    row.aliases.some(alias => alias.toLowerCase() === spaced || foldKey(alias) === needle);
  if (competencyIds?.length) {
    const scoped = SUBSECTIONS.filter(row => competencyIds.includes(row.competencyId) && match(row));
    if (scoped.length > 0) return scoped;
  }
  return SUBSECTIONS.filter(match);
}

export function resolveLevel(input: string): LevelDef | undefined {
  const needle = input.trim().toLowerCase();
  return LEVELS.find(row =>
    row.id === needle ||
    row.tierKey === needle ||
    row.name.toLowerCase() === needle ||
    row.aliases.includes(needle),
  );
}

const UNIT_KEY = /^PSU-([1-9])\.([1-8])\/([^/]+)\/([^/]+)\/([^/]+)$/;

export function parseUnitKey(unitKey: string): {
  courseCode: string;
  competency: string;
  subsection: string;
  level: string;
} | null {
  const match = UNIT_KEY.exec(unitKey.trim());
  if (!match) return null;
  return {
    courseCode: `PSU-${match[1]}.${match[2]}`,
    competency: match[3],
    subsection: match[4],
    level: match[5],
  };
}

export function lessonId(courseCode: string, competencyId: string, slug: string, levelId: string): string {
  return `${courseCode}/${competencyId}/${slug}/${levelId}`;
}

export const COURSE_CODE = /^PSU-[1-9]\.[1-8]$/;
export const SOURCE_ENTRY_ID = /^M-[A-Z0-9]{4,16}$/;
export const RING_CAP = 32;
