import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/errors'
import type { Faq, FaqInput } from '@/types/database'

export async function fetchActiveFaqs(siteId: string): Promise<Faq[]> {
  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .eq('site_id', siteId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return throwIfError(data as Faq[] | null, error, 'Unable to load FAQs.')
}

export async function fetchAllFaqs(siteId: string): Promise<Faq[]> {
  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .eq('site_id', siteId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return throwIfError(data as Faq[] | null, error, 'Unable to load FAQs.')
}

export async function createFaq(siteId: string, input: FaqInput): Promise<Faq> {
  const { data, error } = await supabase
    .from('faqs')
    .insert({
      site_id: siteId,
      question: input.question.trim(),
      answer: input.answer.trim(),
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
    })
    .select('*')
    .single()

  return throwIfError(data as Faq | null, error, 'Unable to add FAQ.')
}

export async function updateFaq(siteId: string, id: string, input: FaqInput): Promise<Faq> {
  const { data, error } = await supabase
    .from('faqs')
    .update({
      question: input.question.trim(),
      answer: input.answer.trim(),
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
    })
    .eq('id', id)
    .eq('site_id', siteId)
    .select('*')
    .single()

  return throwIfError(data as Faq | null, error, 'Unable to update FAQ.')
}

export async function deleteFaq(siteId: string, id: string): Promise<void> {
  const { error } = await supabase.from('faqs').delete().eq('id', id).eq('site_id', siteId)
  if (error) {
    console.error('Failed to delete FAQ', error.message)
    throw new Error('Unable to remove this FAQ.')
  }
}
