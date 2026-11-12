import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/errors'
import type { Bill } from '@/types/ops'

export async function fetchBills(siteId: string): Promise<Bill[]> {
  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('site_id', siteId)
    .order('period_start', { ascending: false })
  return throwIfError(data as Bill[] | null, error, 'Unable to load bills.')
}

export async function fetchBillsForTenant(siteId: string, tenantId: string): Promise<Bill[]> {
  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('site_id', siteId)
    .eq('tenant_id', tenantId)
    .order('period_start', { ascending: false })
  return throwIfError(data as Bill[] | null, error, 'Unable to load bills.')
}

export async function generateMonthlyBills(siteId: string, periodStart: string): Promise<number> {
  const { data, error } = await supabase.rpc('generate_monthly_bills', {
    p_site_id: siteId,
    p_period_start: periodStart,
  })
  if (error) throw new Error(error.message)
  return Number(data ?? 0)
}

export async function syncLiveBilling(siteId: string): Promise<void> {
  const bills = await supabase.rpc('ensure_monthly_bills', { p_site_id: siteId })
  if (bills.error && !/could not find|schema cache/i.test(bills.error.message)) {
    throw new Error(bills.error.message)
  }
  await supabase.rpc('ensure_due_reminders', { p_site_id: siteId })
}

export async function updateRoomRent(siteId: string, roomId: string, monthlyRentCentavos: number) {
  const { error: roomError } = await supabase
    .from('rooms')
    .update({ monthly_rent_centavos: monthlyRentCentavos })
    .eq('id', roomId)
    .eq('site_id', siteId)
  if (roomError) throw new Error('Unable to save rent.')

  const { error: bedError } = await supabase
    .from('beds')
    .update({ monthly_rent_centavos: monthlyRentCentavos })
    .eq('room_id', roomId)
    .eq('site_id', siteId)
  if (bedError) {
    throw new Error(
      'Unable to save rent on beds. Run supabase/migrations/008_bed_billing.sql in the SQL Editor.',
    )
  }
}

export async function fetchBillingSettings(siteId: string) {
  const { data } = await supabase.from('billing_settings').select('*').eq('site_id', siteId).maybeSingle()
  return data as { due_day: number; site_id: string } | null
}
