# Course games

Peractio, Displodo, Pecu Advo, and Griffon Juste are the existing templates. Students open them from a course (`/#/learn?dom=…&course=…`) via the practice bar. Admin → UI Templates still mounts the same components.

Results go through `submitAnswer` with the template title (`Peractio`, `Displodo`, `Pecu Advo`, `Griffon Juste`). That updates one progress row per student, course, subsection, and level:

`fillRatio = 0.4 * (sections acknowledged / sections total) + 0.6 * (correct / answered)`

`getLearningClient()` in `learning-client.ts` is a mock of `getCourseTree`, `getLesson`, `markSectionUnderstood`, `submitAnswer`, and `getProgress` until the schema client lands. Point that function at the real module and leave the games alone. The mock stores rows in `localStorage` under `proseu-learning-mock-v1`. When a Supabase user is signed in, the same answer is also appended to `proseu_learning_attempts`.

Level names and colors come from the course tree (`level.name`, `level.colorHex`). The game chrome does not invent tier labels. The mock tree reads `content/catalog.json`, whose `ringAt` values are 1, 9, 17, and 25 on the existing 0–32 ring. `ringUnits(fillRatio)` is `round(fillRatio * 32)`.

## What the content schema needs to feed the games

Questions and games stay on `proseu_template_items` (payload JSON). Concepts stay on `proseu_atomic_concepts`. One course file is `content/courses/PSU-*.json`, registered in `content/courses/index.ts`. Do not add a second course table.

| Game | `template_id` | Payload the game reads |
| --- | --- | --- |
| Peractio | `peractio` | `prompt`, `acceptedAnswers[]`, `distractors[]`, `blocksAwarded`, plus ordinary `true_false`, `multiple_choice`, `matching`, and `fill_in` items |
| Displodo | `displodo` | `prompt`, `correct`, `distractors[]` (or `options` + `correctIndex`) |
| Pecu Advo | `pecu-advo` | The same question objects, grouped by competency. Optional `prompt` on each item. Areas are the seven stored competency keys. |
| Griffon Juste | `griffon-juste` | `testimony[]` of `{ speaker, text, canObject, contradiction, evidenceId }` and `evidence[]` of `{ id, label, text }`. Ordinary questions are turned into a hearing when testimony is absent. |

Also accepted on any item: `explanation` (shown for a true/false item either way), `subsectionId` or column `subsection_id`, `levelId` or column `level_id`, `questionType` or column `question_type`. Subsection keys match stored names (`Authority`, `Burden of Proof`, …) or ids (`core-principles.authority`). Level ids in the mock catalog are `paralegal`, `bachelor`, `masters`, `doctorate`, with aliases `basic` / `electrum` / `orichalcum` / `adamantine`. A missing level means the item is not tied to one color. Items tagged for a different level are not served.

`proseu_atomic_concepts.content` still maps `PM` → prompt, `RC` → correct, `RI` → distractors, `DT` → explanation, `MS` → competency name, `PN` or `principle_code` → subsection.

`getLesson` wins when it returns `questions` and `games` for that course, subsection, and level. Until then the adapter reads published template items, then concepts, then a bundled course file, then `src/games/content/sample.json` (`"sample": true`). Sample play is labeled in the game.
