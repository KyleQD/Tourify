export function getEventTypeBadgeColor(type: string | null | undefined) {
  const normalized = (type || "").toLowerCase()
  if (normalized === "performance") return "bg-purple-600"
  if (normalized === "meeting") return "bg-blue-600"
  if (normalized === "recording") return "bg-green-600"
  if (normalized === "media") return "bg-amber-600"
  return "bg-gray-600"
}

export function getEventTypeLabel(type: string | null | undefined) {
  const normalized = (type || "").toLowerCase()
  if (normalized === "performance") return "Performance"
  if (normalized === "meeting") return "Meeting"
  if (normalized === "recording") return "Recording"
  if (normalized === "media") return "Media"
  return "Other"
}

export function isSameCalendarDay(firstDateLike: string | Date, secondDateLike: string | Date) {
  const first = new Date(firstDateLike)
  const second = new Date(secondDateLike)
  return (
    first.getDate() === second.getDate() &&
    first.getMonth() === second.getMonth() &&
    first.getFullYear() === second.getFullYear()
  )
}
