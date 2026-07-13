'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, MapPin, ListChecks, AlertTriangle, MessageCircle, Settings2, UserPlus } from 'lucide-react'
import { ElementInspector, type EditorCanvasElement } from './element-inspector'
import type { ElementStatus } from '@/types/site-map'

export type SelectedMapObject =
  | { kind: 'element'; id: string }
  | { kind: 'zone'; id: string }
  | { kind: 'tent'; id: string }
  | null

export type ContextDrawerTab = 'properties' | 'tasks' | 'issues' | 'notes'

interface SiteMapContextDrawerProps {
  open: boolean
  onClose: () => void
  activeTab: ContextDrawerTab
  onTabChange: (tab: ContextDrawerTab) => void
  selectedObject: SelectedMapObject
  element: EditorCanvasElement | null
  zone: Record<string, unknown> | null
  tent: Record<string, unknown> | null
  layers: Array<{ id: string; name: string }>
  elementStatus?: string
  tasks: any[]
  issues: any[]
  notes: any[]
  isReadOnly?: boolean
  modeLabel?: string
  eventId?: string | null
  siteMapId?: string
  onUpdateElement: (id: string, updates: Partial<EditorCanvasElement>) => void
  onStatusUpdate: (id: string, status: ElementStatus) => void
  onDeleteElement: (id: string) => void
  onUpdateZone?: (id: string, updates: Record<string, unknown>) => void
  onUpdateTent?: (id: string, updates: Record<string, unknown>) => void
  onCreateTask?: () => void
  onCompleteTask?: (taskId: string) => void
  childrenTasks?: React.ReactNode
  childrenIssues?: React.ReactNode
  childrenNotes?: React.ReactNode
}

const ZONE_TYPES = [
  'glamping', 'parking', 'vendor', 'food', 'restroom', 'utility',
  'entrance', 'exit', 'stage', 'medical', 'security', 'storage', 'other',
]

