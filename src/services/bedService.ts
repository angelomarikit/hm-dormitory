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

export async function fetchOpenBedsForRoom(
  siteId: string,
  roomId: string,
  occupiedBedIds: string[],
): Promise<Bed[]> {
  const beds = (await fetchBeds(siteId)).filter((bed) => bed.room_id === roomId)
  return beds.filter((bed) => !occupiedBedIds.includes(bed.id))
}
