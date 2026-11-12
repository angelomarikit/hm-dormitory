import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/errors'
import { uploadPrivateFile } from '@/services/privateStorage'
import { parsePesoInput } from '@/utils/money'
import type { UtilityCharge } from '@/types/ops'

function sqlSetupError(message: string) {
  return /schema cache|could not find|does not exist/i.test(message)
    ? 'Run supabase/migrations/015_utility_meters.sql then 016_utility_month_generate.sql in the SQL Editor, then refresh this page.'
    : message
}

export function monthStartISO(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

export function utilityMonthOptions(count = 12) {
  const now = new Date()
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1)
    return {
      value: monthStartISO(date),
      label: date.toLocaleString('en-PH', { month: 'long', year: 'numeric' }),
    }
  })
}

export function periodKey(value: string | null | undefined) {
  return (value ?? '').slice(0, 10)
}

export function splitUtilityShares(totalCentavos: number, occupantCount: number): number[] {
  if (occupantCount <= 0) return []
  const base = Math.floor(totalCentavos / occupantCount)
  const remainder = totalCentavos % occupantCount
  return Array.from({ length: occupantCount }, (_, index) => base + (index < remainder ? 1 : 0))
}

export async function fetchUtilityCharges(siteId: string, periodStart?: string): Promise<UtilityCharge[]> {
  let query = supabase
    .from('utility_charges')
    .select('*, utility_charge_shares(*)')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
  if (periodStart) query = query.eq('period_start', periodStart)
  const { data, error } = await query
  if (error) throw new Error(sqlSetupError(error.message))
  return throwIfError(data as UtilityCharge[] | null, error, 'Unable to load electric and water charges.')
}

export async function saveRoomUtilities(
  siteId: string,
  roomId: string,
  periodStart: string,
  input: {
    electricityPesos: string
    waterPesos: string
    notes: string
    billFile: File | null
  },
): Promise<{ occupant_count: number }> {
  const electricity = parsePesoInput(input.electricityPesos)
  const water = parsePesoInput(input.waterPesos)
  if (electricity <= 0 && water <= 0) {
    throw new Error('Enter an electric or water amount.')
  }

  let billImagePath: string | null = null
  if (input.billFile) {
    billImagePath = await uploadPrivateFile(
      'payment-receipts',
      siteId,
      `utilities/${roomId}`,
      input.billFile,
    )
  }

  const { data, error } = await supabase.rpc('save_room_utilities', {
    p_site_id: siteId,
    p_room_id: roomId,
    p_period_start: periodStart,
    p_electricity_centavos: electricity,
    p_water_centavos: water,
    p_bill_image_path: billImagePath,
    p_notes: input.notes.trim() || null,
  })
  if (error) throw new Error(sqlSetupError(error.message))
  return data as { occupant_count: number }
}

export async function generateMonthUtilities(siteId: string, periodStart: string) {
  const { data, error } = await supabase.rpc('generate_month_utilities', {
    p_site_id: siteId,
    p_period_start: periodStart,
  })
  if (error) throw new Error(sqlSetupError(error.message))
  return data as { rooms: number; boarders: number }
}

export async function deleteUtilityCharge(chargeId: string) {
  const { error } = await supabase.rpc('delete_utility_charge', {
    p_charge_id: chargeId,
  })
  if (error) throw new Error(sqlSetupError(error.message))
}
