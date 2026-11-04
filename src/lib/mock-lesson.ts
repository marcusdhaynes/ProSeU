/**
 * One authored lesson: PSU-1.1, Core Principles, Authority, Paralegal.
 * Shape requested for content writers: 2–3 sentence summary, 3–5 checklist
 * items, 3–5 sections of 60–150 words, at least 8 questions
 * (2 true/false, 3 multiple choice, 1 matching, 2 fill-in).
 * One section has a stored audio URL, one has a video URL, the others are
 * read with the Web Speech API from the section body.
 */

import type { LevelId } from './mastery-catalog';
import type { LessonQuestionType } from './lesson-grade';

export const MOCK_CURRICULUM_CODE = 'PSU-1.1';
export const MOCK_COURSE_ID = 'founding-psu-1-1';
export const MOCK_SUBSECTION_ID = 'core-principles.authority';
export const MOCK_LEVEL_ID: LevelId = 'paralegal';
export const MOCK_LESSON_ID = 'psu-1-1.core-principles.authority.paralegal';

export interface MockLessonSection {
  id: string;
  position: number;
  heading: string;
  body: string;
  audioUrl: string | null;
  videoUrl: string | null;
  defaultOpen: boolean;
}

export interface MockLessonQuestion {
  id: string;
  templateId: 'veritas' | 'multiplix' | 'congruens' | 'scriptum';
  questionType: LessonQuestionType;
  position: number;
  payload: Record<string, unknown>;
}

export interface MockLesson {
  id: string;
  curriculumCode: string;
  subsectionId: string;
  levelId: LevelId;
  summary: string;
  checklist: { id: string; position: number; body: string }[];
  sections: MockLessonSection[];
  questions: MockLessonQuestion[];
}

const forceIsNotAuthority = [
  'A person with authority may set a rule that other people are expected to obey.',
  'A bully can make you move too, but that is force, not authority.',
  'Force works because someone is stronger in the moment.',
  'Authority works because the law recognizes the power and will stand behind it.',
  'Think of a judge telling a witness to answer, or a legislature passing a statute.',
  'Each one acts in a role the law created.',
  'A stranger who shouts the same command has no such role.',
  'The first question is always who gave this person the power, and what the power is for.',
  'If the only answer is that they can hurt you, you are looking at force.',
  'If the answer is an office, a statute, or a court, you are looking at authority.',
  'A command nobody had the authority to give is not a legal rule.',
].join(' ');

const theGrant = [
  'Authority is never a blank check.',
  'It comes with a grant: a description of who may decide, and of what they may decide.',
  'A traffic officer may stop a car because a statute says so.',
  'That same officer may not invent a new crime at the roadside.',
  'The office is real, and the act can still fall outside it.',
  'When you read a rule, look for the grant before you look at the punishment.',
  'Ask which document or custom hands over the power.',
  'Then ask how far that document reaches.',
  'A mayor, a judge, and a parliament each hold authority, and each of them can step past it.',
  'Past the grant, the act may look official and still be unlawful.',
  'Students often stop once they see a title.',
  'The title tells you who claims the power.',
  'The grant tells you whether the claim is one the law will honor.',
].join(' ');

const whoDecided = [
  'Before a court asks who was hurt, it asks who decided.',
  'That order is not cold. It keeps punishment and liability attached to a power the community has already accepted.',
  'Picture a city office that jails a critic for a speech the constitution protects.',
  'The mayor really does hold an office.',
  'The jail door really does lock.',
  'Neither fact answers the authority question.',
  'The constitution already drew the edge of that office, and this punishment sits outside the drawing.',
  'So the right description is not "the mayor had power, so the act was lawful."',
  'It is "the mayor holds an office, and this act left the grant."',
  'Train yourself to say that sentence out loud.',
  'It separates a person who wears authority from an act that authority does not cover.',
  'Later levels will add cases and tests.',
  'This level only asks you to see the edge.',
].join(' ');

const beforeHarm = [
  'Authority comes before harm, duty, and remedy.',
  'If no one had the power to make the rule, there is nothing lawful to apply to the injury.',
  'That does not mean the injury is unimportant.',
  'It means you will study harm in its own subsection, after you know whose rule you are using.',
  'A lawyer who starts with sympathy and never asks who decided will argue the wrong question.',
  'Start with the speaker.',
  'Name the office or the body.',
  'Name the grant.',
  'Only then ask what the rule does to the people in front of you.',
  'This habit is short, and it is the one this lesson exists to build.',
  'When you can do it without notes, the Paralegal level of Authority is in your hands.',
].join(' ');

