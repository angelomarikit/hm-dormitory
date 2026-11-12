import { useEffect, useState } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { fetchNotices } from '@/services/commsService'
import { formatDateTime } from '@/utils/format'
import type { Notice } from '@/types/ops'

export default function BoarderNoticesPage() {
  const { siteId } = useSite()
  const [items, setItems] = useState<Notice[]>([])

  useEffect(() => {
    if (!siteId) return
    void fetchNotices(siteId).then(setItems).catch(() => setItems([]))
  }, [siteId])

  return (
    <div>
      <h1 className="font-display text-3xl">Notices</h1>
      <div className="mt-6 space-y-3">
        {items.length === 0 ? <p className="text-sm text-muted">No notices yet.</p> : null}
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-line bg-white p-5">
            <p className="text-xs uppercase tracking-[0.12em] text-gold">{item.category} · {item.priority}</p>
            <h2 className="mt-1 font-medium">{item.title}</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-muted">{item.body}</p>
            <p className="mt-2 text-xs text-muted">{item.published_at ? formatDateTime(item.published_at) : ''}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
