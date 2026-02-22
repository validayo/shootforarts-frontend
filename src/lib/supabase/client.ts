import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// HMR-safe global singleton to avoid multiple GoTrueClient instances
interface SupabaseGlobal {
  __SFA_SUPABASE__?: SupabaseClient;
}

const globalWithSupabase = globalThis as SupabaseGlobal;

if (!globalWithSupabase.__SFA_SUPABASE__) {
  globalWithSupabase.__SFA_SUPABASE__ = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: "sfa-auth",
    },
  });
}

export const supabase: SupabaseClient = globalWithSupabase.__SFA_SUPABASE__;
