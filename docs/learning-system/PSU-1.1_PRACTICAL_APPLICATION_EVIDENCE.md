# PSU-1.1 — Practical Application: Academic Sources and Editorial Review

**Status:** 28 original lessons authored (7 subsections × 4 mastery levels), 84 reading sections and 224 questions. **All are draft, not published or accredited.** Prepared 2026-11-04.

This final competency converts jurisprudential ideas into ethical legal tasks. The four levels are separate, progressively more demanding treatments rather than the same text rephrased. They are not instructions to practice law without the appropriate professional authorization. No current legal rule may be assumed to apply in every country.

## Learning matrix

| Canonical subsection | Draft source JSON | Red (paralegal) | Yellow (bachelor) | Orange (masters) | Black (doctorate) |
| --- | --- | --- | --- | --- | --- |
| Issue Spotting | `practical_skills_issue_spotting.json` | Client interview and fact/claim separation | Elements map and threshold issues | Cross-border characterization and forum | Hypothesis testing, uncertainty and ethics |
| Rule Extraction | `practical_skills_rule_extraction.json` | Holding, dicta, conditional rules | Ratio, case briefs and subsequent treatment | Statutory conditions and fractured opinions | Source provenance and interpretive theory |
| Burden Manipulation | `practical_skills_burden_manipulation.json` | Production, persuasion and honesty | Civil presumptions and Rule 301 | Criminal safeguards and discrimination frameworks | Evidence asymmetry and procedural justice |
| Evidence Structuring | `practical_skills_evidence_structuring.json` | Timeline, custody and original records | Relevance, authentication and admissibility | Digital records, metadata and forensic integrity | Statistical bias and contestability |
| Argument Construction | `practical_skills_argument_construction.json` | Issue, rule, application and conclusion | IRAC/CREAC and counterargument | Appeal structure, preservation and review | Argument, candor and remedial legitimacy |
| Procedural Leverage | `practical_skills_procedural_leverage.json` | Deadlines and informed dispute-resolution choices | Pleading, proportional discovery, case management | Interim remedies, forum and enforcement | Access to justice and resisting abusive process |
| Judicial Psychology Navigation | `practical_skills_judicial_psychology.json` | Accurate courtroom communication and impartiality | Clear issue framing without stereotypes | Decision-science limitations and reliability | Bias-resistant institutional decision-making |

## Core legal and methodological sources for academic sign-off

1. **Competence, diligence, client communication and candid advocacy:** American Bar Association [Model Rule 1.1](https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_1_1_competence/) and [Model Rules index](https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/model_rules_of_professional_conduct_table_of_contents/). These are **model** rules; actual adopted and amended jurisdictional rules must be checked separately.
2. **Candor and avoiding improper influence:** ABA [Model Rule 3.3](https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_3_3_candor_toward_the_tribunal/) and [Model Rule 3.5](https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_3_5_impartiality_decorum_of_the_tribunal/). Separate permissible explanation from threats, deception and prohibited ex parte contact.
3. **Duties to other parties, litigation pacing:** ABA [Model Rule 3.4](https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_3_4_fairness_to_opposing_party_counsel/) and [Model Rule 3.2](https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_3_2_expediting_litigation/). The title 'Burden Manipulation' is a preexisting taxonomy label, **not** permission to falsify evidence, pressure witnesses, file frivolous process or extend proceedings improperly.
4. **Distinguishing proof burdens:** [Federal Rule of Evidence 301](https://www.law.cornell.edu/rules/fre/rule_301), where in the ordinary federal civil context a presumption shifts burden of production, **not persuasion** unless law otherwise provides; [LII — Burden of proof](https://www.law.cornell.edu/wex/burden_of_proof). Criminal and other special allocation regimes require their own authority.
5. **Evidence:** [FRE 401](https://www.law.cornell.edu/rules/fre/rule_401), [403](https://www.law.cornell.edu/rules/fre/rule_403), [901](https://www.law.cornell.edu/rules/fre/rule_901), and [902](https://www.law.cornell.edu/rules/fre/rule_902). Relevance, authentication, admissibility, probative weight and sufficiency **are not equivalent**. Digital hashes support integrity of a copy, not the truth of content or certainty about the operator of an account.
6. **Pleadings and discovery:** [FRCP 11](https://www.law.cornell.edu/rules/frcp/rule_11) provides particular certification/sanctions rules for covered papers and does **not** directly apply to discovery requests and responses under Rules 26–37; [FRCP 26](https://www.law.cornell.edu/rules/frcp/rule_26) addresses, among other matters, proportionate discovery. Other jurisdictions have different standards.
7. **Legal reasoning, doctrine and precedent:** [LII — Stare decisis](https://www.law.cornell.edu/wex/stare_decisis); [Stanford Encyclopedia — Legal Positivism](https://plato.stanford.edu/entries/legal-positivism/) and [Nature of Law](https://plato.stanford.edu/entries/lawphil-nature/). For fractured opinions, check the controlling tribunal's own guidance; don't universalize an American plurality formula.
8. **Decision-science and judges:** Treat anchoring, availability, perceived credibility and empirical judicial-behavior research as **fallible population-level findings**, not proof about a specific judge. No lesson teaches demographic profiling, prohibited influence, concealment, or covert psychological manipulation. Any behavioral study used in a future exercise requires bibliographic details and methodological review.
9. **Human impact and fair process:** Consider disproportionate burdens on persons with limited money, language access or disability. Every policy/advocacy recommendation must distinguish a source of **current law** from a proposed **reform**, especially across countries.

## Assessment design

Each lesson contains a distinct focus, narrative introduction, three actionable outcomes, three instructional readings (each with matching audio script), and eight questions: two True/False with complete feedback; three four-option multiple-choice questions; one four-pair matching activity; and two fill-in answers with accepted forms. The four levels progress from recognition to application, comparison and critical design. The questions include issue-specific hypotheticals rather than only terms.

The server-side importer must split answers from learner-readable prompts in Supabase. The current **draft practice** is device-local and uses locally available answers; it is never certified assessment. A legal educator must review every answer, plausible distractor, case citation and accepted blank before publishing. All JSON rows remain `status: "draft"`.

## Engineering and academic release gates

- Run `scripts/import-mastery-content.ts --dry-run --strict --require-all-levels lessons/stage-01`.
- Run dedicated competency gates for Major Cases, Policy Debates and Practical Application, plus `scripts/verify-jurisprudence-complete.ts`.
- Confirm **49 subsection nodes × 4 levels = 196 authoring slots**, **1,568 questions**, with unique stable question keys across the entire course; note that Core Principles has an additional reading count over its minimum.
- Check the course Play button opens `core-principles.authority`. Confirm all Practical Application nodes can open draft practice in Track and ICM, with red/yellow/orange/black content.
- Validate accurate feedback, media read-aloud, accessibility, section acknowledgments, local-only progress label and resuming on the same device.
- **Do not** call the course live, certified, or synced until approved content is deployed to the correct ProSeU Supabase project with RLS and authenticated server-grading verified in a real browser.
- Compare the 196 lessons with the actual **official required-course objectives** for the selected ten universities. This university-equivalence map is a separate uncompleted academic audit.
- Require independent legal subject-matter review, including changes to current law, case holdings, cultural accuracy, source provenance, professional ethics and student outcomes.
- Keep all game code and PR #5 strictly untouched.

**The 196/196 count means draft content coverage. It is not academic sign-off, publication, proof that the student can access a live graded course, or completion of all eight Stage 01 courses.**
