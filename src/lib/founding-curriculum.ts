/**
 * ProSeU Founding Curriculum, Edition 2026.
 * Source: ProSeU-Founding-Curriculum-v2.pdf, pages 13–50.
 * Each course has its original PSU reference and its verbatim "Question It Answers".
 * This is administrator import data, not a hard-coded substitute for Firestore records.
 */
export interface FoundingCourse {
  curriculumCode: string;
  title: string;
  description: string;
  order: number;
}
export interface FoundingStage {
  number: number;
  roman: string;
  name: string;
  subtitle: string;
  courses: FoundingCourse[];
}
type StageSource = { name: string; subtitle: string; courses: [string, string][] };
const SOURCE: StageSource[] = [
  { name: "The Architecture of Law", subtitle: "How Law Thinks", courses: [
    ["Jurisprudence: What Law Is and Why It Binds", "Why should anyone obey a rule written by people, and what separates law from a gunman's order?"],
    ["Legal History: From Hammurabi and Rome to the Modern Code", "How did a king's inscribed decrees and a republic's twelve tables grow into the legal systems that govern billions today?"],
    ["The World's Legal Systems: A Comparative Introduction", "When two lawyers from different continents face the same problem, why do they reach for different tools?"],
    ["Legal Reasoning and Analysis", "How does a lawyer move from a pile of facts and authorities to a conclusion that can be defended?"],
    ["Legal Research and Writing", "How does a lawyer find the law that governs a problem and put the answer on paper so that a busy reader trusts it?"],
    ["Interpretation: Statutes, Contracts, Treaties and Sacred Texts", "What does a text mean when its author is absent, its words are ambiguous and the stakes are real?"],
    ["Law, Economics and Evidence of the Social World", "How can a lawyer judge whether a rule works, and whether the numbers offered in court are honest?"],
    ["Logic, Argument and Critical Thinking", "How can a lawyer tell a sound argument from a merely persuasive one, and find the flaw in an opponent's case before the judge does?"],
  ] },
  { name: "Private Law", subtitle: "Rights Between Persons", courses: [
    ["Contract: Promise, Bargain and Obligation", "When does a promise become a legal obligation, and what must a court do when it is broken?"],
    ["Tort and Delict: Harm, Fault and Repair", "Who must pay when one person's act, or failure to act, injures another?"],
    ["Property and Land: Ownership, Possession and Use", "What does it mean to own something, and who may be kept out?"],
    ["Equity and Trusts", "How can one person hold property for the benefit of another, and why do courts police that trust?"],
    ["Restitution and Remedies", "When must a person give back a benefit, and how does a court make a wrong right?"],
    ["Family, Succession and Personal Status", "How does law define who is bound to whom in a family, and who inherits when someone dies?"],
    ["Commercial Transactions: Sale, Credit, Security and Payment", "How does law let strangers trade goods, lend money and trust a payment across borders?"],
    ["Moral Philosophy of Justice", "What do we owe one another when rights collide, and how do moral ideas of fairness shape what private law gives a wronged person?"],
  ] },
  { name: "Public Law", subtitle: "The State, Power and Rights", courses: [
    ["Constitutional Law I: Structure of Government", "How do constitutions divide power among legislatures, executives, courts and the levels of government?"],
    ["Constitutional Law II: Rights and Liberties", "How should a constitution protect the individual against the majority, and who decides where the limit lies?"],
    ["Administrative Law: Controlling Public Power", "What can a citizen do when an official or agency acts unlawfully, unfairly or irrationally?"],
    ["Legislation, Regulation and the Regulatory State", "How do modern states govern through statutes, agencies and rules, and how do we keep that process accountable?"],
    ["Human Rights Law: National, Regional and Universal", "How does a right become enforceable when the state itself is the violator?"],
    ["Tax and Public Finance", "By what authority may a state take part of your income, and how does it decide how to spend it?"],
    ["Citizenship, Migration and Refugee Law", "Who belongs to a state, who may enter it, and who may not be sent away?"],
    ["Rhetoric and Persuasion", "What moves a judge, a legislator or a frightened client to change their mind, and where must an honest lawyer stop?"],
  ] },
  { name: "Crime, Procedure and Proof", subtitle: "Enforcing the Law", courses: [
    ["Criminal Law: Wrong, Culpability and Defense", "When does conduct become a crime, and what must the state prove about a person's act and state of mind before it may condemn them?"],
    ["Criminal Procedure: Investigation, Trial and Rights of the Accused", "How far may the state go in finding, holding and trying a suspect, and what protects the person on the other side?"],
    ["Evidence and Proof", "What may a court treat as true, who must prove it, and how much proof is enough?"],
    ["Civil Procedure: Courts, Jurisdiction and Process", "How does a private grievance travel through a court system and become a binding judgment?"],
    ["Complex and Cross-Border Litigation (Adversarial and Inquisitorial Systems Compared)", "How do you run a dispute that involves many parties, many courts and more than one idea of what a trial is?"],
    ["Negotiation, Mediation and Arbitration", "When is the best way to resolve a dispute not to try it, and how do you do that well?"],
    ["Punishment, Restorative and Transitional Justice", "What is punishment for, who decides how much, and what does a society owe victims after mass wrongdoing?"],
    ["Psychology of Testimony, Memory and Deception", "Why do honest witnesses misremember, why do people mislead, and how can a lawyer weigh an account without trusting a hunch?"],
  ] },
  { name: "The World's Legal Traditions", subtitle: "The World's Legal Traditions", courses: [
    ["The Civil Law Tradition: Codes, Doctrine and Latin America", "How does a legal system run on codes and scholarship rather than precedent, and what happened when it crossed the Atlantic?"],
    ["Islamic Law I: Sources, Method and the Schools (Usul Al-Fiqh)", "How do jurists move from revealed texts to legal rules, and why has that work produced several schools rather than one code?"],
    ["Islamic Law II: Contemporary Practice (Family, Finance, Criminal Law, Constitutions)", "How does a tradition of jurists' law live inside modern states, with their codes, constitutions and global markets?"],
    ["Chinese and East Asian Law", "How do codification, party-state institutions and older traditions of legal thought combine in the legal orders of China and East Asia?"],
    ["South Asian Law: Indian, Hindu and Muslim Personal Law and Constitutionalism", "How does a constitutional democracy of many faiths govern family life through one constitution and personal laws?"],
    ["African Law: Customary, Colonial and Constitutional", "How do customary law, colonial inheritance and modern constitutions fit together in African legal systems?"],
    ["Indigenous Law and Legal Pluralism", "What happens when a state's legal order shares ground with Indigenous legal orders that predate and outlast it?"],
    ["Intercultural Communication and Empathy", "How do you understand a person whose language and sense of fairness differ from yours, and serve them without stereotyping?"],
  ] },
  { name: "Law Beyond Borders", subtitle: "Law Beyond Borders", courses: [
    ["Public International Law", "What binds states when no sovereign stands above them, and who enforces it?"],
    ["Regional Integration Law: The EU and Beyond", "How do states pool sovereignty in a legal order that their own courts must apply?"],
    ["Private International Law: Conflict of Laws", "When a private dispute touches several countries, whose court decides it, whose law applies, and whose judgment will be enforced?"],
    ["International Trade and Investment Law", "How do states open and protect markets, and what happens when they break the promises they made?"],
    ["International Criminal and Humanitarian Law", "How does law restrain war, and who answers for atrocities when states will not act?"],
    ["International Arbitration and Dispute Settlement", "How do parties from different countries obtain a binding, enforceable decision outside any national court?"],
    ["Law of the Sea, Space and the Global Commons (Including Climate and the Oceans)", "Who may use, claim and protect the places that belong to no state: the oceans, the poles, outer space and the atmosphere?"],
    ["Philosophy of Global Justice and Human Dignity", "What do people owe one another across borders, and what turns human dignity from a hope into a claim that law can recognize?"],
  ] },
  { name: "Business and Enterprise", subtitle: "Business and Enterprise", courses: [
    ["Company Law and Corporate Governance", "Who controls a company, to whom do they owe their loyalty, and what happens when they betray it?"],
    ["Securities and Corporate Finance", "How does a company raise money from the public without deceiving it?"],
    ["Financial Regulation, Banking and Fintech", "Why are banks regulated unlike any other business, and can the rules keep pace with crypto and sharia-compliant finance?"],
    ["Insolvency and Restructuring", "When there is not enough to go around, who gets paid, who decides, and can the business be saved?"],
    ["Competition and Antitrust Law", "When does winning in a market become an abuse of it?"],
    ["Intellectual Property", "How can anyone own an idea, a melody or a name, and how far should ownership reach?"],
    ["Employment and Labor Law", "What does an employer owe the people who work for it, and what can they demand together?"],
    ["Behavioral Economics and Decision Psychology", "Why do intelligent clients and counterparties make predictably poor decisions, and how does a lawyer plan around that?"],
  ] },
  { name: "Law in the Modern World", subtitle: "Law in the Modern World", courses: [
    ["Environmental, Climate and Energy Law", "How can law make anyone answer for harm spread across borders, centuries and billions of emitters?"],
    ["Health, Bioethics and Life-Sciences Law", "When medicine can do almost anything, who decides what it may do to a body?"],
    ["Technology, Data and Privacy Law", "Who owns, controls and profits from the trail of data every person now leaves behind?"],
    ["Artificial Intelligence and Algorithmic Governance", "How do you hold a decision to account when no human made it and no one can fully explain it?"],
    ["Cyber, Security and Emergency Powers", "What may a state lawfully do to its people, and to other states, in the name of security?"],
    ["Equality, Discrimination and Social Justice Law", "What does equal treatment demand when people do not start equal?"],
    ["Poverty, Housing and Access to Justice", "What good is a right that a person cannot afford to enforce?"],
    ["Creative Problem-Solving and Legal Innovation", "When no rule fits the problem in front of you, how do you invent a lawful solution that works?"],
  ] },
  { name: "The Practicing Lawyer", subtitle: "Global Practice", courses: [
    ["Professional Responsibility and Global Legal Ethics", "What do you owe your client, the court and the public when those duties collide?"],
    ["Written and Oral Advocacy: Briefs, Moots and Argument", "How do you make a court want to rule for you before your first page ends?"],
    ["Trial and Appellate Advocacy", "How are facts won in a courtroom, and how is a verdict defended or overturned above it?"],
    ["Client Counseling and Negotiation in Practice", "What does a client really need, and how do you win it across the table?"],
    ["Transactional Practice: Deals, Drafting and Due Diligence", "How does a lawyer turn a handshake into a signed, enforceable and closable deal?"],
    ["Clinic and Pro Bono Service", "Can you serve a real person with a real problem, well, under supervision?"],
    ["Emotional Intelligence and Client Psychology", "How do you read people accurately, earn their trust and stay steady when they are frightened, angry or lying?"],
    ["The Global Practice Capstone: Law in Three Jurisdictions", "Can you solve one client's problem under three legal systems at once?"],
  ] },
];
const ROMANS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
export const FOUNDING_CURRICULUM: FoundingStage[] = SOURCE.map((stage, stageIndex) => ({
  number: stageIndex + 1,
  roman: ROMANS[stageIndex],
  name: stage.name,
  subtitle: stage.subtitle,
  courses: stage.courses.map(([title, description], index) => ({
    curriculumCode: `PSU-${stageIndex + 1}.${index + 1}`,
    title,
    description,
    order: index,
  })),
}));
if (FOUNDING_CURRICULUM.length !== 9 || FOUNDING_CURRICULUM.some(s => s.courses.length !== 8)) {
  throw new Error("Founding curriculum must contain exactly nine stages with eight courses each.");
}
