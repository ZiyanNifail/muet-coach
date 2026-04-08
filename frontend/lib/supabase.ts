import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Returns { Authorization: 'Bearer <token>' } if a session exists,
 * or an empty object otherwise. Use this instead of repeating
 * sb.auth.getSession() boilerplate in every page.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {}
}

/**
 * Returns [userId, accessToken] for the current session,
 * or [null, null] if not authenticated. Used as SWR key.
 */
export async function getSessionKey(): Promise<[string, string] | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null
  return [session.user.id, session.access_token]
}
