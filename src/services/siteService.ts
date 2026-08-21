import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/errors'
import type { Site, SiteUpdate } from '@/types/database'

export async function fetchSiteBySlug(slug: string): Promise<Site> {
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('Failed to load site', error.message)
    throw new Error('Unable to load this website right now.')
  }

  if (!data) {
    throw new Error('This website is not configured yet. Check VITE_SITE_SLUG and the sites table.')
  }

  return data as Site
}

export async function updateSite(siteId: string, updates: SiteUpdate): Promise<Site> {
  const { data, error } = await supabase
    .from('sites')
    .update(updates)
    .eq('id', siteId)
    .select('*')
    .single()

  return throwIfError(data as Site | null, error, 'Unable to save website settings.')
}
