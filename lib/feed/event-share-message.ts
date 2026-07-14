import {
  buildEventSharePreview,
  type EventSharePreview,
} from "@/lib/feed/event-share-preview"

export interface EventShareMessagePayload {
  content: string
  taskCard: {
    title: string
    description: string
    action_url: string
    action_label: string
  }
  preview: EventSharePreview
}

function resolveAppOrigin(origin?: string | null) {
  const explicit = (origin || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "")
    .trim()
    .replace(/\/$/, "")
  if (explicit) {
    if (/^https?:\/\//i.test(explicit)) return explicit
    return `https://${explicit}`
  }
  return ""
}

export function buildEventShareMessagePayload({
  event,
  note,
  origin,
}: {
  event: Parameters<typeof buildEventSharePreview>[0]
  note?: string | null
  origin?: string | null
}): EventShareMessagePayload {
  const preview = buildEventSharePreview(event)
  const appOrigin = resolveAppOrigin(origin)
  const absoluteUrl = appOrigin ? `${appOrigin}${preview.url}` : preview.url
  const trimmedNote = typeof note === "string" ? note.trim() : ""
  const locationBits = [preview.venueName, preview.location, preview.eventDate].filter(Boolean)
  const description = locationBits.length > 0
    ? locationBits.join(" · ")
    : "Shared from Tourify"

  const content = trimmedNote
    ? `${trimmedNote}\n\nCheck out ${preview.title}: ${absoluteUrl}`
    : `Check out ${preview.title}: ${absoluteUrl}`

  return {
    content,
    taskCard: {
      title: preview.title,
      description,
      action_url: absoluteUrl,
      action_label: "View event",
    },
    preview,
  }
}

export function encodeTaskCardMessage(taskCard: EventShareMessagePayload["taskCard"]) {
  return `[TASK:${JSON.stringify({
    title: taskCard.title,
    description: taskCard.description || "",
    action_url: taskCard.action_url,
    action_label: taskCard.action_label || "Go to Task",
    is_sensitive: false,
  })}]`
}
