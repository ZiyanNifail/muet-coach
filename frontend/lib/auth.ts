import { supabase } from './supabase'

export type UserRole = 'student' | 'educator' | 'admin'

export interface AppUser {
  id: string
  email: string
  role: UserRole
  full_name: string
  consent_given: boolean
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  role: UserRole
) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  if (!data.user) throw new Error('No user returned from signup')

  const { error: insertError } = await supabase.from('users').insert({
    id: data.user.id,
    email,
    role,
    full_name: fullName,
    consent_given: false,
  })
  if (insertError) throw insertError

  if (role === 'educator') {
    await supabase.from('educator_approvals').insert({ educator_id: data.user.id })
  }

  return data.user
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getAppUser(): Promise<AppUser | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('users')
    .select('id, email, role, full_name, consent_given')
    .eq('id', user.id)
    .single()

  if (error || !data) return null
  return data as AppUser
}

export async function getEducatorApprovalStatus(
  userId: string
): Promise<'pending' | 'approved' | 'rejected' | null> {
  const { data } = await supabase
    .from('educator_approvals')
    .select('status')
    .eq('educator_id', userId)
    .maybeSingle()
  return (data?.status as 'pending' | 'approved' | 'rejected') ?? null
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  })
  if (error) throw error
}

export async function ensureAppUserRow(): Promise<AppUser | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const existing = await getAppUser()
  if (existing) return existing
  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Student'
  const { error } = await supabase.from('users').insert({
    id: user.id,
    email: user.email,
    role: 'student',
    full_name: fullName,
    consent_given: false,
  })
  if (error && error.code !== '23505') throw error
  return await getAppUser()
}

export async function giveConsent(userId: string) {
  await supabase
    .from('users')
    .update({ consent_given: true, consent_timestamp: new Date().toISOString() })
    .eq('id', userId)

  await supabase.from('consent_log').insert({
    user_id: userId,
    action: 'accepted',
    timestamp: new Date().toISOString(),
  })
}
