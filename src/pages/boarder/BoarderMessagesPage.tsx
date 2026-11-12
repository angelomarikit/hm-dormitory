import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/contexts/AuthContext'
import { useSite } from '@/contexts/SiteContext'
import { useBoarderTenant } from '@/hooks/useBoarderTenant'
import { fetchMessages, fetchOrCreateConversation, sendMessage } from '@/services/commsService'
import { formatDateTime } from '@/utils/format'
import type { Conversation, Message } from '@/types/ops'

export default function BoarderMessagesPage() {
  const { siteId } = useSite()
  const { user } = useAuth()
  const { tenant } = useBoarderTenant()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')

  useEffect(() => {
    if (!siteId || !tenant) return
    void fetchOrCreateConversation(siteId, tenant.id).then(async (row) => {
      setConversation(row)
      setMessages(await fetchMessages(row.id))
    }).catch(() => setConversation(null))
  }, [siteId, tenant])

  return (
    <div>
      <h1 className="font-display text-3xl">Messages</h1>
      <div className="mt-6 max-w-xl rounded-xl border border-line bg-white p-4">
        <div className="max-h-96 space-y-3 overflow-y-auto">
          {messages.map((message) => (
            <div key={message.id} className={message.sender_id === user?.id ? 'text-right' : ''}>
              <p className="inline-block rounded-lg bg-paper-2 px-3 py-2 text-sm">{message.body}</p>
              <p className="mt-1 text-xs text-muted">{formatDateTime(message.created_at)}</p>
            </div>
          ))}
        </div>
        <Textarea className="mt-4" label="Message" value={body} onChange={(e) => setBody(e.target.value)} />
        <Button
          className="mt-3"
          disabled={!conversation || !user || !siteId}
          onClick={async () => {
            if (!conversation || !user || !siteId || !body.trim()) return
            await sendMessage({ conversationId: conversation.id, siteId, senderId: user.id, body })
            setBody('')
            setMessages(await fetchMessages(conversation.id))
          }}
        >
          Send
        </Button>
      </div>
    </div>
  )
}
