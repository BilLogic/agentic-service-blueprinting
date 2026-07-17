import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const PLACEHOLDER_KEY = 'your-anon-key'
const PLACEHOLDER_URL_FRAGMENT = 'YOUR_PROJECT'

export function isSupabaseConfigured(): boolean {
  if (!supabaseUrl || !supabaseAnonKey) return false
  if (supabaseAnonKey === PLACEHOLDER_KEY) return false
  if (supabaseUrl.includes(PLACEHOLDER_URL_FRAGMENT)) return false
  return true
}

export function createSupabaseClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) {
    return null
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey)
}
