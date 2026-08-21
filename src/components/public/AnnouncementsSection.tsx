import { useState } from 'react'
import { ArrowUpRight, Bell } from 'lucide-react'
import { formatDate } from '@/utils/format'
import { SampleLabel } from '@/components/public/SampleLabel'
import { Modal } from '@/components/ui/Modal'
import type { Announcement } from '@/types/database'

export function AnnouncementsSection({
  announcements,
  isSample = false,
}: {
  announcements: Announcement[]
  isSample?: boolean
}) {
  const [selected, setSelected] = useState<Announcement | null>(null)

  if (announcements.length === 0) return null

  const featured = announcements.find((item) => item.is_important) ?? announcements[0]
  const remaining = announcements.filter((item) => item.id !== featured.id)
  const featuredDate = featured.published_at ?? featured.created_at

  return (
    <section id="announcements" className="announce-band">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <p className="text-xs tracking-[0.22em] text-gold uppercase">Updates</p>
        <span className="gold-rule mt-3" />
        <h2 className="mt-4 font-display text-3xl sm:text-4xl">
          Announcements
          <SampleLabel show={isSample} />
        </h2>

        <div className={`mt-8 grid gap-5 ${remaining.length > 0 ? 'lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.85fr)]' : ''}`}>
          <button
            type="button"
            onClick={() => setSelected(featured)}
            className="announce-featured announce-in relative overflow-hidden rounded-xl border border-gold/35 bg-white px-6 py-7 text-left transition duration-300 hover:border-gold hover:shadow-[0_18px_40px_-24px_rgba(10,10,10,0.4)] sm:px-8 sm:py-8"
          >
            <span className="pointer-events-none absolute top-0 right-0 h-24 w-24 bg-[radial-gradient(circle_at_top_right,rgba(197,164,106,0.18),transparent_70%)]" />
            <span className="pointer-events-none absolute top-4 left-4 h-10 w-10 border-t border-l border-gold/70" />
            <span className="pointer-events-none absolute right-4 bottom-4 h-10 w-10 border-r border-b border-gold/40" />

            <div className="relative flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-[#fbf7f0] px-3 py-1.5 text-[11px] tracking-[0.18em] text-gold-dark uppercase">
                <span className="announce-pulse h-1.5 w-1.5 rounded-full bg-gold" />
                Pinned update
              </span>
              <span className="inline-flex items-center gap-2 text-xs tracking-wide text-muted">
                <Bell className="h-3.5 w-3.5 text-gold" />
                {formatDate(featuredDate)}
              </span>
            </div>

            <h3 className="relative mt-5 max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
              {featured.title}
            </h3>
            <span className="gold-rule mt-5" />
            <p className="relative mt-5 max-w-2xl line-clamp-4 whitespace-pre-line text-base leading-7 text-muted">
              {featured.content}
            </p>
            <span className="relative mt-6 inline-flex items-center gap-1 text-sm tracking-wide text-ink">
              Read notice
              <ArrowUpRight className="h-4 w-4 text-gold" />
            </span>
          </button>

          {remaining.length > 0 ? (
            <div className="flex flex-col">
              <p className="mb-3 text-[11px] tracking-[0.2em] text-gold uppercase">More updates</p>
              <div className="flex flex-1 flex-col gap-3">
                {remaining.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item)}
                    className="announce-in announce-note group flex gap-4 rounded-xl border border-line bg-white p-5 text-left transition duration-300 hover:border-gold/50 hover:shadow-[0_12px_30px_-18px_rgba(10,10,10,0.25)]"
                    style={{ animationDelay: `${120 + index * 80}ms` }}
                  >
                    <div className="hidden w-12 shrink-0 border-r border-line pr-3 text-center sm:block">
                      <p className="font-display text-2xl leading-none">{dayOf(item)}</p>
                      <p className="mt-1 text-[10px] tracking-[0.16em] text-gold uppercase">{monthOf(item)}</p>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium leading-snug transition group-hover:text-gold-dark">{item.title}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{item.content}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs tracking-wide text-ink">
                        Read notice
                        <ArrowUpRight className="h-3.5 w-3.5 text-gold" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <AnnouncementModal announcement={selected} onClose={() => setSelected(null)} />
    </section>
  )
}

function AnnouncementModal({
  announcement,
  onClose,
}: {
  announcement: Announcement | null
  onClose: () => void
}) {
  if (!announcement) return null

  const date = announcement.published_at ?? announcement.created_at

  return (
    <Modal open={Boolean(announcement)} title={announcement.title} onClose={onClose}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          {announcement.is_important ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-[#fbf7f0] px-3 py-1.5 text-[11px] tracking-[0.18em] text-gold-dark uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              Pinned update
            </span>
          ) : (
            <span className="text-[11px] tracking-[0.18em] text-gold uppercase">Announcement</span>
          )}
          <span className="inline-flex items-center gap-2 text-xs tracking-wide text-muted">
            <Bell className="h-3.5 w-3.5 text-gold" />
            {formatDate(date)}
          </span>
        </div>
        <span className="gold-rule" />
        <p className="whitespace-pre-line text-base leading-7 text-muted">{announcement.content}</p>
      </div>
    </Modal>
  )
}

function dayOf(item: Announcement) {
  return new Intl.DateTimeFormat('en-PH', { day: '2-digit' }).format(
    new Date(item.published_at ?? item.created_at),
  )
}

function monthOf(item: Announcement) {
  return new Intl.DateTimeFormat('en-PH', { month: 'short' }).format(
    new Date(item.published_at ?? item.created_at),
  )
}
