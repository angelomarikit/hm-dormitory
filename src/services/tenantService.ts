import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/errors'
import type { Tenant, TenantInput, TenantWithRoom } from '@/types/database'

const TENANT_SELECT = `
  *,
  rooms (
    id,
    room_number,
    room_name,
    room_type,
    capacity,
    occupied_spaces,
    floor_id,
    floors ( id, name, floor_number )
  )
`

export async function fetchAllTenants(siteId: string): Promise<TenantWithRoom[]> {
  const { data, error } = await supabase
    .from('tenants')
    .select(TENANT_SELECT)
    .eq('site_id', siteId)
    .order('is_active', { ascending: false })
    .order('started_on', { ascending: false })

  return throwIfError(
    data as TenantWithRoom[] | null,
    error,
    mapTenantError(error?.message, 'Unable to load tenants.'),
  )
}

export async function fetchActiveTenants(siteId: string): Promise<TenantWithRoom[]> {
  const { data, error } = await supabase
    .from('tenants')
    .select(TENANT_SELECT)
    .eq('site_id', siteId)
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  return throwIfError(
    data as TenantWithRoom[] | null,
    error,
    mapTenantError(error?.message, 'Unable to load tenants.'),
  )
}

export async function createTenant(siteId: string, input: TenantInput): Promise<Tenant> {
  const fullName = input.full_name.trim()
  if (!fullName) throw new Error('Tenant name is required.')
  if (!input.room_id) throw new Error('Choose a room.')
  if (!input.started_on) throw new Error('Start date is required.')

  const { data, error } = await supabase
    .from('tenants')
    .insert({
      site_id: siteId,
      room_id: input.room_id,
      full_name: fullName,
      phone: input.phone?.trim() || null,
      notes: input.notes?.trim() || null,
      started_on: input.started_on,
      left_on: null,
      is_active: true,
    })
    .select('*')
    .single()

  return throwIfError(data as Tenant | null, error, mapTenantError(error?.message, 'Unable to add tenant.'))
}

export async function updateTenant(
  siteId: string,
  id: string,
  input: TenantInput,
): Promise<Tenant> {
  const fullName = input.full_name.trim()
  if (!fullName) throw new Error('Tenant name is required.')
  if (!input.room_id) throw new Error('Choose a room.')
  if (!input.started_on) throw new Error('Start date is required.')

  const { data, error } = await supabase
    .from('tenants')
    .update({
      room_id: input.room_id,
      full_name: fullName,
      phone: input.phone?.trim() || null,
      notes: input.notes?.trim() || null,
      started_on: input.started_on,
    })
    .eq('id', id)
    .eq('site_id', siteId)
    .select('*')
    .single()

  return throwIfError(data as Tenant | null, error, mapTenantError(error?.message, 'Unable to update tenant.'))
}

export async function markTenantLeft(
  siteId: string,
  id: string,
  leftOn: string,
): Promise<Tenant> {
  if (!leftOn) throw new Error('Leave date is required.')

  const { data, error } = await supabase
    .from('tenants')
    .update({
      is_active: false,
      left_on: leftOn,
    })
    .eq('id', id)
    .eq('site_id', siteId)
    .select('*')
    .single()

  return throwIfError(data as Tenant | null, error, 'Unable to mark this tenant as left.')
}

export async function deleteTenant(siteId: string, id: string): Promise<void> {
  const { error } = await supabase.from('tenants').delete().eq('id', id).eq('site_id', siteId)
  if (error) {
    console.error('Failed to delete tenant', error.message)
    throw new Error('Unable to remove this tenant.')
  }
}

function mapTenantError(message: string | undefined, fallback: string) {
  if (!message) return fallback
  if (message.includes('already full')) return 'This room is already full.'
  if (/schema cache|does not exist|relation/i.test(message)) {
    return 'Tenants are not set up yet. Run supabase/migrations/002_tenants_and_standard_rooms.sql in the Supabase SQL Editor.'
  }
  return fallback
}
