import { supabase } from '@/lib/supabase'

export const fetcher = (url: string) => fetch(url).then(r => r.json())

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
