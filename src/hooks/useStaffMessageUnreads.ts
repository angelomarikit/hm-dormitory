import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useSite } from '@/contexts/SiteContext'
import { STAFF_UNREAD_EVENT, fetchUnreadBoarderCounts } from '@/services/commsService'

export function useStaffMessageUnreadsState() {
  const { siteId } = useSite()
  const { user, isCms, isCaretaker } = useAuth()
  const enabled = Boolean(siteId && user && (isCms || isCaretaker))
  const [total, setTotal] = useState(0)
  const [byConversation, setByConversation] = useState<Record<string, number>>({})
  const refreshRef = useRef<() => Promise<void>>(async () => {})

  const refresh = useCallback(async () => {
    if (!enabled || !siteId || !user) {
      setTotal(0)
      setByConversation({})
      return
    }
    try {
      const counts = await fetchUnreadBoarderCounts(siteId, user.id)
      setTotal(counts.total)
      setByConversation(counts.byConversation)
    } catch {
      /* keep last known counts */
    }
  }, [enabled, siteId, user])

  refreshRef.current = refresh

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!enabled || !siteId) return
    const onRefresh = () => {
      void refreshRef.current()
    }
    window.addEventListener(STAFF_UNREAD_EVENT, onRefresh)
    const channel = supabase
      .channel(`staff-unread:${siteId}:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `site_id=eq.${siteId}` },
        onRefresh,
      )
      .subscribe()
    return () => {
      window.removeEventListener(STAFF_UNREAD_EVENT, onRefresh)
      void supabase.removeChannel(channel)
    }
  }, [enabled, siteId])

  return { total, byConversation, refresh }
}
