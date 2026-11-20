import { findSubsection, sameLevel, sameSubsection } from '@/games/catalog';
import type { CourseTree, NormalizedQuestion } from '@/games/types';

export type ContentScope = 'subsection' | 'level';

/**
 * Keep items for the selected level. Items with no level travel with every level.
 * Items tagged for a different level stay out, so a doctorate prompt is not served
 * during a paralegal session. Unscoped items are used only when nothing is tagged
 * for the selected level, unless exact matches exist — then unscoped items still
 * come along as shared practice.
 */
export function selectQuestions(
  questions: NormalizedQuestion[],
  tree: CourseTree,
  scope: { subsectionId: string; levelId: string; breadth: ContentScope },
): NormalizedQuestion[] {
  const inScope = questions.filter(question => {
    if (scope.breadth === 'subsection') {
      if (question.subsectionId && !sameSubsection(tree, question.subsectionId, scope.subsectionId)) return false;
      if (!question.subsectionId && question.competencyId) {
        const located = findSubsection(tree, scope.subsectionId);
        if (located && question.competencyId !== located.competency.id && question.competencyId !== located.competency.name) {
          return false;
        }
      }
    }
    return true;
  });
  const exactLevel = inScope.filter(question => question.levelId && sameLevel(tree.levels, question.levelId, scope.levelId));
  const unscoped = inScope.filter(question => !question.levelId);
  if (exactLevel.length) return [...exactLevel, ...unscoped].sort((a, b) => a.position - b.position);
  if (unscoped.length) return unscoped.sort((a, b) => a.position - b.position);
  return [];
}
