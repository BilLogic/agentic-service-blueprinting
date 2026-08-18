import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const PLACEHOLDER_KEY = 'your-anon-key'
const PLACEHOLDER_URL_FRAGMENT = 'YOUR_PROJECT'

// Read at call time, not module load: vitest's vi.stubEnv can then make
// "no database configured" true even in a workspace whose real .env Vite
// loaded into import.meta.env (the no-DB tests rely on this).
function envConfig(): { url: string | undefined; anonKey: string | undefined } {
  return {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  }
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = envConfig()
  if (!url || !anonKey) return false
  if (anonKey === PLACEHOLDER_KEY) return false
  if (url.includes(PLACEHOLDER_URL_FRAGMENT)) return false
  return true
}

export function createSupabaseClient(): SupabaseClient<Database> | null {
  const { url, anonKey } = envConfig()
  if (!isSupabaseConfigured() || !url || !anonKey) {
    return null
  }

  return createClient<Database>(url, anonKey)
}
