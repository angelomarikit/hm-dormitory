import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/errors'
import type { Rate, RateUpdate } from '@/types/database'

export async function fetchRate(siteId: string): Promise<Rate | null> {
  const { data, error } = await supabase
    .from('rates')
    .select('*')
    .eq('site_id', siteId)
    .maybeSingle()

  if (error) {
    console.error('Failed to load rates', error.message)
    throw new Error('Unable to load rates.')
  }

  return data as Rate | null
}

export async function upsertRate(siteId: string, updates: RateUpdate): Promise<Rate> {
  const existing = await fetchRate(siteId)

  if (existing) {
    const { data, error } = await supabase
      .from('rates')
      .update(updates)
      .eq('id', existing.id)
      .eq('site_id', siteId)
      .select('*')
      .single()

    return throwIfError(data as Rate | null, error, 'Unable to save rates.')
  }

  const { data, error } = await supabase
    .from('rates')
    .insert({ site_id: siteId, ...updates })
    .select('*')
    .single()

  return throwIfError(data as Rate | null, error, 'Unable to save rates.')
}
