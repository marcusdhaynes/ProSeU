/**
 * Lesson UI swap:
 *   export { lessonAdapter } from '@/learning/client';
 */
export { createSupabaseLessonAdapter, lessonAdapter } from './client';
export type {
  CourseTree,
  LessonAdapter,
  LessonView,
  LevelProgress,
  ProgressSnapshot,
} from './client';
