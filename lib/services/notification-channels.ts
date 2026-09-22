import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export interface NotificationChannelResult {
  success: boolean
  error?: string
  providerId?: string
  providerRef?: string
}

export async function sendEmailNotification(params: {
  to: string
  subject: string
  body: string
  fromName?: string
}): Promise<NotificationChannelResult> {
  if (!resend) return { success: false, error: 'Email not configured' }
  try {
    const result = await resend.emails.send({
      from: `${params.fromName || 'Tourify'} <notifications@tourify.app>`,
      to: params.to,
      subject: params.subject,
      html: params.body,
    })
    if (result.error) return { success: false, error: result.error.message }
    return {
      success: true,
      providerId: 'resend',
      providerRef: result.data?.id,
    }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function sendSMSNotification(params: {
  to: string
  body: string
}): Promise<NotificationChannelResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: 'SMS not configured' }
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: params.to,
          From: fromNumber,
          Body: params.body,
        }),
      }
    )
    if (!response.ok) {
      const err = await response.json() as { message?: string }
      return { success: false, error: err.message || 'SMS send failed' }
    }
    const receipt = await response.json() as { sid?: string }
    return {
      success: true,
      providerId: 'twilio',
      providerRef: receipt.sid,
    }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function sendPushNotification(params: {
  pushToken: string
  title: string
  body: string
  data?: Record<string, string>
}): Promise<NotificationChannelResult> {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: params.pushToken,
        title: params.title,
        body: params.body,
        data: params.data,
        sound: 'default',
      }),
    })
    if (!response.ok) return { success: false, error: 'Push send failed' }
    const payload = await response.json() as {
      data?: { id?: string; status?: string; message?: string } | Array<{
        id?: string
        status?: string
        message?: string
      }>
    }
    const ticket = Array.isArray(payload.data) ? payload.data[0] : payload.data
    if (ticket?.status === 'error') {
      return { success: false, error: ticket.message || 'Push provider rejected message' }
    }
    return {
      success: true,
      providerId: 'expo',
      providerRef: ticket?.id,
    }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
