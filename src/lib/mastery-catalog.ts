/**
 * Shared competency and mastery-level catalog.
 *
 * Stored competency keys stay the strings already written onto concept `MS`
 * fields: "Procedural Framework" and "Practical Skills". The path shows the
 * owner's display names. Subsection name strings are unchanged so existing
 * `PN` values still match; four of the lists were filed under the wrong
 * competency and are corrected here.
 *
 * Level ids follow the audit draft (`paralegal` … `doctorate`). The ring
 * still paints them with the existing tier keys and thresholds 1, 9, 17, 25.
 */

export type TierKey = 'basic' | 'electrum' | 'orichalcum' | 'adamantine';
export type LevelId = 'paralegal' | 'bachelor' | 'masters' | 'doctorate';

export interface MasteryLevel {
  id: LevelId;
  tier: TierKey;
  position: number;
  /** Button color changes at this progress value. */
  threshold: number;
  name: string;
  audience: string;
  colorHex: string;
  shadowHex: string;
}

export const RING_MAX = 32;
export const POINTS_PER_LEVEL = 8;

export const MASTERY_LEVELS: readonly MasteryLevel[] = [
  { id: 'paralegal', tier: 'basic', position: 0, threshold: 1, name: 'Paralegal', audience: 'Associate', colorHex: '#ff4b4b', shadowHex: '#9e2b2b' },
  { id: 'bachelor', tier: 'electrum', position: 1, threshold: 9, name: 'Bachelor of Law', audience: 'Bachelor', colorHex: '#FFD54F', shadowHex: '#B29500' },
  { id: 'masters', tier: 'orichalcum', position: 2, threshold: 17, name: 'Masters', audience: 'Masters', colorHex: '#FF4500', shadowHex: '#8B0000' },
  { id: 'doctorate', tier: 'adamantine', position: 3, threshold: 25, name: 'Doctorate', audience: 'Doctorate', colorHex: '#1a1a1a', shadowHex: '#000000' },
] as const;

export const TIER_ORDER: readonly TierKey[] = ['basic', 'electrum', 'orichalcum', 'adamantine'];

/** Existing ring paints. Tier 0 (`basic`) keeps an empty color so the node uses the competency color. */
export const TIER_STYLES: Record<TierKey, { color: string; shadow: string; label: string }> = {
  basic: { color: '', shadow: '', label: 'Basic' },
  electrum: { color: '#FFD54F', shadow: '#B29500', label: 'Electrum' },
  orichalcum: { color: '#FF4500', shadow: '#8B0000', label: 'Orichalcum' },
  adamantine: { color: '#1a1a1a', shadow: '#000000', label: 'Adamantine' },
};

export interface MasteryPrinciple {
  /** Stored principle name. Backward compatible with concept `PN` lines. */
  key: string;
  /** Same as `key`. Kept so existing path JSX can read `principle.name`. */
  name: string;
  slug: string;
  snippet: string;
}

export interface MasterySection {
  /** Stored competency name. Backward compatible with concept `MS` lines. */
  key: string;
  /** Owner display name. */
  name: string;
  displayName: string;
  slug: string;
  desc: string;
  color: string;
  principles: MasteryPrinciple[];
}

function principle(key: string, snippet: string): MasteryPrinciple {
  return { key, name: key, slug: slugify(key), snippet };
}

export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function subsectionId(competencySlug: string, principleSlug: string): string {
  return `${competencySlug}.${principleSlug}`;
}

