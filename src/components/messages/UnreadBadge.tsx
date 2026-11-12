export function UnreadBadge({
  count,
  overlay = false,
}: {
  count: number
  overlay?: boolean
}) {
  if (count <= 0) return null
  const label = count > 99 ? '99+' : String(count)
  return (
    <span
      className={[
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white',
        overlay ? 'absolute -top-1.5 -right-1.5' : 'ml-auto shrink-0',
      ].join(' ')}
    >
      {label}
    </span>
  )
}
