# PSU-1.2 · Legal History · Core Principles — evidence and editorial review

**Status:** draft academic content, not legal advice, not published, and **not** certified to cover the ten universities. Authoring date: 2026-11-04.

## Purpose and scope

These seven JSON documents contain the 28 mastery-level lessons for **PSU-1.2, Legal History: From Hammurabi and Rome to the Modern Code**, within the canonical **Core Principles** competency. Each of the seven subsections — Authority, Rights, Duties, Harm, Causation, Remedy, Legitimacy — has its own Red/Yellow/Orange/Black progression.

The historical narrative moves from primary artifacts and source criticism through Roman institutions, medieval legal pluralism and early modern forms, to modern comparative analysis, dignity and institutional accountability. Every unit is 3 initially-open teaching sections with audio scripts, 3 specific learning outcomes, 8 question objects with stable keys, and null video slots. The content does **not** reinterpret historical sources as modern, worldwide binding law.

## Source map for historical propositions (verify during review)

| Source ID | Primary or academic evidence | Applied to content |
| --- | --- | --- |
| H01 | Musée du Louvre, [Code of Hammurabi](https://www.louvre.fr/en/the-code-of-hammurabi) | Ancient royal legal judgments; ca. 1750 BCE; social differentiation, public royal presentation |
| H02 | Oxford Classical Dictionary, [Twelve Tables](https://academic.oup.com/edited-volume/61673/chapter-abstract/548214008) | Roman public legislation and uncertain later reconstruction |
| H03 | Harvard Law School Ames Foundation, [Corpus Iuris Civilis history](https://amesfoundation.law.harvard.edu/digital/CJCiv/CJCivMetadata.html) | Justinian's Digest, Institutes, Code, reception of Roman thought |
| H04 | University of Giessen, [Constitutio Antoniniana and surviving papyrus](https://www.constitutio.de/en) | Caracalla's 212/213 broad citizenship grant to free inhabitants and the need for historical qualifications |
| H05 | UK National Archives, [Magna Carta (1215) translated text](https://www.nationalarchives.gov.uk/education/resources/magna-carta/british-library-magna-carta-1215-runnymede/) | Historical charter clauses; distinction between contemporary privileges and later interpretations |
| H06 | US National Archives, [Magna Carta legacy](https://www.archives.gov/exhibits/featured-documents/magna-carta/legacy.html) | Feudal bargaining context, early limitation and later broader interpretation |
| H07 | French National Assembly, [1804 legal codification](https://www.assemblee-nationale.fr/dyn/histoire-et-patrimoine/consulat-et-premier-empire/la-codification-juridique) | Napoleon's civil code and legislative unification |
| H08 | UK National Archives, [Chancery equity suits before 1558](https://www.nationalarchives.gov.uk/help-with-your-research/research-guides/chancery-equity-suits-before-1558/) | Medieval English Chancery, property, duties, disputes and equitable process |
| H09 | UK National Archives, [Chancery equity suits 1558–1875](https://www.nationalarchives.gov.uk/help-with-your-research/research-guides/chancery-equity-suits-after-1558/) | Historical distinction between common law and equity and its institutional evolution |
| H10 | United Nations, [History of the Universal Declaration](https://www.un.org/en/about-us/udhr/history-of-the-declaration) and [full text](https://www.un.org/en/about-us/universal-declaration-of-human-rights) | 1948 adoption, universal dignity, Article 8 effective remedy, distinction from binding treaties |

## Lesson-level review assignment

| Subsection | Red (historical anchor) | Yellow | Orange | Black |
| --- | --- | --- | --- | --- |
| Authority | H01 | H02 | H05,H06 | H03,H07 |
| Rights | H01 | H04 | H05,H06 | H10 |
| Duties | H01 | H03 | H08 | Further review: industrial/labor regulation sources |
| Harm | H01 | H03 | Further review: medieval and English forms of action | Further review: modern mass harm and regulation |
| Causation | H01 | Further review: Lex Aquilia and Roman juristic sources | Further review: common-law remoteness history | Further review: modern causal inference and exposure |
| Remedy | H01 | H03 | H08,H09 | H10 |
| Legitimacy | H01 | H02,H03 | H05,H06 | Further review: colonial legal pluralism and Indigenous jurisdictions |

The final-row **further review** designation is intentional: do not certify those historical propositions or attach ten-university learning-objective mappings until specialist review. Course summaries must not conceal source gaps.

## Review before publication

1. Check exact primary-text quotations, dates and historical translations; no historical material is presented as operative advice.
2. Verify each subsection's four levels genuinely add new analytical depth, rather than simply increasing vocabulary.
3. Revise question sets to reduce overreliance on definition recall and expand realistic transfer problems, distractor quality and answer feedback.
4. Check that source evidence supports the conclusion claimed in the specific section, not merely a nearby topic.
5. Map every required learning objective from all ten source programmes into stable source-entry IDs and link it to lessons and assessed questions. A catalogue title is **not** a learning-objective citation.
6. Review cross-jurisdiction comparisons for exclusions, exceptions and misleading generalizations; engage reviewers with relevant specialist expertise.
7. Once the Supabase schema, identity integration, PR #4 lesson UI and tests are ready, import reviewed lessons through PR #6's importer. Keep `status: draft` until explicitly approved.

**Games:** no changes, no integration, no tests of games.

## Import validation

Run from this branch (Node + dependencies required):

```bash
npx tsx scripts/import-mastery-content.ts --dry-run --strict --require-all-levels lessons/stage-01/PSU-1.2
npm run mastery:inventory
```

The loader resolves each file's PSU-1.2 course code from its directory and normalizes `core_principles` and the four color keys. No privileged Supabase key is required for dry-run.
