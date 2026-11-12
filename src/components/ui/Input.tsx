import type { InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, id, className, ...props }: InputProps) {
  const inputId = id ?? props.name ?? label.replace(/\s+/g, '-').toLowerCase()

  return (
    <label className="block space-y-1.5" htmlFor={inputId}>
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        id={inputId}
        className={cn(
          'min-h-11 w-full rounded-md border bg-white px-3 py-2 text-base text-ink outline-none transition placeholder:text-muted/70 focus:border-gold',
          error ? 'border-red-500' : 'border-line',
          className,
        )}
        {...props}
      />
      {hint && !error ? <span className="text-sm text-muted">{hint}</span> : null}
      {error ? <span className="text-sm text-red-700">{error}</span> : null}
    </label>
  )
}
