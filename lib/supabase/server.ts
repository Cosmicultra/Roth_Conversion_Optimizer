import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl, isSupabaseServiceConfigured } from "@/lib/supabase/env";

let cached: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (!cached) {
    cached = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

export function isSupabaseConfigured(): boolean {
  return isSupabaseServiceConfigured();
}

export { isSupabaseAuthConfigured } from "@/lib/supabase/env";
