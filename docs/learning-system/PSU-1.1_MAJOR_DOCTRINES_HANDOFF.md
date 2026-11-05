# PSU-1.1 course-content contribution: Major Doctrines

## Ownership and status

This is a **content-only** contribution to the GrokBots mastery-data-layer branch (PR #6).
It **does not change** the Learn UI, existing Core Principles authoring, Supabase schema, auth, or any games.

Course: **PSU-1.1 — Jurisprudence: What Law Is and Why It Binds**.
Competency: **Major Doctrines**. All seven canonical subsections are represented:

| Subsection | File |
| --- | --- |
| Jurisdiction Doctrines | `major_doctrines_jurisdiction.json` |
| Liability Doctrines | `major_doctrines_liability.json` |
| Defense Doctrines | `major_doctrines_defenses.json` |
| Remedy Doctrines | `major_doctrines_remedies.json` |
| Procedural Doctrines | `major_doctrines_procedure.json` |
| Constitutional Doctrines | `major_doctrines_constitution.json` |
| Equity Doctrines | `major_doctrines_equity.json` |

Each file has `key: major_doctrines` and exactly one uniquely keyed subsection. This is intentional: the PR #6 importer accepts multiple competency documents and upserts by stable lesson ID.

## What is authored

- 7 subsections × 4 mastery levels = **28 distinct lessons**.
- 3 narrative sections per lesson = **84 readable sections**, initially open.
- 3 “I can” checklist items per lesson.
- Text-to-speech-ready `audio_script` for every section.
- Future video fields set to `null`, never fake media links.
- 8 questions per lesson = **224 questions**:
  - 56 true/false, with 1–2 sentence explanations for either response;
  - 84 four-option multiple choice, including a factual scenario per lesson;
  - 28 four-pair matching;
  - 56 one-blank fill-in.
- Four progressively distinct educational depths: red/Paralegal, yellow/Bachelor, orange/Masters, black/Doctorate.

Material is deliberately **jurisprudential**: it teaches legal authority, responsibility, procedure, rights, corrective fairness and institutional legitimacy. Detailed subject-specific positive law belongs in the later dedicated contract/tort/constitutional/procedure courses, preventing duplicated curricula.

**Every lesson is marked `draft`.** This is substantive candidate material, not an assertion that the content has passed academic peer review, matched every syllabus of the ten universities, or been published.

## Validation and integration

Run from the PR #6 branch (or this contribution branch):

```bash
npx tsx scripts/import-mastery-content.ts --dry-run --strict --require-all-levels \
  lessons/stage-01/PSU-1.1/major_doctrines_jurisdiction.json \
  lessons/stage-01/PSU-1.1/major_doctrines_liability.json \
  lessons/stage-01/PSU-1.1/major_doctrines_defenses.json \
  lessons/stage-01/PSU-1.1/major_doctrines_remedies.json \
  lessons/stage-01/PSU-1.1/major_doctrines_procedure.json \
  lessons/stage-01/PSU-1.1/major_doctrines_constitution.json \
  lessons/stage-01/PSU-1.1/major_doctrines_equity.json
```

A separate structural inspection verified all seven JSON files parse and have all levels; 28 lessons / 84 sections / 224 uniquely identified questions; no missing question types, invalid choice indices or section lengths outside 60–150 words. **The repository's actual TypeScript importer and build have not been executed in this contribution.** Run the above in CI before merging. After the proposed PR #6 Supabase migration is reviewed and applied, use the existing importer to upsert *reviewed* lessons. Do not publish drafts automatically.

## GrokBots integration requirements

1. Integrate PR #4 (lesson UI) with PR #6 (mastery data adapter) before expecting any authored lesson to open from a node. Main currently does not include that integration.
2. Confirm Firebase users map securely to recognized Supabase identities before saving progress. Never use a privileged key in the browser.
3. Keep canonical `PSU-1.1`, `major-doctrines.<subsection-slug>`, four level identifiers and question stable keys. Preserve student progress on revised content.
4. Keep question answers and grading authoritative on the server; only return prompts/options to students.
5. Confirm a node opens the correct authored subsection and level, all sections start expanded, checking "I understand" records the 40% review contribution, and correctly graded questions contribute 60%.
6. Verify audio is meaningful, the accordion works on keyboard and touch, and return/refresh retains authorized student progress.
7. Subject each draft to legal academic review. Track source learning objectives with stable identifiers and precise references **before** marking it published.

## Coverage statement

The ten-program source list is Harvard, Oxford, Cambridge, Yale, Stanford, NUS, NYU, Columbia, LSE, and UC Berkeley. The accompanying `TEN_UNIVERSITY_SOURCE_REGISTER.md` records their official programme-level sources. Those public summaries **do not establish exhaustive individual learning objectives**, nor have 58 required-core source entries or every M-id been reconciled here. The claim “every required topic from all ten has been mastered” is therefore **not yet verified**. Do not substitute lesson counts for source-coverage proof.

**Non-negotiable:** No games or game code should be changed by this content contribution.
