import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getEnv, isSupabaseConfigured } from '@/lib/env'
import { fetchSiteBySlug } from '@/services/siteService'
import type { Site } from '@/types/database'

interface SiteContextValue {
  site: Site | null
  siteId: string | null
  siteSlug: string
  loading: boolean
  error: string | null
  refreshSite: () => Promise<void>
}

const SiteContext = createContext<SiteContextValue | undefined>(undefined)

export function SiteProvider({ children }: { children: ReactNode }) {
  const { siteSlug } = getEnv()
  const [site, setSite] = useState<Site | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSite = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (!isSupabaseConfigured()) {
      setSite(null)
      setError('This website is not configured yet. Add Supabase environment variables to continue.')
      setLoading(false)
      return
    }

    try {
      const nextSite = await fetchSiteBySlug(siteSlug)
      setSite(nextSite)
    } catch (loadError) {
      setSite(null)
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load this website.',
      )
    } finally {
      setLoading(false)
    }
  }, [siteSlug])

  useEffect(() => {
    void loadSite()
  }, [loadSite])

  const value = useMemo<SiteContextValue>(
    () => ({
      site,
      siteId: site?.id ?? null,
      siteSlug,
      loading,
      error,
      refreshSite: loadSite,
    }),
    [site, siteSlug, loading, error, loadSite],
  )

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}

export function useSite() {
  const context = useContext(SiteContext)
  if (!context) {
    throw new Error('useSite must be used within SiteProvider')
  }
  return context
}
