import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function sendEmailNotification(params: {
  to: string
  subject: string
  body: string
  fromName?: string
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) return { success: false, error: 'Email not configured' }
  try {
    await resend.emails.send({
      from: `${params.fromName || 'Tourify'} <notifications@tourify.app>`,
      to: params.to,
      subject: params.subject,
      html: params.body,
    })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function sendSMSNotification(params: {
  to: string
  body: string
}): Promise<{ success: boolean; error?: string }> {
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
      const err = await response.json()
      return { success: false, error: err.message || 'SMS send failed' }
    }
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function sendPushNotification(params: {
  pushToken: string
  title: string
  body: string
  data?: Record<string, string>
}): Promise<{ success: boolean; error?: string }> {
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
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