export const MOCK_LESSON: MockLesson = {
  id: MOCK_LESSON_ID,
  curriculumCode: MOCK_CURRICULUM_CODE,
  subsectionId: MOCK_SUBSECTION_ID,
  levelId: MOCK_LEVEL_ID,
  summary: 'Authority is the legal power to make a rule other people must follow. You will learn how to tell that power apart from a threat, who is allowed to use it, and where it stops. By the end you can point to the person or body a rule comes from.',
  checklist: [
    { id: 'check-force', position: 0, body: 'I can tell legal authority from mere force.' },
    { id: 'check-who', position: 1, body: 'I can name who is allowed to make the rule.' },
    { id: 'check-grant', position: 2, body: 'I can say what happens when that person steps outside the grant.' },
    { id: 'check-order', position: 3, body: 'I can explain why a court asks who decided before it asks who was hurt.' },
  ],
  sections: [
    {
      id: 'sec-force',
      position: 0,
      heading: 'Force is not authority',
      body: forceIsNotAuthority,
      audioUrl: null,
      videoUrl: null,
      defaultOpen: true,
    },
    {
      id: 'sec-grant',
      position: 1,
      heading: 'The grant has edges',
      body: theGrant,
      audioUrl: 'lesson/authority-grant.wav',
      videoUrl: null,
      defaultOpen: true,
    },
    {
      id: 'sec-office',
      position: 2,
      heading: 'The office is not the act',
      body: whoDecided,
      audioUrl: null,
      videoUrl: 'lesson/authority-office.mp4',
      defaultOpen: true,
    },
    {
      id: 'sec-order',
      position: 3,
      heading: 'Ask who decided first',
      body: beforeHarm,
      audioUrl: null,
      videoUrl: null,
      defaultOpen: true,
    },
  ],
  questions: [
    {
      id: 'q-tf-force',
      templateId: 'veritas',
      questionType: 'true_false',
      position: 0,
      payload: {
        prompt: 'A threat is the same thing as legal authority.',
        answer: false,
        explanationIfCorrect: 'A threat can make someone obey, but authority is power the law recognizes. Strength alone does not create a legal rule.',
        explanationIfWrong: 'Force and authority are different. A threat may scare someone into obeying, yet the law still asks whether the speaker was allowed to command.',
      },
    },
    {
      id: 'q-tf-statute',
      templateId: 'veritas',
      questionType: 'true_false',
      position: 1,
      payload: {
        prompt: 'A statute binds only when the body that enacted it had authority to do so.',
        answer: true,
        explanationIfCorrect: 'Authority asks who is allowed to make the rule. A statute binds when that body acted inside its grant.',
        explanationIfWrong: 'A document does not become law just because it looks official. The body that enacted it must have had the power to do so.',
      },
    },
    {
      id: 'q-mc-question',
      templateId: 'multiplix',
      questionType: 'multiple_choice',
      position: 2,
      payload: {
        prompt: 'Which question does Authority ask?',
        options: ['Who has the power to make this rule?', 'Who was harmed?', 'What money will make this right?', 'Was the hearing polite?'],
        correctIndex: 0,
        explanation: 'Authority is about who holds legal power. Harm, money, and manners are later questions.',
      },
    },
    {
      id: 'q-mc-stop',
      templateId: 'multiplix',
      questionType: 'multiple_choice',
      position: 3,
      payload: {
        prompt: 'An officer stops a driver under a traffic statute. What makes the stop authority rather than a threat?',
        options: ['The officer is larger than the driver.', 'The statute gives the officer that power.', 'The driver is afraid.', 'The officer is angry.'],
        correctIndex: 1,
        explanation: 'The statute is the grant. Size, fear, and anger describe force, not the legal power to stop the car.',
      },
    },
    {
      id: 'q-mc-mayor',
      templateId: 'multiplix',
      questionType: 'multiple_choice',
      position: 4,
      payload: {
        prompt: 'A mayor jails a critic for a speech the constitution protects. What is the best description?',
        options: [
          'The mayor used authority the office actually has.',
          'The mayor holds the office, but this act is outside the grant.',
          'Speech is always a crime.',
          'Only a judge can ever be wrong.',
        ],
        correctIndex: 1,
        explanation: 'Holding an office is not a blank check. Authority ends where the law draws the line, and punishing protected speech crosses it.',
      },
    },
    {
      id: 'q-match',
      templateId: 'congruens',
      questionType: 'matching',
      position: 5,
      payload: {
        pairs: [
          { term: 'Authority', definition: 'Who has the legal power' },
          { term: 'Force', definition: 'Obedience bought by a threat' },
          { term: 'Grant', definition: 'The edge of that power' },
        ],
        explanation: 'Authority is the legal power, force is a threat, and the grant is the edge of the power.',
      },
    },
    {
      id: 'q-fill-power',
      templateId: 'scriptum',
      questionType: 'fill_in',
      position: 6,
      payload: {
        prompt: 'Authority asks who has legal ____.',
        blanks: [{ answer: 'power', accepted: ['power'] }],
        explanation: 'Authority is the question of who holds legal power, not who was hurt.',
      },
    },
    {
      id: 'q-fill-rule',
      templateId: 'scriptum',
      questionType: 'fill_in',
      position: 7,
      payload: {
        prompt: 'A command with no authority is not a legal ____.',
        blanks: [{ answer: 'rule', accepted: ['rule', 'law'] }],
        explanation: 'People may obey a command out of fear. Without authority it is still not a legal rule.',
      },
    },
  ],
};

export function mockLessonMatches(curriculumCode: string | null, courseId: string, subsectionId: string, levelId: LevelId): boolean {
  const course = curriculumCode === MOCK_CURRICULUM_CODE || courseId === MOCK_COURSE_ID;
  return course && subsectionId === MOCK_SUBSECTION_ID && levelId === MOCK_LEVEL_ID;
}
