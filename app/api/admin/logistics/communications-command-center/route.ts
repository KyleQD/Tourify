import { NextRequest, NextResponse } from "next/server"

import { resolveAuthorizedOrgLogisticsScope } from "@/lib/admin/resolve-authorized-org"
import { withAdminCapability } from "@/lib/auth/api-auth"

type SupabaseClientLike = {
  from: (table: string) => any
}

interface FeedItem {
  id: string
  source: "group_thread" | "event_bulletin" | "event_channel" | "event_task" | "external_event"
  title: string
  summary: string | null
  priority: string | null
  status: string | null
  eventId: string | null
  actionUrl: string | null
  lastActivity: string | null
}

interface CountResult {
  count: number
  warning?: string
}

async function safeCount(query: any, label: string): Promise<CountResult> {
  const { count, error } = await query
  if (error) {
    return { count: 0, warning: `${label}: ${error.message}` }
  }
  return { count: count ?? 0 }
}

async function getTourEventIds(args: {
  supabase: SupabaseClientLike
  tourId: string | null
  fallbackEventIds: string[]
}): Promise<string[]> {
  if (!args.tourId) return args.fallbackEventIds

  const { data, error } = await args.supabase
    .from("tour_events")
    .select("event_id")
    .eq("tour_id", args.tourId)

  if (error || !data) return []

  return (data as Array<{ event_id?: string | null }>)
    .map((row) => row.event_id)
    .filter((id): id is string => Boolean(id))
}

function applyEventScope(query: any, eventIds: string[], eventId: string | null) {
  if (eventId) return query.eq("event_id", eventId)
  if (eventIds.length === 0) return query.eq("event_id", "00000000-0000-0000-0000-000000000000")
  return query.in("event_id", eventIds)
}

function normalizeLastMessage(raw: unknown): { content?: string | null; created_at?: string | null } | null {
  if (Array.isArray(raw)) return (raw[0] as { content?: string | null; created_at?: string | null }) ?? null
  if (raw && typeof raw === "object") return raw as { content?: string | null; created_at?: string | null }
  return null
}

