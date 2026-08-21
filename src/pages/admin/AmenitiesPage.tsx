import { useEffect, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { Switch } from '@/components/ui/Switch'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { toUserMessage } from '@/lib/errors'
import { useModalDraft } from '@/hooks/useSessionDraft'
import {
  createAmenity,
  deleteAmenity,
  fetchAllAmenities,
  updateAmenity,
} from '@/services/amenityService'
import { deleteSiteAssetByUrl, uploadSiteAsset } from '@/services/storageService'
import type { Amenity, AmenityInput } from '@/types/database'

const emptyForm: AmenityInput = {
  name: '',
  description: '',
  image_url: '',
  sort_order: 0,
  is_active: true,
}

export default function AmenitiesPage() {
  const { siteId } = useSite()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Amenity[]>([])
  const { open, setOpen, editingId, setEditingId, form, setForm, resetDraft } = useModalDraft(
    siteId ? `amenities:${siteId}` : null,
    emptyForm,
  )
  const [editing, setEditing] = useState<Amenity | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pending, setPending] = useState<Amenity | null>(null)
  const [nameError, setNameError] = useState('')

  async function load() {
    if (!siteId) return
    setLoading(true)
    try {
      setItems(await fetchAllAmenities(siteId))
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to load amenities.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  useEffect(() => {
    if (!editingId) {
      setEditing(null)
      return
    }
    const item = items.find((entry) => entry.id === editingId)
    if (item) setEditing(item)
  }, [editingId, items])

  function openCreate() {
    setEditing(null)
    setEditingId(null)
    setForm({ ...emptyForm, sort_order: items.length + 1 })
    setNameError('')
    setOpen(true)
  }

  function openEdit(item: Amenity) {
    setEditing(item)
    setEditingId(item.id)
    setForm({
      name: item.name,
      description: item.description,
      image_url: item.image_url,
      sort_order: item.sort_order,
      is_active: item.is_active,
    })
    setNameError('')
    setOpen(true)
  }

  async function save() {
    if (!siteId) return
    if (!form.name.trim()) {
      setNameError('Name is required.')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateAmenity(siteId, editing.id, form)
        toast.success('Amenity updated.')
      } else {
        await createAmenity(siteId, form)
        toast.success('Amenity added.')
      }
      setOpen(false)
      resetDraft()
      await load()
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to save amenity.'))
    } finally {
      setSaving(false)
    }
  }

  async function uploadImage(file: File) {
    if (!siteId) return
    setUploading(true)
    try {
      const url = await uploadSiteAsset(siteId, 'amenities', file)
      if (form.image_url) await deleteSiteAssetByUrl(form.image_url)
      setForm((current) => ({ ...current, image_url: url }))
      toast.success('Image uploaded.')
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to upload image.'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Amenities"
        description="Only published amenities appear on the public website."
        action={<Button onClick={openCreate}>Add amenity</Button>}
      />

      {loading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-28" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No amenities yet." description="Add only the facilities this property actually offers." />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-xl border border-line bg-white">
              {item.image_url ? (
                <img src={item.image_url} alt="" className="h-36 w-full object-cover" />
              ) : null}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold">{item.name}</h2>
                  <Badge tone={item.is_active ? 'success' : 'neutral'}>
                    {item.is_active ? 'Visible' : 'Hidden'}
                  </Badge>
                </div>
                {item.description ? <p className="mt-2 text-sm text-muted">{item.description}</p> : null}
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" onClick={() => openEdit(item)}>
                    Edit
                  </Button>
                  <Button variant="ghost" onClick={() => setPending(item)}>
                    Delete
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={open} title={editing ? 'Edit amenity' : 'Add amenity'} onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            error={nameError}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Textarea
            label="Description"
            value={form.description ?? ''}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
          <Input
            label="Display order"
            type="number"
            value={form.sort_order ?? 0}
            onChange={(event) =>
              setForm((current) => ({ ...current, sort_order: Number(event.target.value) }))
            }
          />
          <Switch
            label="Show on website"
            checked={form.is_active ?? true}
            onChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))}
          />
          <ImageUpload
            label="Photo"
            value={form.image_url}
            uploading={uploading}
            onSelect={(file) => void uploadImage(file)}
            onRemove={() => {
              void deleteSiteAssetByUrl(form.image_url)
              setForm((current) => ({ ...current, image_url: '' }))
            }}
          />
          <Button className="w-full" disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pending)}
        title="Delete amenity"
        message={`Are you sure you want to delete ${pending?.name ?? 'this amenity'}?`}
        loading={saving}
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          if (!siteId || !pending) return
          setSaving(true)
          try {
            await deleteAmenity(siteId, pending.id)
            await deleteSiteAssetByUrl(pending.image_url)
            toast.success('Amenity deleted.')
            setPending(null)
            await load()
          } catch (error) {
            toast.error(toUserMessage(error, 'Unable to delete amenity.'))
          } finally {
            setSaving(false)
          }
        }}
      />
    </div>
  )
}
