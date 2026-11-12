import { useBoarderTenant } from '@/hooks/useBoarderTenant'
import { formatDate } from '@/utils/format'

export default function BoarderProfilePage() {
  const { tenant, boarderProfile } = useBoarderTenant()

  return (
    <div>
      <h1 className="font-display text-3xl">Profile</h1>
      <dl className="mt-6 grid max-w-lg gap-3 rounded-xl border border-line bg-white p-5 text-sm">
        <div>
          <dt className="text-muted">Name</dt>
          <dd className="font-medium">{tenant?.full_name ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted">Email</dt>
          <dd>{tenant?.email ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted">Mobile</dt>
          <dd>{tenant?.phone ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted">Room</dt>
          <dd>{tenant?.rooms?.room_number ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted">Started</dt>
          <dd>{formatDate(tenant?.started_on)}</dd>
        </div>
        <div>
          <dt className="text-muted">Emergency contact</dt>
          <dd>
            {boarderProfile?.emergency_name ?? '—'} {boarderProfile?.emergency_phone ? `· ${boarderProfile.emergency_phone}` : ''}
          </dd>
        </div>
      </dl>
    </div>
  )
}
