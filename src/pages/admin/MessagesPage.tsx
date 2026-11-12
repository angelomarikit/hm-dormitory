import { useEffect, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { MessageCenter } from '@/components/messages/MessageCenter'
import { useAuth } from '@/contexts/AuthContext'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { fetchActiveTenants } from '@/services/tenantService'
import { toUserMessage } from '@/lib/errors'
import type { TenantWithRoom } from '@/types/database'

export default function MessagesPage() {
  const { siteId } = useSite()
  const { user } = useAuth()
  const toast = useToast()
  const [tenants, setTenants] = useState<TenantWithRoom[]>([])

  useEffect(() => {
    if (!siteId) return
    void fetchActiveTenants(siteId)
      .then(setTenants)
      .catch((error) => toast.error(toUserMessage(error, 'Unable to load boarders.')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  return (
    <div>
      <AdminPageHeader
        title="Messages"
        description="The same conversation is stored in the database for staff and the boarder."
      />
      <div className="mt-6">
        {siteId && user ? (
          <MessageCenter
            siteId={siteId}
            userId={user.id}
            boarders={tenants.map((tenant) => ({
              id: tenant.id,
              full_name: tenant.full_name,
              room: tenant.rooms?.room_number,
            }))}
          />
        ) : null}
      </div>
    </div>
  )
}
