import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import {
  buildContractCompletedEmail,
  buildContractInviteEmail,
  buildContractReminderEmail,
} from "@/lib/email/contract-email-templates"

function getPublicOrigin() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
  if (explicit) return explicit
  const vercel = process.env.VERCEL_URL
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`
  return "http://localhost:3000"
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function getUserEmail(admin: NonNullable<ReturnType<typeof getServiceSupabase>>, userId: string) {
  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error || !data?.user?.email) return null
  return data.user.email
}

async function getProfileName(admin: NonNullable<ReturnType<typeof getServiceSupabase>>, userId: string) {
  const { data } = await admin.from("profiles").select("full_name, username, name").eq("id", userId).maybeSingle()
  const row = data as { full_name?: string | null; username?: string | null; name?: string | null } | null
  return row?.full_name?.trim() || row?.name?.trim() || row?.username?.trim() || "Tourify user"
}

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

function getFromAddress() {
  return (
    process.env.RESEND_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    "Tourify <onboarding@resend.dev>"
  )
}

export async function sendContractInviteEmail(args: { contractId: string }): Promise<{ ok: boolean; error?: string }> {
  const admin = getServiceSupabase()
  const resend = getResend()
  if (!admin) return { ok: false, error: "Server misconfigured (database)" }
  if (!resend) {
    console.warn("[contract-email] RESEND_API_KEY missing — invite email skipped")
    return { ok: false, error: "Email not configured" }
  }

  const { data: row, error } = await admin.from("artist_contracts").select("id,title,user_id,counterparty_user_id,status").eq("id", args.contractId).maybeSingle()
  if (error || !row || row.status !== "sent") return { ok: false, error: "Contract not found or not sent" }

  const cpId = row.counterparty_user_id as string | null
  const ownerId = row.user_id as string
  if (!cpId) return { ok: false, error: "No counterparty" }

  const [toEmail, senderName] = await Promise.all([getUserEmail(admin, cpId), getProfileName(admin, ownerId)])
  if (!toEmail) return { ok: false, error: "Counterparty email unavailable" }

  const origin = getPublicOrigin()
  const contractPath = `/contracts/${row.id}`
  const signUrl = `${origin}${contractPath}`
  const loginUrl = `${origin}/login?redirectTo=${encodeURIComponent(contractPath)}`

  const { subject, html } = buildContractInviteEmail({
    contractTitle: (row.title as string) || "Agreement",
    senderDisplayName: senderName,
    signUrl,
    loginUrl,
  })

  const { error: sendErr } = await resend.emails.send({
    from: getFromAddress(),
    to: toEmail,
    subject,
    html,
  })
  if (sendErr) {
    console.error("[contract-email] invite send failed", sendErr)
    return { ok: false, error: sendErr.message || "Resend error" }
  }
  return { ok: true }
}

export async function sendContractCompletionEmails(args: {
  contractId: string
}): Promise<{ ok: boolean; error?: string }> {
  const admin = getServiceSupabase()
  const resend = getResend()
  if (!admin) return { ok: false, error: "Server misconfigured (database)" }
  if (!resend) {
    console.warn("[contract-email] RESEND_API_KEY missing — completion emails skipped")
    return { ok: false, error: "Email not configured" }
  }

  const { data: row, error } = await admin
    .from("artist_contracts")
    .select("id,title,user_id,counterparty_user_id,status,metadata")
    .eq("id", args.contractId)
    .maybeSingle()
  if (error || !row || row.status !== "signed") return { ok: false, error: "Contract not fully signed" }

  const prevMeta = (row.metadata || {}) as Record<string, unknown> & { completion_emails_sent_at?: string }
  if (prevMeta.completion_emails_sent_at) return { ok: true }

  const ownerId = row.user_id as string
  const cpId = row.counterparty_user_id as string | null
  const origin = getPublicOrigin()
  const viewUrl = `${origin}/contracts/${row.id}`
  const title = (row.title as string) || "Agreement"

  const ownerEmail = await getUserEmail(admin, ownerId)
  const cpEmail = cpId ? await getUserEmail(admin, cpId) : null

  let anySent = false
  if (ownerEmail) {
    const { subject, html } = buildContractCompletedEmail({
      contractTitle: title,
      viewUrl,
      recipientRole: "owner",
    })
    const { error: e1 } = await resend.emails.send({ from: getFromAddress(), to: ownerEmail, subject, html })
    if (e1) console.error("[contract-email] owner completion failed", e1)
    else anySent = true
  }
  if (cpEmail) {
    const { subject, html } = buildContractCompletedEmail({
      contractTitle: title,
      viewUrl,
      recipientRole: "counterparty",
    })
    const { error: e2 } = await resend.emails.send({ from: getFromAddress(), to: cpEmail, subject, html })
    if (e2) console.error("[contract-email] counterparty completion failed", e2)
    else anySent = true
  }

  if (!ownerEmail && !cpEmail) return { ok: false, error: "No recipient emails" }

  if (anySent) {
    const nextMeta: Record<string, unknown> = {
      ...prevMeta,
      completion_emails_sent_at: new Date().toISOString(),
    }
    await admin
      .from("artist_contracts")
      .update({ metadata: nextMeta, updated_at: new Date().toISOString() })
      .eq("id", row.id)
  }

  return { ok: anySent }
}

export type ContractReminderDay = "day1" | "day3" | "day5"

export async function sendContractReminderEmailForCron(args: {
  contractId: string
  day: ContractReminderDay
}): Promise<{ ok: boolean; error?: string }> {
  const admin = getServiceSupabase()
  const resend = getResend()
  if (!admin || !resend) return { ok: false, error: "Not configured" }

  const { data: row, error } = await admin
    .from("artist_contracts")
    .select("id,title,user_id,counterparty_user_id,status,sent_at,metadata")
    .eq("id", args.contractId)
    .maybeSingle()
  if (error || !row || row.status !== "sent" || !row.sent_at) return { ok: false, error: "Invalid row" }

  const meta = (row.metadata || {}) as {
    signatures?: { counterparty?: unknown }
    email_reminders?: Record<string, string>
  }
  if (meta.signatures?.counterparty) return { ok: false, error: "Already signed" }

  const cpId = row.counterparty_user_id as string | null
  if (!cpId) return { ok: false, error: "No counterparty" }

  const reminderKey =
    args.day === "day1" ? "day1_sent_at" : args.day === "day3" ? "day3_sent_at" : "day5_sent_at"
  if (meta.email_reminders?.[reminderKey]) return { ok: false, error: "Already reminded" }

  const toEmail = await getUserEmail(admin, cpId)
  if (!toEmail) return { ok: false, error: "No email" }

  const senderName = await getProfileName(admin, row.user_id as string)
  const origin = getPublicOrigin()
  const contractPath = `/contracts/${row.id}`
  const signUrl = `${origin}${contractPath}`

  const label =
    args.day === "day1" ? "1-day reminder" : args.day === "day3" ? "3-day reminder" : "5-day reminder"

  const { subject, html } = buildContractReminderEmail({
    contractTitle: (row.title as string) || "Agreement",
    senderDisplayName: senderName,
    signUrl,
    reminderLabel: label,
  })

  const { error: sendErr } = await resend.emails.send({
    from: getFromAddress(),
    to: toEmail,
    subject,
    html,
  })
  if (sendErr) {
    console.error("[contract-email] reminder failed", sendErr)
    return { ok: false, error: sendErr.message }
  }

  const nextReminders = { ...(meta.email_reminders || {}), [reminderKey]: new Date().toISOString() }
  const nextMeta = { ...meta, email_reminders: nextReminders }
  await admin.from("artist_contracts").update({ metadata: nextMeta, updated_at: new Date().toISOString() }).eq("id", row.id)

  return { ok: true }
}

export interface ContractReminderCandidate {
  id: string
  sent_at: string
  metadata: Record<string, unknown> | null
}

/** Eligible: status sent, counterparty unsigned, past threshold, reminder not yet logged */
export function pickReminderDay(
  sentAtIso: string,
  now: Date,
  reminders: Record<string, string | undefined> | undefined
): ContractReminderDay | null {
  const sent = new Date(sentAtIso).getTime()
  const ms = now.getTime() - sent
  const dayMs = 24 * 60 * 60 * 1000
  if (ms < dayMs) return null
  if (!reminders?.day1_sent_at) return "day1"
  if (ms >= 3 * dayMs && !reminders.day3_sent_at) return "day3"
  if (ms >= 5 * dayMs && !reminders.day5_sent_at) return "day5"
  return null
}
