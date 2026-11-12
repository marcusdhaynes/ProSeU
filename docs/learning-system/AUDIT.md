# ProSeU learning system: app audit and blueprint

Audit date: 3 November 2026. This document records what the code and the live Supabase project `uylqbdjnonfcmlvxschj` actually do. It does not change app behavior. Draft SQL in section 6 is a proposal only and has not been applied.

Scope of the live check: an anonymous read of published `proseu_domains`, `proseu_fields`, `proseu_courses`, and `proseu_atomic_concepts` through the project's public REST API, using the publishable key already compiled into `src/supabase/client.ts`. Private tables were not readable, which is expected. Anything not confirmed that way is marked **uncertain**.

The product the team wants is: Learn → Stage → Core Courses → course → 7 competencies → 7 subsections → 4 colored mastery levels, with lessons, questions, games, and a progress control that fills as the student reviews material and answers correctly. The catalog shell for stages and courses already exists. The lesson, question, game, and per-level progress layers do not.

## 1. Learn → Stage → Core Courses

### Route

Production navigation is a Vite app with React Router's `HashRouter`, not the Next.js server.

- Router: `web/main.tsx` line 22. `/learn` renders `src/app/learn/layout.tsx` around `src/app/learn/page.tsx`.
- The top bar link "Learn" is `href: "/learn"` in `src/components/main-nav.tsx` lines 49–55.
- Hash routes look like `/#/learn`, `/#/learn?dom=founding-stage-1`, and `/#/learn?dom=founding-stage-1&course=psu-1-1`.
- `web/navigation.tsx` line 1 implements `useSearchParams` from `useLocation().search`, so those query keys work inside the hash.
- `?view=notebook` switches the same page into `NotebookWorkspace` (`src/app/learn/page.tsx` lines 540–541 and 737–738). Notebook is a separate surface and is not part of the course path.
- There is no `/learn/stage/:id` route and no course-id path under Learn. Stage and course are query parameters on one page.

`src/app/learn/layout.tsx` lines 12–15 only wraps the page in a full-height background and a Suspense fallback ("Initializing ScholaIuris Curriculum...").

### What the screen renders

`LearnPage` in `src/app/learn/page.tsx` (from line 528) has four view states: `academy`, `domain`, `course`, `notebook`.

| View | How you get there | What it shows |
| --- | --- | --- |
| Academy hub | `/learn` with no `dom` | Heading "Academic Domains". One card per published domain. Card subtitle is "{n} required courses", counted in the client from `catalog.courses` (lines 786–798). |
| Stage | Sidebar or card sets `?dom={domain.slug}` (`handleDomainSelect`, lines 613–618) | Back link, domain name, domain description, three inert buttons ("Books/Docs", "Web/Articles", "Videos/Audio", lines 832–840), then one section per field. |
| Core Courses | The field section inside the stage view | Heading is `field.name`. Under the live data that heading is the text **Core Courses**. Course cards show title, `curriculumCode` (fallback `code`, then the word "Course"), and description (lines 844–882). |
| Course path | `?course={course.slug}` (`handleCourseSelect`, lines 621–626) | `PathView` (line 362). This is the Duolingo-style screen. See section 2. |

The left rail accordion is labeled **Learn** (lines 665–699). Its children are domain names, so with the live catalog they read "Stage I: The Architecture of Law" through "Stage IX: The Practicing Lawyer". Terms, Practice, Leaderboard, Quests, Shop, Profile, and More are buttons with no handlers (lines 719–732).

Streak "48" and "1,240 XP" in the course header (lines 750–755), coins "2242", and the daily-quest numbers (lines 1016–1020) are literals. They are not read from a user record.

### Where stage and course data come from

The Learn page loads one catalog and never reads Firestore.

```543:565:src/app/learn/page.tsx
  // The Academy is a public, read-only view of Supabase's published catalog.
  // Firebase remains the login provider but is never queried for curriculum.
  const [catalog, setCatalog] = useState<AcademyCatalog>(EMPTY_ACADEMY_CATALOG);
  // ...
    getPublishedAcademyCatalog()
```

`getPublishedAcademyCatalog` (`src/supabase/public-curriculum.ts` lines 49–102) selects published rows from:

- `proseu_domains` → `AcademyDomain` (`id`, `name`, `description`, `slug`, `code`, `position` mapped to `order`)
- `proseu_fields` → `AcademyField` (`domain_id` mapped to `domainId`)
- `proseu_courses` → `AcademyCourse` (`domain_id`, `field_id`, `title`, `slug`, `code`, `position`, and `content.curriculumCode` when that JSON value is a string)

Limits are 1,000 rows per table. Status filter is `published`. A thrown error is shown with a Retry button (learn page lines 773–779). An empty domain list shows "No published Domains are currently available in Supabase."

The client (`src/supabase/client.ts` lines 3–24) uses `VITE_SUPABASE_URL` or the fallback `https://uylqbdjnonfcmlvxschj.supabase.co`, plus `VITE_SUPABASE_PUBLISHABLE_KEY` or a publishable key committed in that file. Anonymous catalog reads are allowed by the RLS repair in `supabase/migrations/20261026225517_fix_public_published_curriculum_rls.sql`: published rows are selectable without calling `is_admin()`.

### Live catalog (verified 3 November 2026)

Anonymous read returned **9 domains, 9 fields, 72 courses, 0 atomic concepts**. Every course `content.curriculumCode` matches `PSU-[1-9].[1-8]`. Every course `content` object is exactly:

```json
{
  "source": "proseu-founding-2026",
  "required": true,
  "stageNumber": 1,
  "sourceEdition": "2026",
  "curriculumCode": "PSU-1.1"
}
```

`stageNumber` is 1–9. `sourceEdition` is `"2026"`. `required` is `true`. `credits` is null.

Stages are domains. The UI does not have a separate "stage" type.

| id | code | name | description (subtitle) |
| --- | --- | --- | --- |
| `founding-stage-1` | ST1 | Stage I: The Architecture of Law | How Law Thinks |
| `founding-stage-2` | ST2 | Stage II: Private Law | Rights Between Persons |
| `founding-stage-3` | ST3 | Stage III: Public Law | The State, Power and Rights |
| `founding-stage-4` | ST4 | Stage IV: Crime, Procedure and Proof | Enforcing the Law |
| `founding-stage-5` | ST5 | Stage V: The World's Legal Traditions | The World's Legal Traditions |
| `founding-stage-6` | ST6 | Stage VI: Law Beyond Borders | Law Beyond Borders |
| `founding-stage-7` | ST7 | Stage VII: Business and Enterprise | Business and Enterprise |
| `founding-stage-8` | ST8 | Stage VIII: Law in the Modern World | Law in the Modern World |
| `founding-stage-9` | ST9 | Stage IX: The Practicing Lawyer | Global Practice |

Each stage has one field named **Core Courses**, id `founding-core-{n}`, code `CO{n}`, description `Eight courses in Stage {n}`, `content.source` `proseu-founding-2026`, `content.stageNumber` n. Fields have `slug: null`. The stage page therefore shows a single "Core Courses" heading and eight course cards. Eight courses were counted on every `founding-stage-*` id.

