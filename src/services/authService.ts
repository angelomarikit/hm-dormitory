import { supabase } from '@/lib/supabase'
import type { SiteMember, SiteRole } from '@/types/database'
import type { BoarderProfile } from '@/types/ops'

export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    throw new Error(error.message)
  }
}

export async function signUpWithPassword(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })
  if (error) {
    throw new Error(error.message)
  }
  return data.user
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  })
  if (error) {
    throw new Error(error.message)
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw new Error(error.message)
  }
}

export async function fetchSiteMembership(
  userId: string,
  siteId: string,
): Promise<SiteMember | null> {
  const { data, error } = await supabase
    .from('site_members')
    .select('*')
    .eq('user_id', userId)
    .eq('site_id', siteId)
    .maybeSingle()

  if (error) {
    console.error('Failed to load membership', error.message)
    throw new Error('Unable to verify administrator access.')
  }

  return data as SiteMember | null
}

export async function fetchBoarderProfile(
  userId: string,
  siteId: string,
): Promise<BoarderProfile | null> {
  const { data, error } = await supabase
    .from('boarder_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('site_id', siteId)
    .maybeSingle()

  if (error) {
    console.error('Failed to load boarder profile', error.message)
    return null
  }

  return data as BoarderProfile | null
}

export function canManageContent(role: SiteRole | null): boolean {
  return role === 'owner' || role === 'admin' || role === 'editor'
}

export function isCmsRole(role: SiteRole | null): boolean {
  return canManageContent(role)
}

export function isCaretakerRole(role: SiteRole | null): boolean {
  return role === 'caretaker'
}
