import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/errors'
import type { Amenity, AmenityInput } from '@/types/database'

export async function fetchActiveAmenities(siteId: string): Promise<Amenity[]> {
  const { data, error } = await supabase
    .from('amenities')
    .select('*')
    .eq('site_id', siteId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  return throwIfError(data as Amenity[] | null, error, 'Unable to load amenities.')
}

export async function fetchAllAmenities(siteId: string): Promise<Amenity[]> {
  const { data, error } = await supabase
    .from('amenities')
    .select('*')
    .eq('site_id', siteId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  return throwIfError(data as Amenity[] | null, error, 'Unable to load amenities.')
}

export async function createAmenity(siteId: string, input: AmenityInput): Promise<Amenity> {
  const { data, error } = await supabase
    .from('amenities')
    .insert({
      site_id: siteId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      image_url: input.image_url || null,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
    })
    .select('*')
    .single()

  return throwIfError(data as Amenity | null, error, 'Unable to add amenity.')
}

export async function updateAmenity(
  siteId: string,
  id: string,
  input: AmenityInput,
): Promise<Amenity> {
  const { data, error } = await supabase
    .from('amenities')
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      image_url: input.image_url || null,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
    })
    .eq('id', id)
    .eq('site_id', siteId)
    .select('*')
    .single()

  return throwIfError(data as Amenity | null, error, 'Unable to update amenity.')
}

export async function deleteAmenity(siteId: string, id: string): Promise<void> {
  const { error } = await supabase.from('amenities').delete().eq('id', id).eq('site_id', siteId)
  if (error) {
    console.error('Failed to delete amenity', error.message)
    throw new Error('Unable to remove this amenity.')
  }
}