function ZoneLeadPicker({
  eventId,
  leadUserId,
  disabled,
  onSelect,
}: {
  eventId?: string | null
  leadUserId?: string | null
  disabled?: boolean
  onSelect: (userId: string | null, department?: string | null) => void
}) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])

  useEffect(() => {
    if (!eventId || search.length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const resp = await fetch(
          `/api/hiring/roster?event_id=${encodeURIComponent(eventId)}&search=${encodeURIComponent(search)}`,
          { credentials: 'include' }
        )
        const data = await resp.json()
        const members = data.data || data.members || []
        setResults(
          members
            .slice(0, 6)
            .map((member: any) => ({
              id: member.userId || member.user_id,
              name: member.name || member.fullName || member.full_name || 'Crew',
              department: member.department || null,
            }))
            .filter((member: any) => member.id)
        )
      } catch {
        setResults([])
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [eventId, search])

  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] text-slate-400">Zone lead (roster)</Label>
      {leadUserId ? (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5">
          <UserPlus className="h-3 w-3 text-emerald-400" />
          <span className="flex-1 truncate text-[11px] text-emerald-200">{leadUserId}</span>
          {!disabled && (
            <button type="button" onClick={() => onSelect(null)} className="text-emerald-400 hover:text-white">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ) : (
        <>
          <Input
            value={search}
            disabled={disabled || !eventId}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={eventId ? 'Search roster…' : 'Link an event to pick leads'}
            className="h-8 border-slate-700 bg-slate-900 text-xs text-white"
          />
          {results.length > 0 && (
            <div className="overflow-hidden rounded-md border border-slate-700 bg-slate-900">
              {results.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className="flex w-full items-center justify-between px-2 py-1.5 text-left text-xs text-white hover:bg-slate-800"
                  onClick={() => {
                    onSelect(member.id, member.department)
                    setSearch('')
                    setResults([])
                  }}
                >
                  <span className="truncate">{member.name}</span>
                  {member.department && <span className="text-[10px] text-slate-500">{member.department}</span>}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function SiteMapContextDrawer({
  open,
  onClose,
  activeTab,
  onTabChange,
  selectedObject,
  element,
  zone,
  tent,
  layers,
  elementStatus,
  tasks,
  issues,
  notes,
  isReadOnly,
  modeLabel,
  eventId,
  siteMapId,
  onUpdateElement,
  onStatusUpdate,
  onDeleteElement,
  onUpdateZone,
  onUpdateTent,
  onCreateTask,
  onCompleteTask,
  childrenTasks,
  childrenIssues,
  childrenNotes,
}: SiteMapContextDrawerProps) {
  if (!open) return null

  const title =
    selectedObject?.kind === 'zone'
      ? String(zone?.name || 'Zone')
      : selectedObject?.kind === 'tent'
        ? String(tent?.tent_number || tent?.tentNumber || tent?.name || 'Structure')
        : element?.label || 'Selection'

  const objectTasks = selectedObject
    ? tasks.filter((task) => (task.elementId || task.element_id) === selectedObject.id)
    : tasks
  const objectIssues = selectedObject?.kind === 'element'
    ? issues.filter((issue) => !issue.element_id || issue.element_id === selectedObject.id)
    : issues

  return (
    <aside className="absolute right-0 top-0 z-30 flex h-full w-80 flex-col border-l border-slate-700/40 bg-slate-950/95 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-slate-700/40 px-3 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Settings2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <h3 className="truncate text-sm font-semibold text-white">{title}</h3>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            {selectedObject && (
              <Badge variant="outline" className="border-slate-600 text-[10px] capitalize text-slate-400">
                {selectedObject.kind}
              </Badge>
            )}
            {modeLabel && (
              <Badge className="bg-slate-800 text-[10px] text-slate-300">{modeLabel}</Badge>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as ContextDrawerTab)} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-2 mt-2 grid h-8 grid-cols-4 bg-slate-900">
          <TabsTrigger value="properties" className="px-1 text-[10px]">Props</TabsTrigger>
          <TabsTrigger value="tasks" className="px-1 text-[10px]">
            Tasks
            {objectTasks.length > 0 && <span className="ml-1 text-emerald-400">{objectTasks.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="issues" className="px-1 text-[10px]">
            Issues
            {objectIssues.length > 0 && <span className="ml-1 text-rose-400">{objectIssues.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="notes" className="px-1 text-[10px]">
            Notes
            {notes.length > 0 && <span className="ml-1 text-sky-400">{notes.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="properties" className="mt-0 min-h-0 flex-1 overflow-y-auto">
          {selectedObject?.kind === 'element' && element && (
            <ElementInspector
              element={element}
              layers={layers}
              elementStatus={elementStatus}
              onUpdate={onUpdateElement}
              onStatusUpdate={onStatusUpdate}
              onDelete={onDeleteElement}
            />
          )}

          {selectedObject?.kind === 'zone' && zone && onUpdateZone && (
            <div className="space-y-3 p-3">
              <div>
                <Label className="text-[10px] text-slate-400">Name</Label>
                <Input
                  value={String(zone.name || '')}
                  disabled={isReadOnly}
                  onChange={(e) => onUpdateZone(String(zone.id), { name: e.target.value })}
                  className="h-8 border-slate-700 bg-slate-900 text-xs text-white"
                />
              </div>
              <div>
                <Label className="text-[10px] text-slate-400">Zone type</Label>
                <select
                  value={String(zone.zone_type || zone.zoneType || 'other')}
                  disabled={isReadOnly}
                  onChange={(e) => onUpdateZone(String(zone.id), { zoneType: e.target.value, zone_type: e.target.value })}
                  className="h-8 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-white"
                >
                  {ZONE_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <ZoneLeadPicker
                eventId={eventId}
                leadUserId={String(zone.lead_user_id || zone.leadUserId || '') || null}
                disabled={isReadOnly}
                onSelect={(userId, department) => {
                  onUpdateZone(String(zone.id), {
                    lead_user_id: userId,
                    leadUserId: userId,
                    ...(department
                      ? { assigned_department: department, assignedDepartment: department }
                      : {}),
                  })
                }}
              />
              <div>
                <Label className="text-[10px] text-slate-400">Department</Label>
                <Input
                  value={String(zone.assigned_department || zone.assignedDepartment || '')}
                  disabled={isReadOnly}
                  onChange={(e) => onUpdateZone(String(zone.id), {
                    assigned_department: e.target.value || null,
                    assignedDepartment: e.target.value || null,
                  })}
                  className="h-8 border-slate-700 bg-slate-900 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['x', 'y', 'width', 'height'] as const).map((key) => (
                  <div key={key}>
                    <Label className="text-[10px] uppercase text-slate-400">{key}</Label>
                    <Input
                      type="number"
                      value={Number(zone[key] ?? 0)}
                      disabled={isReadOnly}
                      onChange={(e) => onUpdateZone(String(zone.id), { [key]: Number(e.target.value) })}
                      className="h-8 border-slate-700 bg-slate-900 text-xs text-white"
                    />
                  </div>
                ))}
              </div>
              {!isReadOnly && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-full border-slate-700 text-xs"
                  onClick={async () => {
                    const mapId = siteMapId || String(zone.site_map_id || '')
                    if (!mapId) return
                    await fetch(`/api/admin/logistics/site-maps/${mapId}/zones/bulk-assign`, {
                      method: 'POST',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        zoneId: zone.id,
                        leadUserId: zone.lead_user_id || zone.leadUserId || null,
                        assignedDepartment: zone.assigned_department || zone.assignedDepartment || null,
                        starterTasks: [{ title: `Setup ${zone.name || 'zone'}` }],
                      }),
                    })
                  }}
                >
                  Sync ownership + starter task
                </Button>
              )}
            </div>
          )}

          {selectedObject?.kind === 'tent' && tent && onUpdateTent && (
            <div className="space-y-3 p-3">
              <div>
                <Label className="text-[10px] text-slate-400">Structure #</Label>
                <Input
                  value={String(tent.tent_number || tent.tentNumber || '')}
                  disabled={isReadOnly}
                  onChange={(e) => onUpdateTent(String(tent.id), { tentNumber: e.target.value, tent_number: e.target.value })}
                  className="h-8 border-slate-700 bg-slate-900 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['x', 'y', 'width', 'height'] as const).map((key) => (
                  <div key={key}>
                    <Label className="text-[10px] uppercase text-slate-400">{key}</Label>
                    <Input
                      type="number"
                      value={Number(tent[key] ?? 0)}
                      disabled={isReadOnly}
                      onChange={(e) => onUpdateTent(String(tent.id), { [key]: Number(e.target.value) })}
                      className="h-8 border-slate-700 bg-slate-900 text-xs text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!selectedObject && (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500">
              <div>
                <MapPin className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                Select a zone, structure, or element to edit properties and assign work.
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="mt-0 min-h-0 flex-1 overflow-y-auto p-3">
          <div className="space-y-3">
            {childrenTasks}
            {!childrenTasks && !isReadOnly && onCreateTask && (
              <Button size="sm" className="w-full" onClick={onCreateTask}>
                <ListChecks className="mr-1.5 h-3.5 w-3.5" />
                Add task{selectedObject ? ' to selection' : ''}
              </Button>
            )}
            {objectTasks.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-500">No tasks yet</p>
            )}
            {objectTasks.map((task) => (
              <div key={task.id} className="rounded-lg border border-slate-700/40 bg-slate-900/60 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-white">{task.title || task.task_type}</p>
                    <p className="text-[10px] capitalize text-slate-500">{task.status} · {task.priority || 'medium'}</p>
                  </div>
                  {!isReadOnly && task.status !== 'completed' && onCompleteTask && (
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => onCompleteTask(task.id)}>
                      Done
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="issues" className="mt-0 min-h-0 flex-1 overflow-y-auto p-3">
          {childrenIssues || (
            <div className="space-y-2">
              {objectIssues.length === 0 && (
                <p className="py-6 text-center text-xs text-slate-500">No issues</p>
              )}
              {objectIssues.map((issue) => (
                <div key={issue.id} className="rounded-lg border border-slate-700/40 bg-slate-900/60 p-2.5">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-amber-400" />
                    <p className="truncate text-xs font-medium text-white">{issue.title}</p>
                  </div>
                  <p className="mt-1 text-[10px] capitalize text-slate-500">{issue.severity} · {issue.status || 'open'}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-0 min-h-0 flex-1 overflow-y-auto p-3">
          {childrenNotes || (
            <div className="space-y-2">
              {notes.length === 0 && (
                <p className="py-6 text-center text-xs text-slate-500">No notes</p>
              )}
              {notes.map((note) => {
                const values = note.new_values || note.newValues || {}
                return (
                  <div key={note.id} className="rounded-lg border border-slate-700/40 bg-slate-900/60 p-2.5">
                    <div className="flex items-center gap-1.5">
                      <MessageCircle className="h-3 w-3 text-sky-400" />
                      <p className="truncate text-xs text-white">{values.content || 'Note'}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </aside>
  )
}
