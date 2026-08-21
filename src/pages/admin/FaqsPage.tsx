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
import { createFaq, deleteFaq, fetchAllFaqs, updateFaq } from '@/services/faqService'
import type { Faq, FaqInput } from '@/types/database'

const emptyForm: FaqInput = {
  question: '',
  answer: '',
  sort_order: 0,
  is_active: true,
}

export default function FaqsPage() {
  const { siteId } = useSite()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Faq[]>([])
  const [form, setForm] = useState<FaqInput>(emptyForm)
  const [editing, setEditing] = useState<Faq | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pending, setPending] = useState<Faq | null>(null)
  const [errors, setErrors] = useState<{ question?: string; answer?: string }>({})

  async function load() {
    if (!siteId) return
    setLoading(true)
    try {
      setItems(await fetchAllFaqs(siteId))
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to load FAQs.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm, sort_order: items.length + 1 })
    setErrors({})
    setOpen(true)
  }

  function openEdit(item: Faq) {
    setEditing(item)
    setForm({
      question: item.question,
      answer: item.answer,
      sort_order: item.sort_order,
      is_active: item.is_active,
    })
    setErrors({})
    setOpen(true)
  }

  async function save() {
    if (!siteId) return
    const nextErrors: { question?: string; answer?: string } = {}
    if (!form.question.trim()) nextErrors.question = 'Question is required.'
    if (!form.answer.trim()) nextErrors.answer = 'Answer is required.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    try {
      if (editing) {
        await updateFaq(siteId, editing.id, form)
        toast.success('FAQ updated.')
      } else {
        await createFaq(siteId, form)
        toast.success('FAQ added.')
      }
      setOpen(false)
      await load()
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to save FAQ.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="FAQs"
        description="Add questions boarders commonly ask."
        action={<Button onClick={openCreate}>Add FAQ</Button>}
      />

      {loading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-24" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No FAQs yet." />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-line bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold">{item.question}</h2>
                <Badge tone={item.is_active ? 'success' : 'neutral'}>
                  {item.is_active ? 'Visible' : 'Hidden'}
                </Badge>
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-muted">{item.answer}</p>
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

      <Modal open={open} title={editing ? 'Edit FAQ' : 'Add FAQ'} onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <Input
            label="Question"
            value={form.question}
            error={errors.question}
            onChange={(event) => setForm((current) => ({ ...current, question: event.target.value }))}
          />
          <Textarea
            label="Answer"
            value={form.answer}
            error={errors.answer}
            onChange={(event) => setForm((current) => ({ ...current, answer: event.target.value }))}
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
        title="Delete FAQ"
        message="Are you sure you want to delete this FAQ?"
        loading={saving}
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          if (!siteId || !pending) return
          setSaving(true)
          try {
            await deleteFaq(siteId, pending.id)
            toast.success('FAQ deleted.')
            setPending(null)
            await load()
          } catch (error) {
            toast.error(toUserMessage(error, 'Unable to delete FAQ.'))
          } finally {
            setSaving(false)
          }
        }}
      />
    </div>
  )
}
