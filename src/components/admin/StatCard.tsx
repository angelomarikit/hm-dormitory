export function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="rounded-xl border border-line bg-white p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-display text-4xl">{value}</p>
    </article>
  )
}
