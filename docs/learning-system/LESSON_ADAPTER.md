# Lesson adapter (for the schema owner)

The lesson screen does not query Supabase. It calls `LessonAdapter` in `src/lib/lesson-adapter.ts`. The mock is `createMockLessonAdapter`. Replace that object; do not change the call sites in `src/app/learn/page.tsx` or `src/components/learn/lesson/LessonScreen.tsx`.

Stages and the 72 courses already load through `getPublishedAcademyCatalog`. This adapter only covers the tree under a course, the lesson body, and the ring.

```ts
interface LessonAdapter {
  getCourseTree(course: { courseId: string; curriculumCode: string | null }): Promise<CourseTree>;
  getLesson(input: { courseId: string; curriculumCode: string | null; subsectionId: string; levelId: LevelId }): Promise<LessonView | null>;
  markSectionUnderstood(input: { courseId: string; curriculumCode: string | null; subsectionId: string; levelId: LevelId; sectionId: string }): Promise<ProgressSnapshot>;
  submitAnswer(input: { courseId: string; curriculumCode: string | null; subsectionId: string; levelId: LevelId; questionId: string; response: unknown }): Promise<{ correct: boolean; explanation: string; progress: ProgressSnapshot }>;
  getProgress(input: { courseId: string; subsectionId: string }): Promise<ProgressSnapshot>;
}
```

`LevelId` is `paralegal | bachelor | masters | doctorate`, in that order. Those are the audit draft ids. The ring still uses thresholds **1, 9, 17, 25** and tier keys `basic`, `electrum`, `orichalcum`, `adamantine`. `progress` on the snapshot is the 0–32 integer `DuolingoNode` already paints. `masteryPercent` is `round(progress / 32 * 100)` for one node. The ICM bar averages that across the seven subsections of a competency.

Per level, `fillRatio = 0.4 * (sectionsAcknowledged / sectionsTotal) + 0.6 * (questionsCorrect / questionsTotal)`. `questionsTotal` is the authored count, not `questions_answered`, so a single correct guess cannot finish the level. `questionsAnswered` and `questionsCorrect` are still distinct-question counts for the draft `proseu_subsection_progress` row. A level adds its 8 ring points only after the previous level's fill ratio is 1.

`getLesson` returns `null` when that level is not authored. The screen says so. The only mock lesson is `PSU-1.1` / `founding-psu-1-1` / `core-principles.authority` / `paralegal`.

Stored competency keys stay `Procedural Framework` and `Practical Skills` (concept `MS` / `PN`). The path shows **Procedural Frameworks** and **Practical Application**. Subsection name strings are unchanged; Decision Standards, Major Cases, Policy Debates, and Practical Skills now hold the lists that match their descriptions.

Question payloads match the audit draft. The player mounts the existing templates:

| `questionType` | Component | Response sent to `submitAnswer` |
| --- | --- | --- |
| `true_false` | `Veritas` (`embedded`) | `{ answer: boolean }` |
| `multiple_choice` | `Multiplix` (`embedded`) | `{ choiceIndex: number }` |
| `matching` | `Congruens` (`embedded`) | `{ pairs: { term, definition }[] }` |
| `fill_in` | new fill-in control | `{ blanks: string[] }` |

True/false payloads need `explanationIfCorrect` and `explanationIfWrong` (one or two sentences each). The other types use `explanation`. Admin previews of Veritas, Multiplix, and Congruens still take no props. Games were not changed.

Section `audioUrl` is played with an `<audio>` element. When it is null, the Listen button uses `speechSynthesis` on the section body. `videoUrl` renders a `<video>` only when set. No cloud TTS.

The mock persists in `localStorage` key `proseu.lesson.mock.v1` because production sign-in is still Firebase and `proseu_subsection_progress.user_id` is a Supabase auth id. A real adapter should skip the write when there is no Supabase session, the same way `saveStudyProgress` does.
