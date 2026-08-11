export type PersonalCalendarSource = "assignment" | "ticket" | "booking"

export interface PersonalCalendarItem {
  id: string
  source: PersonalCalendarSource
  sourceId: string
  eventId: string | null
  title: string
  subtitle: string | null
  startAt: string
  endAt: string | null
  href: string
  status: string
  conflictIds: string[]
}

export interface PersonalCalendarPayload {
  items: PersonalCalendarItem[]
  sources: Record<PersonalCalendarSource, "ready" | "unavailable">
  partial: boolean
  generatedAt: string
}

function timestamp(value: string | null): number | null {
  if (!value) return null
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? null : parsed
}

export function addCalendarConflicts(
  input: PersonalCalendarItem[],
): PersonalCalendarItem[] {
  return input.map((item) => {
    const start = timestamp(item.startAt)
    const end = timestamp(item.endAt) ?? start
    if (start === null || end === null) return { ...item, conflictIds: [] }

    const conflictIds = input
      .filter((candidate) => candidate.id !== item.id)
      .filter((candidate) => {
        const candidateStart = timestamp(candidate.startAt)
        const candidateEnd = timestamp(candidate.endAt) ?? candidateStart
        return (
          candidateStart !== null &&
          candidateEnd !== null &&
          start < candidateEnd &&
          candidateStart < end
        )
      })
      .map((candidate) => candidate.id)

    return { ...item, conflictIds }
  })
}

