import { SampleLabel } from '@/components/public/SampleLabel'
import type { HouseRule } from '@/types/database'

export function HouseRulesSection({
  rules,
  isSample = false,
}: {
  rules: HouseRule[]
  isSample?: boolean
}) {
  if (rules.length === 0) return null

  return (
    <section id="house-rules" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-xs tracking-[0.22em] text-gold uppercase">Living here</p>
      <span className="gold-rule mt-3" />
      <h2 className="mt-4 font-display text-3xl sm:text-4xl">
        House rules
        <SampleLabel show={isSample} />
      </h2>
      <ol className="mt-6 grid gap-4 md:grid-cols-2">
        {rules.map((rule, index) => (
          <li key={rule.id} className="rounded-xl border border-line bg-white p-5">
            <p className="text-xs tracking-widest text-gold uppercase">
              {String(index + 1).padStart(2, '0')}
            </p>
            <h3 className="mt-2 text-lg font-semibold">{rule.title || 'House rule'}</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted">{rule.description}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
