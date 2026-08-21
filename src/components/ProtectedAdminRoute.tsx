import { Navigate, Outlet } from 'react-router-dom'
import { PageLoader } from '@/components/ui/Spinner'
import { useAuth } from '@/contexts/AuthContext'
import { useSite } from '@/contexts/SiteContext'
import { canManageContent } from '@/services/authService'

export function ProtectedAdminRoute() {
  const { loading: siteLoading, site } = useSite()
  const { loading, user, isSiteAdmin, role } = useAuth()

  if (siteLoading || loading) {
    return (
      <div className="min-h-screen bg-paper">
        <PageLoader label="Checking access…" />
      </div>
    )
  }

  if (!site || !user || !isSiteAdmin || !canManageContent(role)) {
    return <Navigate to="/admin" replace />
  }

  return <Outlet />
}
