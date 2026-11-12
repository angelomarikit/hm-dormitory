import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/errors'
import type { Bed } from '@/types/ops'

export async function fetchBeds(siteId: string): Promise<Bed[]> {
  const { data, error } = await supabase
    .from('beds')
    .select('*')
    .eq('site_id', siteId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  return throwIfError(data as Bed[] | null, error, 'Unable to load beds.')
}

export interface OpenBed {
  bed_id: string
  room_id: string
  bed_code: string
  room_number: string
  monthly_rent_centavos: number
}

export async function fetchOpenBeds(siteId: string): Promise<OpenBed[]> {
  const { data, error } = await supabase.rpc('list_open_beds', { p_site_id: siteId })
  if (error) {
    throw new Error(
      /schema cache|could not find/i.test(error.message)
        ? 'Run supabase/migrations/014_registration_bed.sql in the SQL Editor so applicants can choose a bed.'
        : 'Unable to load open beds.',
    )
  }
  return (data ?? []) as OpenBed[]
}

export async function fetchOpenBedsForRoom(
  siteId: string,
  roomId: string,
  occupiedBedIds: string[],
): Promise<Bed[]> {
  const beds = (await fetchBeds(siteId)).filter((bed) => bed.room_id === roomId)
  return beds.filter((bed) => !occupiedBedIds.includes(bed.id))
}
