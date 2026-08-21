import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

export function Textarea({ label, error, id, className, ...props }: TextareaProps) {
  const inputId = id ?? props.name ?? label.replace(/\s+/g, '-').toLowerCase()

  return (
    <label className="block space-y-1.5" htmlFor={inputId}>
      <span className="text-sm font-medium text-ink">{label}</span>
      <textarea
        id={inputId}
        className={cn(
          'min-h-28 w-full rounded-md border bg-white px-3 py-2 text-base text-ink outline-none transition placeholder:text-muted/70 focus:border-gold',
          error ? 'border-red-500' : 'border-line',
          className,
        )}
        {...props}
      />
      {error ? <span className="text-sm text-red-700">{error}</span> : null}
    </label>
  )
}
