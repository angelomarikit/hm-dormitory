import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { UnreadBadge } from '@/components/messages/UnreadBadge'
import { useStaffMessageUnreads } from '@/contexts/StaffUnreadContext'
import {
  fetchConversations,
  fetchMessages,
  fetchOrCreateConversation,
  markConversationRead,
  notifyStaffUnreadRefresh,
  sendMessage,
} from '@/services/commsService'
import { formatDateTime } from '@/utils/format'
import type { Conversation, Message } from '@/types/ops'

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function MessageCenter({
  siteId,
  userId,
  boarders,
  lockedTenantId,
}: {
  siteId: string
  userId: string
  boarders: Array<{ id: string; full_name: string; room?: string | null }>
  lockedTenantId?: string | null
}) {
  const boarderMode = Boolean(lockedTenantId)
  const { pathname } = useLocation()
  const viewingInbox = pathname.includes('/messages') && !boarderMode
  const { byConversation } = useStaffMessageUnreads()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [active, setActive] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [query, setQuery] = useState('')
  const scroller = useRef<HTMLDivElement>(null)

  const names = useMemo(
    () => Object.fromEntries(boarders.map((item) => [item.id, item.full_name])),
    [boarders],
  )
  const rooms = useMemo(
    () => Object.fromEntries(boarders.map((item) => [item.id, item.room ?? ''])),
    [boarders],
  )

  async function loadConversations() {
    const list = await fetchConversations(siteId)
    setConversations(list)
    return list
  }

  useEffect(() => {
    let cancelled = false
    void loadConversations()
      .then(async (list) => {
        if (cancelled) return
        if (lockedTenantId) {
          const existing = list.find((item) => item.tenant_id === lockedTenantId)
          const row = existing ?? (await fetchOrCreateConversation(siteId, lockedTenantId))
          if (!cancelled) {
            setActive(row)
            if (!existing) setConversations(await fetchConversations(siteId))
          }
        }
      })
      .catch(() => {
        if (!cancelled) setConversations([])
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, lockedTenantId])

  useEffect(() => {
    if (!active) {
      setMessages([])
      return
    }
    void fetchMessages(active.id).then(setMessages).catch(() => setMessages([]))
  }, [active?.id])

  useEffect(() => {
    if (!viewingInbox || !active?.id) return
    void markConversationRead(active.id, userId)
  }, [viewingInbox, active?.id, userId])

  useEffect(() => {
    const channel = supabase
      .channel(`ops-messages:${siteId}:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `site_id=eq.${siteId}` },
        (payload) => {
          const row = payload.new as Message
          setConversations((current) =>
            current.map((item) =>
              item.id === row.conversation_id ? { ...item, updated_at: row.created_at } : item,
            ),
          )
          setMessages((msgs) => {
            if (row.conversation_id !== active?.id) return msgs
            return msgs.some((item) => item.id === row.id) ? msgs : [...msgs, row]
          })
          if (viewingInbox && row.conversation_id === active?.id && row.sender_id !== userId) {
            void markConversationRead(row.conversation_id, userId)
          } else {
            notifyStaffUnreadRefresh()
          }
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [siteId, active?.id, userId, viewingInbox])

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight })
  }, [messages.length, active?.id])

  const visibleBoarders = boarders.filter((item) => {
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return `${item.full_name} ${item.room ?? ''}`.toLowerCase().includes(needle)
  })

  async function openWith(tenantId: string) {
    const row = await fetchOrCreateConversation(siteId, tenantId)
    setConversations(await loadConversations())
    setActive(row)
  }

  async function onSend() {
    if (!active || !body.trim()) return
    setSending(true)
    try {
      const row = await sendMessage({
        conversationId: active.id,
        siteId,
        senderId: userId,
        body,
      })
      setBody('')
      setMessages((current) => (current.some((item) => item.id === row.id) ? current : [...current, row]))
    } finally {
      setSending(false)
    }
  }

  const boarderName = active ? names[active.tenant_id] ?? 'Boarder' : ''
  const headerName = boarderMode ? 'Administration' : boarderName
  const headerDetail = boarderMode
    ? rooms[lockedTenantId ?? '']
      ? `Room ${rooms[lockedTenantId ?? '']} · Message the office`
      : 'Message the office'
    : rooms[active?.tenant_id ?? '']
      ? `Room ${rooms[active?.tenant_id ?? '']}`
      : 'Direct message'

  const thread = (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#faf8f4]">
      {active ? (
        <>
          <header className="flex shrink-0 items-center gap-3 border-b border-line bg-white px-5 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm text-gold">
              {initials(headerName)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">{headerName}</p>
              <p className="truncate text-xs text-muted">{headerDetail}</p>
            </div>
          </header>
          <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
            {messages.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">No messages yet. Start the conversation.</p>
            ) : null}
            {messages.map((message) => {
              const mine = message.sender_id === userId
              return (
                <div key={message.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={mine ? 'max-w-[75%] text-right' : 'max-w-[75%]'}>
                    <p
                      className={[
                        'inline-block whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed',
                        mine
                          ? 'rounded-br-md bg-ink text-white'
                          : 'rounded-bl-md border border-line bg-white text-ink',
                      ].join(' ')}
                    >
                      {message.body}
                    </p>
                    <p className="mt-1 text-[11px] text-muted">{formatDateTime(message.created_at)}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <form
            className="shrink-0 border-t border-line bg-white p-3 sm:p-4"
            onSubmit={(event) => {
              event.preventDefault()
              void onSend()
            }}
          >
            <div className="flex items-center gap-2">
              <input
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write a message"
                className="min-h-11 flex-1 rounded-full border border-line bg-paper-2 px-4 text-sm outline-none focus:border-gold"
              />
              <button
                type="submit"
                disabled={sending || !body.trim()}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-gold disabled:opacity-40"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-xs tracking-[0.18em] text-gold uppercase">Messages</p>
          <p className="mt-2 font-display text-3xl">Choose a boarder</p>
          <p className="mt-2 max-w-sm text-sm text-muted">
            Conversations are stored in the database. The same thread appears here and on the boarder portal.
          </p>
        </div>
      )}
    </section>
  )

  if (boarderMode) {
    return (
      <div className="flex h-[min(36rem,calc(100vh-11rem))] min-h-[28rem] flex-col overflow-hidden rounded-2xl border border-line bg-white">
        {thread}
      </div>
    )
  }

  return (
    <div className="grid h-[min(40rem,calc(100vh-11rem))] min-h-[28rem] overflow-hidden rounded-2xl border border-line bg-white lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col border-b border-line bg-white lg:border-r lg:border-b-0">
        <div className="shrink-0 border-b border-line px-4 py-3">
          <p className="text-xs tracking-[0.18em] text-gold uppercase">Inbox</p>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search boarders"
            className="mt-2 w-full rounded-lg border border-line bg-paper-2 px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {visibleBoarders.map((boarder) => {
            const conversation = conversations.find((item) => item.tenant_id === boarder.id)
            const selected = active?.tenant_id === boarder.id
            const unread = conversation ? (byConversation[conversation.id] ?? 0) : 0
            return (
              <button
                key={boarder.id}
                type="button"
                onClick={() => void openWith(boarder.id)}
                className={[
                  'flex w-full items-center gap-3 border-b border-line/70 px-4 py-3 text-left',
                  selected ? 'bg-[#faf8f4]' : 'hover:bg-paper-2',
                ].join(' ')}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-medium text-gold">
                  {initials(boarder.full_name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${unread > 0 ? 'font-semibold' : 'font-medium'}`}>
                    {boarder.full_name}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {boarder.room ? `Room ${boarder.room}` : 'No room'}
                    {conversation ? ' · open' : ''}
                  </span>
                </span>
                <UnreadBadge count={unread} />
              </button>
            )
          })}
          {visibleBoarders.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted">No boarders to message yet.</p>
          ) : null}
        </div>
      </aside>
      {thread}
    </div>
  )
}
