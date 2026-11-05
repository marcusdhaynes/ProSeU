/**
 * One source of truth for a course card's Play action.
 * The title/description still open the outline; Play starts the first lesson.
 * An unsupported course goes to its outline rather than to an empty node.
 */
export type PlayableCourse = {
  slug: string;
  title?: string;
  curriculumCode?: string | null;
  code?: string | null;
};

export function isJurisprudenceCourse(course: Omit<PlayableCourse, 'slug'> | null): boolean {
  if (!course) return false;
  return course.curriculumCode === 'PSU-1.1'
    || course.code === 'PSU-1.1'
    || course.title === 'Jurisprudence: What Law Is and Why It Binds';
}

export const JURISPRUDENCE_START_NODE = 'core-principles.authority' as const;

export function coursePlayUrl(current: URLSearchParams, domainSlug: string, course: PlayableCourse): string {
  const params = new URLSearchParams(current.toString());
  params.set('dom', domainSlug);
  params.set('course', course.slug);
  if (isJurisprudenceCourse(course)) params.set('node', JURISPRUDENCE_START_NODE);
  else params.delete('node');
  params.delete('view');
  return `/learn?${params.toString()}`;
}
