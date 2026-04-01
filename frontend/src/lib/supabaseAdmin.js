import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// Service role key is required for admin operations (create/delete auth users).
// This key bypasses RLS — keep this app internal-only.
// Add VITE_SUPABASE_SERVICE_ROLE_KEY to your .env file.
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null
