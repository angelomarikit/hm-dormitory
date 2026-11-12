import { Navigate, Outlet } from 'react-router-dom'
import { PageLoader } from '@/components/ui/Spinner'
import { useAuth } from '@/contexts/AuthContext'
import { useSite } from '@/contexts/SiteContext'

export function ProtectedAdminRoute() {
  const { loading: siteLoading, site } = useSite()
  const { loading, user, access } = useAuth()

  if (access === 'cms' && site && user) {
    return <Outlet />
  }

  if (siteLoading || loading) {
    return (
      <div className="min-h-screen bg-paper">
        <PageLoader label="Checking access…" />
      </div>
    )
  }

  if (access === 'caretaker') return <Navigate to="/caretaker" replace />
  if (access === 'boarder') return <Navigate to="/boarder" replace />
  if (access === 'pending_boarder') return <Navigate to="/boarder/pending" replace />
  return <Navigate to="/login" replace />
}

export function ProtectedCaretakerRoute() {
  const { loading: siteLoading, site } = useSite()
  const { loading, access } = useAuth()
  if (access === 'caretaker' && site) return <Outlet />
  if (access === 'cms' && site) return <Outlet />
  if (siteLoading || loading) {
    return (
      <div className="min-h-screen bg-paper">
        <PageLoader label="Checking access…" />
      </div>
    )
  }
  return <Navigate to="/login" replace />
}

export function ProtectedBoarderRoute() {
  const { loading: siteLoading, site } = useSite()
  const { loading, access } = useAuth()
  if (access === 'boarder' && site) return <Outlet />
  if (access === 'pending_boarder' && site) return <Navigate to="/boarder/pending" replace />
  if (siteLoading || loading) {
    return (
      <div className="min-h-screen bg-paper">
        <PageLoader label="Checking access…" />
      </div>
    )
  }
  return <Navigate to="/login" replace />
}

export function ProtectedPendingBoarderRoute() {
  const { loading: siteLoading, site } = useSite()
  const { loading, access } = useAuth()
  if (access === 'pending_boarder' && site) return <Outlet />
  if (access === 'boarder' && site) return <Navigate to="/boarder" replace />
  if (siteLoading || loading) {
    return (
      <div className="min-h-screen bg-paper">
        <PageLoader label="Checking access…" />
      </div>
    )
  }
  return <Navigate to="/login" replace />
}
