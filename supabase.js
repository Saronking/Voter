// src/lib/supabase.js
// ⚠️  REPLACE with your own Supabase project credentials
// Go to: https://supabase.com → your project → Settings → API

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'         // e.g. https://xyzabc.supabase.co
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY' // the long "anon public" key

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
