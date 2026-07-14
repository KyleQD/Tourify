'use client'

import { Button } from '@/components/ui/button'
import { Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CanvasFilters {
  layerId: string
  status: string
  assignee: string
  issueSeverity: string
  taskState: string
  unresolvedNotesOnly: boolean
  unassignedZonesOnly?: boolean
  myDepartment?: string
}

interface SiteMapFilterBarProps {
  filters: CanvasFilters
  onChange: (next: CanvasFilters) => void
  layers: Array<{ id: string; name: string }>
  assigneeOptions: Array<{ value: string; label: string }>
  className?: string
}

const defaultFilters: CanvasFilters = {
  layerId: 'all',
  status: 'all',
  assignee: 'all',
  issueSeverity: 'all',
  taskState: 'all',
  unresolvedNotesOnly: false,
  unassignedZonesOnly: false,
  myDepartment: '',
}

export function hasActiveCanvasFilters(filters: CanvasFilters) {
  return (
    filters.layerId !== 'all' ||
    filters.status !== 'all' ||
    filters.assignee !== 'all' ||
    filters.issueSeverity !== 'all' ||
    filters.taskState !== 'all' ||
    filters.unresolvedNotesOnly ||
    Boolean(filters.unassignedZonesOnly) ||
    Boolean(filters.myDepartment)
  )
}

export function SiteMapFilterBar({
  filters,
  onChange,
  layers,
  assigneeOptions,
  className,
}: SiteMapFilterBarProps) {
  const active = hasActiveCanvasFilters(filters)

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500">
        <Filter className="h-3 w-3" />
        Filters
      </div>

      <select
        value={filters.layerId}
        onChange={(e) => onChange({ ...filters, layerId: e.target.value })}
        className="h-7 rounded-md border border-slate-700/50 bg-slate-900/70 px-2 text-[11px] text-slate-200"
      >
        <option value="all">All layers</option>
        {layers.map((layer) => (
          <option key={layer.id} value={layer.id}>{layer.name}</option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
        className="h-7 rounded-md border border-slate-700/50 bg-slate-900/70 px-2 text-[11px] text-slate-200"
      >
        <option value="all">All statuses</option>
        <option value="not_started">Not started</option>
        <option value="in_progress">In progress</option>
        <option value="setup_complete">Setup complete</option>
        <option value="needs_attention">Needs attention</option>
        <option value="blocked">Blocked</option>
        <option value="verified">Verified</option>
      </select>

      <select
        value={filters.assignee}
        onChange={(e) => onChange({ ...filters, assignee: e.target.value })}
        className="h-7 rounded-md border border-slate-700/50 bg-slate-900/70 px-2 text-[11px] text-slate-200"
      >
        <option value="all">All assignees</option>
        {assigneeOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>

      <select
        value={filters.taskState}
        onChange={(e) => onChange({ ...filters, taskState: e.target.value })}
        className="h-7 rounded-md border border-slate-700/50 bg-slate-900/70 px-2 text-[11px] text-slate-200"
      >
        <option value="all">All tasks</option>
        <option value="pending">Pending</option>
        <option value="in_progress">In progress</option>
        <option value="blocked">Blocked</option>
        <option value="completed">Completed</option>
      </select>

      <select
        value={filters.issueSeverity}
        onChange={(e) => onChange({ ...filters, issueSeverity: e.target.value })}
        className="h-7 rounded-md border border-slate-700/50 bg-slate-900/70 px-2 text-[11px] text-slate-200"
      >
        <option value="all">All issues</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="critical">Critical</option>
      </select>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={cn(
          'h-7 px-2 text-[11px]',
          filters.unresolvedNotesOnly ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400'
        )}
        onClick={() => onChange({ ...filters, unresolvedNotesOnly: !filters.unresolvedNotesOnly })}
      >
        Unresolved notes
      </Button>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={cn(
          'h-7 px-2 text-[11px]',
          filters.unassignedZonesOnly ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400'
        )}
        onClick={() => onChange({ ...filters, unassignedZonesOnly: !filters.unassignedZonesOnly })}
      >
        Unassigned zones
      </Button>

      {active && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px] text-slate-400"
          onClick={() => onChange({ ...defaultFilters })}
        >
          Clear
        </Button>
      )}
    </div>
  )
}

export { defaultFilters }
