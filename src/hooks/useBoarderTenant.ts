import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSite } from '@/contexts/SiteContext'
import { fetchTenantById } from '@/services/tenantService'
import type { TenantWithRoom } from '@/types/database'

export function useBoarderTenant() {
  const { siteId } = useSite()
  const { boarderProfile } = useAuth()
  const [tenant, setTenant] = useState<TenantWithRoom | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!siteId || !boarderProfile?.tenant_id) {
      setTenant(null)
      setLoading(false)
      return
    }
    setLoading(true)
    void fetchTenantById(siteId, boarderProfile.tenant_id)
      .then(setTenant)
      .finally(() => setLoading(false))
  }, [boarderProfile?.tenant_id, siteId])

  return { tenant, loading, boarderProfile }
}
