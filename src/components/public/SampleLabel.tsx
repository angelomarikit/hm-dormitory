export function SampleLabel({ show }: { show?: boolean }) {
  if (!show) return null
  return (
    <span className="ml-2 align-middle text-[10px] font-medium tracking-[0.18em] text-gold uppercase">
      Sample
    </span>
  )
}
