// VEN-041 — shared event form contract for Venue event creation/editing.
// Lives here (not inside any modal) so server actions and UI components can
// share one type without importing modal implementations.

export interface EventFormData {
  id?: number
  title: string
  description: string
  date: Date
  startTime: string
  endTime: string
  type: string
  status: string
  capacity: number
  ticketPrice: number
  isPublic: boolean
  attendance?: number
}
