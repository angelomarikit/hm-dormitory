import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/errors'
import type { Floor, FloorInput } from '@/types/database'

export async function fetchActiveFloors(siteId: string): Promise<Floor[]> {
  const { data, error } = await supabase
    .from('floors')
    .select('*')
    .eq('site_id', siteId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('floor_number', { ascending: true })

  return throwIfError(data as Floor[] | null, error, 'Unable to load floors.')
}

export async function fetchAllFloors(siteId: string): Promise<Floor[]> {
  const { data, error } = await supabase
    .from('floors')
    .select('*')
    .eq('site_id', siteId)
    .order('sort_order', { ascending: true })
    .order('floor_number', { ascending: true })

  return throwIfError(data as Floor[] | null, error, 'Unable to load floors.')
}

export async function createFloor(siteId: string, input: FloorInput): Promise<Floor> {
  const { data, error } = await supabase
    .from('floors')
    .insert({
      site_id: siteId,
      name: input.name.trim(),
      floor_number: input.floor_number,
      description: input.description?.trim() || null,
      sort_order: input.sort_order ?? input.floor_number,
      is_active: input.is_active ?? true,
    })
    .select('*')
    .single()

  return throwIfError(data as Floor | null, error, 'Unable to add floor.')
}

export async function updateFloor(
  siteId: string,
  id: string,
  input: FloorInput,
): Promise<Floor> {
  const { data, error } = await supabase
    .from('floors')
    .update({
      name: input.name.trim(),
      floor_number: input.floor_number,
      description: input.description?.trim() || null,
      sort_order: input.sort_order ?? input.floor_number,
      is_active: input.is_active ?? true,
    })
    .eq('id', id)
    .eq('site_id', siteId)
    .select('*')
    .single()

  return throwIfError(data as Floor | null, error, 'Unable to update floor.')
}

export async function deleteFloor(siteId: string, id: string): Promise<void> {
  const { error } = await supabase.from('floors').delete().eq('id', id).eq('site_id', siteId)
  if (error) {
    console.error('Failed to delete floor', error.message)
    throw new Error('Unable to remove this floor. Move or delete its rooms first.')
  }
}
