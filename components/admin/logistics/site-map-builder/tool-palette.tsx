'use client'

import { MousePointer, Hand, Ruler, Type, AlertTriangle, Trash2, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

export type EditorTool = 'select' | 'pan' | 'measure' | 'text' | 'issue' | 'delete' | 'duplicate' | 'place'

interface ToolPaletteProps {
  selectedTool: string
  onToolSelect: (tool: string) => void
  className?: string
}

const toolGroups = [
  {
    label: 'Navigate',
    tools: [
      { id: 'select', icon: MousePointer, label: 'Select', shortcut: 'V' },
      { id: 'pan', icon: Hand, label: 'Pan', shortcut: 'H' },
    ],
  },
  {
    label: 'Annotate',
    tools: [
      { id: 'measure', icon: Ruler, label: 'Measure', shortcut: 'M' },
      { id: 'text', icon: Type, label: 'Text', shortcut: 'T' },
      { id: 'issue', icon: AlertTriangle, label: 'Issue', shortcut: 'I' },
    ],
  },
  {
    label: 'Edit',
    tools: [
      { id: 'delete', icon: Trash2, label: 'Delete', shortcut: 'Del' },
      { id: 'duplicate', icon: Copy, label: 'Duplicate', shortcut: '⌘D' },
    ],
  },
]

export function ToolPalette({ selectedTool, onToolSelect, className }: ToolPaletteProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {toolGroups.map((group) => (
        <div key={group.label} className="space-y-1.5">
          <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1">{group.label}</h4>
          <div className="grid grid-cols-2 gap-1">
            {group.tools.map((tool) => {
              const Icon = tool.icon
              const isActive = selectedTool === tool.id
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => onToolSelect(tool.id)}
                  className={cn(
                    'flex items-center gap-2 px-2 py-2 rounded-lg text-left text-xs transition-colors border',
                    isActive
                      ? 'bg-slate-700 text-white border-slate-500'
                      : 'text-slate-400 border-transparent hover:bg-slate-800/60 hover:text-white'
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1">{tool.label}</span>
                  <kbd className="text-[9px] text-slate-500 font-mono">{tool.shortcut}</kbd>
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <p className="text-[10px] text-slate-500 px-1">Space + drag to pan · Shift+click multi-select</p>
    </div>
  )
}
