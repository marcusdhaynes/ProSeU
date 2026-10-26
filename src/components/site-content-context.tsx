'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabaseData, requireSupabaseDataAdmin } from '@/supabase/firebase-data-client';

interface SiteContentContextType {
  getContent: (key: string, defaultValue: string) => string;
  updatePendingContent: (key: string, value: string) => void;
  clearPendingContent: (key: string) => void;
  saveChanges: () => Promise<void>;
  isLoading: boolean;
}
const SiteContentContext = createContext<SiteContentContextType | undefined>(undefined);

type UpdateTarget = { table: string; id: string; column: 'name'|'title'|'description' } | null;
function academicTarget(key: string): UpdateTarget {
  const patterns: Array<[string, string, 'name'|'title'|'description']> = [
    ['dom_name_', 'proseu_domains', 'name'],
    ['dom_desc_', 'proseu_domains', 'description'],
    ['field_name_', 'proseu_fields', 'name'],
    ['field_desc_', 'proseu_fields', 'description'],
    ['course_title_', 'proseu_courses', 'title'],
    ['course_desc_', 'proseu_courses', 'description'],
  ];
  for (const [prefix, table, column] of patterns) {
    if (key.startsWith(prefix)) return { table, id: key.slice(prefix.length), column };
  }
  return null;
}

export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const [pendingChanges, setPendingChanges] = useState<Record<string,string>>({});
  const [cache, setCache] = useState<Record<string,string>>({});
  const [isLoading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseData.from('proseu_site_content')
        .select('key,value').limit(1000);
      if (error) throw error;
      const next: Record<string,string> = {};
      for (const item of data || []) next[item.key] = item.value;
      setCache(next);
    } catch (error) {
      console.error('Supabase site content is unavailable:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const getContent = (key: string, defaultValue: string) =>
    pendingChanges[key] ?? cache[key] ?? defaultValue;

  const updatePendingContent = (key: string, value: string) => {
    setPendingChanges(previous => ({...previous, [key]: value}));
  };
  const clearPendingContent = (key: string) => {
    setPendingChanges(previous => {
      const next = {...previous};
      delete next[key];
      return next;
    });
  };
  const saveChanges = async () => {
    const changes = Object.entries(pendingChanges);
    if (changes.length === 0) return;
    await requireSupabaseDataAdmin();
    // Domain, Field and Course titles/descriptions must remain first-class
    // normalized PostgreSQL records, not merely cached display overrides.
    for (const [key, value] of changes) {
      const target = academicTarget(key);
      if (target) {
        const { error } = await supabaseData.from(target.table)
          .update({ [target.column]: value }).eq('id', target.id);
        if (error) throw error;
      }
      const { error } = await supabaseData.from('proseu_site_content')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
    }
    setCache(previous => ({...previous, ...pendingChanges}));
    setPendingChanges({});
  };

  return (
    <SiteContentContext.Provider value={{
      getContent, updatePendingContent, clearPendingContent, saveChanges, isLoading
    }}>
      {children}
    </SiteContentContext.Provider>
  );
}

export function useSiteContent() {
  const context = useContext(SiteContentContext);
  if (!context) throw new Error('useSiteContent must be used inside SiteContentProvider');
  return context;
}
