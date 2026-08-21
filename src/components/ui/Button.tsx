import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

const variants: Record<Variant, string> = {
  primary:
    'bg-ink text-white hover:bg-black disabled:bg-ink/40',
  secondary:
    'bg-gold text-ink hover:bg-gold-dark hover:text-white disabled:bg-gold/50',
  ghost:
    'bg-transparent text-ink hover:bg-paper-2 disabled:text-muted',
  danger:
    'bg-red-700 text-white hover:bg-red-800 disabled:bg-red-700/50',
  outline:
    'border border-ink/15 bg-white text-ink hover:border-gold hover:text-gold-dark disabled:opacity-50',
}

export function Button({
  variant = 'primary',
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium tracking-wide transition disabled:cursor-not-allowed',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
