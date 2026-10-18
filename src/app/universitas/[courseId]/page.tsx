'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { contentEngine, Question, Concept } from '@/lib/contentEngine';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MultipleChoiceRenderer } from '@/components/renderers/MultipleChoiceRenderer';
import { ReadingRenderer } from '@/components/renderers/ReadingRenderer';
import { CheckCircle2, XCircle, ArrowRight, Home, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface UniversitasPageProps {
  params: Promise<{ courseId: string }>;
}

export default function UniversitasPage(props: UniversitasPageProps) {
  // Unwrap params using React.use() as required by Next.js 15
  // Avoiding destructuring in the signature to prevent proxy enumeration warnings
  const params = use(props.params);
  const { courseId } = params;
  
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();

  // Fetch concepts directly associated with this course ID (CR field)
  const conceptsQ = useMemoFirebase(() => db ? query(collection(db, 'atomic_concepts'), where('CR', '==', courseId)) : null, [db, courseId]);
  const { data: rawConcepts = [] } = useCollection(conceptsQ);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (rawConcepts && rawConcepts.length > 0) {
      // Reconstruct concepts from indexed fields before generating questions
      const reconstructed = rawConcepts.map(c => contentEngine.reconstructConcept(c));
      setQuestions(contentEngine.generateQuestionSet(reconstructed, 'universitas'));
    }
  }, [rawConcepts]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const updateProgress = async (isCorrect: boolean) => {
    if (!db || !user || !currentQuestion) return;
    
    const lessonId = currentQuestion.conceptId;
    const docId = `${user.uid}_${lessonId}`;
    const docRef = doc(db, 'user_concepts', docId);
    
    try {
            const snap = await getDoc(docRef).catch((err) => {
        console.error("Firestore Get Progress Error:", err);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'get',
        }));
        throw err; // Re-throw after emitting
      });
      const existing = snap.exists() ? snap.data() : null;
      
      const timesSeen = (existing?.timesSeen || 0) + 1;
      const timesCorrect = (existing?.timesCorrect || 0) + (isCorrect ? 1 : 0);
      const timesIncorrect = (existing?.timesIncorrect || 0) + (isCorrect ? 0 : 1);
      const correctStreak = isCorrect ? (existing?.correctStreak || 0) + 1 : 0;
      const masteryScore = timesSeen > 0 ? timesCorrect / timesSeen : 0;
      
      const data = {
        userId: user.uid,
        lessonId: lessonId,
        timesSeen,
        timesCorrect,
        timesIncorrect,
        correctStreak,
        masteryScore,
        lastAttempt: new Date().toISOString(),
        nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: serverTimestamp()
      };
      
      setDoc(docRef, data, { merge: true }).catch((err) => {
         console.error("Firestore Set Progress Error:", err);
         errorEmitter.emit('permission-error', new FirestorePermissionError({
           path: docRef.path,
           operation: 'write',
           requestResourceData: data
         }));
      });
    } catch (e) {
      console.error("Failed to fetch current progress", e);
    }
  };

  const handleAnswer = (answer: string) => {
    if (answer === currentQuestion.correctAnswer || currentQuestion.type === 'reading') {
      setFeedback('correct');
      if (currentQuestion.type !== 'reading') {
        updateProgress(true);
      }
    } else {
      setFeedback('incorrect');
      updateProgress(false);
    }
  };

  const handleNext = () => {
    setFeedback(null);
    setShowHint(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsFinished(true);
    }
  };

  if (!db || (rawConcepts.length === 0 && !isFinished)) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 space-y-4">
      <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground animate-pulse font-bold uppercase tracking-[0.2em] text-[10px]">Initializing Universitas Knowledge Base...</p>
    </div>
  );

  if (isFinished) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6">
        <div className="bg-emerald-500/10 text-emerald-600 p-6 rounded-full inline-block">
          <CheckCircle2 className="h-20 w-20" />
        </div>
        <h1 className="text-3xl font-bold">Session Complete!</h1>
        <p className="text-muted-foreground">You've successfully processed these atomic units. Your mastery index has been updated.</p>
        <Button className="w-full rounded-full h-12 font-bold shadow-lg" onClick={() => router.push('/learn')}>
          <Home className="mr-2 h-4 w-4" /> Back to Academy
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pt-10 px-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full"><XCircle className="h-6 w-6" /></Button>
        <Progress value={progress} className="h-3 flex-1 bg-muted" />
      </div>

      <div className="min-h-[450px] flex flex-col justify-center">
        {currentQuestion && currentQuestion.type === 'multiple_choice' && (
          <div className="space-y-6">
            <MultipleChoiceRenderer 
              question={currentQuestion} 
              onAnswer={handleAnswer} 
              disabled={!!feedback}
            />
            {currentQuestion.hint && !feedback && (
              <div className="flex justify-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowHint(!showHint)}
                  className="text-[10px] font-bold uppercase tracking-widest gap-2 opacity-50 hover:opacity-100"
                >
                  <Lightbulb className="h-3 w-3" /> {showHint ? "Hide Hint" : "Need a Hint?"}
                </Button>
              </div>
            )}
            {showHint && !feedback && (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-800 text-xs italic text-center animate-in fade-in slide-in-from-top-2">
                "{currentQuestion.hint}"
              </div>
            )}
          </div>
        )}
        {currentQuestion && currentQuestion.type === 'reading' && (
          <ReadingRenderer 
            question={currentQuestion} 
            onAnswer={() => handleAnswer('continue')} 
          />
        )}
      </div>

      {feedback && (
        <div className={cn(
          "fixed bottom-0 left-0 right-0 p-8 border-t transition-all transform animate-in slide-in-from-bottom z-50 shadow-2xl",
          feedback === 'correct' ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20" : "bg-rose-50 border-rose-200 dark:bg-rose-950/20"
        )}>
          <div className="max-w-2xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {feedback === 'correct' ? (
                <div className="bg-emerald-100 p-2 rounded-full"><CheckCircle2 className="h-8 w-8 text-emerald-600" /></div>
              ) : (
                <div className="bg-rose-100 p-2 rounded-full"><XCircle className="h-8 w-8 text-rose-600" /></div>
              )}
              <div>
                <h3 className={cn("font-bold text-lg", feedback === 'correct' ? "text-emerald-700" : "text-rose-700")}>
                  {feedback === 'correct' ? "Correct!" : "Incorrect"}
                </h3>
                {feedback === 'incorrect' && currentQuestion && (
                  <p className="text-rose-600/80 text-xs font-medium">Correct answer: <span className="font-bold">{currentQuestion.correctAnswer}</span></p>
                )}
              </div>
            </div>
            <Button 
              onClick={handleNext}
              className={cn("rounded-full px-10 h-12 font-bold shadow-lg w-full md:w-auto", feedback === 'correct' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700")}
            >
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
