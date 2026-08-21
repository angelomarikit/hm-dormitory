import { cn } from '@/utils/cn'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 items-center justify-between gap-4 text-left"
    >
      <span className="text-sm font-medium text-ink">{label}</span>
      <span
        className={cn(
          'relative h-7 w-12 rounded-full transition',
          checked ? 'bg-gold' : 'bg-stone-300',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition',
            checked && 'translate-x-5',
          )}
        />
      </span>
    </button>
  )
}
