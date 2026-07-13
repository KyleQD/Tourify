'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { MousePointer, Square, Trash2 } from 'lucide-react'
import { getElementById } from '@/lib/data/canned-elements'
import type { ElementStatus } from '@/types/site-map'

export interface EditorCanvasElement {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  fill: string
  stroke: string
  strokeWidth: number
  label: string
  data?: Record<string, unknown>
}

interface ElementInspectorProps {
  element: EditorCanvasElement | null
  layers: Array<{ id: string; name: string }>
  elementStatus?: string
  onUpdate: (id: string, updates: Partial<EditorCanvasElement>) => void
  onStatusUpdate: (id: string, status: ElementStatus) => void
  onDelete: (id: string) => void
}

const statusOptions: Array<{ value: ElementStatus; label: string }> = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'setup_complete', label: 'Setup Complete' },
  { value: 'needs_attention', label: 'Needs Attention' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'verified', label: 'Verified' },
]

export function ElementInspector({
  element,
  layers,
  elementStatus,
  onUpdate,
  onStatusUpdate,
  onDelete,
}: ElementInspectorProps) {
  if (!element) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <MousePointer className="h-8 w-8 text-slate-600 mx-auto" />
          <p className="text-sm text-slate-500">Select an element on the canvas to inspect its properties</p>
        </div>
      </div>
    )
  }

  const cannedInfo = getElementById(element.type)
  const layerId = (element.data?.layerId || element.data?.layer_id || '') as string

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md" style={{ backgroundColor: element.stroke }}>
          {cannedInfo?.icon ? <cannedInfo.icon className="h-4 w-4 text-white" /> : <Square className="h-4 w-4 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">{element.label}</div>
          <div className="text-[10px] text-slate-400">{element.type}</div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Identity</h4>
        <div>
          <Label className="text-[10px] text-slate-400">Layer</Label>
          <select
            value={layerId}
            onChange={(e) =>
              onUpdate(element.id, { data: { ...(element.data || {}), layerId: e.target.value || null } })
            }
            className="w-full h-7 text-xs bg-slate-800/50 border border-slate-700/50 text-white rounded-md px-2"
          >
            <option value="">No layer</option>
            {layers.map((layer) => (
              <option key={layer.id} value={layer.id}>
                {layer.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-[10px] text-slate-400">Setup Status</Label>
          <select
            value={(elementStatus || 'not_started') as ElementStatus}
            onChange={(e) => onStatusUpdate(element.id, e.target.value as ElementStatus)}
            className="w-full h-7 text-xs bg-slate-800/50 border border-slate-700/50 text-white rounded-md px-2"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Position</h4>
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <Label className="text-[10px] text-slate-400">X</Label>
            <Input
              type="number"
              value={element.x}
              onChange={(e) => onUpdate(element.id, { x: +e.target.value })}
              className="h-7 text-xs bg-slate-800/50 border-slate-700/50 text-white rounded-md"
            />
          </div>
          <div>
            <Label className="text-[10px] text-slate-400">Y</Label>
            <Input
              type="number"
              value={element.y}
              onChange={(e) => onUpdate(element.id, { y: +e.target.value })}
              className="h-7 text-xs bg-slate-800/50 border-slate-700/50 text-white rounded-md"
            />
          </div>
          <div>
            <Label className="text-[10px] text-slate-400">Width</Label>
            <Input
              type="number"
              value={element.width}
              onChange={(e) => onUpdate(element.id, { width: +e.target.value })}
              className="h-7 text-xs bg-slate-800/50 border-slate-700/50 text-white rounded-md"
            />
          </div>
          <div>
            <Label className="text-[10px] text-slate-400">Height</Label>
            <Input
              type="number"
              value={element.height}
              onChange={(e) => onUpdate(element.id, { height: +e.target.value })}
              className="h-7 text-xs bg-slate-800/50 border-slate-700/50 text-white rounded-md"
            />
          </div>
        </div>
        <div>
          <Label className="text-[10px] text-slate-400">Rotation</Label>
          <Input
            type="number"
            value={element.rotation}
            onChange={(e) => onUpdate(element.id, { rotation: +e.target.value })}
            className="h-7 text-xs bg-slate-800/50 border-slate-700/50 text-white rounded-md"
          />
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Appearance</h4>
        <div>
          <Label className="text-[10px] text-slate-400">Label</Label>
          <Input
            value={element.label}
            onChange={(e) => onUpdate(element.id, { label: e.target.value })}
            className="h-7 text-xs bg-slate-800/50 border-slate-700/50 text-white rounded-md"
          />
        </div>
      </div>

      <Button
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={() => onDelete(element.id)}
      >
        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
        Delete element
      </Button>
    </div>
  )
}
