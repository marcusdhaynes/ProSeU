'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { generateIntuitiveCode } from '@/lib/codes';

interface SiteContentContextType {
  getContent: (key: string, defaultValue: string) => string;
  updatePendingContent: (key: string, value: string) => void;
  clearPendingContent: (key: string) => void;
  saveChanges: () => Promise<void>;
  isLoading: boolean;
}

const SiteContentContext = createContext<SiteContentContextType | undefined>(undefined);

export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const db = useFirestore();
  
  // Use useMemoFirebase to stabilize the reference
  const q = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'siteContent');
  }, [db]);

  const { data: remoteContent, isLoading } = useCollection(q);

  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [contentCache, setContentCache] = useState<Record<string, string>>({});

  useEffect(() => {
    if (remoteContent) {
      const map: Record<string, string> = {};
      remoteContent.forEach(item => {
        map[item.id] = item.value;
      });
      setContentCache(map);
    }
  }, [remoteContent]);

  const getContent = (key: string, defaultValue: string) => {
    const val = pendingChanges[key] !== undefined ? pendingChanges[key] : contentCache[key];
    return val !== undefined ? val : defaultValue;
  };

  const updatePendingContent = (key: string, value: string) => {
    setPendingChanges(prev => ({ ...prev, [key]: value }));
  };

  const clearPendingContent = (key: string) => {
    setPendingChanges(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const saveChanges = async () => {
    if (!db) return;
    const batch = writeBatch(db);
    
    // Fetch current codes for reactive regeneration on title/name change
    const [domsSnap, fieldsSnap, coursesSnap] = await Promise.all([
      getDocs(collection(db, 'domains')),
      getDocs(collection(db, 'fields')),
      getDocs(collection(db, 'courses'))
    ]);
    
    const allDomCodes = domsSnap.docs.map(d => ({ id: d.id, code: d.data().code }));
    const allFieldCodes = fieldsSnap.docs.map(d => ({ id: d.id, code: d.data().code }));
    const allCourseCodes = coursesSnap.docs.map(d => ({ id: d.id, code: d.data().code }));

    // Use a sequential approach for propagation to ensure data integrity
    for (const [key, value] of Object.entries(pendingChanges)) {
      // 1. Save to siteContent (The general content buffer)
      const docRef = doc(db, 'siteContent', key);
      batch.set(docRef, {
        value,
        lastModifiedAt: new Date().toISOString(),
        description: "Updated via ProSeU Edit Mode"
      }, { merge: true });

      // 2. Synchronize with primary collections
      if (key.startsWith('course_title_')) {
        const id = key.replace('course_title_', '');
        const currentCourse = allCourseCodes.find(c => c.id === id);
        const others = allCourseCodes.filter(c => c.id !== id).map(c => c.code).filter(Boolean);
        const newCode = generateIntuitiveCode(value, 'C', others);
        
        batch.set(doc(db, 'courses', id), { title: value, code: newCode }, { merge: true });
        
        // Propagate code change to concepts if the code actually changed
        if (currentCourse && currentCourse.code !== newCode) {
           const conceptsSnap = await getDocs(query(collection(db, 'atomic_concepts'), where('CR', '==', currentCourse.code)));
           conceptsSnap.docs.forEach(conceptDoc => {
              batch.set(doc(db, 'atomic_concepts', conceptDoc.id), { CR: newCode }, { merge: true });
           });
        }
      } else if (key.startsWith('course_desc_')) {
        const id = key.replace('course_desc_', '');
        batch.set(doc(db, 'courses', id), { description: value }, { merge: true });
      } else if (key.startsWith('field_name_')) {
        const id = key.replace('field_name_', '');
        const currentField = allFieldCodes.find(f => f.id === id);
        const others = allFieldCodes.filter(c => c.id !== id).map(c => c.code).filter(Boolean);
        const newCode = generateIntuitiveCode(value, 'B', others);
        batch.set(doc(db, 'fields', id), { name: value, code: newCode }, { merge: true });

        if (currentField && currentField.code !== newCode) {
           const conceptsSnap = await getDocs(query(collection(db, 'atomic_concepts'), where('FL', '==', currentField.code)));
           conceptsSnap.docs.forEach(conceptDoc => {
              batch.set(doc(db, 'atomic_concepts', conceptDoc.id), { FL: newCode }, { merge: true });
           });
        }
      } else if (key.startsWith('field_desc_')) {
        const id = key.replace('field_desc_', '');
        batch.set(doc(db, 'fields', id), { description: value }, { merge: true });
      } else if (key.startsWith('dom_name_')) {
        const id = key.replace('dom_name_', '');
        const currentDom = allDomCodes.find(d => d.id === id);
        const others = allDomCodes.filter(c => c.id !== id).map(c => c.code).filter(Boolean);
        const newCode = generateIntuitiveCode(value, 'A', others);
        batch.set(doc(db, 'domains', id), { name: value, code: newCode }, { merge: true });

        if (currentDom && currentDom.code !== newCode) {
           const conceptsSnap = await getDocs(query(collection(db, 'atomic_concepts'), where('DM', '==', currentDom.code)));
           conceptsSnap.docs.forEach(conceptDoc => {
              batch.set(doc(db, 'atomic_concepts', conceptDoc.id), { DM: newCode }, { merge: true });
           });
        }
      } else if (key.startsWith('dom_desc_')) {
        const id = key.replace('dom_desc_', '');
        batch.set(doc(db, 'domains', id), { description: value }, { merge: true });
      }
    }

    try {
      await batch.commit();
      setPendingChanges({});
    } catch (error) {
      console.error("Failed to save site content changes:", error);
      const permissionError = new FirestorePermissionError({
        path: 'siteContent',
        operation: 'write',
        requestResourceData: pendingChanges,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  return (
    <SiteContentContext.Provider value={{ getContent, updatePendingContent, clearPendingContent, saveChanges, isLoading }}>
      {children}
    </SiteContentContext.Provider>
  );
}

export function useSiteContent() {
  const context = useContext(SiteContentContext);
  if (context === undefined) {
    throw new Error('useSiteContent must be used within a SiteContentProvider');
  }
  return context;
}