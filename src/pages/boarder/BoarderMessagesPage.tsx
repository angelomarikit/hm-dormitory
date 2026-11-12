import { MessageCenter } from '@/components/messages/MessageCenter'
import { useAuth } from '@/contexts/AuthContext'
import { useSite } from '@/contexts/SiteContext'
import { useBoarderTenant } from '@/hooks/useBoarderTenant'

export default function BoarderMessagesPage() {
  const { siteId } = useSite()
  const { user } = useAuth()
  const { tenant } = useBoarderTenant()

  return (
    <div>
      <p className="text-xs tracking-[0.22em] text-gold uppercase">Administration</p>
      <h1 className="mt-2 font-display text-3xl">Messages</h1>
      <p className="mt-2 text-sm text-muted">Replies from the office appear here instantly and are saved to the database.</p>
      <div className="mt-6">
        {siteId && user && tenant ? (
          <MessageCenter
            siteId={siteId}
            userId={user.id}
            lockedTenantId={tenant.id}
            boarders={[
              {
                id: tenant.id,
                full_name: tenant.full_name,
                room: tenant.rooms?.room_number,
              },
            ]}
          />
        ) : (
          <p className="text-sm text-muted">Your bed assignment is required before messaging opens.</p>
        )}
      </div>
    </div>
  )
}
