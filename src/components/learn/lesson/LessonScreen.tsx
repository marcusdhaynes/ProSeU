'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  lessonAdapter,
  type LessonAdapter,
  type LessonView,
  type ProgressSnapshot,
} from '@/lib/lesson-adapter';
import { MASTERY_LEVELS, type LevelId } from '@/lib/mastery-catalog';
import { cn } from '@/lib/utils';
import { QuestionPlayer } from './QuestionPlayer';
import { SectionMedia } from './SectionMedia';

export function LessonScreen({
  courseId,
  curriculumCode,
  subsectionId,
  subsectionName,
  competencyName,
  color,
  adapter = lessonAdapter,
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
  onBack: () => void;
  onProgress: (snapshot: ProgressSnapshot) => void;
}) {
  const [levelId, setLevelId] = useState<LevelId>('paralegal');
  const [lesson, setLesson] = useState<LessonView | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionAnswered, setQuestionAnswered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLesson(null);
    setError(null);
    setQuestionIndex(0);
    setQuestionAnswered(false);
    setChecked({});
    adapter.getLesson({ courseId, curriculumCode, subsectionId, levelId })
      .then(next => {
        if (cancelled) return;
        setLesson(next);
        setMissing(!next);
        setOpenSections(next ? next.sections.filter(section => section.defaultOpen && !section.understood).map(section => section.id) : []);
      })
      .catch(cause => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => { cancelled = true; };
  }, [adapter, courseId, curriculumCode, subsectionId, levelId]);

  const acknowledge = async (sectionId: string) => {
    if (!lesson || lesson.sections.some(section => section.id === sectionId && section.understood)) return;
    const snapshot = await adapter.markSectionUnderstood({ courseId, curriculumCode, subsectionId, levelId, sectionId });
    onProgress(snapshot);
    setLesson(current => current && ({
      ...current,
      sections: current.sections.map(section => section.id === sectionId ? { ...section, understood: true } : section),
    }));
    setOpenSections(current => current.filter(id => id !== sectionId));
  };

  const level = MASTERY_LEVELS.find(item => item.id === levelId) ?? MASTERY_LEVELS[0];

  return (
    <div className="space-y-8 pb-16" data-testid="lesson-screen">
      <header className="space-y-4">
        <button type="button" onClick={onBack} className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-accent inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3 w-3" /> Back to course
        </button>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">{competencyName}</p>
          <h1 className="text-3xl font-black uppercase tracking-tight text-primary">{subsectionName}</h1>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Mastery level">
          {MASTERY_LEVELS.map(item => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === levelId}
              onClick={() => setLevelId(item.id)}
              className={cn(
                'rounded-full border-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest',
                item.id === levelId ? 'text-white' : 'bg-card text-foreground',
              )}
              style={item.id === levelId
                ? { backgroundColor: item.colorHex, borderColor: item.shadowHex }
                : { borderColor: item.colorHex, color: item.colorHex }}
            >
              {item.name}
            </button>
          ))}
        </div>
      </header>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {lesson?.preview && (
        <div role="note" data-testid="draft-practice-banner" className="rounded-2xl border border-amber-500/60 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
          <p className="font-black">Draft practice preview</p>
          <p className="mt-1">You can read, listen, and practice questions now. Progress is saved only on this device, is not a verified grade, and does not sync to Supabase. Academic review and publication are pending.</p>
        </div>
      )}
      {missing && !error && (
        <div className="rounded-[2rem] border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center">
          <p className="text-sm font-bold text-foreground">This {level.name} lesson has not been written yet.</p>
          <p className="mt-2 text-xs text-muted-foreground">This lesson is not available in the course yet. Other authored draft lessons can be tried in preview mode.</p>
        </div>
      )}

      {lesson && (
        <div className="space-y-8">
          <section className="rounded-[2rem] border-2 border-border bg-card px-6 py-5 shadow-sm" data-testid="lesson-summary">
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">What you will learn</h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground">{lesson.summary}</p>
          </section>

          <section className="space-y-2" data-testid="lesson-checklist">
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">Checklist</h2>
            <ul className="space-y-2">
              {lesson.checklist.map(item => {
                const on = !!checked[item.id];
                return (
                  <li key={item.id}>
                    <label className={cn('flex cursor-pointer items-start gap-3 rounded-2xl border-2 px-4 py-3', on ? 'border-accent bg-accent/5' : 'border-border bg-card')}>
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-[#da840b]"
                        checked={on}
                        onChange={() => setChecked(current => ({ ...current, [item.id]: !current[item.id] }))}
                      />
                      <span className="text-sm font-semibold text-foreground">{item.body}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>

          <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="space-y-3" data-testid="lesson-sections">
            {lesson.sections.map(section => (
              <AccordionItem key={section.id} value={section.id} className="rounded-[1.5rem] border-2 border-border bg-card px-4">
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
                    <input
                      type="checkbox"
                      data-testid={`understand-${section.id}`}
                      checked={section.understood}
                      onChange={() => { if (!section.understood) void acknowledge(section.id); }}
                    />
                    <Check className="h-4 w-4 text-accent" />
                    I understand
                  </label>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {lesson.questions.length > 0 && (
            <section className="space-y-4" data-testid="lesson-practice">
              <h2 className="text-lg font-black uppercase tracking-widest text-primary">Practice</h2>
              <QuestionPlayer
                key={lesson.questions[questionIndex].id}
                question={lesson.questions[questionIndex]}
                index={questionIndex}
                total={lesson.questions.length}
                onAnswer={async response => {
                  const graded = await adapter.submitAnswer({
                    courseId,
                    curriculumCode,
                    subsectionId,
                    levelId,
                    questionId: lesson.questions[questionIndex].id,
                    response,
                  });
                  onProgress(graded.progress);
                  setQuestionAnswered(true);
                  return { correct: graded.correct, explanation: graded.explanation };
                }}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full font-black uppercase tracking-widest"
                  disabled={!questionAnswered || questionIndex >= lesson.questions.length - 1}
                  onClick={() => {
                    setQuestionAnswered(false);
                    setQuestionIndex(index => Math.min(lesson.questions.length - 1, index + 1));
                  }}
                >
                  Next question
                </Button>
                {questionAnswered && questionIndex === lesson.questions.length - 1 && (
                  <span role="status" className="text-sm font-bold text-accent">Practice complete for this mastery level. You can select another level above or return to the course.</span>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
