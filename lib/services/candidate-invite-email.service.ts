import { Resend } from "resend"

/**
 * ADM-M-014 — candidate invite delivery.
 *
 * Previously the invite endpoints returned a raw invitation token to the admin
 * UI and relied on manual copy/paste. This service sends the actual invite
 * email via Resend (same provider as contracts), records delivery status on
 * the candidate row, and degrades gracefully when RESEND_API_KEY is absent so
 * non-production environments keep working with link copy/paste.
 */

export interface CandidateInvitePayload {
  to: string
  candidateName: string
  position: string
  organizationName: string
  inviteUrl: string
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

export function buildCandidateInviteEmailHtml(payload: CandidateInvitePayload): string {
  return `<!doctype html>
<html>
  <body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0b1220;color:#e2e8f0;margin:0;padding:32px">
    <div style="max-width:520px;margin:0 auto;background:#111a2e;border:1px solid #24314f;border-radius:12px;padding:28px">
      <h1 style="margin:0 0 8px;font-size:20px">You're invited to join ${escapeHtml(payload.organizationName)}</h1>
      <p style="margin:0 0 16px;color:#94a3b8">Position: <strong style="color:#e2e8f0">${escapeHtml(payload.position)}</strong></p>
      <p style="margin:0 0 24px;color:#94a3b8">
        Hi ${escapeHtml(payload.candidateName)}, you've been invited to complete onboarding.
        Use the secure link below — it is personal to you and should not be shared.
      </p>
      <a href="${payload.inviteUrl}"
         style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">
        Start onboarding
      </a>
      <p style="margin:24px 0 0;color:#64748b;font-size:12px">
        If the button doesn't work, paste this URL into your browser:<br/>
        <span style="color:#94a3b8">${payload.inviteUrl}</span>
      </p>
    </div>
  </body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export type InviteDeliveryResult =
  | { delivered: true; providerId: string }
  | { delivered: false; reason: "email_provider_not_configured" }
  | { delivered: false; reason: "send_failed"; error: string }

export async function sendCandidateInviteEmail(
  payload: CandidateInvitePayload,
): Promise<InviteDeliveryResult> {
  const resend = getResend()
  if (!resend) {
    return { delivered: false, reason: "email_provider_not_configured" }
  }

  const from =
    process.env.INVITE_EMAIL_FROM ||
    process.env.CONTRACT_EMAIL_FROM ||
    "Tourify <onboarding@resend.dev>"

  try {
    const result = await resend.emails.send({
      from,
      to: payload.to,
      subject: `Onboarding invitation — ${payload.position} at ${payload.organizationName}`,
      html: buildCandidateInviteEmailHtml(payload),
    })

    if (result.error) {
      return { delivered: false, reason: "send_failed", error: result.error.message }
    }
    return { delivered: true, providerId: result.data?.id ?? "" }
  } catch (error) {
    return { delivered: false, reason: "send_failed", error: (error as Error).message }
  }
}
