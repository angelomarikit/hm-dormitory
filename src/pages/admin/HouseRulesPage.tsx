import { useEffect, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
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
  createHouseRule,
  deleteHouseRule,
  fetchAllHouseRules,
  updateHouseRule,
} from '@/services/houseRuleService'
import type { HouseRule, HouseRuleInput } from '@/types/database'

const emptyForm: HouseRuleInput = {
  title: '',
  description: '',
  sort_order: 0,
  is_active: true,
}

export default function HouseRulesAdminPage() {
  const { siteId } = useSite()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<HouseRule[]>([])
  const { open, setOpen, editingId, setEditingId, form, setForm, resetDraft } = useModalDraft(
    siteId ? `house-rules:${siteId}` : null,
    emptyForm,
  )
  const [editing, setEditing] = useState<HouseRule | null>(null)
  const [saving, setSaving] = useState(false)
  const [pending, setPending] = useState<HouseRule | null>(null)
  const [descriptionError, setDescriptionError] = useState('')

  async function load() {
    if (!siteId) return
    setLoading(true)
    try {
      setItems(await fetchAllHouseRules(siteId))
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to load house rules.'))
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
    setDescriptionError('')
    setOpen(true)
  }

  function openEdit(item: HouseRule) {
    setEditing(item)
    setEditingId(item.id)
    setForm({
      title: item.title,
      description: item.description,
      sort_order: item.sort_order,
      is_active: item.is_active,
    })
    setDescriptionError('')
    setOpen(true)
  }

  async function save() {
    if (!siteId) return
    if (!form.description.trim()) {
      setDescriptionError('Description is required.')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateHouseRule(siteId, editing.id, form)
        toast.success('House rule updated.')
      } else {
        await createHouseRule(siteId, form)
        toast.success('House rule added.')
      }
      setOpen(false)
      resetDraft()
      await load()
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to save house rule.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="House Rules"
        description="These appear in the house rules section on the landing page."
        action={<Button onClick={openCreate}>Add rule</Button>}
      />

      {loading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-24" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No house rules yet." />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-line bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold">{item.title || 'House rule'}</h2>
                <Badge tone={item.is_active ? 'success' : 'neutral'}>
                  {item.is_active ? 'Visible' : 'Hidden'}
                </Badge>
              </div>
              <p className="mt-2 line-clamp-4 text-sm text-muted">{item.description}</p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={() => openEdit(item)}>
                  Edit
                </Button>
                <Button variant="ghost" onClick={() => setPending(item)}>
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={open} title={editing ? 'Edit house rule' : 'Add house rule'} onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <Input
            label="Title"
            value={form.title ?? ''}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />
          <Textarea
            label="Description"
            value={form.description}
            error={descriptionError}
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
          <Button className="w-full" disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pending)}
        title="Delete house rule"
        message="Are you sure you want to delete this house rule?"
        loading={saving}
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          if (!siteId || !pending) return
          setSaving(true)
          try {
            await deleteHouseRule(siteId, pending.id)
            toast.success('House rule deleted.')
            setPending(null)
            await load()
          } catch (error) {
            toast.error(toUserMessage(error, 'Unable to delete house rule.'))
          } finally {
            setSaving(false)
          }
        }}
      />
    </div>
  )
}