export const MASTERY_SECTIONS: readonly MasterySection[] = [
  {
    key: 'Core Principles',
    name: 'Core Principles',
    displayName: 'Core Principles',
    slug: 'core-principles',
    desc: 'Foundational concepts and state-individual relationships.',
    color: '#ff4b4b',
    principles: [
      principle('Authority', 'WHO HAS LEGAL POWER...'),
      principle('Rights', 'WHO IS PROTECTED...'),
      principle('Duties', 'WHO IS OBLIGATED...'),
      principle('Harm', 'WHAT COUNTS AS INJURY...'),
      principle('Causation', 'LEGAL RESPONSIBILITY LINK...'),
      principle('Remedy', 'LEGAL CONSEQUENCES...'),
      principle('Legitimacy', 'WHY AUTHORITY IS VALID...'),
    ],
  },
  {
    key: 'Major Doctrines',
    name: 'Major Doctrines',
    displayName: 'Major Doctrines',
    slug: 'major-doctrines',
    desc: 'Key rules, standards, and legal definitions.',
    color: '#ff9600',
    principles: [
      principle('Jurisdiction Doctrines', 'AUTHORITY SCOPE DEFINED...'),
      principle('Liability Doctrines', 'CONDITIONS FOR RESPONSIBILITY...'),
      principle('Defense Doctrines', 'VALID EXCUSES...'),
      principle('Remedy Doctrines', 'AVAILABLE RELIEF...'),
      principle('Procedural Doctrines', 'CASE PROGRESSION RULES...'),
      principle('Constitutional Doctrines', 'RIGHTS AND STRUCTURE...'),
      principle('Equity Doctrines', 'FAIRNESS-BASED RULES...'),
    ],
  },
  {
    key: 'Procedural Framework',
    name: 'Procedural Frameworks',
    displayName: 'Procedural Frameworks',
    slug: 'procedural-framework',
    desc: 'Steps for application, enforcement, and adjudication.',
    color: '#e6b400',
    principles: [
      principle('Jurisdiction Establishment', 'COURT AUTHORITY CONFIRMED...'),
      principle('Pleading', 'CLAIMS AND DEFENSES STATED...'),
      principle('Motion Practice', 'ISSUES RESOLVED EARLY...'),
      principle('Discovery', 'EVIDENCE OBTAINED...'),
      principle('Pre-trial Resolution', 'SETTLEMENT OR DISMISSAL...'),
      principle('Adjudication', 'CASE DECIDED...'),
      principle('Appeal and Review', 'DECISION REVIEWED...'),
    ],
  },
  {
    key: 'Decision Standards',
    name: 'Decision Standards',
    displayName: 'Decision Standards',
    slug: 'decision-standards',
    desc: 'The lens through which the court decides outcomes.',
    color: '#58cc02',
    principles: [
      principle('Burden of Proof', 'WHO MUST PROVE...'),
      principle('Standard of Proof', 'HOW MUCH PROOF...'),
      principle('Standard of Review', 'APPELLATE REVIEW...'),
      principle('Level of Scrutiny', 'RIGHTS PROTECTION...'),
      principle('Evidentiary Weight', 'EVALUATING EVIDENCE...'),
      principle('Deference Doctrines', 'WHEN COURTS DEFER...'),
      principle('Balancing Tests', 'WEIGHING INTERESTS...'),
    ],
  },
  {
    key: 'Major Cases',
    name: 'Major Cases',
    displayName: 'Major Cases',
    slug: 'major-cases',
    desc: 'Landmark judicial decisions and their impacts.',
    color: '#1cb0f6',
    principles: [
      principle('Authority-Defining Cases', 'WHO HOLDS AUTHORITY...'),
      principle('Rights-Defining Cases', 'SCOPE OF RIGHTS...'),
      principle('Limits-of-Power Cases', 'BOUNDARIES ENFORCED...'),
      principle('Procedure-Defining Cases', 'PROCESS REQUIREMENTS...'),
      principle('Liability-Expansion Cases', 'SCOPE BROADENED...'),
      principle('Liability-Restriction Cases', 'SCOPE NARROWED...'),
      principle('Paradigm-Shifting Cases', 'FRAMEWORK CHANGED...'),
    ],
  },
  {
    key: 'Policy Debates',
    name: 'Policy Debates',
    displayName: 'Policy Debates',
    slug: 'policy-debates',
    desc: 'Controversies, reforms, and competing arguments.',
    color: '#9333ea',
    principles: [
      principle('Individual vs State Power', 'BALANCE OF POWER...'),
      principle('Fairness vs Efficiency', 'JUSTICE VS SYSTEM...'),
      principle('Predictability vs Flexibility', 'CONSISTENCY VS ADAPTATION...'),
      principle('Centralization vs Decentralization', 'POWER DISTRIBUTION...'),
      principle('Formalism vs Pragmatism', 'STRICT VS PRACTICAL...'),
      principle('Stability vs Evolution', 'CONTINUITY VS CHANGE...'),
      principle('Liberty vs Security', 'FREEDOM VS SAFETY...'),
    ],
  },
  {
    key: 'Practical Skills',
    name: 'Practical Application',
    displayName: 'Practical Application',
    slug: 'practical-skills',
    desc: 'Real-world application, drafting, and advocacy.',
    color: '#ff66aa',
    principles: [
      principle('Issue Spotting', 'IDENTIFYING PROBLEMS...'),
      principle('Rule Extraction', 'DERIVING RULES...'),
      principle('Burden Manipulation', 'SHIFTING PROOF...'),
      principle('Evidence Structuring', 'ORGANIZING RECORDS...'),
      principle('Argument Construction', 'LOGICAL REASONING...'),
      principle('Procedural Leverage', 'USING PROCESS...'),
      principle('Judicial Psychology Navigation', 'UNDERSTANDING TENDENCIES...'),
    ],
  },
];

/** Keys are the stored competency names. Values are the stored subsection names. */
export const MASTERY_MAP: Record<string, string[]> = Object.fromEntries(
  MASTERY_SECTIONS.map(section => [section.key, section.principles.map(item => item.key)]),
);

export function competencyDisplayName(storedKey: string): string {
  return MASTERY_SECTIONS.find(section => section.key === storedKey)?.displayName ?? storedKey;
}

export const LEVELS_IN_ORDER: readonly LevelId[] = MASTERY_LEVELS.map(level => level.id);

export function levelById(id: LevelId): MasteryLevel {
  const level = MASTERY_LEVELS.find(item => item.id === id);
  if (!level) throw new Error(`Unknown mastery level: ${id}`);
  return level;
}

export function findSubsection(id: string): { section: MasterySection; principle: MasteryPrinciple; sectionIndex: number; principleIndex: number } | null {
  for (let sectionIndex = 0; sectionIndex < MASTERY_SECTIONS.length; sectionIndex += 1) {
    const section = MASTERY_SECTIONS[sectionIndex];
    const principleIndex = section.principles.findIndex(item => subsectionId(section.slug, item.slug) === id);
    if (principleIndex >= 0) {
      return { section, principle: section.principles[principleIndex], sectionIndex, principleIndex };
    }
  }
  return null;
}
