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
import {
  fetchBoarderProfile,
  fetchSiteMembership,
  isCaretakerRole,
  isCmsRole,
  signInWithPassword,
  signOut as signOutRequest,
} from '@/services/authService'
import { useSite } from '@/contexts/SiteContext'
import type { SiteMember, SiteRole } from '@/types/database'
import type { AccessKind, BoarderProfile } from '@/types/ops'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  membership: SiteMember | null
  boarderProfile: BoarderProfile | null
  role: SiteRole | null
  access: AccessKind
  isSiteAdmin: boolean
  isCms: boolean
  isCaretaker: boolean
  isBoarder: boolean
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
  const [boarderProfile, setBoarderProfile] = useState<BoarderProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  const resolveAccess = useCallback(
    async (nextUser: User | null) => {
      if (!nextUser || !siteId) {
        setMembership(null)
        setBoarderProfile(null)
        return
      }

      const nextMembership = await fetchSiteMembership(nextUser.id, siteId)
      setMembership(nextMembership)
      if (nextMembership) {
        setBoarderProfile(null)
        setAuthError(null)
        return
      }

      const profile = await fetchBoarderProfile(nextUser.id, siteId)
      setBoarderProfile(profile)
      setAuthError(null)
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
        await resolveAccess(data.session?.user ?? null)
      } catch (error) {
        if (!cancelled) {
          setAuthError(error instanceof Error ? error.message : 'Unable to verify access.')
          setMembership(null)
          setBoarderProfile(null)
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
            await resolveAccess(nextSession?.user ?? null)
          } catch (error) {
            setAuthError(error instanceof Error ? error.message : 'Unable to verify access.')
            setMembership(null)
            setBoarderProfile(null)
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
  }, [resolveAccess, siteLoading])

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
    setBoarderProfile(null)
    setAuthError(null)
  }, [])

  const role = membership?.role ?? null
  const access: AccessKind = !user
    ? 'anonymous'
    : isCmsRole(role)
      ? 'cms'
      : isCaretakerRole(role)
        ? 'caretaker'
        : boarderProfile?.status === 'active'
          ? 'boarder'
          : boarderProfile?.status === 'pending'
            ? 'pending_boarder'
            : 'unassigned'

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading: loading || siteLoading,
      membership,
      boarderProfile,
      role,
      access,
      isSiteAdmin: access === 'cms',
      isCms: access === 'cms',
      isCaretaker: access === 'caretaker',
      isBoarder: access === 'boarder',
      authError,
      signIn,
      signOut,
      clearAuthError: () => setAuthError(null),
    }),
    [
      user,
      session,
      loading,
      siteLoading,
      membership,
      boarderProfile,
      role,
      access,
      authError,
      signIn,
      signOut,
    ],
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
