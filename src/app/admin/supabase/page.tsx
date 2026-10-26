'use client';

import { useAdminAccess } from '@/hooks/use-admin-access';
import { SupabaseCurriculumManager } from '@/components/admin/SupabaseCurriculumManager';

export default function SupabaseCurriculumPreview() {
  const { isAdmin, isLoading } = useAdminAccess();
  if (isLoading) {
    return <main className="max-w-6xl mx-auto p-8 text-sm" role="status">Checking administrator login…</main>;
  }
  if (!isAdmin) {
    return <main className="max-w-6xl mx-auto p-8" role="alert">This page requires a verified ProSeU administrator login.</main>;
  }
  return (
    <main className="max-w-7xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold">ProSeU Admin · Supabase Curriculum</h1>
      <p className="text-sm text-muted-foreground">
        This migration preview uses Firebase only to verify login, and Supabase exclusively for Domain, Field, and Course data.
        The database enforces administrator permissions independently from this page.
      </p>
      <SupabaseCurriculumManager />
    </main>
  );
}
