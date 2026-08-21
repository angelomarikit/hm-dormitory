import type { ReactNode } from 'react'

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs tracking-[0.22em] text-gold uppercase">Administrator</p>
        <span className="gold-rule mt-3" />
        <h1 className="mt-4 font-display text-3xl">{title}</h1>
        {description ? <p className="mt-2 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
