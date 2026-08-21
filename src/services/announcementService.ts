import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/errors'
import type { Announcement, AnnouncementInput } from '@/types/database'

export async function fetchPublishedAnnouncements(siteId: string): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('site_id', siteId)
    .eq('is_published', true)
    .order('is_important', { ascending: false })
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false })

  return throwIfError(data as Announcement[] | null, error, 'Unable to load announcements.')
}

export async function fetchAllAnnouncements(siteId: string): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })

  return throwIfError(data as Announcement[] | null, error, 'Unable to load announcements.')
}

export async function createAnnouncement(
  siteId: string,
  input: AnnouncementInput,
): Promise<Announcement> {
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      site_id: siteId,
      title: input.title.trim(),
      content: input.content.trim(),
      is_important: input.is_important,
      is_published: input.is_published,
      published_at: input.is_published ? new Date().toISOString() : null,
    })
    .select('*')
    .single()

  return throwIfError(data as Announcement | null, error, 'Unable to create announcement.')
}

export async function updateAnnouncement(
  siteId: string,
  id: string,
  input: AnnouncementInput,
  previous: Pick<Announcement, 'is_published' | 'published_at'>,
): Promise<Announcement> {
  const publishedAt = input.is_published
    ? previous.published_at ?? new Date().toISOString()
    : previous.published_at

  const { data, error } = await supabase
    .from('announcements')
    .update({
      title: input.title.trim(),
      content: input.content.trim(),
      is_important: input.is_important,
      is_published: input.is_published,
      published_at: publishedAt,
    })
    .eq('id', id)
    .eq('site_id', siteId)
    .select('*')
    .single()

  return throwIfError(data as Announcement | null, error, 'Unable to update announcement.')
}

export async function deleteAnnouncement(siteId: string, id: string): Promise<void> {
  const { error } = await supabase.from('announcements').delete().eq('id', id).eq('site_id', siteId)
  if (error) {
    console.error('Failed to delete announcement', error.message)
    throw new Error('Unable to delete announcement.')
  }
}
