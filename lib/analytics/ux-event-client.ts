interface UxEventInput {
  eventName: string
  surface: string
  metadata?: Record<string, unknown>
}

interface UxMetricPayload {
  name: string
  value: number
  surface: string
  metadata?: Record<string, unknown>
  sessionId: string
  eventType: "ux_event"
}

function getSessionId(): string {
  if (typeof window === "undefined") return "server"
  const storageKey = "tourify-ux-session-id"
  const existingId = window.sessionStorage.getItem(storageKey)
  if (existingId) return existingId
  const createdId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  window.sessionStorage.setItem(storageKey, createdId)
  return createdId
}

export async function trackDashboardUxEvent({ eventName, surface, metadata }: UxEventInput) {
  if (typeof window === "undefined") return
  try {
    const payload: UxMetricPayload = {
      name: eventName,
      value: 1,
      surface,
      metadata,
      sessionId: getSessionId(),
      eventType: "ux_event",
    }

    await fetch("/api/analytics/metrics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ metrics: [payload] }),
      keepalive: true,
    })
  } catch (error) {
    console.error("[ux-event] tracking failed", error)
  }
}