export const GET = withAdminCapability(
  "logistics.view",
  async (request: NextRequest, { user, admin }) => {
    try {
      const eventId = request.nextUrl.searchParams.get("eventId") || request.nextUrl.searchParams.get("event_id")
      const tourId = request.nextUrl.searchParams.get("tourId") || request.nextUrl.searchParams.get("tour_id")
      const limit = Math.min(
        Math.max(Number(request.nextUrl.searchParams.get("limit") || "12") || 12, 1),
        50,
      )

      const scope = await resolveAuthorizedOrgLogisticsScope({
        userId: user.id,
        requestedOrgId: admin.orgId,
        eventId,
        tourId,
      })
      const supabase = scope.service as SupabaseClientLike
      const scopedEventIds = await getTourEventIds({
        supabase,
        tourId,
        fallbackEventIds: scope.eventIds,
      })
      const scopedTourIds = tourId ? [tourId] : scope.tourIds
      const warnings: string[] = []

      const [
        threadCount,
        bulletinCount,
        channelCount,
        taskMessageCount,
        ackPendingCount,
        externalEventCount,
      ] = await Promise.all([
        safeCount(
          (() => {
            let query = supabase
              .from("group_threads")
              .select("id", { count: "exact", head: true })
              .eq("thread_type", "logistics")
              .eq("context_type", "logistics")
            if (eventId) query = query.eq("context_id", eventId)
            else if (scopedEventIds.length > 0) query = query.in("context_id", scopedEventIds)
            else query = query.eq("context_id", "00000000-0000-0000-0000-000000000000")
            return query
          })(),
          "group_threads",
        ),
        safeCount(
          applyEventScope(
            supabase.from("event_bulletins").select("id", { count: "exact", head: true }),
            scopedEventIds,
            eventId,
          ),
          "event_bulletins",
        ),
        safeCount(
          applyEventScope(
            supabase.from("event_group_chats").select("id", { count: "exact", head: true }),
            scopedEventIds,
            eventId,
          ),
          "event_group_chats",
        ),
        safeCount(
          applyEventScope(
            supabase.from("event_task_messages").select("id", { count: "exact", head: true }),
            scopedEventIds,
            eventId,
          ),
          "event_task_messages",
        ),
        safeCount(
          (() => {
            let query = supabase
              .from("logistics_acknowledgements")
              .select("id", { count: "exact", head: true })
              .eq("status", "pending")
            if (eventId) query = query.eq("event_id", eventId)
            else if (tourId) query = query.eq("tour_id", tourId)
            else query = query.eq("org_id", scope.orgId)
            return query
          })(),
          "logistics_acknowledgements",
        ),
        safeCount(
          (() => {
            let query = supabase
              .from("communication_events")
              .select("id", { count: "exact", head: true })
              .eq("org_id", scope.orgId)
            if (eventId) query = query.eq("event_id", eventId)
            else if (tourId) query = query.eq("tour_id", tourId)
            return query
          })(),
          "communication_events",
        ),
      ])

      for (const result of [threadCount, bulletinCount, channelCount, taskMessageCount, ackPendingCount, externalEventCount]) {
        if (result.warning) warnings.push(result.warning)
      }

      const feedItems: FeedItem[] = []

      const { data: threads, error: threadsError } = await supabase
        .from("group_threads")
        .select(`
          id,
          name,
          updated_at,
          context_id,
          last_message:group_messages!last_message_id(content, created_at)
        `)
        .eq("thread_type", "logistics")
        .eq("context_type", "logistics")
        .in("context_id", eventId ? [eventId] : scopedEventIds.length > 0 ? scopedEventIds : ["00000000-0000-0000-0000-000000000000"])
        .order("updated_at", { ascending: false })
        .limit(limit)

      if (threadsError) warnings.push(`group_threads feed: ${threadsError.message}`)
      else {
        for (const thread of (threads ?? []) as Array<Record<string, any>>) {
          const lastMessage = normalizeLastMessage(thread.last_message)
          feedItems.push({
            id: String(thread.id),
            source: "group_thread",
            title: String(thread.name || "Team Comms"),
            summary: lastMessage?.content || null,
            priority: null,
            status: null,
            eventId: typeof thread.context_id === "string" ? thread.context_id : null,
            actionUrl: `/groups/${thread.id}`,
            lastActivity: lastMessage?.created_at || String(thread.updated_at || ""),
          })
        }
      }

      const { data: bulletins, error: bulletinsError } = await applyEventScope(
        supabase
          .from("event_bulletins")
          .select("id, event_id, title, content, priority, created_at, requires_acknowledgment"),
        scopedEventIds,
        eventId,
      )
        .order("created_at", { ascending: false })
        .limit(limit)

      if (bulletinsError) warnings.push(`event_bulletins feed: ${bulletinsError.message}`)
      else {
        for (const bulletin of (bulletins ?? []) as Array<Record<string, any>>) {
          feedItems.push({
            id: String(bulletin.id),
            source: "event_bulletin",
            title: String(bulletin.title || "Bulletin"),
            summary: typeof bulletin.content === "string" ? bulletin.content : null,
            priority: typeof bulletin.priority === "string" ? bulletin.priority : null,
            status: bulletin.requires_acknowledgment ? "ack_required" : null,
            eventId: typeof bulletin.event_id === "string" ? bulletin.event_id : null,
            actionUrl: bulletin.event_id
              ? `/admin/dashboard/events/${bulletin.event_id}?tab=communications`
              : null,
            lastActivity: String(bulletin.created_at || ""),
          })
        }
      }

      const { data: taskMessages, error: taskMessagesError } = await applyEventScope(
        supabase
          .from("event_task_messages")
          .select("id, event_id, title, description, priority, status, updated_at, created_at, action_url"),
        scopedEventIds,
        eventId,
      )
        .order("created_at", { ascending: false })
        .limit(limit)

      if (taskMessagesError) warnings.push(`event_task_messages feed: ${taskMessagesError.message}`)
      else {
        for (const task of (taskMessages ?? []) as Array<Record<string, any>>) {
          feedItems.push({
            id: String(task.id),
            source: "event_task",
            title: String(task.title || "Task message"),
            summary: typeof task.description === "string" ? task.description : null,
            priority: typeof task.priority === "string" ? task.priority : null,
            status: typeof task.status === "string" ? task.status : null,
            eventId: typeof task.event_id === "string" ? task.event_id : null,
            actionUrl: typeof task.action_url === "string" ? task.action_url : null,
            lastActivity: String(task.updated_at || task.created_at || ""),
          })
        }
      }

      feedItems.sort((a, b) => {
        const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0
        const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0
        return bTime - aTime
      })

      return NextResponse.json({
        success: true,
        scope: {
          orgId: scope.orgId,
          tourId,
          eventId,
          eventCount: scopedEventIds.length,
          tourCount: scopedTourIds.length,
        },
        summary: {
          nativeThreads: threadCount.count,
          bulletins: bulletinCount.count,
          eventChannels: channelCount.count,
          taskMessages: taskMessageCount.count,
          pendingAcknowledgements: ackPendingCount.count,
          externalEvents: externalEventCount.count,
        },
        feed: feedItems.slice(0, limit),
        providerStatus: {
          email: "not_configured",
          weather: "not_configured",
          whatsapp: "not_configured",
        },
        migrationWarnings: warnings,
        generatedAt: new Date().toISOString(),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Communications command center unavailable"
      const status = message.includes("not available") || message.includes("Organization is not available") ? 403 : 500
      console.error("[Communications Command Center]", error)
      return NextResponse.json({ success: false, error: message }, { status })
    }
  },
)
