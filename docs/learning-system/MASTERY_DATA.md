# Mastery data layer

Additive migration `supabase/migrations/20261103_000012_mastery_learning.sql`. It does not copy the 9 stages or 72 courses. Lessons reference the existing `proseu_courses` row (`content.curriculumCode`, for example `PSU-1.1`, id `founding-psu-1-1`).

## Lesson screen

The read API matches PR #4's `LessonAdapter`. One line in `src/lib/lesson-adapter.ts`:

```ts
export { lessonAdapter } from '@/learning/client';
```

`getCourseTree`, `getLesson`, `markSectionUnderstood`, `submitAnswer`, and `getProgress` keep that PR's argument and return types. `submitAnswer` grades on the server and returns one `explanation` string.

## Tables

| Table | Purpose |
| --- | --- |
| `proseu_mastery_levels` | paralegal, bachelor, masters, doctorate. `tier_key` is basic, electrum, orichalcum, adamantine. `fill_threshold` is 1, 9, 17, 25. `use_competency_color` keeps Basic on the competency color until design turns the stored red on. |
| `proseu_competencies` | Seven shared competencies. `name` is the student label (Procedural Frameworks, Practical Application). `legacy_name` is the string already stored on concept `MS` fields. |
| `proseu_subsections` | The 49 shared subsections, including the corrected Decision Standards, Major Cases, Policy Debates, and Practical Application lists. |
| `proseu_lessons` | One row per course × subsection × level. |
| `proseu_checklist_items` | "I can" lines. |
| `proseu_lesson_sections` | Accordions: body, example, `audio_script`, `audio_url`, `video_url`. |
| `proseu_section_acknowledgements` | "I understand", per student. |
| `proseu_subsection_progress` | Both inputs of the 40/60 rule, per student × course × subsection × level. |
| `proseu_mastery_settings` | `review_weight` 0.4 and `score_weight` 0.6. Change the row to retune without a migration. |
| `proseu_template_items` | Questions. Nullable `lesson_id`, `subsection_id`, `level_id`, `question_type`, `stable_key`. `payload` is jsonb. |
| `proseu_template_answer_keys` | Server grading copy. Not readable by students. |
| `proseu_learning_attempts` | Existing append-only attempts, plus lesson, `source` (consumer name; lesson answers use `lesson`), and `graded_by`. |
| `proseu_source_entries`, `proseu_entry_courses` | M-id to primary and secondary course, with confidence. No reason column. |
| `proseu_coverage_topics` and link tables | Topic to competencies, subsections, and entry ids. |
| `proseu_lesson_topics` | Empty. A later import can attach a lesson to a topic. |

`proseu_courses`, domains, fields, atomic concepts, and the ten template definitions are reused and not duplicated.

## Progress

Stored on each level row: `sections_total`, `sections_acknowledged`, `questions_total` (authored true/false, multiple choice, matching, and fill-in items), `questions_answered`, and `questions_correct` (latest outcome per item).

`fill_ratio = review_weight * (acknowledged / sections) + score_weight * (correct / questions_total)`.

If the lesson has no authored questions, the score denominator falls back to `questions_answered`. `fill_points` is that level's 0–8 ring slots. The 0–32 node integer is computed in order: a level adds slots only after the previous level's ratio is 1. Both inputs are stored, and the weights are a settings row.

## Who can read what

Anonymous visitors can read published lessons, sections, checklists, and published template items whose template is published. Learn already browses without an account, so a guest can open a published lesson. The old template-item policy called `is_admin()` and rejected anonymous reads. The new published-read policy does not.

Drafts are visible to content editors (admins and the new `author` grant). The coverage tables are admin-only. Students never receive them from `getLesson` or `getCourseTree`. Answer keys stay editor-only; the published question payload is the prompt and choices, not the answer.

## Future: games

No game content is imported or validated here. Lesson units and questions are reusable later because each row has a stable key (`PSU-1.1/core-principles/authority/paralegal`, and question ids such as `PSU-1.1.core_principles.authority.red.q1`). `proseu_template_items.payload` is jsonb and `question_type` is an open token (`^[a-z][a-z0-9_]{0,40}$`), not a closed list, so a later consumer can add a type without a migration. `proseu_learning_attempts.source` records who wrote the attempt (`lesson` today). A game can set its own source on the same progress row.

## Not changed

`MASTERY_SECTIONS` in the current Learn page still files four lists under the wrong competency and still says Procedural Framework and Practical Skills. The seed here uses the corrected lists and the display names Procedural Frameworks and Practical Application. Stored `legacy_name` values stay Procedural Framework and Practical Skills. This PR does not edit the Learn page.

`supabase/ARCHITECTURE.md` still says the project has no imported domains. The live catalog has 9 stages and 72 courses. This migration does not rewrite that doc.
