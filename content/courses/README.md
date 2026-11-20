# Course content files

One JSON file per course, named by PSU code (`PSU-1.1.json` … `PSU-9.8.json`).
The importer (not part of the games) should match `curriculumCode` to
`proseu_courses.content.curriculumCode`.

Games read a file only after it is exported from `index.ts`. They also read
published `proseu_template_items` and `proseu_atomic_concepts` directly.
Until those rows exist, the games play `src/games/content/sample.json`, which
is marked `"sample": true` and is not course content.

See `src/games/content/README.md` for the fields each game reads.
