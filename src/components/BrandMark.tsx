import { cn } from '@/utils/cn'

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      <path d="M24 3.5 44.5 21.2V41.5H3.5V21.2L24 3.5Z" fill="#0A0A0A" />
      <rect x="20.25" y="23.5" width="7.5" height="18" rx="0.4" fill="#C5A46A" />
      <rect x="10.5" y="23.5" width="5.25" height="5.25" fill="#C5A46A" />
      <rect x="32.25" y="23.5" width="5.25" height="5.25" fill="#C5A46A" />
      <path
        d="M8 44.8c5.2-2.4 13.2-3.6 16-3.6s10.8 1.2 16 3.6"
        stroke="#C5A46A"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function SiteLogo({
  url,
  name,
  className,
}: {
  url?: string | null
  name?: string
  className?: string
}) {
  if (url) {
    return (
      <img
        src={url}
        alt={name || ''}
        className={cn('h-16 w-auto max-h-16 shrink-0 object-contain sm:h-20 sm:max-h-20', className)}
      />
    )
  }

  return <BrandMark className={cn('h-16 w-16 sm:h-20 sm:w-20', className)} />
}
