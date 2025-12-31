import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Debug: check if env vars are loaded
console.log('[Supabase] URL configured:', !!supabaseUrl)
console.log('[Supabase] Key configured:', !!supabaseAnonKey)

// Create client only if credentials exist
export const supabase: SupabaseClient | null =
    supabaseUrl && supabaseAnonKey
        ? createClient(supabaseUrl, supabaseAnonKey)
        : null

// Helper to check if supabase is configured
export const isSupabaseConfigured = () => !!supabase
