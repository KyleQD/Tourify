/**
 * Canonical helpers for surfacing hiring events in the applicant's message
 * center. These post system messages from the hiring manager into the existing
 * `job_application` conversation so approved applicants see actionable threads
 * under /messages (Work tab), alongside their in-app notifications.
 *
 * All helpers use the service-role client (server-only, enforced by
 * createServiceRoleClient) and are non-blocking: callers wrap them so a
 * messaging failure never rolls back an approval.
 */
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export interface HiringThreadTaskCard {
  title: string
  description?: string
  actionUrl: string
  actionLabel?: string
  isSensitive?: boolean
}

interface EnsureConversationArgs {
  applicationId: string
  applicantUserId: string
  hiringManagerUserId: string
}

/**
 * Find or create the job-application conversation between an applicant and the
 * hiring manager. Returns the conversation id, or null when it cannot be
 * resolved (e.g. the two ids are identical or the insert fails).
 */
export async function ensureJobApplicationConversation({
  applicationId,
  applicantUserId,
  hiringManagerUserId,
}: EnsureConversationArgs): Promise<string | null> {
  if (!applicantUserId || !hiringManagerUserId || applicantUserId === hiringManagerUserId) return null

  const supabase = createServiceRoleClient()

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .or(
      `and(participant_1.eq.${applicantUserId},participant_2.eq.${hiringManagerUserId}),and(participant_1.eq.${hiringManagerUserId},participant_2.eq.${applicantUserId})`
    )
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const nowIso = new Date().toISOString()
  const { data: created, error } = await supabase
    .from("conversations")
    .insert({
      participant_1: hiringManagerUserId,
      participant_2: applicantUserId,
      trust_tier: "context",
      context_type: "job_application",
      context_id: applicationId,
      accepted_at: nowIso,
      accepted_by: hiringManagerUserId,
    })
    .select("id")
    .single()

  if (error || !created) {
    console.warn("[hiring-applicant-comms] Failed to create job-application conversation:", error)
    return null
  }

  return created.id as string
}

interface SendThreadMessageArgs {
  conversationId: string
  senderId: string
  content: string
  taskCard?: HiringThreadTaskCard | null
}

function encodeTaskCard(taskCard: HiringThreadTaskCard): string {
  return `[TASK:${JSON.stringify({
    title: taskCard.title,
    description: taskCard.description ?? "",
    action_url: taskCard.actionUrl,
    action_label: taskCard.actionLabel ?? "Go to Task",
    is_sensitive: taskCard.isSensitive ?? false,
  })}]`
}

/**
 * Insert a system message into a hiring conversation and bump the conversation's
 * last-message pointer so it surfaces at the top of the Work tab.
 */
export async function sendApplicantHiringThreadMessage({
  conversationId,
  senderId,
  content,
  taskCard,
}: SendThreadMessageArgs): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const messageContent = taskCard ? encodeTaskCard(taskCard) : content

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: messageContent,
    })
    .select("id")
    .single()

  if (error || !message) {
    console.warn("[hiring-applicant-comms] Failed to insert hiring thread message:", error)
    return false
  }

  await supabase
    .from("conversations")
    .update({ last_message_id: message.id, updated_at: new Date().toISOString() })
    .eq("id", conversationId)

  return true
}

export interface PostApplicantHiringMessageArgs {
  applicationId: string
  applicantUserId: string
  hiringManagerUserId: string
  content: string
  taskCard?: HiringThreadTaskCard | null
}

/**
 * Ensure the job-application conversation exists, then post a hiring-manager
 * message into it. Returns the conversation id when the message was delivered.
 */
export async function postApplicantHiringMessage(
  args: PostApplicantHiringMessageArgs
): Promise<{ conversationId: string | null; delivered: boolean }> {
  try {
    const conversationId = await ensureJobApplicationConversation({
      applicationId: args.applicationId,
      applicantUserId: args.applicantUserId,
      hiringManagerUserId: args.hiringManagerUserId,
    })
    if (!conversationId) return { conversationId: null, delivered: false }

    const delivered = await sendApplicantHiringThreadMessage({
      conversationId,
      senderId: args.hiringManagerUserId,
      content: args.content,
      taskCard: args.taskCard ?? null,
    })

    return { conversationId, delivered }
  } catch (err) {
    console.warn("[hiring-applicant-comms] Failed to post hiring message:", err)
    return { conversationId: null, delivered: false }
  }
}
