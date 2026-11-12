import { useEffect, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { fetchNotices, publishNotice } from '@/services/commsService'
import { formatDateTime } from '@/utils/format'
import { toUserMessage } from '@/lib/errors'
import type { Notice } from '@/types/ops'

export default function NoticesPage() {
  const { siteId } = useSite()
  const toast = useToast()
  const [items, setItems] = useState<Notice[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('general')
  const [priority, setPriority] = useState('normal')

  async function load() {
    if (!siteId) return
    setItems(await fetchNotices(siteId))
  }

  useEffect(() => {
    void load().catch((error) => toast.error(toUserMessage(error, 'Unable to load notices.')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  return (
    <div>
      <AdminPageHeader title="Notices" description="Private notices for logged-in boarders. Public website announcements stay on Announcements." />
      <form
        className="mt-6 grid gap-4 rounded-xl border border-line bg-white p-5"
        onSubmit={async (event) => {
          event.preventDefault()
          if (!siteId) return
          try {
            await publishNotice(siteId, { title, body, category, priority, audience: 'all_boarders' })
            toast.success('Notice published.')
            setTitle('')
            setBody('')
            await load()
          } catch (error) {
            toast.error(toUserMessage(error, 'Unable to publish.'))
          }
        }}
      >
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Textarea label="Message" value={body} onChange={(e) => setBody(e.target.value)} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="general">General</option>
            <option value="payment">Payment reminder</option>
            <option value="maintenance">Maintenance</option>
            <option value="rules">House rules</option>
            <option value="emergency">Emergency</option>
            <option value="other">Other</option>
          </Select>
          <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
        </div>
        <Button type="submit">Publish to all boarders</Button>
      </form>
      <div className="mt-8 space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-line bg-white p-5">
            <p className="text-xs uppercase tracking-[0.12em] text-gold">{item.category} · {item.priority}</p>
            <h2 className="mt-1 font-medium">{item.title}</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-muted">{item.body}</p>
            <p className="mt-2 text-xs text-muted">{item.published_at ? formatDateTime(item.published_at) : 'Draft'}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
