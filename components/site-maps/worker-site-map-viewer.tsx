'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { AlertTriangle, CheckCircle2, ChevronUp, Loader2, MapPin } from 'lucide-react'

interface WorkerSiteMapViewerProps {
  siteMapId: string
}

export function WorkerSiteMapViewer({ siteMapId }: WorkerSiteMapViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [blockerText, setBlockerText] = useState('')
  const [sheetOpen, setSheetOpen] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const resp = await fetch(`/api/work/site-maps/${siteMapId}`, { credentials: 'include' })
      const payload = await resp.json()
      if (!resp.ok || !payload.success) throw new Error(payload.error || 'Failed to load map')
      setData(payload.data)
      const firstOpen = (payload.data.myTasks || []).find((t: any) => t.status !== 'completed')
      if (firstOpen) setSelectedTaskId(firstOpen.id)
    } catch (err: any) {
      setError(err?.message || 'Failed to load')
    } finally {
      setIsLoading(false)
    }
  }, [siteMapId])

  useEffect(() => { load() }, [load])

  const selectedTask = useMemo(
    () => (data?.myTasks || []).find((task: any) => task.id === selectedTaskId) || null,
    [data, selectedTaskId]
  )

  useEffect(() => {
    if (!data || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = Number(data.width) || 1200
    const height = Number(data.height) || 900
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = '100%'
    canvas.style.height = 'auto'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.fillStyle = '#0b1220'
    ctx.fillRect(0, 0, width, height)

    for (const zone of data.zones || []) {
      const x = Number(zone.x) || 0
      const y = Number(zone.y) || 0
      const w = Number(zone.width) || 120
      const h = Number(zone.height) || 80
      ctx.fillStyle = zone.color || 'rgba(147, 51, 234, 0.25)'
      ctx.fillRect(x, y, w, h)
      ctx.strokeStyle = zone.border_color || '#a855f7'
      ctx.strokeRect(x, y, w, h)
      ctx.fillStyle = '#fff'
      ctx.font = '600 12px system-ui'
      ctx.fillText(zone.name || 'Zone', x + 8, y + 18)

      const openCount = (data.myTasks || []).filter(
        (t: any) => t.element_id === zone.id && t.status !== 'completed'
      ).length
      if (openCount > 0) {
        ctx.fillStyle = '#f59e0b'
        ctx.beginPath()
        ctx.arc(x + w - 14, y + 14, 10, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#000'
        ctx.font = '700 10px system-ui'
        ctx.textAlign = 'center'
        ctx.fillText(String(openCount), x + w - 14, y + 17)
        ctx.textAlign = 'left'
      }
    }

    for (const el of data.elements || []) {
      const x = Number(el.x) || 0
      const y = Number(el.y) || 0
      const w = Number(el.width) || 40
      const h = Number(el.height) || 40
      ctx.fillStyle = el.fill || el.fill_color || '#334155'
      ctx.fillRect(x, y, w, h)
    }
  }, [data])

  async function updateTask(action: string, extra: Record<string, unknown> = {}) {
    if (!selectedTask) return
    setIsSaving(true)
    try {
      const resp = await fetch(`/api/admin/logistics/site-maps/${siteMapId}/tasks`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, taskId: selectedTask.id, ...extra }),
      })
      if (!resp.ok) throw new Error('Update failed')
      await load()
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleChecklistItem(itemId: string) {
    if (!selectedTask) return
    const checklist = Array.isArray(selectedTask.checklist) ? [...selectedTask.checklist] : []
    const next = checklist.map((item: any) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    )
    await updateTask('UPDATE_CHECKLIST', { checklist: next })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 bg-slate-950 text-slate-400">
        <MapPin className="h-8 w-8" />
        <p>{error || 'Map unavailable'}</p>
      </div>
    )
  }

  const openTasks = (data.myTasks || []).filter((t: any) => t.status !== 'completed')

  return (
    <div className="relative min-h-screen bg-slate-950 text-white">
      <div className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{data.name}</h1>
            <p className="text-xs text-slate-400">{openTasks.length} open task{openTasks.length === 1 ? '' : 's'}</p>
          </div>
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">Work Mode</Badge>
        </div>
      </div>

      <div className="p-2 pb-48">
        <canvas ref={canvasRef} className="w-full rounded-lg border border-slate-800" />
      </div>

      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 rounded-t-2xl border border-slate-700 bg-slate-900 shadow-2xl transition-transform',
          sheetOpen ? 'translate-y-0' : 'translate-y-[calc(100%-48px)]'
        )}
      >
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 py-3 text-xs text-slate-400"
          onClick={() => setSheetOpen((v) => !v)}
        >
          <ChevronUp className={cn('h-4 w-4 transition', !sheetOpen && 'rotate-180')} />
          {selectedTask?.title || 'Your tasks'}
        </button>

        <div className="max-h-[50vh] space-y-3 overflow-y-auto px-4 pb-6">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(data.myTasks || []).map((task: any) => (
              <button
                key={task.id}
                type="button"
                onClick={() => setSelectedTaskId(task.id)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1 text-xs',
                  selectedTaskId === task.id
                    ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-200'
                    : 'border-slate-700 text-slate-300'
                )}
              >
                {task.title}
              </button>
            ))}
          </div>

          {selectedTask && (
            <>
              <div>
                <h2 className="text-sm font-semibold">{selectedTask.title}</h2>
                {selectedTask.task_description && (
                  <p className="mt-1 text-xs text-slate-400">{selectedTask.task_description}</p>
                )}
                <div className="mt-2 flex gap-2">
                  <Badge className="bg-slate-800 text-[10px] capitalize">{selectedTask.status}</Badge>
                  {selectedTask.element_type && (
                    <Badge variant="outline" className="border-slate-600 text-[10px] capitalize">
                      {selectedTask.element_type}
                    </Badge>
                  )}
                </div>
              </div>

              {Array.isArray(selectedTask.checklist) && selectedTask.checklist.length > 0 && (
                <div className="space-y-2">
                  {selectedTask.checklist.map((item: any) => (
                    <label key={item.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={Boolean(item.done)}
                        onCheckedChange={() => toggleChecklistItem(item.id)}
                      />
                      <span className={cn(item.done && 'text-slate-500 line-through')}>{item.label}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Textarea
                  value={blockerText}
                  onChange={(e) => setBlockerText(e.target.value)}
                  placeholder="Report a blocker…"
                  className="min-h-[60px] border-slate-700 bg-slate-950 text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSaving || !blockerText.trim()}
                    className="border-amber-500/40 text-amber-200"
                    onClick={() => updateTask('BLOCK_TASK', { blockerReason: blockerText.trim() }).then(() => setBlockerText(''))}
                  >
                    <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                    Blocker
                  </Button>
                  <Button
                    size="sm"
                    disabled={isSaving || selectedTask.status === 'completed'}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => updateTask('COMPLETE_TASK')}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Complete
                  </Button>
                </div>
              </div>
            </>
          )}

          {!selectedTask && (
            <p className="py-8 text-center text-sm text-slate-500">No tasks assigned to you on this map.</p>
          )}
        </div>
      </div>
    </div>
  )
}
