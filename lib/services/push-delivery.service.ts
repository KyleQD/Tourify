interface PushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
}

interface PushTicket {
  id?: string
  status: 'ok' | 'error'
  message?: string
  details?: Record<string, unknown>
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export async function sendPushNotification(
  message: PushMessage
): Promise<{ success: boolean; ticket?: PushTicket; error?: string }> {
  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: message.to,
        sound: 'default',
        title: message.title,
        body: message.body,
        data: message.data ?? {},
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return { success: false, error: result.errors?.[0]?.message ?? 'Expo push request failed' }
    }

    const ticket: PushTicket = result.data?.[0] ?? result.data
    return ticket?.status === 'ok'
      ? { success: true, ticket }
      : { success: false, ticket, error: ticket?.message ?? 'Push delivery failed' }
  } catch (err) {
    const message_ = err instanceof Error ? err.message : 'Unknown error sending push notification'
    return { success: false, error: message_ }
  }
}

export async function sendPushNotificationBatch(
  messages: PushMessage[]
): Promise<{ success: boolean; tickets?: PushTicket[]; error?: string }> {
  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        messages.map((m) => ({
          to: m.to,
          sound: 'default',
          title: m.title,
          body: m.body,
          data: m.data ?? {},
        }))
      ),
    })

    const result = await response.json()

    if (!response.ok) {
      return { success: false, error: result.errors?.[0]?.message ?? 'Expo push batch request failed' }
    }

    const tickets: PushTicket[] = result.data
    const allOk = tickets.every((t) => t.status === 'ok')
    return { success: allOk, tickets }
  } catch (err) {
    const message_ = err instanceof Error ? err.message : 'Unknown error sending push batch'
    return { success: false, error: message_ }
  }
}
