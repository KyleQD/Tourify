interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
}

export class SMSDeliveryService {
  private static twilioClient: any = null

  private static getClient() {
    if (this.twilioClient) return this.twilioClient

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (!accountSid || !authToken) return null

    try {
      const twilio = require('twilio')
      this.twilioClient = twilio(accountSid, authToken)
      return this.twilioClient
    } catch {
      console.warn('Twilio SDK not available')
      return null
    }
  }

  static async sendSMS({ to, body }: { to: string; body: string }): Promise<SMSResult> {
    const client = this.getClient()
    if (!client) {
      console.warn('[SMS] Twilio not configured, skipping SMS delivery')
      return { success: false, error: 'SMS not configured' }
    }

    const fromNumber = process.env.TWILIO_PHONE_NUMBER
    if (!fromNumber) {
      return { success: false, error: 'TWILIO_PHONE_NUMBER not set' }
    }

    try {
      const message = await client.messages.create({
        body,
        from: fromNumber,
        to,
      })
      return { success: true, messageId: message.sid }
    } catch (error: any) {
      console.error('[SMS] Failed to send:', error.message)
      return { success: false, error: error.message }
    }
  }

  static async sendVerificationCode({ to, code }: { to: string; code: string }): Promise<SMSResult> {
    return this.sendSMS({
      to,
      body: `Your Tourify verification code is: ${code}. This code expires in 10 minutes.`,
    })
  }

  static async sendNotification({ to, message }: { to: string; message: string }): Promise<SMSResult> {
    return this.sendSMS({ to, body: message })
  }
}
