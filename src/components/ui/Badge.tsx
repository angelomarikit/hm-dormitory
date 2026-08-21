import { cn } from '@/utils/cn'

type BadgeTone = 'available' | 'limited' | 'full' | 'neutral' | 'success'

const tones: Record<BadgeTone, string> = {
  available: 'border border-gold/50 bg-white text-ink',
  limited: 'border border-ink/20 bg-paper-2 text-ink',
  full: 'border border-line bg-ink text-white',
  neutral: 'border border-line bg-paper-2 text-muted',
  success: 'border border-gold/40 bg-white text-gold-dark',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: string
  tone?: BadgeTone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2.5 py-1 text-[11px] font-medium tracking-[0.14em] uppercase',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
