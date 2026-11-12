import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/errors'
import type {
  ActivityLog,
  AppNotification,
  Conversation,
  MaintenanceRequest,
  Message,
  Notice,
} from '@/types/ops'

export async function fetchNotices(siteId: string): Promise<Notice[]> {
  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
  return throwIfError(data as Notice[] | null, error, 'Unable to load notices.')
}

export async function publishNotice(
  siteId: string,
  input: { title: string; body: string; category: string; priority: string; audience: string; room_id?: string | null },
) {
  const { data, error } = await supabase
    .from('notices')
    .insert({
      site_id: siteId,
      ...input,
      published_at: new Date().toISOString(),
    })
    .select('*')
    .single()
  return throwIfError(data as Notice | null, error, 'Unable to publish notice.')
}

export async function fetchOrCreateConversation(siteId: string, tenantId: string): Promise<Conversation> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('site_id', siteId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (existing) return existing as Conversation

  const { data, error } = await supabase
    .from('conversations')
    .insert({ site_id: siteId, tenant_id: tenantId })
    .select('*')
    .single()
  return throwIfError(data as Conversation | null, error, 'Unable to open conversation.')
}

export async function fetchConversations(siteId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('site_id', siteId)
    .order('updated_at', { ascending: false })
  return throwIfError(data as Conversation[] | null, error, 'Unable to load messages.')
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  return throwIfError(data as Message[] | null, error, 'Unable to load messages.')
}

export async function sendMessage(input: {
  conversationId: string
  siteId: string
  senderId: string
  body: string
}) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: input.conversationId,
      site_id: input.siteId,
      sender_id: input.senderId,
      body: input.body.trim(),
      client_key: crypto.randomUUID(),
    })
    .select('*')
    .single()
  return throwIfError(data as Message | null, error, 'Unable to send message.')
}

export async function fetchMaintenance(siteId: string): Promise<MaintenanceRequest[]> {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
  return throwIfError(data as MaintenanceRequest[] | null, error, 'Unable to load maintenance.')
}

export async function createMaintenance(input: {
  siteId: string
  tenantId: string
  roomId: string | null
  title: string
  details: string
}) {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .insert({
      site_id: input.siteId,
      tenant_id: input.tenantId,
      room_id: input.roomId,
      title: input.title.trim(),
      details: input.details.trim() || null,
    })
    .select('*')
    .single()
  return throwIfError(data as MaintenanceRequest | null, error, 'Unable to submit request.')
}

export async function setMaintenanceStatus(id: string, siteId: string, status: string) {
  const { error } = await supabase
    .from('maintenance_requests')
    .update({ status })
    .eq('id', id)
    .eq('site_id', siteId)
  if (error) throw new Error('Unable to update request.')
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)
  return throwIfError(data as AppNotification[] | null, error, 'Unable to load notifications.')
}

export async function fetchActivityLogs(siteId: string): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
    .limit(100)
  return throwIfError(data as ActivityLog[] | null, error, 'Unable to load activity.')
}

export async function logActivity(
  siteId: string,
  action: string,
  entityType: string,
  entityId: string,
  detail: string,
) {
  await supabase.rpc('log_activity', {
    p_site_id: siteId,
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_detail: detail,
  })
}
