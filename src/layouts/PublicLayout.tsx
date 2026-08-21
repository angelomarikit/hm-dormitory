import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from '@/components/public/Navbar'
import { Footer } from '@/components/public/Footer'
import { PageLoader } from '@/components/ui/Spinner'
import { useSite } from '@/contexts/SiteContext'
import { scrollToSection } from '@/utils/scroll'

export function PublicLayout() {
  const { site, loading, error } = useSite()
  const location = useLocation()

  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (!hash) return
    const timer = window.setTimeout(() => scrollToSection(hash), 80)
    return () => window.clearTimeout(timer)
  }, [location.hash])

  if (loading) {
    return (
      <div className="min-h-screen bg-paper">
        <PageLoader label="Loading website…" />
      </div>
    )
  }

  if (error || !site) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6">
        <div className="max-w-md rounded-xl border border-line bg-white p-8 text-center">
          <h1 className="font-display text-3xl">Website unavailable</h1>
          <p className="mt-3 text-muted">
            {error || 'This site is not ready yet. Confirm the database setup and environment variables.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
