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

export async function getPublishedAcademyCatalog(): Promise<AcademyCatalog> {
  if (!supabase) throw new Error('The Supabase catalog is not configured.');
  const [domainResult, fieldResult, courseResult] = await Promise.all([
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

  for (const result of [domainResult, fieldResult, courseResult]) {
    if (result.error) throw new Error(`Could not load the published Academy catalog: ${result.error.message}`);
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

  return { domains, fields, courses };
}
