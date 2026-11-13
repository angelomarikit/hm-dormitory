import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/errors'
import { uploadPrivateFile } from '@/services/privateStorage'
import { parsePesoInput } from '@/utils/money'
import type { UtilityCharge } from '@/types/ops'

function sqlSetupError(message: string) {
  return /schema cache|could not find|does not exist/i.test(message)
    ? 'Run supabase/migrations/015_utility_meters.sql, 016_utility_month_generate.sql, then 017_utility_readings.sql in the SQL Editor, then refresh this page.'
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

function parseReading(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const amount = Number(trimmed.replace(/,/g, ''))
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Meter readings must be zero or a positive number.')
  }
  return amount
}

export function readingLabel(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return ''
  return String(value)
}

export async function fetchPreviousRoomReadings(
  siteId: string,
  roomId: string,
  beforePeriod: string,
): Promise<{ electricity: number | null; water: number | null }> {
  const { data, error } = await supabase
    .from('utility_charges')
    .select('electricity_current_reading, water_current_reading')
    .eq('site_id', siteId)
    .eq('room_id', roomId)
    .lt('period_start', beforePeriod)
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    if (/schema cache|column|does not exist/i.test(error.message)) {
      return { electricity: null, water: null }
    }
    throw new Error(sqlSetupError(error.message))
  }
  return {
    electricity: data?.electricity_current_reading == null ? null : Number(data.electricity_current_reading),
    water: data?.water_current_reading == null ? null : Number(data.water_current_reading),
  }
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
    electricityPrevious: string
    electricityCurrent: string
    waterPrevious: string
    waterCurrent: string
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
    p_electricity_previous_reading: parseReading(input.electricityPrevious),
    p_electricity_current_reading: parseReading(input.electricityCurrent),
    p_water_previous_reading: parseReading(input.waterPrevious),
    p_water_current_reading: parseReading(input.waterCurrent),
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
