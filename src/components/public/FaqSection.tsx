import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { SampleLabel } from '@/components/public/SampleLabel'
import type { Faq } from '@/types/database'

export function FaqSection({
  faqs,
  isSample = false,
}: {
  faqs: Faq[]
  isSample?: boolean
}) {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null)

  if (faqs.length === 0) return null

  return (
    <section id="faq" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-xs tracking-[0.22em] text-gold uppercase">Questions</p>
      <span className="gold-rule mt-3" />
      <h2 className="mt-4 font-display text-3xl sm:text-4xl">
        FAQ
        <SampleLabel show={isSample} />
      </h2>
      <div className="mt-6 divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
        {faqs.map((faq) => {
          const open = openId === faq.id
          return (
            <div key={faq.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : faq.id)}
              >
                <span className="font-medium">{faq.question}</span>
                <ChevronDown className={`h-5 w-5 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
              </button>
              {open ? (
                <p className="whitespace-pre-line px-5 pb-5 text-sm leading-6 text-muted">
                  {faq.answer}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