Course ids are `founding-psu-{stage}-{index}` (example `founding-psu-1-1`). Slugs are `psu-1-1`. The short `code` column is `101` … `908` (`{stage}0{index}`), which is what the admin hierarchy would show. The PSU code the card prints is `content.curriculumCode`, for example `PSU-1.1`. Titles and descriptions match `src/lib/founding-curriculum.ts` lines 21–112, including the first course description "Why should anyone obey a rule written by people, and what separates law from a gunman's order?".

`src/lib/founding-curriculum.ts` is the in-repo source of those 72 titles. A runtime check at lines 126–128 throws if the array is not 9×8. **No current file imports `FOUNDING_CURRICULUM`.** It is not what the Learn page reads.

The migration files do not `INSERT` these 72 courses. The rows exist in the live project anyway. Git history shows they were shaped like the admin importer removed in commit `f0f0c10` (`FoundingCurriculumImport.tsx`). That importer wrote Firestore `domains` / `fields` / `courses` with the same ids (`founding-stage-1`, `founding-core-1`, `founding-psu-1-1`), slugs, `ST{n}` / `CO{n}` / `{stage}0{index}` codes, and `curriculumSource: "proseu-founding-2026"`. Its field description string was `Eight required courses in Stage ${roman}.` The live Supabase field description is `Eight courses in Stage 1` (Arabic numeral, no word "required"). So the live rows follow that importer's ids and the static curriculum's titles, and they are not a byte-for-byte copy of the deleted Firestore writer. **Which job wrote the Supabase rows is uncertain**; it is not in `supabase/migrations`.

`supabase/ARCHITECTURE.md` lines 147–149 still say the project contains no imported domains. That sentence is stale as of this audit. `supabase/README.md` lines 61–68 still map domains to the legacy `proseu_catalog` table. The normalized tables are the ones the app reads.

### Other catalog writers (not the Learn page)

These still talk to **Firebase Firestore**, not the Supabase catalog the student sees:

- `src/components/admin/CurriculumManager.tsx` reads and writes Firestore `domains`, `fields`, `courses`.
- `src/components/admin/templates/ScholaIuris.tsx` lines 515–526 reads Firestore `domains`, `fields`, `courses` for the admin preview of the same path UI.
- `src/components/learn/category-sidebar.tsx` and `src/components/learn/domain-sidebar.tsx` read and write Firestore `domains`. Neither is imported by `src/app/learn/page.tsx`.
- `src/app/universitas/[courseId]/page.tsx` reads Firestore `atomic_concepts` where `CR == courseId`.

Whether those Firestore collections still hold a parallel copy of the 72 courses was **not checked**. There are no Firebase credentials in this run.

`src/supabase/academic-store.ts` can list and upsert the normalized tables, but only an authenticated admin passes RLS. The Learn page does not call it.

## 2. Track view, ICM view, and how the ring fills

Both views are inside `PathView` (`src/app/learn/page.tsx` lines 362–508). The same component is duplicated, with a dark Duolingo palette, in `src/components/admin/templates/ScholaIuris.tsx` lines 341–487.

The screen does not contain the words "Track View". The default is the winding path (`isICM === false`, state initialized at learn page line 535). A switch labeled **ICM** (lines 392–395) flips `isICM`. Copy elsewhere says "Start track" (line 456) and, in the admin duplicate, "Start track to schedule" (`ScholaIuris.tsx` line 435). In this audit, "track view" means that default path.

### Shared data shape

`MASTERY_SECTIONS` (learn page lines 93–192) is a hardcoded array of 7 competencies. Each entry is:

```ts
{ name: string; desc: string; color: string; principles: { name: string; snippet: string }[] }
```

Every competency has exactly 7 `principles`. The array is the same for every course. Course title and description are the only course-specific strings on the path. The overview paragraph (lines 405–407) is a placeholder that interpolates `course.title`.

`nodeProgress` is `Record<string, number>` in React state (line 534). The key is `` `${sectionIndex}-${principleIndex}` ``, for example `"0-3"`. It is not loaded from Supabase or Firebase. It resets on refresh. It is not keyed by course id, so clicking around and then opening another course reuses the same map for as long as the page component stays mounted. **Uncertain** whether a `dom`/`course` query change remounts the page; the state is not cleared in the URL effect (lines 579–605), so a client-side course change keeps the previous clicks.

### Track view (ICM off)

Lines 476–504. For each competency:

- A centered label with the competency `name` between two rules. Subsection names are not shown.
- Seven `DuolingoNode` buttons in a sine wave (`Math.sin(bIdx * 0.8) * 60` pixels).
- Click calls `onNodeClick(sIdx, bIdx)`.

### ICM view (ICM on)

Lines 411–473. A Radix accordion, `type="multiple"`, with no `defaultValue`, so every competency starts collapsed. Each trigger shows:

- competency `name` and `desc`
- the word "Mastery" and the literal **0%**
- a `<Progress value={0} />` bar

