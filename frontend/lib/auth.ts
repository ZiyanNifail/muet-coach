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
