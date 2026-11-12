import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/errors'
import { uploadPrivateFile } from '@/services/privateStorage'
import type { Payment, PaymentMethod } from '@/types/ops'

export async function fetchPayments(siteId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
  return throwIfError(data as Payment[] | null, error, 'Unable to load payments.')
}

export async function fetchPaymentsForTenant(siteId: string, tenantId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('site_id', siteId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  return throwIfError(data as Payment[] | null, error, 'Unable to load payments.')
}

export async function submitEwalletPayment(input: {
  siteId: string
  tenantId: string
  billId: string
  amountCentavos: number
  method: Exclude<PaymentMethod, 'cash'>
  referenceNumber: string
  file: File
}) {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      site_id: input.siteId,
      tenant_id: input.tenantId,
      bill_id: input.billId,
      amount_centavos: input.amountCentavos,
      method: input.method,
      status: 'pending_verification',
      reference_number: input.referenceNumber.trim(),
      submitted_by: (await supabase.auth.getUser()).data.user?.id,
    })
    .select('*')
    .single()
  const payment = throwIfError(data as Payment | null, error, 'Unable to submit payment.')
  const path = await uploadPrivateFile(
    'payment-receipts',
    input.siteId,
    `payments/${payment.id}`,
    input.file,
  )
  await supabase.from('payment_receipts').insert({
    site_id: input.siteId,
    payment_id: payment.id,
    storage_path: path,
  })
  return payment
}

export async function confirmPayment(id: string) {
  const { data, error } = await supabase.rpc('confirm_payment', { p_payment_id: id })
  if (error) throw new Error(error.message)
  return data as Payment
}

export async function rejectPayment(id: string, reason: string) {
  const { data, error } = await supabase.rpc('reject_payment', {
    p_payment_id: id,
    p_reason: reason,
  })
  if (error) throw new Error(error.message)
  return data as Payment
}

export async function recordCashCollection(input: {
  siteId: string
  tenantId: string
  billId: string
  amountCentavos: number
  paidOn: string
  notes: string
}) {
  const { data, error } = await supabase.rpc('record_cash_collection', {
    p_site_id: input.siteId,
    p_tenant_id: input.tenantId,
    p_bill_id: input.billId,
    p_amount_centavos: input.amountCentavos,
    p_paid_on: input.paidOn,
    p_notes: input.notes || null,
  })
  if (error) throw new Error(error.message)
  return data as Payment
}
