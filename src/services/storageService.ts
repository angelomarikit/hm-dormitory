import { supabase } from '@/lib/supabase'
import { uniqueFileName } from '@/utils/files'

const BUCKET = 'site-assets'
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Please upload a JPG, PNG, or WebP image.'
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'Images must be 5 MB or smaller.'
  }
  return null
}

export async function uploadSiteAsset(siteId: string, folderPath: string, file: File): Promise<string> {
  const validationError = validateImageFile(file)
  if (validationError) {
    throw new Error(validationError)
  }

  const path = `${siteId}/${folderPath}/${uniqueFileName(file.name)}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })

  if (error) {
    console.error('Upload failed', error.message)
    throw new Error('Unable to upload this image.')
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteSiteAssetByUrl(publicUrl: string | null | undefined): Promise<void> {
  if (!publicUrl) return

  const path = extractStoragePath(publicUrl)
  if (!path) return

  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) {
    console.error('Failed to delete storage object', error.message)
  }
}

export function extractStoragePath(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const index = publicUrl.indexOf(marker)
  if (index === -1) return null
  return decodeURIComponent(publicUrl.slice(index + marker.length).split('?')[0] ?? '')
}
