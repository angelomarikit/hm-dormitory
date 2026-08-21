import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/errors'
import type { HouseRule, HouseRuleInput } from '@/types/database'

export async function fetchActiveHouseRules(siteId: string): Promise<HouseRule[]> {
  const { data, error } = await supabase
    .from('house_rules')
    .select('*')
    .eq('site_id', siteId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return throwIfError(data as HouseRule[] | null, error, 'Unable to load house rules.')
}

export async function fetchAllHouseRules(siteId: string): Promise<HouseRule[]> {
  const { data, error } = await supabase
    .from('house_rules')
    .select('*')
    .eq('site_id', siteId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return throwIfError(data as HouseRule[] | null, error, 'Unable to load house rules.')
}

export async function createHouseRule(siteId: string, input: HouseRuleInput): Promise<HouseRule> {
  const { data, error } = await supabase
    .from('house_rules')
    .insert({
      site_id: siteId,
      title: input.title?.trim() || null,
      description: input.description.trim(),
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
    })
    .select('*')
    .single()

  return throwIfError(data as HouseRule | null, error, 'Unable to add house rule.')
}

export async function updateHouseRule(
  siteId: string,
  id: string,
  input: HouseRuleInput,
): Promise<HouseRule> {
  const { data, error } = await supabase
    .from('house_rules')
    .update({
      title: input.title?.trim() || null,
      description: input.description.trim(),
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
    })
    .eq('id', id)
    .eq('site_id', siteId)
    .select('*')
    .single()

  return throwIfError(data as HouseRule | null, error, 'Unable to update house rule.')
}

export async function deleteHouseRule(siteId: string, id: string): Promise<void> {
  const { error } = await supabase.from('house_rules').delete().eq('id', id).eq('site_id', siteId)
  if (error) {
    console.error('Failed to delete house rule', error.message)
    throw new Error('Unable to remove this house rule.')
  }
}
