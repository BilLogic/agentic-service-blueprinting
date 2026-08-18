/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Local authoring key — dev server only, never set in a deploy env. */
  readonly VITE_SUPABASE_DEV_SERVICE_KEY?: string
  /** `'true'` shows the Edit UI on a dev server that cannot write. */
  readonly VITE_DEV_AUTHORING_UI?: string
  /** Dev sign-in pair — a real authenticated session, dev server only. */
  readonly VITE_SUPABASE_DEV_EMAIL?: string
  readonly VITE_SUPABASE_DEV_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
