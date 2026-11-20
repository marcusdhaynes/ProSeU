# Game content adapter

`loadPlaySet` resolves a course slug, id, or PSU code, then builds a play set.

Order:

1. `getLesson` from the learning client (null in the mock).
2. Published `proseu_template_items` for that `course_id`. Payload fields are used when `subsection_id`, `level_id`, and `question_type` columns are not present yet. Anonymous reads of that table currently fail the `is_admin()` policy (the audit's 401). The adapter treats that as empty and continues. It does not change the policy.
3. Published `proseu_atomic_concepts` for that course, if no template items came back.
4. A file in `content/courses/` whose `curriculumCode` matches, once it is exported from `content/courses/index.ts`.
5. `sample.json`, which is sample data, not a course.

Competency and subsection names are the stored keys (`Procedural Framework`, `Practical Skills`, and the subsection strings). Aliases `Procedural Frameworks` and `Practical Application` also match. The four lists that were misfiled are keyed here by meaning: Decision Standards holds the proof and review standards, Major Cases holds the case types, Policy Debates holds the dichotomies, and Practical Skills holds the advocacy moves. Games look those up by id or by name, not by the old screen index.

Difficulty uses the level's `position` (0–3): slower drops, more lives, and fewer distractors at the first position.
