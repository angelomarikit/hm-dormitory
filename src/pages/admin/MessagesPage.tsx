import { useEffect, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/contexts/AuthContext'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { fetchConversations, fetchMessages, sendMessage } from '@/services/commsService'
import { fetchAllTenants } from '@/services/tenantService'
import { formatDateTime } from '@/utils/format'
import { toUserMessage } from '@/lib/errors'
import type { Conversation, Message } from '@/types/ops'

export default function MessagesPage() {
  const { siteId } = useSite()
  const { user } = useAuth()
  const toast = useToast()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [active, setActive] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')

  useEffect(() => {
    if (!siteId) return
    void Promise.all([fetchConversations(siteId), fetchAllTenants(siteId)])
      .then(([list, tenants]) => {
        setConversations(list)
        setNames(Object.fromEntries(tenants.map((t) => [t.id, t.full_name])))
      })
      .catch((error) => toast.error(toUserMessage(error, 'Unable to load messages.')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  useEffect(() => {
    if (!active) return
    void fetchMessages(active.id).then(setMessages)
  }, [active])

  return (
    <div>
      <AdminPageHeader title="Messages" description="Reply to boarder conversations." />
      <div className="mt-6 grid gap-4 lg:grid-cols-[16rem_1fr]">
        <aside className="rounded-xl border border-line bg-white">
          {conversations.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`block w-full border-b border-line px-4 py-3 text-left text-sm ${active?.id === item.id ? 'bg-paper-2' : ''}`}
              onClick={() => setActive(item)}
            >
              {names[item.tenant_id] ?? 'Boarder'}
            </button>
          ))}
        </aside>
        <section className="rounded-xl border border-line bg-white p-4">
          {active && user ? (
            <>
              <div className="max-h-96 space-y-3 overflow-y-auto">
                {messages.map((message) => (
                  <div key={message.id} className={message.sender_id === user.id ? 'text-right' : ''}>
                    <p className="inline-block rounded-lg bg-paper-2 px-3 py-2 text-sm">{message.body}</p>
                    <p className="mt-1 text-xs text-muted">{formatDateTime(message.created_at)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Textarea label="Reply" value={body} onChange={(e) => setBody(e.target.value)} />
              </div>
              <Button
                className="mt-2"
                onClick={async () => {
                  if (!siteId || !body.trim()) return
                  await sendMessage({ conversationId: active.id, siteId, senderId: user.id, body })
                  setBody('')
                  setMessages(await fetchMessages(active.id))
                }}
              >
                Send
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted">Select a conversation.</p>
          )}
        </section>
      </div>
    </div>
  )
}
