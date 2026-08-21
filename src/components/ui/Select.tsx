import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
}

export function Select({ label, error, id, className, children, ...props }: SelectProps) {
  const inputId = id ?? props.name ?? label.replace(/\s+/g, '-').toLowerCase()

  return (
    <label className="block space-y-1.5" htmlFor={inputId}>
      <span className="text-sm font-medium text-ink">{label}</span>
      <select
        id={inputId}
        className={cn(
          'min-h-11 w-full rounded-md border bg-white px-3 py-2 text-base text-ink outline-none transition focus:border-gold',
          error ? 'border-red-500' : 'border-line',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error ? <span className="text-sm text-red-700">{error}</span> : null}
    </label>
  )
}
