import { toAuthEmail, normalizeUsername } from '@/lib/authIdentity'
import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/errors'
import { signInWithPassword, signUpWithPassword } from '@/services/authService'
import { uploadPrivateFile } from '@/services/privateStorage'
import { todayISO } from '@/utils/format'
import type { Registration, RegistrationInput } from '@/types/ops'

export async function submitRegistration(
  siteId: string,
  input: RegistrationInput,
  idFile: File | null,
): Promise<Registration> {
  const username = normalizeUsername(input.email)
  const authEmail = toAuthEmail(username)
  const { data: existingSession } = await supabase.auth.getSession()
  const existingEmail = existingSession.session?.user.email?.toLowerCase()
  if (existingEmail && existingEmail !== authEmail) {
    await supabase.auth.signOut()
  }

  try {
    await signUpWithPassword(authEmail, input.password, input.full_name.trim())
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (!/already registered|already exists/i.test(message)) {
      throw error
    }
  }

  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) {
    try {
      await signInWithPassword(authEmail, input.password)
    } catch {
      throw new Error(
        'We created your login. Sign in with your username and password so the application can be saved to the database.',
      )
    }
  }

  const { data, error } = await supabase.rpc('submit_site_registration', {
    payload: {
      site_id: siteId,
      full_name: input.full_name.trim(),
      date_of_birth: input.date_of_birth || '',
      gender: input.gender || '',
      nationality: input.nationality || '',
      home_address: input.home_address.trim(),
      occupancy_type: input.occupancy_type || '',
      school_or_company: input.school_or_company.trim(),
      email: username,
      mobile: input.mobile.trim(),
      emergency_name: input.emergency_name.trim(),
      emergency_relationship: input.emergency_relationship.trim(),
      emergency_phone: input.emergency_phone.trim(),
      preferred_room_type: input.preferred_room_type || '',
      preferred_room_id: input.preferred_room_id || '',
      preferred_bed_id: input.preferred_bed_id || '',
      preferred_move_in: input.preferred_move_in || '',
      expected_stay: input.expected_stay.trim(),
      special_requests: input.special_requests.trim(),
    },
  })

  const registration = throwIfError(
    data as Registration | null,
    error,
    error?.message?.includes('schema cache')
      ? 'Run supabase/migrations/009_live_ops.sql in the SQL Editor so applications save to the database.'
      : 'Unable to submit registration.',
  )

  if (idFile) {
    const path = await uploadPrivateFile(
      'registration-documents',
      siteId,
      `registrations/${registration.id}`,
      idFile,
    )
    await supabase.from('registration_documents').insert({
      site_id: siteId,
      registration_id: registration.id,
      document_type: 'valid_id',
      storage_path: path,
      original_name: idFile.name,
    })
  }

  return registration
}

export async function fetchRegistrations(siteId: string): Promise<Registration[]> {
  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
  return throwIfError(data as Registration[] | null, error, 'Unable to load registrations.')
}

export async function lookupRegistration(reference: string, email: string) {
  const { data, error } = await supabase.rpc('lookup_registration_status', {
    p_reference: reference,
    p_email: normalizeUsername(email),
  })
  if (error) throw new Error('Unable to look up this application.')
  const row = Array.isArray(data) ? data[0] : data
  return row as { reference_number: string; status: string; submitted_at: string } | null
}

export async function setRegistrationStatus(
  siteId: string,
  id: string,
  status: Registration['status'],
  note?: string,
) {
  const { data, error } = await supabase
    .from('registrations')
    .update({
      status,
      review_notes: note ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('site_id', siteId)
    .select('*')
    .single()
  const row = throwIfError(data as Registration | null, error, 'Unable to update registration.')
  await supabase.from('registration_status_history').insert({
    registration_id: id,
    to_status: status,
    note: note ?? null,
  })
  return row
}

export async function approveRegistration(options: {
  siteId: string
  registration: Registration
  roomId: string
  bedId: string
  rentCentavos: number
}) {
  const { siteId, registration, roomId, bedId, rentCentavos } = options
  if (!registration.user_id) throw new Error('This applicant has no login yet.')

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      site_id: siteId,
      room_id: roomId,
      bed_id: bedId,
      user_id: registration.user_id,
      email: registration.email,
      full_name: registration.full_name,
      phone: registration.mobile,
      started_on: registration.preferred_move_in || todayISO(),
      is_active: true,
    })
    .select('*')
    .single()

  if (tenantError || !tenant) {
    throw new Error(tenantError?.message.includes('already full') ? 'That room is full.' : 'Unable to assign a bed.')
  }

  await supabase.from('room_assignment_history').insert({
    site_id: siteId,
    tenant_id: tenant.id,
    room_id: roomId,
    bed_id: bedId,
    started_on: tenant.started_on,
  })

  await supabase
    .from('boarder_profiles')
    .update({
      status: 'active',
      tenant_id: tenant.id,
      monthly_rent_centavos: rentCentavos,
    })
    .eq('user_id', registration.user_id)
    .eq('site_id', siteId)

  return setRegistrationStatus(siteId, registration.id, 'approved', 'Approved and assigned a bed.')
}
