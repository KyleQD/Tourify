import { Resend } from 'resend'

// =============================================================================
// TYPES
// =============================================================================

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export interface EmailResult {
  success: boolean
  id?: string
  error?: string
}

export interface BatchEmailResult {
  success: boolean
  results: EmailResult[]
  successCount: number
  failureCount: number
}

// =============================================================================
// CLIENT
// =============================================================================

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || 'Tourify <noreply@tourify.app>'
}

// =============================================================================
// EMAIL DELIVERY SERVICE
// =============================================================================

export class EmailDeliveryService {
  /**
   * Send a single notification email via Resend.
   */
  static async sendNotificationEmail(params: SendEmailParams): Promise<EmailResult> {
    const resend = getResendClient()
    if (!resend) {
      console.warn('[email-delivery] RESEND_API_KEY not set — email skipped')
      return { success: false, error: 'Email not configured' }
    }

    try {
      const { data, error } = await resend.emails.send({
        from: getFromAddress(),
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
        ...(params.text ? { text: params.text } : {}),
      })

      if (error) {
        console.error('[email-delivery] send failed:', error)
        return { success: false, error: error.message || 'Resend error' }
      }

      return { success: true, id: data?.id }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown email error'
      console.error('[email-delivery] unexpected error:', message)
      return { success: false, error: message }
    }
  }

  /**
   * Send a batch of emails via Resend's batch API.
   */
  static async sendBatchEmails(emails: SendEmailParams[]): Promise<BatchEmailResult> {
    if (emails.length === 0) {
      return { success: true, results: [], successCount: 0, failureCount: 0 }
    }

    const resend = getResendClient()
    if (!resend) {
      console.warn('[email-delivery] RESEND_API_KEY not set — batch email skipped')
      const results = emails.map(() => ({
        success: false as const,
        error: 'Email not configured',
      }))
      return { success: false, results, successCount: 0, failureCount: emails.length }
    }

    const from = getFromAddress()

    try {
      const { data, error } = await resend.batch.send(
        emails.map((e) => ({
          from,
          to: Array.isArray(e.to) ? e.to : [e.to],
          subject: e.subject,
          html: e.html,
          ...(e.text ? { text: e.text } : {}),
        }))
      )

      if (error) {
        console.error('[email-delivery] batch send failed:', error)
        const results = emails.map(() => ({
          success: false as const,
          error: error.message || 'Resend batch error',
        }))
        return { success: false, results, successCount: 0, failureCount: emails.length }
      }

      const ids: Array<{ id: string }> = data?.data ?? []
      const results: EmailResult[] = ids.map((item) => ({
        success: true,
        id: item.id,
      }))

      return {
        success: true,
        results,
        successCount: results.length,
        failureCount: 0,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown batch email error'
      console.error('[email-delivery] unexpected batch error:', message)
      const results = emails.map(() => ({
        success: false as const,
        error: message,
      }))
      return { success: false, results, successCount: 0, failureCount: emails.length }
    }
  }
}
