import {
  mapToOperationalStatus,
  readinessLabelForOperational,
  type LogisticsOperationalStatus,
} from '@/lib/logistics/status'

export type LogisticsDimension =
  | 'transport'
  | 'travel'
  | 'equipment'
  | 'backline'
  | 'catering'
  | 'comms'
  | 'site_map'

export interface DimensionCounts {
  total: number
  completed: number
  confirmed: number
  issues: number
  published?: number
}

export interface LogisticsReadinessDimension {
  id: LogisticsDimension
  label: string
  state: 'missing' | 'not_started' | 'in_progress' | 'ready' | 'at_risk'
  total: number
  completed: number
  issues: number
  detail: string
}

function dimensionState(counts: DimensionCounts): LogisticsReadinessDimension['state'] {
  if (counts.total === 0 && !counts.published) return 'missing'
  if (counts.issues > 0) return 'at_risk'
  if (counts.published && counts.published > 0 && counts.total === 0) return 'ready'
  if (counts.completed >= counts.total && counts.total > 0) return 'ready'
  if (counts.confirmed > 0 || counts.completed > 0) return 'in_progress'
  return 'not_started'
}

export function buildLogisticsReadiness(args: {
  transport: DimensionCounts
  travel: DimensionCounts
  equipment: DimensionCounts
  backline: DimensionCounts
  catering: DimensionCounts
  comms: DimensionCounts
  siteMap: DimensionCounts
}): LogisticsReadinessDimension[] {
  const specs: Array<{ id: LogisticsDimension; label: string; counts: DimensionCounts }> = [
    { id: 'transport', label: 'Transport', counts: args.transport },
    { id: 'travel', label: 'Travel / Lodging', counts: args.travel },
    { id: 'equipment', label: 'Equipment', counts: args.equipment },
    { id: 'backline', label: 'Backline', counts: args.backline },
    { id: 'catering', label: 'Catering', counts: args.catering },
    { id: 'comms', label: 'Comms', counts: args.comms },
    { id: 'site_map', label: 'Site Map', counts: args.siteMap },
  ]

  return specs.map((spec) => {
    const state = dimensionState(spec.counts)
    const detail =
      spec.counts.total === 0 && !spec.counts.published
        ? 'No records in scope'
        : `${spec.counts.completed}/${spec.counts.total || spec.counts.published || 0} complete` +
          (spec.counts.issues ? `; ${spec.counts.issues} issue(s)` : '')

    return {
      id: spec.id,
      label: spec.label,
      state,
      total: spec.counts.total,
      completed: spec.counts.completed,
      issues: spec.counts.issues,
      detail,
    }
  })
}

export function countsFromStatuses(statuses: Array<string | null | undefined>): DimensionCounts {
  let completed = 0
  let confirmed = 0
  let issues = 0
  for (const status of statuses) {
    const mapped: LogisticsOperationalStatus = mapToOperationalStatus(status)
    if (mapped === 'completed') completed += 1
    if (mapped === 'confirmed' || mapped === 'in_progress') confirmed += 1
    if (mapped === 'issue') issues += 1
  }
  return { total: statuses.length, completed, confirmed, issues }
}

export function metricCardFromCounts(counts: DimensionCounts): {
  percentage: number
  items: number
  completed: number
  status: string
} {
  const percentage =
    counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0
  const sampleStatus = counts.issues > 0
    ? 'issue'
    : counts.completed >= counts.total && counts.total > 0
      ? 'completed'
      : counts.confirmed > 0
        ? 'in_progress'
        : 'draft'
  return {
    percentage,
    items: counts.total,
    completed: counts.completed,
    status: readinessLabelForOperational(mapToOperationalStatus(sampleStatus)),
  }
}
