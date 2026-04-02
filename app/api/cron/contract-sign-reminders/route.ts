import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  pickReminderDay,
  sendContractReminderEmailForCron,
  type ContractReminderDay,
} from "@/lib/services/contract-email.service"
import { isAuthorizedCronRequest, unauthorizedResponse } from "@/lib/auth/route-guards"

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function runReminders() {
  const admin = getAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 })
  }

  const { data: rows, error } = await admin
    .from("artist_contracts")
    .select("id,sent_at,metadata,status")
    .eq("status", "sent")

  if (error) {
    console.error("[cron contract reminders]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const now = new Date()
  let processed = 0
  let sent = 0
  const failures: string[] = []

  for (const r of rows || []) {
    if (!r.sent_at) continue
    const meta = (r.metadata || {}) as {
      signatures?: { counterparty?: unknown }
      email_reminders?: Record<string, string>
    }
    if (meta.signatures?.counterparty) continue

    const day = pickReminderDay(r.sent_at, now, meta.email_reminders)
    if (!day) continue

    processed++
    const result = await sendContractReminderEmailForCron({
      contractId: r.id as string,
      day: day as ContractReminderDay,
    })
    if (result.ok) sent++
    else if (result.error !== "Already reminded" && result.error !== "Already signed")
      failures.push(`${r.id}: ${result.error}`)
  }

  return NextResponse.json({
    ok: true,
    candidates: processed,
    remindersSent: sent,
    failures: failures.slice(0, 20),
  })
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedResponse()
  return runReminders()
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedResponse()
  return runReminders()
}
