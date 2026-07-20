export type LogisticsTaskSourceType =
  | 'transport_segment'
  | 'flight'
  | 'lodging_booking'
  | 'equipment_reservation'
  | 'backline_requirement'
  | 'catering_service'
  | 'comms_plan'
  | 'site_map_version'
  | 'logistics_item'

export interface LogisticsTaskCreateInput {
  eventId?: string | null
  tourId?: string | null
  type: string
  title: string
  description?: string | null
  status?: string
  priority?: string
  assignedToUserId?: string | null
  dueDate?: string | null
  budget?: number | null
  notes?: string | null
  createdBy: string
  sourceType?: LogisticsTaskSourceType | null
  sourceId?: string | null
}

export function buildLogisticsTaskInsert(input: LogisticsTaskCreateInput) {
  return {
    event_id: input.eventId || null,
    tour_id: input.tourId || null,
    type: input.type,
    title: input.title,
    description: input.description || null,
    status: input.status || 'pending',
    priority: input.priority || 'medium',
    assigned_to_user_id: input.assignedToUserId || null,
    due_date: input.dueDate || null,
    budget: input.budget ?? null,
    notes: input.notes || null,
    created_by: input.createdBy,
    source_type: input.sourceType || null,
    source_id: input.sourceId || null,
  }
}

export function logisticsTaskDeepLink(args: {
  sourceType?: string | null
  sourceId?: string | null
  eventId?: string | null
  tourId?: string | null
  tab?: string
}): string {
  const params = new URLSearchParams()
  params.set('tab', args.tab || 'overview')
  if (args.eventId) params.set('eventId', args.eventId)
  if (args.tourId) params.set('tourId', args.tourId)
  if (args.sourceId) params.set('recordId', args.sourceId)
  if (args.sourceType) params.set('sourceType', args.sourceType)
  return `/admin/dashboard/logistics?${params.toString()}`
}
