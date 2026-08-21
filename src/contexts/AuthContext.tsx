import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { fetchSiteMembership, signInWithPassword, signOut as signOutRequest } from '@/services/authService'
import { useSite } from '@/contexts/SiteContext'
import type { SiteMember, SiteRole } from '@/types/database'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  membership: SiteMember | null
  role: SiteRole | null
  isSiteAdmin: boolean
  authError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  clearAuthError: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { siteId, loading: siteLoading } = useSite()
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [membership, setMembership] = useState<SiteMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  const resolveMembership = useCallback(
    async (nextUser: User | null) => {
      if (!nextUser || !siteId) {
        setMembership(null)
        return null
      }

      const nextMembership = await fetchSiteMembership(nextUser.id, siteId)
      if (!nextMembership) {
        await signOutRequest()
        setMembership(null)
        setSession(null)
        setUser(null)
        setAuthError('This account is not assigned to this website.')
        return null
      }

      setMembership(nextMembership)
      setAuthError(null)
      return nextMembership
    },
    [siteId],
  )

  useEffect(() => {
    if (siteLoading) return

    let cancelled = false

    async function bootstrap() {
      setLoading(true)
      const { data } = await supabase.auth.getSession()
      if (cancelled) return

      setSession(data.session)
      setUser(data.session?.user ?? null)

      try {
        await resolveMembership(data.session?.user ?? null)
      } catch (error) {
        if (!cancelled) {
          setAuthError(error instanceof Error ? error.message : 'Unable to verify access.')
          setMembership(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void bootstrap()

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)

      window.setTimeout(() => {
        void (async () => {
          try {
            await resolveMembership(nextSession?.user ?? null)
          } catch (error) {
            setAuthError(error instanceof Error ? error.message : 'Unable to verify access.')
            setMembership(null)
          } finally {
            if (event === 'SIGNED_OUT') setLoading(false)
          }
        })()
      }, 0)
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [resolveMembership, siteLoading])

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthError(null)
    setLoading(true)
    try {
      await signInWithPassword(email, password)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign in.')
      setLoading(false)
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    await signOutRequest()
    setMembership(null)
    setAuthError(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading: loading || siteLoading,
      membership,
      role: membership?.role ?? null,
      isSiteAdmin: Boolean(membership),
      authError,
      signIn,
      signOut,
      clearAuthError: () => setAuthError(null),
    }),
    [user, session, loading, siteLoading, membership, authError, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
