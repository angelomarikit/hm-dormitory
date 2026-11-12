import { supabase } from '@/lib/supabase'
import { uniqueFileName } from '@/utils/files'

const MAX = 10 * 1024 * 1024
const ALLOWED = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]

export function validatePrivateFile(file: File): string | null {
  if (!ALLOWED.includes(file.type)) return 'Upload a JPG, PNG, WebP, or PDF.'
  if (file.size > MAX) return 'Files must be 10 MB or smaller.'
  return null
}

export async function uploadPrivateFile(
  bucket: 'registration-documents' | 'payment-receipts' | 'boarder-documents',
  siteId: string,
  folder: string,
  file: File,
): Promise<string> {
  const invalid = validatePrivateFile(file)
  if (invalid) throw new Error(invalid)
  const path = `${siteId}/${folder}/${uniqueFileName(file.name)}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType: file.type,
  })
  if (error) {
    console.error(error.message)
    throw new Error('Unable to upload this file.')
  }
  return path
}

export async function signedUrl(
  bucket: 'registration-documents' | 'payment-receipts' | 'boarder-documents',
  path: string,
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10)
  if (error || !data?.signedUrl) throw new Error('Unable to open this file.')
  return data.signedUrl
}
