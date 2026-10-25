'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { supabase, supabaseConfigured, signInWithSupabaseGoogle } from '@/supabase/client';
import { getMyAdminStatus } from '@/supabase/data';

type CheckStatus = 'pending' | 'pass' | 'fail';
type Check = { label: string; state: CheckStatus; detail?: string };

const baseChecks: Check[] = [
  { label: 'Supabase project connected', state: 'pending' },
  { label: 'Google OAuth session', state: 'pending' },
  { label: 'ProSeU SQL migration and public catalog', state: 'pending' },
  { label: 'PostgreSQL administrator authorization', state: 'pending' },
];

export default function DatabaseCheckPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checks, setChecks] = useState<Check[]>(baseChecks);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setChecks(baseChecks.map((check, index) => ({
        ...check, state: 'fail',
        detail: index === 0 ? 'Awaiting a Supabase project URL and publishable key.' : 'Not tested.',
      })));
      setBusy(false);
      return;
    }

    setBusy(true);
    const results: Check[] = [{ label: baseChecks[0].label, state: 'pass' }];
    const auth = await supabase.auth.getUser();
    const verifiedUser = auth.data.user;
    setUser(verifiedUser);
    results.push({
      label: baseChecks[1].label,
      state: verifiedUser ? 'pass' : 'pending',
      detail: auth.error?.message || (!verifiedUser ? 'Sign in with Google to continue.' : verifiedUser.email || ''),
    });

    const catalog = await supabase.from('proseu_catalog').select('record_id', { count: 'exact', head: true });
    results.push({
      label: baseChecks[2].label, state: catalog.error ? 'fail' : 'pass',
      detail: catalog.error ? catalog.error.message : 'Schema reachable; catalog access allowed.',
    });

    if (!verifiedUser) {
      results.push({
        label: baseChecks[3].label, state: 'pending',
        detail: 'Sign in with Google to test administrator permissions.',
      });
    } else {
      try {
        const isAdmin = await getMyAdminStatus();
        results.push({
          label: baseChecks[3].label, state: isAdmin ? 'pass' : 'fail',
          detail: isAdmin ? 'Verified database administrator.' :
            'You are signed in but not authorized as an administrator.',
        });
      } catch (err) {
        results.push({
          label: baseChecks[3].label, state: 'fail',
          detail: err instanceof Error ? err.message : 'Could not query admin permissions.',
        });
      }
    }
    setChecks(results);
    setBusy(false);
  }, []);

  useEffect(() => {
    void refresh();
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Avoid blocking Supabase's auth state callback.
      queueMicrotask(() => { void refresh(); });
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  const googleLogin = async () => {
    setError(null);
    try { await signInWithSupabaseGoogle(); }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start Google sign-in.');
    }
  };

  const logout = async () => {
    if (!supabase) return;
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
    await refresh();
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-12">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">ProSeU · Database Readiness</h1>
        <p className="text-sm text-muted-foreground">
          Staging only. This checks the future free, open-source database
          and Google sign-in without moving, replacing, or deleting any Firebase data.
        </p>
      </div>
      <div className="rounded-xl border bg-card p-5 space-y-4">
        {checks.map((check, index) => (
          <div key={index} className="flex gap-3 border-b last:border-b-0 pb-3 last:pb-0">
            <span aria-hidden="true" className="font-bold">
              {check.state === 'pass' ? '✓' : check.state === 'fail' ? '×' : '○'}
            </span>
            <div>
              <p className="text-sm font-semibold">{check.label}</p>
              {check.detail && <p className="text-xs text-muted-foreground">{check.detail}</p>}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {supabaseConfigured && !user && <Button onClick={googleLogin}>Sign in with Google</Button>}
        {supabaseConfigured && user && <Button variant="outline" onClick={logout}>Sign out of Supabase</Button>}
        <Button disabled={busy} variant="secondary" onClick={() => void refresh()}>
          {busy ? 'Checking…' : 'Recheck connection'}
        </Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        This diagnostic does not enable Supabase production login or data migration.
        Full cutover requires a verified project, Google OAuth configuration and a
        one-time migration of existing user records.
      </p>
    </main>
  );
}
