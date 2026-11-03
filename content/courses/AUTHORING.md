# Authoring mastery content

One JSON file per competency, saved at `lessons/stage-01/PSU-1.1/<competency>.json`. A whole-course file is also accepted. The importer does not create courses. It updates lessons on the published `proseu_courses` row whose `content.curriculumCode` is `PSU-1.1`.

```bash
npx tsx scripts/import-mastery-content.ts --dry-run lessons/stage-01/PSU-1.1/core_principles.json
npx tsx scripts/import-mastery-content.ts --dry-run --entries path/to/entry-to-course.json --topics path/to/course-topics.json
```

`--dry-run` never opens a database. A real import needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Do not commit those, and do not commit the full coverage files.

## Competency file

`key` is `core_principles` (underscores match the stored id `core-principles`). Each subsection has `levels.red`, `yellow`, `orange`, and `black`. Those colors are aliases of `paralegal`, `bachelor`, `masters`, and `doctorate`. The stored lesson id is `PSU-1.1/core-principles/authority/paralegal`.

A level has `summary` (2–3 sentences), `checklist` (3–5 lines starting with "I can"), and 3–5 `sections`. Each section uses `title`, `body_md` (60–150 words), `audio_script`, optional `example`, and `video` (null until a file exists). Questions use `type`, and at least eight per lesson: 2 `true_false`, 3 `multiple_choice`, 1 `matching`, 2 `fill_in`.

True/false accepts a single `explanation` shown for both outcomes, or `explanation_if_true` and `explanation_if_false`, or the lesson player's `explanationIfCorrect` and `explanationIfWrong`.

## Coverage

`entry-to-course.json` maps each `M-` id to `{ primary, secondary, confidence }`. `course-topics.json` maps each course to topics with `competencies`, `subsections`, and `entry_ids`. Any `reason` or `thin_competencies` text is discarded and is not stored. Pass the real files by path. The committed samples are `content/coverage/fixtures/*.sample.json`.

## Style strictness

`--strict` turns style-guide misses into errors. The default is warnings. `--require-all-levels` errors when a subsection in the file is missing a color.
