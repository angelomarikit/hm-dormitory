import { useLayoutEffect, useRef, useState } from 'react'
import { isFilled } from '@/utils/cn'
import { SampleLabel } from '@/components/public/SampleLabel'
import type { Rate } from '@/types/database'

export function RatesSection({
  rate,
  isSample = false,
}: {
  rate: Rate | null
  isSample?: boolean
}) {
  if (!rate) return null

  const items = [
    { label: rate.monthly_rate_label || 'Monthly boarding rate', value: rate.monthly_rate },
    { label: 'Electricity', value: rate.electricity_information },
    { label: 'Water', value: rate.water_information },
    { label: 'Other fees', value: rate.other_fees },
    { label: 'Deposit', value: rate.deposit_information },
    { label: 'Additional notes', value: rate.additional_notes },
  ].filter((item): item is { label: string; value: string } => isFilled(item.value))

  if (items.length === 0) return null

  return (
    <section id="rates" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-xs tracking-[0.22em] text-gold uppercase">Boarding information</p>
      <span className="gold-rule mt-3" />
      <h2 className="mt-4 font-display text-3xl sm:text-4xl">
        Rates
        <SampleLabel show={isSample} />
      </h2>
      <div className="mt-6 grid items-stretch gap-4 md:grid-cols-2">
        {items.map((item) => (
          <RateCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>
    </section>
  )
}

function RateCard({ label, value }: { label: string; value: string }) {
  const textRef = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [canToggle, setCanToggle] = useState(false)

  useLayoutEffect(() => {
    const element = textRef.current
    if (!element || expanded) return
    setCanToggle(element.scrollHeight > element.clientHeight + 1)
  }, [value, expanded])

  return (
    <article className="flex h-full flex-col rounded-xl border border-line bg-white p-5">
      <h3 className="text-xs font-medium tracking-[0.16em] text-gold uppercase">{label}</h3>
      <p
        ref={textRef}
        className={[
          'mt-3 flex-1 whitespace-pre-line text-lg leading-7',
          expanded ? '' : 'line-clamp-5',
        ].join(' ')}
      >
        {value}
      </p>
      {canToggle ? (
        <button
          type="button"
          className="mt-4 self-start text-sm font-medium tracking-wide text-gold-dark underline decoration-gold underline-offset-4"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? 'See less' : 'See more'}
        </button>
      ) : (
        <span className="mt-4 h-5" aria-hidden="true" />
      )}
    </article>
  )
}