The 0% does not read `nodeProgress`. Opening a competency lists its seven principles: `name`, `snippet`, "Last Attempted" ("Today" if that node's count is `> 0`, otherwise "Not yet attempted"), "Next Lesson" ("Scheduled" or "Start track"), and the same `DuolingoNode`.

### What a click does

```629:636:src/app/learn/page.tsx
  const handleNodeClick = (sIdx: number, bIdx: number) => {
    const id = `${sIdx}-${bIdx}`;
    setNodeProgress(prev => {
      const current = prev[id] || 0;
      if (current >= 32) return prev;
      return { ...prev, [id]: current + 1 };
    });
  };
```

A click does not open a lesson, a question, a game, or `/universitas/:courseId`. It increments a local integer by 1, capped at 32. Correctness is not involved. The admin preview's `handleNodeClick` (`ScholaIuris.tsx` lines 543–549) is the same formula.

The right-hand "Performance" card still says Completion **0%** and Last Studied **N/A** (lines 1033–1041) regardless of clicks.

### How the ring is painted

`DuolingoNode` (lines 309–359) and `TieredProgressRing` / `Segment` (lines 232–307).

Center button tier, from the integer `progress`:

| progress | tier index | token | paint |
| --- | --- | --- | --- |
| 0 | -1 | muted | `hsl(var(--muted))` |
| 1–8 | 0 | `basic` | the competency `color` |
| 9–16 | 1 | `electrum` | `#FFD54F` |
| 17–24 | 2 | `orichalcum` | `#FF4500` |
| 25–32 | 3 | `adamantine` | `#1a1a1a` |

The ring is seven arcs (one per principle index `i` in `0..6`), not one arc per competency. Segment `i` uses:

| condition | tier index |
| --- | --- |
| `progress >= 26 + i` | 3 adamantine |
| `progress >= 18 + i` | 2 orichalcum |
| `progress >= 10 + i` | 1 electrum |
| `progress >= 2 + i` | 0, competency color |
| else | muted |

Worked example for one node: at 1 the center is already the competency color and every arc is still muted (arc 0 needs 2). At 8 every arc is the competency color. At 9 the center jumps to Electrum while the arcs are still on the competency color. At 16 every arc is Electrum. At 32 every arc is Adamantine and further clicks do nothing. Tier 0's `TIER_STYLES.basic.color` is `''`; the segment code substitutes the competency color only when `tierIndex === 0` (lines 266–273 and 324–330).

`TIER_STYLES.label` (`Basic`, `Electrum`, `Orichalcum`, `Adamantine`) is never rendered. A student sees color, not those words, and not Paralegal / Bachelor / Masters / Doctorate.

The same thresholds and the same `TIER_STYLES` hex values are copied in `ScholaIuris.tsx` lines 72–77 and 232–330.

### Stored mastery that the path does not use

Two other systems store a mastery number. Neither feeds the ring.

1. Firestore Universitas session, route `/universitas/:courseId` (`web/main.tsx` line 22; page `src/app/universitas/[courseId]/page.tsx`). After a non-reading answer it writes `user_concepts/{uid}_{lessonId}` with `masteryScore = timesCorrect / timesSeen` (lines 70–86). Reading steps are always treated as correct and do not update that document (lines 103–107). `nextReview` is set to now plus 24 hours. The Learn path does not link here.
2. Supabase `proseu_user_concepts.mastery_score` numeric 0–1, plus SM-2-style `ease_factor`, `interval_days`, `next_review` (`supabase/migrations/20261025_000003_academic_learning_core.sql` lines 105–118). `saveStudyProgress` in `src/supabase/academic-store.ts` lines 53–71 can upsert it for the signed-in Supabase user. No Learn or template screen calls `saveStudyProgress`. Anonymous clients cannot `SELECT` the table (live check returned `42501`, permission denied for `anon`).

`proseu_course_progress` (`completed_units`, `total_units`, `completion_ratio`) exists in that same migration (lines 123–132) and is also unused by the path.

## 3. The seven competencies and their subsections

They are defined twice as full objects and once as a name map.

- Student path: `MASTERY_SECTIONS` in `src/app/learn/page.tsx` lines 93–192.
- Admin path preview: the same array in `src/components/admin/templates/ScholaIuris.tsx` lines 81–180.
- Admin concept editor: `MASTERY_MAP` in `src/components/admin/UniversitasHierarchyTable.tsx` lines 62–70. Names only, no `desc`, no color. Checking a competency writes that competency name into the concept's `MS` (Mastery) text, and unchecking it strips the associated subsection names from `PN` (Principle). See `handleMasteryToggle` lines 525–545 and the checkbox popover lines 732–779. Those strings live on Firestore atomic concepts, not in a competency table.

The in-app definitions are the `desc` strings. Quoted verbatim:

| # | `name` | `desc` (verbatim) | `color` |
| --- | --- | --- | --- |
| 1 | Core Principles | Foundational concepts and state-individual relationships. | `#ff4b4b` |
| 2 | Major Doctrines | Key rules, standards, and legal definitions. | `#ff9600` |
| 3 | Procedural Framework | Steps for application, enforcement, and adjudication. | `#e6b400` |
| 4 | Decision Standards | The lens through which the court decides outcomes. | `#58cc02` |
| 5 | Major Cases | Landmark judicial decisions and their impacts. | `#1cb0f6` |
| 6 | Policy Debates | Controversies, reforms, and competing arguments. | `#9333ea` |
| 7 | Practical Skills | Real-world application, drafting, and advocacy. | `#ff66aa` |

Subsections exist. They are the `principles` arrays, seven each, identical for every course. Track view does not print them. ICM view does. Each also has a `snippet` in all caps ending in `...`; those snippets are labels, not lesson text.

**Core Principles:** Authority (`WHO HAS LEGAL POWER...`), Rights (`WHO IS PROTECTED...`), Duties (`WHO IS OBLIGATED...`), Harm (`WHAT COUNTS AS INJURY...`), Causation (`LEGAL RESPONSIBILITY LINK...`), Remedy (`LEGAL CONSEQUENCES...`), Legitimacy (`WHY AUTHORITY IS VALID...`).

**Major Doctrines:** Jurisdiction Doctrines (`AUTHORITY SCOPE DEFINED...`), Liability Doctrines (`CONDITIONS FOR RESPONSIBILITY...`), Defense Doctrines (`VALID EXCUSES...`), Remedy Doctrines (`AVAILABLE RELIEF...`), Procedural Doctrines (`CASE PROGRESSION RULES...`), Constitutional Doctrines (`RIGHTS AND STRUCTURE...`), Equity Doctrines (`FAIRNESS-BASED RULES...`).

**Procedural Framework:** Jurisdiction Establishment (`COURT AUTHORITY CONFIRMED...`), Pleading (`CLAIMS AND DEFENSES STATED...`), Motion Practice (`ISSUES RESOLVED EARLY...`), Discovery (`EVIDENCE OBTAINED...`), Pre-trial Resolution (`SETTLEMENT OR DISMISSAL...`), Adjudication (`CASE DECIDED...`), Appeal and Review (`DECISION REVIEWED...`).

**Decision Standards:** Authority-Defining Cases (`WHO HOLDS AUTHORITY...`), Rights-Defining Cases (`SCOPE OF RIGHTS...`), Limits-of-Power Cases (`BOUNDARIES ENFORCED...`), Procedure-Defining Cases (`PROCESS REQUIREMENTS...`), Liability-Expansion Cases (`SCOPE BROADENED...`), Liability-Restriction Cases (`SCOPE NARROWED...`), Paradigm-Shifting Cases (`FRAMEWORK CHANGED...`).

**Major Cases:** Individual vs State Power (`BALANCE OF POWER...`), Fairness vs Efficiency (`JUSTICE VS SYSTEM...`), Predictability vs Flexibility (`CONSISTENCY VS ADAPTATION...`), Centralization vs Decentralization (`POWER DISTRIBUTION...`), Formalism vs Pragmatism (`STRICT VS PRACTICAL...`), Stability vs Evolution (`CONTINUITY VS CHANGE...`), Liberty vs Security (`FREEDOM VS SAFETY...`).

**Policy Debates:** Issue Spotting (`IDENTIFYING PROBLEMS...`), Rule Extraction (`DERIVING RULES...`), Burden Manipulation (`SHIFTING PROOF...`), Evidence Structuring (`ORGANIZING RECORDS...`), Argument Construction (`LOGICAL REASONING...`), Procedural Leverage (`USING PROCESS...`), Judicial Psychology Navigation (`UNDERSTANDING TENDENCIES...`).

**Practical Skills:** Burden of Proof (`WHO MUST PROVE...`), Standard of Proof (`HOW MUCH PROOF...`), Standard of Review (`APPELLATE REVIEW...`), Level of Scrutiny (`RIGHTS PROTECTION...`), Evidentiary Weight (`EVALUATING EVIDENCE...`), Deference Doctrines (`WHEN COURTS DEFER...`), Balancing Tests (`WEIGHING INTERESTS...`).

### Match against the requested hierarchy

Core Principles and its seven subsections match the requested list exactly: Authority, Rights, Duties, Harm, Causation, Remedy, Legitimacy.

The stored competency names differ from the requested names in two places: the app says `Procedural Framework` (singular) and `Practical Skills`. The requested names are `Procedural Frameworks` and `Practical Application`.

The subsection lists under Decision Standards, Major Cases, Policy Debates, and Practical Skills do not match those titles' own `desc` sentences. Decision Standards lists kinds of cases. Major Cases lists policy dichotomies. Policy Debates lists advocacy techniques. Practical Skills lists burdens and standards of review. The three copies of the list agree with each other, so this is the current content, not a one-file typo. Whether the lists were rotated relative to an earlier outline is **uncertain**. A content pass should confirm the mapping before seeding, because the editor (`MASTERY_MAP`) will write these exact strings onto concepts.

There is no per-course override, no lesson body, no checklist, no "I understand" control, and no audio or video field on a subsection.

## 4. Mastery colors and level names

Two different palettes are easy to mix up.

### A. Four mastery tiers (the ring)

Defined only in the two `TIER_STYLES` objects:

- `src/app/learn/page.tsx` lines 76–91
- `src/components/admin/templates/ScholaIuris.tsx` lines 64–79

| key | label in source | color | shadow | shown as text? |
| --- | --- | --- | --- | --- |
| `basic` | Basic | `''` (empty; tier 0 paints the competency color instead) | `''` | no |
| `electrum` | Electrum | `#FFD54F` | `#B29500` | no |
| `orichalcum` | Orichalcum | `#FF4500` | `#8B0000` | no |
| `adamantine` | Adamantine | `#1a1a1a` | `#000000` | no |

Order is `['basic', 'electrum', 'orichalcum', 'adamantine']` (learn page line 91).

The requested level names are not these tokens.

- Red / Paralegal / Associate: no tier is defined as a universal red. Tier 0 reuses whatever competency color the node belongs to. Core Principles happens to be `#ff4b4b`. Major Doctrines at tier 0 is `#ff9600`.
- Yellow / Bachelor of Law: the nearest existing paint is Electrum `#FFD54F`. The source label is `Electrum`.
- Orange / Masters: the nearest existing paint is Orichalcum `#FF4500` (orange-red) with shadow `#8B0000`. The source label is `Orichalcum`.
- Black / Doctorate: the nearest existing paint is Adamantine `#1a1a1a` with shadow `#000000`. The source label is `Adamantine`.

Footer links (`src/components/footer.tsx` lines 27–30) say "Paralegal Diploma", "Pre-Law Bachelors", and "JD Degree Program", all `href="#"`. `src/components/hero.tsx` line 50 says "Professional Paralegal Track". None of these are wired to the ring.

### B. Seven competency colors (the path's tier-0 color)

These are `MASTERY_SECTIONS[].color`, listed in section 3. They are also the rotating accent colors inside the game templates, with small differences:

Template `COLORS` arrays use `#ff4b4b`, `#ff9600`, `#ffc800` (Veritas, Multiplix, Congruens, Scriptum) or `#ce82ff` (Inoblitus, Peractio, Displodo), `#58cc02`, `#1cb0f6`, and `#ff66aa`. Policy Debates on the path is `#9333ea`, while some templates use `#a349a4` or `#ce82ff` for the purple slot. Procedural Framework's path color `#e6b400` is not the template yellow `#ffc800`.

Dark chrome shared by the templates: background `#131f24`, border `#37464f`, muted text `#afafaf`.

## 5. Templates and games

All ten are presentational components under `src/components/admin/templates/`. `TemplateManager` (`src/components/admin/TemplateManager.tsx` lines 42–114) mounts each one with **no props** inside an admin tab. The student Learn path does not import them. A node click cannot start Veritas, Peractio, or anything else.

Supabase has a row per template kind, seeded by `supabase/migrations/20261025_000004_learning_templates.sql` lines 193–203. An anonymous read of `proseu_templates` on 3 November 2026 failed with `permission denied for function is_admin`. The SELECT policy is `is_published OR is_admin()` (migration lines 112–113), and `is_admin()` is not executable by `anon` (`20261025_000001_proseu_core.sql` lines 100–102). That is the same class of bug the later curriculum RLS migration fixed for domains, fields, courses, and concepts. It was not applied to templates, template items, or template assignments. **Uncertain** whether a signed-in non-admin can read published template rows; `authenticated` is granted `EXECUTE` on `is_admin()`, so the function call itself should be allowed for them, and the policy should then return published rows. The student UI does not call `listTemplates`.

`SupabaseTemplateStudio` (`src/components/admin/SupabaseTemplateStudio.tsx`) is the real data contract, and it is admin-only. It loads `proseu_templates`, `proseu_template_items`, and revisions after a Supabase session. Item save shape (`template-store.ts` lines 47–56, studio lines 97–102):

```ts
{
  id?: string;
  template_id: TemplateSlug; // one of the ten kind strings
  course_id?: string | null;
  concept_id?: string | null;
  position?: number;
  is_published?: boolean;
  payload: Record<string, unknown>; // any JSON object, max 100_000 chars
}
```

There is no schema for `payload` beyond "JSON object". The preview components do not read `payload`. Their questions are `MOCK_*` constants in the file. `ARCHITECTURE.md` lines 63–67 says the same thing: mock arrays are examples, not official course material.

| Component | Export | DB id / kind | What it is | Maps to | State |
| --- | --- | --- | --- | --- | --- |
| `ScholaIuris.tsx` | `ScholaIuris()` | `schola-iuris` | Full academy shell: domains from Firestore, then the same path / ICM ring as Learn. Header text "ScholaIuris Curriculum". | The path itself, not a question type | Firestore catalog if the admin's Firebase project has domains. Ring progress is local. Competencies are the hardcoded array. |
| `Inoblitus.tsx` | `Inoblitus()` | `inoblitus` | Flip card. Front `prompt`, back `response`, optional `hint`. Space flips; arrows change card. Star and a `Volume2` button. | Flashcard / spaced repetition. DB description: "Spaced-repetition flashcards", config `{"algorithm":"sm2-compatible-v1","schemaVersion":1}`. Not one of the four requested question types. | `MOCK_CARDS`: 7 Latin terms (lines 20–28). Star does not persist. The volume button's onClick only `stopPropagation` (line 152). No audio is played. |
| `Veritas.tsx` | `Veritas()` | `veritas` | Statement plus two buttons, **Verum** and **Falsum**. | True/False | `MOCK_QUESTIONS`: `{ prompt, answer: boolean }[]`, 7 items (lines 10–18). Both buttons call `next()` (lines 69 and 77). The boolean `answer` is never checked. No 1–2 sentence explanation is rendered. |
| `Multiplix.tsx` | `Multiplix()` | `multiplix` | Prompt plus four options labeled A–D. | Multiple choice | `MOCK_QUESTIONS`: `{ prompt, options: string[], correct: number }[]`, 4 items (lines 10–15). Every option calls `next()` (line 70). `correct` is never checked. One sample marks "President" as the answer to "Who has the power to declare war?" (`correct: 0`). Treat the mocks as UI fixtures. |
| `Congruens.tsx` | `Congruens()` | `congruens` | Two columns, Terms and Definitions. | Matching | `MOCK_PAIRS`: `{ id, term, definition }[]`, 5 items (lines 10–16). Selection is local state. Nothing compares the two ids, nothing removes a matched pair. The definition column is re-shuffled on every render (`sort(() => Math.random() - 0.5)`, line 73). |
| `Scriptum.tsx` | `Scriptum()` | `scriptum` | Writing prompt, hint, textarea, Submit. | Free response. The nearest existing stand-in for fill-in, but it is an essay box, not a token blank. | `MOCK_PROMPTS`: `{ prompt, hint }[]`, 3 items (lines 10–14). Submit only advances the index and clears the text (lines 22–24). No expected answer, no grading. |
| `Peractio.tsx` | `Peractio()` | `peractio` | 8×16 grid, tetromino tray, drag to place, row clear scores 100, 300-second timer. DB description: "Timed grid challenges". | Tetris-inspired. Pieces are placed by drag, not falling on a gravity tick. | No legal question is required to score. "Knowledge Input" (lines 174–179) accepts any non-empty string and spawns 3 random shapes. `SHAPES` includes I, O, T, S, Z, J, L, Dot, Double (lines 25–35). No props. |
| `Displodo.tsx` | `Displodo()` | `displodo` | Ship, click-to-shoot lasers, bouncing answer meteors, 60-second timer, +100 and +7 seconds on a correct meteor. DB description: "Timed answer meteor game". | Asteroids-inspired (ship plus floating targets). It is not a physics port of Asteroids. | `MOCK_QUESTIONS`: `{ prompt, correct, distractors: string[] }[]`, 3 items (lines 14–18). A correct meteor advances the question (lines 67–75). Wrong meteors do not change the score. `gameState === 'finished'` exists in the type and is never set. The timer state is never decremented. |
| `PecuAdvo.tsx` | `PecuAdvo()` | `pecu-advo` | 10×10 tile map inside a Game Boy-like frame. Arrow keys move. Tile `4` opens dialog "JUDGE: Ready for your defense?". Tile `3` opens a "COURTROOM BATTLE!" overlay with Objection and Run. DB description: "Explorable case scenario game". | Pokémon-style 8-bit walking / encounter shell. | The `MAP` constant (lines 7–18) is the only content. No props, no question text, no party, no XP. |
| `GriffonJuste.tsx` | `GriffonJuste()` | `griffon-juste` | Testimony typewriter, previous/next statement, an objection button. If `canObject` is true, the screen flashes "Objection!" and appends `contradiction`. DB description: "Testimony and objection simulation". | Phoenix Wright-style. The on-screen title is "Griffon Juste". | `MOCK_TESTIMONY`: two lines (lines 9–12). No evidence record, no penalty for a wrong objection, no props. |

A second, older question engine exists and is also unused by the path:

- `src/lib/contentEngine.ts` `Question.type` is `'reading' | 'multiple_choice' | 'matching' | 'scenario'` (lines 30–41).
- `generateQuestionSet` only emits a reading card and a multiple-choice card (lines 92–99). `matching` and `scenario` fall through to the reading branch (lines 140–158).
- Multiple choice is built from atomic-concept fields: `PM` prompt, `RC` correct response, `RI` incorrect responses, `DT` explanation, `HN` hint, `MN` mnemonic (lines 107–138).
- Renderers: `MultipleChoiceRenderer` props `{ question, onAnswer, disabled? }` (`src/components/renderers/MultipleChoiceRenderer.tsx` lines 8–14). `ReadingRenderer` props `{ question, onAnswer }` (`ReadingRenderer.tsx` lines 9–12). The concept name is painted `#cc9a43` (line 22).
- Universitas is the only caller, and it reads Firestore.

Fill-in, as a blank inside a sentence with an exact expected token, has no component.

## 6. Supabase schema: what exists, what is missing, what to add

Project `uylqbdjnonfcmlvxschj`. Canonical write-up: `supabase/ARCHITECTURE.md`. Applied SQL: `supabase/migrations/20261025_000001` through `000011`, plus `20261026225517_fix_public_published_curriculum_rls.sql`. Do not re-run the initial migrations (see `supabase/README.md` lines 29–35).

### Relevant tables

| Table | Role today | Learning-system use |
| --- | --- | --- |
| `proseu_domains` | Published stages. `content.stageNumber`, `content.source`. | Keep. One row per stage. |
| `proseu_fields` | The "Core Courses" bucket under each stage. | Keep. Electives would be additional fields later. |
| `proseu_courses` | 72 published courses. PSU code lives in `content.curriculumCode`. `code` is `101`-style. | Keep. Do not invent a second course table. |
| `proseu_atomic_concepts` | Universitas atoms (`content` JSON holds `MS`, `PN`, `PM`, `RC`, `RI`, `DT`, `ES`, `EA`, `HN`, `MN`, `TR`, `VL`). Live count 0. | Keep for concept atoms. A bad fit as the subsection/level grid: the path's 7×7 names are not atoms, and the table has no level. |
| `proseu_user_concepts` | Per user, per concept: counts, `mastery_score` 0–1, SM-2 scheduling. | Keep for Inoblitus-style concept review. It cannot represent "subsection × level" without overloading `concept_id`. |
| `proseu_course_progress` | Per user, per course: unit counts and `completion_ratio`. | Keep as a course rollup. It has no subsection or level. |
| `proseu_enrollments` | Per user, per course status. | Unchanged. |
| `proseu_learning_sessions` / `proseu_learning_attempts` | Generic session plus append-only attempts (`question_type`, `response` jsonb, `is_correct`). Update and delete were revoked (`000008` lines 100–107). | Reuse for telemetry. Attempts have no subsection or level column. |
| `proseu_templates` | Ten kinds, seeded published in SQL. Anon cannot read them today because of `is_admin()` inside the policy. | Keep the ten kinds. Fix the policy the same way curriculum RLS was fixed, in a later migration. |
| `proseu_template_items` | Versioned JSON `payload`, optional `course_id` and `concept_id`. Comment at lines 36–37 already names MCQ, true/false, matching, writing, timed challenges, testimony, and game objectives. | Reuse as the question and game-content store. Add nullable FKs so a payload can be attached to a subsection and a level. |
| `proseu_template_assignments` | Template ↔ course, `required`, `position`, `settings` jsonb. | Reuse for "this course uses Veritas". It cannot say "this subsection at this level uses Veritas". |
| `proseu_template_sessions` / `proseu_template_answers` / `proseu_template_preferences` | Per-user play state. Answers are append-only. | Reuse for a play session. They do not store the ring fill. |
| `proseu_curriculum_revisions` | Trigger-written history for domains, fields, courses, concepts, role groups (`000008`). | New content tables should grow the same kind of history only if editors need it. Not required for the first lesson import. |
| Storage `proseu-public` | Public bucket, 10 MB file limit (`000006` lines 29–31). | Put lesson audio and video here, or store external URLs. 10 MB will not hold a long video; those should be URLs to a host that allows the size. |
| Storage `proseu-private` | 25 MB, path must start with the Supabase auth uid. | Not for course media. |

`000009` revokes every privilege on `proseu_*` and then grants back a short list. A new table is invisible until its `GRANT`s are in the same migration.

Firebase still owns sign-in (`src/app/login/page.tsx`, `FirebaseClientProvider` in `web/layout.tsx`). Supabase Auth is a second, staged client (`signInWithSupabaseGoogle` in `client.ts`). `proseu_user_concepts.user_id` references `auth.users`, so the proposed progress table will not accept a Firebase uid. Progress cannot be saved for current production users until the identity link in `proseu_private` (see `ARCHITECTURE.md` lines 76–88) exists. That is a cutover constraint, not a reason to store the new progress in Firestore.

### What is missing

- No competency or subsection tables. The 7×7 list is TypeScript.
- No mastery-level table. The four colors are TypeScript, under different names.
- No lesson, checklist, accordion section, audio URL, or video URL.
- No question type constraint. `payload` is free JSON. `contentEngine` types are not the database types.
- No per-user row for (course, subsection, level).
- No "I understand" acknowledgement.
- Template read policies still call `is_admin()` for anonymous clients.

### Minimal additive schema (draft, not applied)

Reuse domains, fields, and courses as Stage → Core Courses → Course. Add a global competency catalog (the seven names are shared by every course), a global level catalog, per-course lessons, and a progress row. Put questions and game payloads in `proseu_template_items` by adding two nullable foreign keys.

Competency and subsection rows are global so the content file can say `"competency": "core-principles"` instead of inserting 72 copies of "Authority". Lesson bodies, which differ by course, are the per-course table.

```sql
-- DRAFT ONLY. Do not apply from this audit.
-- Follow-up migration would also GRANT, enable RLS, and avoid calling
-- proseu_private.is_admin() in any policy that anon must pass.
-- Pattern to copy: 20261026225517_fix_public_published_curriculum_rls.sql.

create table public.proseu_mastery_levels (
  id text primary key check (id in ('paralegal','bachelor','masters','doctorate')),
  position integer not null check (position between 0 and 3),
  name text not null,
  audience text not null,
  color_hex text not null check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  shadow_hex text not null check (shadow_hex ~ '^#[0-9A-Fa-f]{6}$'),
  unique (position)
);

insert into public.proseu_mastery_levels(id, position, name, audience, color_hex, shadow_hex) values
  ('paralegal', 0, 'Paralegal', 'Associate', '#ff4b4b', '#9e2b2b'),
  ('bachelor', 1, 'Bachelor of Law', 'Bachelor', '#FFD54F', '#B29500'),
  ('masters', 2, 'Masters', 'Masters', '#FF4500', '#8B0000'),
  ('doctorate', 3, 'Doctorate', 'Doctorate', '#1a1a1a', '#000000');
-- Paralegal red is the existing Core Principles / Veritas red #ff4b4b.
-- Bachelor yellow, Masters orange, and Doctorate black reuse the Electrum,
-- Orichalcum, and Adamantine paints so the current ring art has a place to
-- land. Confirm the four hex values with design before insert. They are
-- not stored as level tokens anywhere today. The id values are the stable
-- keys the content files should use.

create table public.proseu_competencies (
  id text primary key,
  position integer not null check (position between 0 and 6),
  name text not null unique,
  definition text not null,
  color_hex text not null,
  unique (position)
);

create table public.proseu_subsections (
  id text primary key,
  competency_id text not null references public.proseu_competencies(id),
  position integer not null check (position between 0 and 6),
  name text not null,
  snippet text not null default '',
  unique (competency_id, position),
  unique (competency_id, name)
);

-- One lesson per course × subsection × level. Missing row = not authored.
create table public.proseu_lessons (
  id text primary key,
  course_id text not null references public.proseu_courses(id) on delete restrict,
  subsection_id text not null references public.proseu_subsections(id),
  level_id text not null references public.proseu_mastery_levels(id),
  summary text not null default '',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  unique (course_id, subsection_id, level_id)
);

create table public.proseu_checklist_items (
  id text primary key,
  lesson_id text not null references public.proseu_lessons(id) on delete cascade,
  position integer not null check (position >= 0),
  body text not null,
  unique (lesson_id, position)
);

-- Accordion sections. default_open is a content hint; the client collapses
-- a section after the signed-in student records an acknowledgement.
create table public.proseu_lesson_sections (
  id text primary key,
  lesson_id text not null references public.proseu_lessons(id) on delete cascade,
  position integer not null check (position >= 0),
  heading text not null,
  body text not null default '',
  audio_url text,
  video_url text,
  default_open boolean not null default true,
  unique (lesson_id, position)
);

create table public.proseu_section_acknowledgements (
  user_id uuid not null references auth.users(id) on delete cascade,
  section_id text not null references public.proseu_lesson_sections(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  primary key (user_id, section_id)
);

-- Ring fill for one student, one subsection, one level, inside one course.
-- fill_ratio is derived (see below) and stored so the path can render
-- without replaying every attempt. It is practice UI state, not a grade.
create table public.proseu_subsection_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.proseu_courses(id) on delete restrict,
  subsection_id text not null references public.proseu_subsections(id),
  level_id text not null references public.proseu_mastery_levels(id),
  sections_total integer not null default 0 check (sections_total >= 0),
  sections_acknowledged integer not null default 0 check (sections_acknowledged >= 0),
  questions_answered integer not null default 0 check (questions_answered >= 0),
  questions_correct integer not null default 0 check (questions_correct >= 0),
  fill_ratio numeric(5,4) not null default 0 check (fill_ratio between 0 and 1),
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id, subsection_id, level_id)
);

alter table public.proseu_template_items
  add column subsection_id text references public.proseu_subsections(id),
  add column level_id text references public.proseu_mastery_levels(id),
  add column question_type text;

alter table public.proseu_template_items
  add constraint proseu_template_items_question_type_ck
  check (question_type is null or question_type in (
    'true_false','multiple_choice','matching','fill_in',
    'flashcard','free_response','tetris','asteroids','pecu_advo','griffon_juste'
  ));
```

Recommended `fill_ratio`, computed in one place (a SQL function or the save path), not in the component:

```text
review = sections_acknowledged / sections_total    -- 0 if total is 0
score  = questions_correct / questions_answered    -- 0 if none answered
fill_ratio = 0.4 * review + 0.6 * score
```

Map `fill_ratio` onto the existing 0–32 ring by `round(fill_ratio * 32)` so the current `TieredProgressRing` can stay. The ICM percentage should display `round(fill_ratio * 100)`, replacing the hardcoded 0. This formula is a recommendation. The app does not compute it today.

`question_type` on the item, plus the existing `template_id`, tells the player which component to mount. Suggested payload shapes, all JSON objects, matching the mock fields the components already invent:

- `true_false`: `{ "prompt", "answer": boolean, "explanation" }` with explanation required, 1–2 sentences.
- `multiple_choice`: `{ "prompt", "options": string[], "correctIndex": number, "explanation" }`.
- `matching`: `{ "pairs": [{ "term", "definition" }] }`.
- `fill_in`: `{ "prompt", "blanks": [{ "answer", "accepted": string[] }] }`. New. Scriptum does not cover this.
- `flashcard` (Inoblitus): `{ "prompt", "response", "hint" }`.
- `free_response` (Scriptum): `{ "prompt", "hint", "rubric" }`.
- `tetris` (Peractio): `{ "prompt", "acceptedAnswers": string[], "blocksAwarded": number }`.
- `asteroids` (Displodo): `{ "prompt", "correct", "distractors": string[] }`.
- `pecu_advo`: `{ "map", "encounters": [{ "tile", "kind", "text" }] }`.
- `griffon_juste`: `{ "testimony": [{ "speaker", "text", "canObject", "contradiction" }] }`.

Seed the seven competencies from the verbatim `name` / `desc` / `color` table in section 3, after the content owner confirms the Decision Standards / Major Cases / Policy Debates / Practical Skills subsection lists. Suggested ids: `core-principles`, `major-doctrines`, `procedural-framework`, `decision-standards`, `major-cases`, `policy-debates`, `practical-skills`.

RLS, when this is implemented: published lessons and published template items selectable by `anon` with `status = 'published'` and no `is_admin()` call in that policy; writes require `proseu_private.is_admin()` on the `authenticated` role only; `proseu_subsection_progress` and acknowledgements are `user_id = auth.uid()` with no anon grant. Mirror `000009` grants. Also split the existing template SELECT policies so anon does not invoke `is_admin()`.

Out of scope for this additive pass: moving Firebase login, deleting `proseu_atomic_concepts`, or rewriting the 0–32 painting code. Those can wait until a lesson actually loads.

## 7. Audio, TTS, and the visual system

### Audio and speech

No lesson audio player and no text-to-speech exist in the app.

- Repo search of `src` found no `speechSynthesis`, `SpeechSynthesis`, `new Audio`, or read-aloud control.
- The only speaker icon is the Inoblitus `Volume2` button, which does not play sound (`Inoblitus.tsx` line 152).
- "Videos/Audio" on the stage page (`learn/page.tsx` line 839) and the course sidebar buttons Videos / Books / Articles / Websites (lines 1057–1066) have no `onClick`.
- The Genkit skill note that mentions `gemini-2.5-flash-preview-tts` is in `.agents/skills`, not in the app. `server.ts` exposes `/api/gemini` and a flow allow-list. None of the flows is a TTS endpoint. **Uncertain** whether the external `https://subversion.ai.studio` runtime has a speech route; this repo does not call one.
- Public media, when added, can be a URL column (`audio_url`, `video_url` in the draft schema) pointing at `proseu-public` or another host. Nothing in the bucket was listed for this audit.

### Styling

The student shell uses Tailwind tokens in `src/app/globals.css` lines 5–47. Tailwind maps them in `tailwind.config.ts` lines 19–48. `html` font size is 75% (`globals.css` lines 51–53). Dark mode is the class `dark`, default theme is light (`web/layout.tsx` line 14, `defaultTheme="light"`, `enableSystem={false}`).

Computed hex from those HSL channels (not stored as hex in the source):

| Token | Light HSL | Approx. hex | Role |
| --- | --- | --- | --- |
| `--background` | `40 30% 98%` | `#fbfaf8` | warm off-white page |
| `--foreground` | `222 47% 11%` | `#0f1729` | body text |
| `--primary` | `222 47% 15%` | `#141f38` | dark navy. Headings use `text-primary`. |
| `--accent` | `35 90% 45%` | `#da840b` | gold. Buttons, active Learn state, rings. |
| `--muted` | `40 15% 92%` | `#eeece8` | empty ring segments, cards |
| `--destructive` | `0 84.2% 60.2%` | `#ef4444` | errors |
| `--radius` | `0.75rem` |  | cards are often `rounded-[2rem]` anyway |

Dark theme keeps the same gold accent. Dark `--background` is `222 47% 5%` (about `#070a13`), darker navy. Dark `--primary` flips to `40 30% 98%` because headings use `text-primary` and must stay light on navy.

Fonts, loaded from Google Fonts in `index.html` and `src/app/layout.tsx` line 26:

- Inter 300–700, Tailwind `font-body` and `font-headline` (`tailwind.config.ts` lines 13–16). The Learn page sets `font-body`.
- Handlee, Tailwind `font-handlee`. Not used on the path.
- IBM Plex Mono, utility `.font-ibm-plex-mono` in `index.html`. The Universitas admin grid uses `font-mono`.

`docs/blueprint.md` lines 13–18 still specify a purple primary `#342E55` and accent `#4D9DE0`. The running CSS does not. Use `globals.css` for new lesson UI.

The path and the ten templates do not use the navy/gold tokens for the nodes. They use the hardcoded Duolingo hex list in sections 3 and 4, plus inline `<style>` for `.gloss-band` and `.fiery-gloss` (learn page lines 640–650). New lesson chrome should use `bg-background`, `text-primary`, and `bg-accent` so it matches the shell. The ring can keep the level hex values from section 4.

`ReadingRenderer` hardcodes concept titles as `#cc9a43`, a second gold that is not `--accent`.

## 8. Build, deploy, local run, tests

### What actually ships

GitHub Pages, static Vite build. Workflow: `.github/workflows/pages.yml`.

- Trigger: push to `main`, or manual.
- Node 24, `npm install --no-audit --no-fund`, then `npm run check:auth-migration`, then `npm run build:web`.
- Build env: `GITHUB_PAGES=true`, `VITE_API_BASE_URL` from repo variable `API_BASE_URL` or `https://subversion.ai.studio`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from repo variables (empty string if unset; the client then uses the fallbacks in `client.ts`).
- `vite.config.ts` sets `base` to `/ProSeU/` when `GITHUB_PAGES=true`, else `./`.
- The workflow copies `dist/index.html` to `dist/404.html` so GitHub Pages can host the hash router.
- Deploy action: `actions/deploy-pages@v4`.
- Public URL recorded in `README.md` line 3: `https://marcusdhaynes.github.io/ProSeU/`.

`npm run build` and `npm run build:web` are both `vite build` (`package.json` lines 9 and 16). Next.js is still a dependency. `npm run dev:next` and `npm run build:next` exist. `next.config.ts` sets `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds`. Production deploy does not run them. `DEPLOYMENT.md` describes the Vite/GitHub Pages path and a Tauri native workflow (`.github/workflows/native.yml`, desktop plus Android). `server.ts` is `npm run start`: Express on port 3000 serving `dist` plus `/api/flows/*` and `/api/gemini`. GitHub Pages does not run that server. AI calls in the static build go to `VITE_API_BASE_URL` (`vite.config.ts` rewrites `src/ai/flows/*` to `fetch`).

Academy catalog CI: `.github/workflows/academy-catalog.yml` runs `node scripts/check-academy-supabase.mjs` and `npm run build:web` when Learn, the public curriculum loader, or migrations change. The script asserts the Learn page does not import Firestore and that the loader selects the three published tables.

### Local run

From `README.md` lines 49–56:

```bash
npm install
npm run dev
```

`dev` is `vite --host 0.0.0.0 --port 3000`. Open `http://localhost:3000/#/learn`. The catalog request needs either the committed fallback client or `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. `.env.supabase.example` documents the variable names. Firebase config for sign-in is separate (`firebase-applet-config.json`); this audit did not exercise login.

### Test commands

There is no Jest, Vitest, or Playwright script in `package.json`.

| Command | What it checks |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `next lint`. Whether a Next lint setup still works in the Vite app was **not** run for this audit. |
| `npm run check:auth-migration` | `node scripts/check-auth-migration.mjs`. Also runs in the Pages workflow. |
| `node scripts/check-academy-supabase.mjs` | Static assertions that Learn reads Supabase. Also the academy catalog workflow. |
| `npm run build:web` | Production bundle. |
| `npm run genkit:dev` | Genkit dev server for `src/ai/dev.ts`. Not required to render Learn. |
| `npm run desktop:dev` | Tauri. Needs a Rust toolchain. |

## 9. Content file format and import

One JSON file per course, named by the PSU code, so a writer can work offline:

```text
content/courses/PSU-1.1.json
content/courses/PSU-1.2.json
...
content/courses/PSU-9.8.json
```

The importer should treat the file as the source of lesson bodies, checklist items, sections, and questions. It should not rewrite stage or course titles that an admin has edited. Match courses by `content.curriculumCode`, which is unique across the live 72 rows.

```json
{
  "curriculumCode": "PSU-1.1",
  "sourceEdition": "2026",
  "lessons": [
    {
      "competencyId": "core-principles",
      "subsectionId": "core-principles.authority",
      "levelId": "paralegal",
      "summary": "One short paragraph shown above the checklist.",
      "checklist": [
        "I can say who holds this power.",
        "I can name the limit on that power."
      ],
      "sections": [
        {
          "heading": "The rule",
          "body": "Markdown or plain text.",
          "audioUrl": null,
          "videoUrl": null,
          "defaultOpen": true
        }
      ],
      "questions": [
        {
          "templateId": "veritas",
          "questionType": "true_false",
          "prompt": "A statute is valid because an official with authority enacted it.",
          "answer": true,
          "explanation": "Authority asks who is allowed to make the rule. A valid statute comes from that body, acting within its grant."
        },
        {
          "templateId": "multiplix",
          "questionType": "multiple_choice",
          "prompt": "Which question does Authority ask?",
          "options": ["Who has the power?", "Who was harmed?", "What is the remedy?", "Was the hearing fair?"],
          "correctIndex": 0,
          "explanation": "Authority is about who holds legal power, not about harm or remedy."
        },
        {
          "templateId": "congruens",
          "questionType": "matching",
          "pairs": [{ "term": "Authority", "definition": "Who has legal power" }]
        },
        {
          "templateId": "scriptum",
          "questionType": "fill_in",
          "prompt": "Authority asks who has legal ____.",
          "blanks": [{ "answer": "power", "accepted": ["power", "authority"] }]
        }
      ],
      "games": [
        {
          "templateId": "displodo",
          "questionType": "asteroids",
          "prompt": "Who has legal power?",
          "correct": "The body the law names",
          "distractors": ["Anyone stronger", "The losing party"]
        }
      ]
    }
  ]
}
```

Scale, if every cell is filled: 72 courses × 7 competencies × 7 subsections × 4 levels = 14,112 lesson objects. The format allows a file to contain only the levels that are written. The player should show an empty node when the lesson row is absent, and should not invent the mock questions from the TSX files.

Import sketch, to be added later as something like `scripts/import-learning-content.mjs`:

1. Read the JSON files. Reject a file whose `curriculumCode` is not `PSU-[1-9].[1-8]` or whose ids are not in the competency, subsection, and level catalogs.
2. Resolve `course_id` with `select id from proseu_courses where content->>'curriculumCode' = $code and status = 'published'`. Fail the file if that is not exactly one row.
3. Upsert `proseu_lessons` on `(course_id, subsection_id, level_id)`, then replace that lesson's checklist items, sections, and template items inside one transaction. Use stable ids such as `psu-1-1.core-principles.authority.paralegal` so a second import updates instead of duplicating.
4. Insert questions as `proseu_template_items` with `template_id`, `course_id`, `subsection_id`, `level_id`, `question_type`, and `payload`. Leave `is_published` false until an editor publishes.
5. Run with the service role on a trusted machine. Do not put that key in Vite env or in this repository. Do not import `MOCK_*` arrays.

The Learn page, after that data exists, still has to be taught to read lessons and to call `proseu_subsection_progress`. This audit does not do that.

## Recommended build order

1. Confirm the four subsection lists that do not match their competency titles, and lock the seven definitions in section 3.
2. Add the draft tables in a new migration, with grants and anon-safe published-read policies. Include the template-policy fix.
3. Seed competencies, subsections, and the four levels. Do not seed fake questions.
4. Accept `content/courses/PSU-*.json` and import one course end to end.
5. On the existing `PathView`, load real `fill_ratio` and open the lesson for that node: summary, checklist, accordion sections defaulting open, "I understand" writing `proseu_section_acknowledgements`, then the question component chosen by `question_type`.
6. Keep Firebase login until the identity map is verified. Hide the save path when there is no Supabase session, the way `saveStudyProgress` already does.

## Source index

| Concern | File |
| --- | --- |
| Student Learn UI, competencies, ring math | `src/app/learn/page.tsx` |
| Published catalog loader | `src/supabase/public-curriculum.ts` |
| Static 9×8 titles (not imported) | `src/lib/founding-curriculum.ts` |
| Admin duplicate of the path (Firestore) | `src/components/admin/templates/ScholaIuris.tsx` |
| Competency checkbox map | `src/components/admin/UniversitasHierarchyTable.tsx` |
| Ten previews | `src/components/admin/templates/*.tsx`, mounted by `TemplateManager.tsx` |
| Template persistence | `src/supabase/template-store.ts`, `SupabaseTemplateStudio.tsx` |
| Concept question generator | `src/lib/contentEngine.ts`, `src/app/universitas/[courseId]/page.tsx` |
| Schema | `supabase/migrations/20261025_000003_academic_learning_core.sql`, `000004_learning_templates.sql`, `000006_indexes_and_storage.sql`, `000008_curriculum_history_and_attempt_integrity.sql`, `000009_least_privilege_grants.sql`, `20261026225517_fix_public_published_curriculum_rls.sql` |
| Design tokens | `src/app/globals.css`, `tailwind.config.ts`, `index.html` |
| Router and Pages build | `web/main.tsx`, `vite.config.ts`, `.github/workflows/pages.yml` |
