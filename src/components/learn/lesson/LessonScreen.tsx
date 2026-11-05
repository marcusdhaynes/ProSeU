'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, RotateCcw } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  lessonAdapter,
  type LessonAdapter,
  type LessonView,
  type ProgressSnapshot,
} from '@/lib/lesson-adapter';
import { MASTERY_LEVELS, type LevelId } from '@/lib/mastery-catalog';
import {
  completedPrefix, nextPart, readingPart, MASTERY_ORDER,
  READING_PARTS, PARTS_PER_LEVEL, QUESTIONS_PER_ROUND,
} from '@/learning/part-progress';
import { cn } from '@/lib/utils';
import { QuestionPlayer } from './QuestionPlayer';
import { SectionMedia } from './SectionMedia';

const PART_LABELS = [
  'Reading I', 'Reading II', 'Reading III',
  'Practice I', 'Practice II', 'Practice III', 'Practice IV',
] as const;

export function LessonScreen({
  courseId,
  curriculumCode,
  subsectionId,
  subsectionName,
  competencyName,
  color,
  adapter = lessonAdapter,
  initialPart,
  initialLevel,
  onBack,
  onProgress,
}: {
  courseId: string;
  curriculumCode: string | null;
  subsectionId: string;
  subsectionName: string;
  competencyName: string;
  color: string;
  adapter?: LessonAdapter;
  initialPart?: number | null; // 0–6. Set by tapping a ring segment.
  initialLevel?: LevelId | null;
  onBack: () => void;
  onProgress: (snapshot: ProgressSnapshot) => void;
}) {
  const [levelId, setLevelId] = useState<LevelId>('paralegal');
  const [partIndex, setPartIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [progressState, setProgressState] = useState<ProgressSnapshot | null>(null);
  const [lesson, setLesson] = useState<LessonView | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionAnswered, setQuestionAnswered] = useState(false);

  // A center click resumes at the first unfinished part, across mastery tiers.
  // A ring click can review a completed part but cannot skip ahead of the
  // first uncompleted part within the selected level.
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setLesson(null);
    setError(null);
    adapter.getProgress({ courseId, subsectionId }).then(snapshot => {
      if (cancelled) return;
      setProgressState(snapshot);
      const next = nextPart(snapshot.partsByLevel || {});
      const desiredLevel = initialLevel ?? next.levelId;
      const finishedPrefix = completedPrefix(snapshot.partsByLevel?.[desiredLevel] || []);
      const requested = initialPart == null ? (initialLevel ? finishedPrefix : next.part) : initialPart;
      setLevelId(desiredLevel);
      setPartIndex(Math.min(Math.max(0, requested), Math.min(finishedPrefix, PARTS_PER_LEVEL - 1)));
      setReady(true);
    }).catch(cause => {
      if (!cancelled) {
        setError(cause instanceof Error ? cause.message : String(cause));
        setReady(true);
      }
    });
    return () => { cancelled = true; };
  }, [adapter, courseId, subsectionId, initialPart, initialLevel]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setLesson(null);
    setMissing(false);
    setQuestionIndex(0);
    setQuestionAnswered(false);
    setChecked({});
    setError(null);
    adapter.getLesson({ courseId, curriculumCode, subsectionId, levelId })
      .then(next => {
        if (cancelled) return;
        setLesson(next);
        setMissing(!next);
        setOpenSections(next
          ? next.sections.filter((section, index) => readingPart(index, next.sections.length) === partIndex && section.defaultOpen && !section.understood)
            .map(section => section.id)
          : []);
      })
      .catch(cause => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => { cancelled = true; };
  }, [adapter, courseId, curriculumCode, subsectionId, levelId, ready]);

  useEffect(() => {
    if (!lesson) return;
    setQuestionIndex(0);
    const firstIndex = (partIndex - READING_PARTS) * QUESTIONS_PER_ROUND;
    setQuestionAnswered(partIndex >= READING_PARTS &&
      !!lesson.correctQuestionIds?.includes(lesson.questions[firstIndex]?.id));
    setOpenSections(lesson.sections
      .filter((section, index) => readingPart(index, lesson.sections.length) === partIndex && section.defaultOpen && !section.understood)
      .map(section => section.id));
  }, [partIndex, lesson?.id]);

  const partCompleted = progressState?.partsByLevel?.[levelId]?.[partIndex] === true;
  const level = MASTERY_LEVELS.find(item => item.id === levelId) ?? MASTERY_LEVELS[0];
  const displaySections = useMemo(() => lesson?.sections.filter((section, index) =>
    readingPart(index, lesson.sections.length) === partIndex) ?? [], [lesson, partIndex]);
  const questions = partIndex >= READING_PARTS
    ? lesson?.questions.slice((partIndex - READING_PARTS) * QUESTIONS_PER_ROUND,
        (partIndex - READING_PARTS + 1) * QUESTIONS_PER_ROUND) ?? []
    : [];
  const question = questions[questionIndex] ?? null;

  const track = (snapshot: ProgressSnapshot) => {
    setProgressState(snapshot);
    onProgress(snapshot);
  };

  const acknowledge = async (sectionId: string) => {
    if (!lesson || lesson.sections.some(section => section.id === sectionId && section.understood)) return;
    try {
      const snapshot = await adapter.markSectionUnderstood({ courseId, curriculumCode, subsectionId, levelId, sectionId });
      track(snapshot);
      setLesson(current => current && ({
        ...current,
        sections: current.sections.map(section => section.id === sectionId ? { ...section, understood: true } : section),
      }));
      setOpenSections(current => current.filter(id => id !== sectionId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const changeLevel = (nextLevel: LevelId) => {
    const count = completedPrefix(progressState?.partsByLevel?.[nextLevel] || []);
    setLevelId(nextLevel);
    setPartIndex(Math.min(count, PARTS_PER_LEVEL - 1));
  };

  const advancePart = () => {
    if (!partCompleted) return;
    if (partIndex < PARTS_PER_LEVEL - 1) {
      setPartIndex(index => index + 1);
      return;
    }
    const current = MASTERY_ORDER.indexOf(levelId);
    if (current < MASTERY_ORDER.length - 1) {
      setLevelId(MASTERY_ORDER[current + 1]);
      setPartIndex(0);
      return;
    }
    onBack();
  };

  return (
    <div className="space-y-7 pb-16" data-testid="lesson-screen">
      <header className="space-y-4">
        <button type="button" onClick={onBack}
          className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-accent inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3 w-3" /> Back to course
        </button>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">{competencyName}</p>
          <h1 className="text-3xl font-black uppercase tracking-tight text-primary">{subsectionName}</h1>
          <p className="mt-2 text-xs font-semibold text-muted-foreground">
            Part {partIndex + 1} of {PARTS_PER_LEVEL}: {PART_LABELS[partIndex]}
            {partCompleted ? ' · Complete' : ' · In progress'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Mastery level">
          {MASTERY_LEVELS.map(item => (
            <button key={item.id} type="button" role="tab"
              aria-selected={item.id === levelId} onClick={() => changeLevel(item.id)}
              className={cn('rounded-full border-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest',
                item.id === levelId ? 'text-white' : 'bg-card text-foreground')}
              style={item.id === levelId
                ? { backgroundColor: item.colorHex, borderColor: item.shadowHex }
                : { borderColor: item.colorHex, color: item.colorHex }}>
              {item.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2" aria-label="Seven lesson parts">
          {Array.from({ length: PARTS_PER_LEVEL }, (_, index) => {
            const complete = progressState?.partsByLevel?.[levelId]?.[index] === true;
            const reachable = index <= completedPrefix(progressState?.partsByLevel?.[levelId] || []);
            return (
              <button key={index} type="button"
                aria-label={`Part ${index + 1}: ${complete ? 'complete' : 'not complete'}`}
                disabled={!reachable}
                onClick={() => setPartIndex(index)}
                className={cn('h-3 min-w-0 flex-1 rounded-full border border-border transition-colors',
                  partIndex === index && 'ring-2 ring-offset-2 ring-accent',
                  !reachable && 'opacity-40')}
                style={{ backgroundColor: complete ? level.colorHex : 'hsl(var(--muted))' }} />
            );
          })}
        </div>
      </header>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {lesson?.preview && (
        <div role="note" data-testid="draft-practice-banner"
          className="rounded-2xl border border-amber-500/60 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
          <p className="font-black">Draft practice preview</p>
          <p className="mt-1">Readings and exercises work here. Completion is saved only on this device, is not a certified grade and does not sync to the server. Academic review and publication are pending.</p>
        </div>
      )}
      {missing && !error && (
        <div className="rounded-[2rem] border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center">
          <p className="text-sm font-bold text-foreground">This {level.name} lesson has not been made available.</p>
          <p className="mt-2 text-xs text-muted-foreground">Only authored and published or explicitly previewable material can open here.</p>
        </div>
      )}

      {lesson && (
        <div className="space-y-7">
          <section className="rounded-[2rem] border-2 border-border bg-card px-6 py-5 shadow-sm" data-testid="lesson-summary">
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">What you will learn</h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground">{lesson.summary}</p>
          </section>
          {partIndex === 0 && (
            <section className="space-y-2" data-testid="lesson-checklist">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Learning outcomes</h2>
              <ul className="space-y-2">
                {lesson.checklist.map(item => (
                  <li key={item.id} className="rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground">
                    <Check className="inline h-4 w-4 mr-2 text-accent" />{item.body}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {partIndex < READING_PARTS && (
            <Accordion type="multiple" value={openSections} onValueChange={setOpenSections}
              className="space-y-3" data-testid="lesson-sections">
              {displaySections.map(section => (
                <AccordionItem key={section.id} value={section.id}
                  className="rounded-[1.5rem] border-2 border-border bg-card px-4">
                  <AccordionTrigger className="text-left font-black uppercase tracking-tight text-primary hover:no-underline">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                      {section.heading}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pb-4">
                    <p className="text-sm leading-relaxed text-foreground">{section.body}</p>
                    <SectionMedia body={section.body} audioUrl={section.audioUrl} videoUrl={section.videoUrl} />
                    <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <input type="checkbox" data-testid={`understand-${section.id}`}
                        checked={section.understood}
                        onChange={() => { if (!section.understood) void acknowledge(section.id); }} />
                      <Check className="h-4 w-4 text-accent" /> I understand
                    </label>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
          {partIndex >= READING_PARTS && (
            <section className="space-y-4" data-testid="lesson-practice">
              <h2 className="text-lg font-black uppercase tracking-widest text-primary">
                {PART_LABELS[partIndex]} · {questions.length} questions
              </h2>
              {question && (
                <QuestionPlayer
                  key={question.id}
                  question={question}
                  index={(partIndex - READING_PARTS) * QUESTIONS_PER_ROUND + questionIndex}
                  total={lesson.questions.length}
                  onAnswer={async response => {
                    const graded = await adapter.submitAnswer({
                      courseId, curriculumCode, subsectionId, levelId,
                      questionId: question.id, response,
                    });
                    track(graded.progress);
                    if (graded.correct) {
                      setLesson(current => current && ({
                        ...current,
                        correctQuestionIds: [...new Set([...(current.correctQuestionIds || []), question.id])],
                      }));
                    }
                    setQuestionAnswered(graded.correct);
                    return { correct: graded.correct, explanation: graded.explanation };
                  }}
                />
              )}
              {questions.length > 1 && questionIndex < questions.length - 1 && (
                <div className="flex justify-end">
                  <Button type="button" variant="outline" className="rounded-full font-black uppercase tracking-widest"
                    disabled={!questionAnswered}
                    onClick={() => {
                      setQuestionIndex(index => index + 1);
                      setQuestionAnswered(!!lesson.correctQuestionIds?.includes(questions[questionIndex + 1]?.id));
                    }}>
                    Next question <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              )}
              {questionAnswered && questionIndex === questions.length - 1 && partCompleted && (
                <p role="status" className="text-sm font-bold text-accent">Both questions complete. This ring segment is now filled.</p>
              )}
            </section>
          )}
          {partCompleted && (
            <div className="flex justify-end">
              <Button type="button" onClick={advancePart}
                className="rounded-full font-black uppercase tracking-widest" data-testid="continue-lesson-part">
                {partIndex < PARTS_PER_LEVEL - 1 ? 'Continue to next part'
                  : levelId !== 'doctorate' ? 'Continue to next mastery level' : 'Finish subsection'}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
          {!partCompleted && lesson.preview && (
            <p className="text-center text-xs text-muted-foreground">
              {partIndex < READING_PARTS
                ? 'Mark every reading in this part as understood to fill its segment.'
                : 'Answer both questions correctly to fill this segment.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
