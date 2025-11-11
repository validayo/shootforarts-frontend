import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// HMR-safe global singleton to avoid multiple GoTrueClient instances
const g = globalThis as any;
export const supabase: SupabaseClient =
  g.__SFA_SUPABASE__ ||
  (g.__SFA_SUPABASE__ = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: "sfa-auth",
    },
  }));

