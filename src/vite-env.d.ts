/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SUPABASE_URL: string;
  // add more as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}