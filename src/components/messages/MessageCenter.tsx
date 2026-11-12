import { useEffect, useMemo, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import {
  fetchConversations,
  fetchMessages,
  fetchOrCreateConversation,
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
    const channel = supabase
      .channel(`ops-messages:${siteId}`)
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
          setActive((current) => {
            if (current?.id === row.conversation_id) {
              setMessages((msgs) => (msgs.some((item) => item.id === row.id) ? msgs : [...msgs, row]))
            }
            return current
          })
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [siteId])

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
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

  const activeName = active ? names[active.tenant_id] ?? 'Boarder' : ''

  return (
    <div className="grid min-h-[32rem] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_18px_40px_-28px_rgba(10,10,10,0.35)] lg:grid-cols-[18rem_1fr] lg:h-[calc(100vh-12rem)]">
      {lockedTenantId ? null : (
        <aside className="flex flex-col border-b border-line bg-[#faf8f4] lg:border-r lg:border-b-0">
          <div className="border-b border-line px-4 py-4">
            <p className="text-xs tracking-[0.18em] text-gold uppercase">Inbox</p>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search boarders"
              className="mt-3 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {visibleBoarders.map((boarder) => {
              const conversation = conversations.find((item) => item.tenant_id === boarder.id)
              const selected = active?.tenant_id === boarder.id
              return (
                <button
                  key={boarder.id}
                  type="button"
                  onClick={() => void openWith(boarder.id)}
                  className={[
                    'flex w-full items-center gap-3 border-b border-line/70 px-4 py-3 text-left',
                    selected ? 'bg-white' : 'hover:bg-white/70',
                  ].join(' ')}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-medium text-gold">
                    {initials(boarder.full_name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{boarder.full_name}</span>
                    <span className="block truncate text-xs text-muted">
                      {boarder.room ? `Room ${boarder.room}` : 'No room'}
                      {conversation ? ' · thread open' : ''}
                    </span>
                  </span>
                </button>
              )
            })}
            {visibleBoarders.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted">No boarders to message yet.</p>
            ) : null}
          </div>
        </aside>
      )}

      <section className="flex min-h-[24rem] flex-col bg-[linear-gradient(180deg,#fffdf8_0%,#ffffff_38%)]">
        {active ? (
          <>
            <header className="flex items-center gap-3 border-b border-line px-5 py-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-sm text-gold">
                {initials(activeName)}
              </span>
              <div>
                <p className="font-medium">{activeName}</p>
                <p className="text-xs text-muted">
                  {rooms[active.tenant_id] ? `Room ${rooms[active.tenant_id]} · ` : ''}
                  Direct message with administration
                </p>
              </div>
            </header>
            <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5">
              {messages.length === 0 ? (
                <p className="text-center text-sm text-muted">No messages yet. Start the conversation.</p>
              ) : null}
              {messages.map((message) => {
                const mine = message.sender_id === userId
                return (
                  <div key={message.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
                    <div className={mine ? 'max-w-[80%] text-right' : 'max-w-[80%]'}>
                      <p
                        className={[
                          'inline-block rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                          mine ? 'rounded-br-md bg-ink text-white' : 'rounded-bl-md border border-line bg-white text-ink',
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
              className="border-t border-line bg-white p-4"
              onSubmit={(event) => {
                event.preventDefault()
                void onSend()
              }}
            >
              <div className="flex items-end gap-2">
                <textarea
                  value={body}
                  rows={2}
                  onChange={(event) => setBody(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void onSend()
                    }
                  }}
                  placeholder="Write a message"
                  className="min-h-12 flex-1 resize-none rounded-xl border border-line px-4 py-3 text-sm"
                />
                <Button type="submit" disabled={sending || !body.trim()}>
                  <Send className="h-4 w-4" />
                  Send
                </Button>
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
    </div>
  )
}
