
'use client';

import React, { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Firestore } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface UserConcept {
  id: string;
  userId: string;
  lessonId: string;
  timesSeen: number;
  timesCorrect: number;
  timesIncorrect: number;
  correctStreak: number;
  masteryScore: number;
  lastAttempt: string;
  nextReview: string;
}

interface User {
  id: string;
  username?: string;
  email: string;
  displayName?: string;
}

interface Concept {
  id: string;
  ID: string;
  CN: string;
}

interface UserConceptsTableProps {
  db: Firestore;
  users: User[];
  concepts: Concept[];
}

export function UserConceptsTable({ db, users, concepts }: UserConceptsTableProps) {
  const userConceptsQ = useMemoFirebase(() => db ? collection(db, 'user_concepts') : null, [db]);
  const { data: userConceptsRaw, isLoading: isConceptsLoading } = useCollection<UserConcept>(userConceptsQ);

  const groupedData = useMemo(() => {
    // If no users, we have no base to build the table
    if (!users || users.length === 0) return { rows: [], userSpans: {} };
    
    const raw = userConceptsRaw || [];
    const rows: any[] = [];
    const userSpans: Record<string, number> = {};

    // Map through all existing users to ensure they are represented
    users.forEach((u) => {
      const userItems = raw.filter(uc => uc.userId === u.id)
        .sort((a, b) => (a.lessonId || '').localeCompare(b.lessonId || ''));
      
      const userLabel = u.username ? `@${u.username}` : (u.displayName || u.email || u.id);
      
      if (userItems.length === 0) {
        // User has no activity yet, but we show them as a placeholder
        userSpans[u.id] = 1;
        rows.push({
          id: `empty-${u.id}`,
          userId: u.id,
          userLabel,
          lessonLabel: 'No activity recorded',
          timesSeen: 0,
          timesCorrect: 0,
          timesIncorrect: 0,
          correctStreak: 0,
          masteryScore: 0,
          lastAttempt: null,
          nextReview: null,
          isFirstInGroup: true,
          isEmpty: true
        });
      } else {
        // User has activity, map their lesson records
        userSpans[u.id] = userItems.length;
        userItems.forEach((uc, idx) => {
          const concept = concepts.find(c => c.ID === uc.lessonId || c.id === uc.lessonId);
          rows.push({
            ...uc,
            userLabel,
            lessonLabel: concept ? `${concept.ID}: ${concept.CN}` : uc.lessonId,
            isFirstInGroup: idx === 0,
            isEmpty: false
          });
        });
      }
    });

    return { rows, userSpans };
  }, [userConceptsRaw, users, concepts]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-bold">User Concepts</h2>
        <p className="text-muted-foreground text-xs font-medium">Tracking learner progress and mastery across the atomic knowledge base.</p>
      </header>

      <div className="bg-card border rounded-xl overflow-x-auto shadow-sm font-mono text-xs">
        <Table className="w-full border-collapse table-fixed">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-center border-r align-middle h-auto p-1 leading-none w-[12%]">UserID</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-center border-r align-middle h-auto p-1 leading-none w-[20%]">LessonID</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-center border-r align-middle h-auto p-1 leading-none w-[6%]">Seen</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-center border-r align-middle h-auto p-1 leading-none w-[6%]">Correct</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-center border-r align-middle h-auto p-1 leading-none w-[6%]">Incorrect</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-center border-r align-middle h-auto p-1 leading-none w-[6%]">Streak</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-center border-r align-middle h-auto p-1 leading-none w-[8%]">Mastery</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-center border-r align-middle h-auto p-1 leading-none w-[18%]">Last Attempt</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-center align-middle h-auto p-1 leading-none w-[18%]">Next Review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedData.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground italic">
                  {isConceptsLoading ? 'Synchronizing progress data...' : 'No users or learning data available.'}
                </TableCell>
              </TableRow>
            ) : (
              groupedData.rows.map((row, idx) => (
                <TableRow key={row.id || idx} className={cn("hover:bg-muted/30 transition-colors", row.isEmpty && "opacity-50")}>
                  {row.isFirstInGroup && (
                    <TableCell 
                      rowSpan={groupedData.userSpans[row.userId]} 
                      className="border-r font-bold bg-background/50 align-middle py-0.5 px-1 text-center text-accent truncate"
                    >
                      {row.userLabel}
                    </TableCell>
                  )}
                  <TableCell className={cn("border-r py-0.5 px-1 font-medium truncate align-middle", row.isEmpty && "italic text-muted-foreground")}>
                    {row.lessonLabel}
                  </TableCell>
                  <TableCell className="border-r py-0.5 px-1 text-center align-middle">{row.timesSeen}</TableCell>
                  <TableCell className="border-r py-0.5 px-1 text-center text-emerald-600 align-middle">{row.timesCorrect}</TableCell>
                  <TableCell className="border-r py-0.5 px-1 text-center text-rose-600 align-middle">{row.timesIncorrect}</TableCell>
                  <TableCell className="border-r py-0.5 px-1 text-center font-bold align-middle">{row.correctStreak}</TableCell>
                  <TableCell className="border-r py-0.5 px-1 text-center font-bold align-middle">
                    {(row.masteryScore * 100).toFixed(0)}%
                  </TableCell>
                  <TableCell className="border-r py-0.5 px-1 text-center text-[10px] align-middle">
                    {row.lastAttempt ? new Date(row.lastAttempt).toLocaleString() : 'N/A'}
                  </TableCell>
                  <TableCell className="py-0.5 px-1 text-center text-[10px] align-middle">
                    {row.nextReview ? new Date(row.nextReview).toLocaleString() : 'N/A'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
