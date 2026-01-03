import { supabase } from '@/lib/supabase'

// API key for protected endpoints (set in Vercel/deployment env)
const apiKey = import.meta.env.VITE_ADMIN_API_KEY || ''

export const fetcher = (url: string) => fetch(url, {
    headers: apiKey ? { 'X-API-Key': apiKey } : {}
}).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
})

export const supabaseFetcher = async (viewName: string) => {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
        .from(viewName)
        .select('*')
        .single()

    if (error) throw error
    return data
}

export const supabaseListFetcher = async (viewName: string) => {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
        .from(viewName)
        .select('*')

    if (error) throw error
    return data
}
