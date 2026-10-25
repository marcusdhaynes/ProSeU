import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const projectUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || '';

export const supabaseConfigured =
  /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(projectUrl) &&
  publishableKey.length > 15 &&
  !/YOUR_|PLACEHOLDER|REPLACE_ME/i.test(publishableKey);

// Never use a service_role/secret key in the browser bundle.
// Until an actual project is connected and approved for cutover, this is a
// staged client. The existing Firebase-backed ProSeU app remains unchanged.
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(projectUrl.replace(/\/$/, ''), publishableKey, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const getSupabaseRedirectUrl = () => {
  // OAuth callback returns to the real GitHub Pages URL, not the HashRouter
  // fragment; the latter is never transmitted in an HTTP request.
  const url = new URL(import.meta.env.BASE_URL || '/', window.location.origin);
  url.searchParams.set('supabase_callback', '1');
  return url.toString();
};

export async function signInWithSupabaseGoogle() {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: getSupabaseRedirectUrl(), scopes: 'openid email profile' },
  });
  if (error) throw error;
}
