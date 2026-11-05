import { supabase } from './client';

/**
 * The public Academy is a read-only view of Supabase's published curriculum.
 * This deliberately does not use Firebase Auth or Supabase Auth: published
 * catalog rows can be read by the anon role under PostgreSQL RLS.
 * Editing always goes through the authenticated Admin Console.
 */
export type AcademyDomain = {
  id: string;
  name: string;
  description: string;
  slug: string;
  code: string | null;
  order: number;
  visible: true;
};
export type AcademyField = {
  id: string;
  name: string;
  description: string;
  domainId: string;
  order: number;
  code: string | null;
  visible: true;
};
export type AcademyCourse = {
  id: string;
  title: string;
  description: string;
  slug: string;
  domainId: string;
  fieldId: string;
  order: number;
  code: string | null;
  curriculumCode: string | null;
  visible: true;
};
export type AcademyCatalog = {
  domains: AcademyDomain[];
  fields: AcademyField[];
  courses: AcademyCourse[];
};

export const EMPTY_ACADEMY_CATALOG: AcademyCatalog = {
  domains: [], fields: [], courses: [],
};
/** Available with the static GitHub Pages deployment even when ProSeU has no
 * connected curriculum database. This is a LOCAL DRAFT PREVIEW, not a
 * fabricated published row. Do not award certified progress from its id.
 */
export const JURISPRUDENCE_PREVIEW_CATALOG: AcademyCatalog = {
  domains: [{
    id: 'preview:stage01', name: 'Stage 01 — The Architecture of Law',
    description: 'Foundations of legal reasoning and institutions.',
    slug: 'the-architecture-of-law', code: 'PSU-STAGE-01', order: 0, visible: true,
  }],
  fields: [{
    id: 'preview:foundations', name: 'Core Legal Foundations',
    description: 'First-stage legal study (draft preview).',
    domainId: 'preview:stage01', order: 0, code: 'PSU-STAGE-01', visible: true,
  }],
  courses: [{
    id: 'preview:PSU-1.1',
    title: 'Jurisprudence: What Law Is and Why It Binds',
    description: 'First complete draft — 196 lessons. Device-local practice only; not published or graded.',
    slug: 'jurisprudence-what-law-is-and-why-it-binds',
    domainId: 'preview:stage01', fieldId: 'preview:foundations',
    order: 0, code: 'PSU-1.1', curriculumCode: 'PSU-1.1', visible: true,
  }],
};

export function withJurisprudencePreview(catalog: AcademyCatalog): AcademyCatalog {
  const courseExists = catalog.courses.some(course => course.curriculumCode === 'PSU-1.1'
    || course.code === 'PSU-1.1'
    || course.title === 'Jurisprudence: What Law Is and Why It Binds');
  if (courseExists) return catalog;
  return {
    domains: [...catalog.domains, ...JURISPRUDENCE_PREVIEW_CATALOG.domains],
    fields: [...catalog.fields, ...JURISPRUDENCE_PREVIEW_CATALOG.fields],
    courses: [...catalog.courses, ...JURISPRUDENCE_PREVIEW_CATALOG.courses],
  };
}


export async function getPublishedAcademyCatalog(): Promise<AcademyCatalog> {
  if (!supabase) return JURISPRUDENCE_PREVIEW_CATALOG;
  let domainResult: any, fieldResult: any, courseResult: any;
  try {
    [domainResult, fieldResult, courseResult] = await Promise.all([
    supabase.from('proseu_domains')
      .select('id,name,description,slug,code,position')
      .eq('status', 'published')
      .order('position', { ascending: true }).limit(1000),
    supabase.from('proseu_fields')
      .select('id,domain_id,name,description,code,position')
      .eq('status', 'published')
      .order('position', { ascending: true }).limit(1000),
    supabase.from('proseu_courses')
      .select('id,domain_id,field_id,title,description,slug,code,position,content')
      .eq('status', 'published')
      .order('position', { ascending: true }).limit(1000),
    ]);
  } catch {
    // Offline and unavailable catalogs must not prevent read-only draft study.
    return JURISPRUDENCE_PREVIEW_CATALOG;
  }

  for (const result of [domainResult, fieldResult, courseResult]) {
    if (result.error) return JURISPRUDENCE_PREVIEW_CATALOG;
  }

  const domains = (domainResult.data || []).map(row => ({
    id: row.id,
    name: row.name,
    description: row.description || '',
    slug: row.slug || row.id,
    code: row.code,
    order: row.position,
    visible: true as const,
  }));
  const fields = (fieldResult.data || []).map(row => ({
    id: row.id,
    name: row.name,
    description: row.description || '',
    domainId: row.domain_id,
    code: row.code,
    order: row.position,
    visible: true as const,
  }));
  const courses = (courseResult.data || []).map(row => ({
    id: row.id,
    title: row.title,
    description: row.description || '',
    slug: row.slug || row.id,
    domainId: row.domain_id,
    fieldId: row.field_id,
    code: row.code,
    curriculumCode: typeof row.content?.curriculumCode === 'string' ? row.content.curriculumCode : null,
    order: row.position,
    visible: true as const,
  }));

  return withJurisprudencePreview({ domains, fields, courses });
}
