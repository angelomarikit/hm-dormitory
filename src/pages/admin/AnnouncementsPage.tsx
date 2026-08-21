import { useEffect, useMemo, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Switch } from '@/components/ui/Switch'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAllAnnouncements,
  updateAnnouncement,
} from '@/services/announcementService'
import { formatDateTime } from '@/utils/format'
import { toUserMessage } from '@/lib/errors'
import type { Announcement, AnnouncementInput } from '@/types/database'

const emptyForm: AnnouncementInput = {
  title: '',
  content: '',
  is_important: false,
  is_published: false,
}

export default function AnnouncementsPage() {
  const { siteId } = useSite()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Announcement[]>([])
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [form, setForm] = useState<AnnouncementInput>(emptyForm)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Announcement | null>(null)
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({})

  async function load() {
    if (!siteId) return
    setLoading(true)
    try {
      setItems(await fetchAllAnnouncements(siteId))
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to load announcements.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  const filtered = useMemo(
    () =>
      items.filter((item) =>
        `${item.title} ${item.content}`.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [items, query],
  )

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setErrors({})
    setOpen(true)
  }

  function openEdit(item: Announcement) {
    setEditing(item)
    setForm({
      title: item.title,
      content: item.content,
      is_important: item.is_important,
      is_published: item.is_published,
    })
    setErrors({})
    setOpen(true)
  }

  async function save() {
    if (!siteId) return
    const nextErrors: { title?: string; content?: string } = {}
    if (!form.title.trim()) nextErrors.title = 'Title is required.'
    if (!form.content.trim()) nextErrors.content = 'Content is required.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    try {
      if (editing) {
        await updateAnnouncement(siteId, editing.id, form, editing)
        toast.success('Announcement updated.')
      } else {
        await createAnnouncement(siteId, form)
        toast.success('Announcement saved.')
      }
      setOpen(false)
      await load()
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to save announcement.'))
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!siteId || !pendingDelete) return
    setSaving(true)
    try {
      await deleteAnnouncement(siteId, pendingDelete.id)
      toast.success('Announcement deleted.')
      setPendingDelete(null)
      await load()
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to delete announcement.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Announcements"
        description="These appear directly below the hero on the public website."
        action={<Button onClick={openCreate}>Add announcement</Button>}
      />

      <div className="mt-5">
        <Input label="Search" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No announcements available." />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((item) => (
            <article key={item.id} className="rounded-xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{item.title}</h2>
                  <p className="mt-1 line-clamp-3 text-sm text-muted">{item.content}</p>
                  <p className="mt-2 text-xs text-muted">{formatDateTime(item.updated_at)}</p>
                </div>
                <div className="flex gap-2">
                  <Badge tone={item.is_published ? 'success' : 'neutral'}>
                    {item.is_published ? 'Published' : 'Draft'}
                  </Badge>
                  {item.is_important ? <Badge tone="limited">Important</Badge> : null}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => openEdit(item)}>
                  Edit
                </Button>
                <Button variant="ghost" onClick={() => setPendingDelete(item)}>
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={open} title={editing ? 'Edit announcement' : 'New announcement'} onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <Input
            label="Title"
            value={form.title}
            error={errors.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />
          <Textarea
            label="Content"
            value={form.content}
            error={errors.content}
            onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
          />
          <Switch
            label="Mark as important"
            checked={form.is_important}
            onChange={(checked) => setForm((current) => ({ ...current, is_important: checked }))}
          />
          <Switch
            label="Publish on website"
            checked={form.is_published}
            onChange={(checked) => setForm((current) => ({ ...current, is_published: checked }))}
          />
          <Button className="w-full" disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete announcement"
        message={`Are you sure you want to delete this announcement${pendingDelete ? `: ${pendingDelete.title}` : ''}?`}
        loading={saving}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
