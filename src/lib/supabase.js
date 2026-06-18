import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
const service = import.meta.env.VITE_SUPABASE_SERVICE_KEY

export const supabase = createClient(url, anon)

// Used only on the admin page — bypasses RLS so the director can see all messages
export const supabaseAdmin = createClient(url, service)
