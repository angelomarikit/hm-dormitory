import { supabase } from '@/lib/supabase'
import type { SiteMember, SiteRole } from '@/types/database'

export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
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

export function canManageContent(role: SiteRole | null): boolean {
  return role === 'owner' || role === 'admin' || role === 'editor'
}
