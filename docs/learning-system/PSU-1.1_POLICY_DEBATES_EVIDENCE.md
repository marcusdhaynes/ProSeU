# PSU-1.1 — Policy Debates: Evidence and Editorial Review Map

**Status: All 28 drafts authored, 0 published. Academic/legal peer review still required.** Date: 2026-11-04.

## Scope

The four mastery levels each have an original focus, 2–3 sentence introduction, three actionable outcomes, three complete connected readings with audio-script text, and eight exercises across Veritas (true/false with feedback), Multiplix (multiple choice), Congruens (matching), and Scriptum (fill-in). The same 49-subsection canonical taxonomy, stable question IDs, and Supabase importer contract used by the other course competencies apply. **These drafts are not claims of professional accreditation, current advice in a specific country, or verified coverage of ten universities' official syllabi.**

| Subsection | JSON source file | Red — Paralegal | Yellow — Bachelor | Orange — Masters | Black — Doctorate |
| --- | --- | --- | --- | --- | --- |
| Individual vs State Power | `policy_debates_individual_state.json` | Rights, official authority, and review | Mill's harm principle and paternalism | Hobbes, Locke, Raz's service conception | Legality, legitimacy, nondomination |
| Fairness vs Efficiency | `policy_debates_fairness_efficiency.json` | Costs of delay and exclusion | Cost-benefit and Pareto criteria | Rawls, Coase, externalities | Rights-constrained institutional design |
| Predictability vs Flexibility | `policy_debates_predictability_flexibility.json` | Clear rules and hardship exceptions | Fuller's eight desiderata | Hart's open texture and bounded equity | Formal legality, substantive justice, reliance |
| Centralization vs Decentralization | `policy_debates_centralization_decentralization.json` | Local responsiveness versus spillovers | Federal and unitary arrangements | Article 5 TEU: conferral, subsidiarity, proportionality | Legal pluralism and Indigenous jurisdiction |
| Formalism vs Pragmatism | `policy_debates_formalism_pragmatism.json` | Text, context and practical goals | Text, purpose, and binding precedent | Holmes, legal realism, descriptive vs normative accounts | Dworkin's law as integrity and criticism |
| Stability vs Evolution | `policy_debates_stability_evolution.json` | Settled rules and reforms | Stare decisis, distinguishing, overruling | Brown, interpretive theories, reliance | Constitutional correction and transparent transition |
| Liberty vs Security | `policy_debates_liberty_security.json` | Lawful security measures | Necessity, proportionality, privacy protections | Emergency powers and derogation issues | Predictive policing, chilling effects, nondomination |

## Academic references and official legal anchors

Sources below are guides to verify the named theories and legal instruments, not substitutes for reading original works and applicable jurisdictional legislation. They are not represented as endorsements.

1. **Limits on coercion:** [Stanford Encyclopedia of Philosophy — The Limits of Law](https://plato.stanford.edu/entries/law-limits/), covering Mill's harm principle and later debates; [Stanford Encyclopedia — Legal Positivism](https://plato.stanford.edu/entries/legal-positivism/), distinguishing validity from obligation; [Stanford Encyclopedia — The Nature of Law](https://plato.stanford.edu/entries/lawphil-nature/), for Hart and Dworkin. Verify Raz's normal-justification thesis against his original writing before sign-off.
2. **Justice and efficiency:** [Stanford Encyclopedia — The Original Position](https://plato.stanford.edu/entries/original-position/), Rawls's two principles including priority of basic liberties, fair opportunity and the difference principle; [Stanford Encyclopedia — Economic Analysis of Law](https://plato.stanford.edu/archives/sum2007/entries/legal-econanalysis/), Coase, Calabresi, efficiency, and debates over welfare metrics. Review Pareto terminology carefully; aggregate gains alone are not Pareto improvements.
3. **Predictability and legal form:** [Stanford Encyclopedia — Rule of Law](https://plato.stanford.edu/entries/rule-of-law/), including Fuller's eight desiderata and the distinction between formal qualities and moral substance. [Stanford Encyclopedia — Nature of Law](https://plato.stanford.edu/entries/lawphil-nature/) treats Hart's open texture, principles and interpretation.
4. **Distribution of powers:** [Stanford Encyclopedia — Federalism](https://plato.stanford.edu/entries/federalism/); [Article 5, Treaty on European Union — EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:12016M005), for conferral, subsidiarity in nonexclusive competence, and proportionality; [European Parliament fact sheet on subsidiarity](https://www.europarl.europa.eu/factsheets/en/sheet/7/principles-of-european-union-law). Do not generalize EU treaty obligations to all federations.
5. **Interpretive disagreement:** [Stanford Encyclopedia — Legal Positivism](https://plato.stanford.edu/entries/legal-positivism/); [Stanford Encyclopedia — The Nature of Law](https://plato.stanford.edu/entries/lawphil-nature/) for Dworkin's interpretivism, source-based criticism, and open texture. Legal realism should be researched against Holmes and later realist work rather than described as unrestrained judicial whim.
6. **Precedent and lawful evolution:** [Cornell Legal Information Institute — Stare Decisis](https://www.law.cornell.edu/wex/stare_decisis); [U.S. Constitution Annotated — Stare Decisis](https://www.law.cornell.edu/constitution-conan/article-3/section-1/stare-decisis-doctrine-current-doctrine), for hierarchy, reliance, reasons for overruling. Consult [the Major Cases evidence map](./PSU-1.1_MAJOR_CASES_EVIDENCE.md) for Brown/Plessy context. Originalism and living constitutionalism have internal variations and should not be caricatured.
7. **Liberty and security:** [Stanford Encyclopedia — Limits of Law](https://plato.stanford.edu/entries/law-limits/) for limits on coercion; verify restrictions and derogation requirements from the controlling constitutional or international human-rights instrument before giving jurisdiction-specific advice. Avoid presenting one proportionality sequence or oversight requirement as globally binding.

## Editorial quality and security rules

- Every question's correct value, plausible distractors, explanation and accepted fill-in answer must receive a subject-matter review. Content checks establish format, not factual correctness.
- Preserve progressive depth. Red explains an affected person and their legal problem; Yellow distinguishes concepts and applicable tests; Orange compares theories or jurisdictions; Black constructs and critiques justified institutional choices.
- Statements of current law must identify the jurisdiction and binding authority. Philosophical theses are views in dispute and should be attributed accurately.
- Do not mark lesson JSON as `published` or grade client-side preview results as certified. The temporary preview provides **device-local practice only**; the production lesson route must continue preferring RLS-protected published Supabase rows and server-side grading.
- Verify the user can click **Play** on Jurisprudence, begin Core Principles → Authority, navigate any Policy Debates node in Track or ICM, open readings, check acknowledgements, hear read-aloud, answer eight exercises and see feedback. Verify a reload resumes only the locally labeled practice preview, not certified progress.
- ProSeU's actual Supabase project must be connected and verified before the approved lesson importer can publish data or record authenticated mastery. No other project's Supabase database should be used.
- Follow up separately on the official ten-university objectives/required-curricula coverage audit. No university audit is implied by these source links.

**Games:** no game-related code, routes, source data, or PR #5 were changed.
