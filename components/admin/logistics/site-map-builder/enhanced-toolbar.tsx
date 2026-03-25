'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  MousePointer,
  Hand,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Square,
  Circle,
  Type,
  Ruler,
  AlertTriangle,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignCenterVertical,
  AlignCenterHorizontal,
  Copy,
  Trash2,
  Move,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Grid,
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Maximize,
  Minimize,
  Download,
  Upload,
  Share,
  Save,
  Undo,
  Redo,
  Settings,
  HelpCircle,
  Keyboard
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToolbarSection {
  id: string
  name: string
  tools: ToolbarTool[]
}

interface ToolbarTool {
  id: string
  name: string
  icon: React.ComponentType<any>
  shortcut?: string
  description: string
  variant?: 'default' | 'destructive' | 'secondary' | 'ghost'
  disabled?: boolean
  badge?: string
}

interface EnhancedToolbarProps {
  activeTool: string
  onToolChange: (toolId: string) => void
  zoom: number
  onZoomChange: (zoom: number) => void
  showGrid: boolean
  onGridToggle: () => void
  showLayers: boolean
  onLayersToggle: () => void
  selectedElements: string[]
  onAction: (action: string) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  className?: string
}

const TOOLBAR_SECTIONS: ToolbarSection[] = [
  {
    id: 'navigation',
    name: 'Navigation',
    tools: [
      {
        id: 'select',
        name: 'Select',
        icon: MousePointer,
        shortcut: 'V',
        description: 'Select and move elements'
      },
      {
        id: 'pan',
        name: 'Pan',
        icon: Hand,
        shortcut: 'H',
        description: 'Pan around the canvas'
      }
    ]
  },
  {
    id: 'zoom',
    name: 'Zoom',
    tools: [
      {
        id: 'zoom-in',
        name: 'Zoom In',
        icon: ZoomIn,
        shortcut: 'Ctrl +',
        description: 'Zoom in on the canvas'
      },
      {
        id: 'zoom-out',
        name: 'Zoom Out',
        icon: ZoomOut,
        shortcut: 'Ctrl -',
        description: 'Zoom out on the canvas'
      },
      {
        id: 'fit-to-screen',
        name: 'Fit to Screen',
        icon: RotateCcw,
        shortcut: 'Ctrl 0',
        description: 'Fit entire canvas to screen'
      }
    ]
  },
  {
    id: 'drawing',
    name: 'Drawing',
    tools: [
      {
        id: 'rectangle',
        name: 'Rectangle',
        icon: Square,
        shortcut: 'R',
        description: 'Draw rectangular shapes'
      },
      {
        id: 'circle',
        name: 'Circle',
        icon: Circle,
        shortcut: 'C',
        description: 'Draw circular shapes'
      },
      {
        id: 'text',
        name: 'Text',
        icon: Type,
        shortcut: 'T',
        description: 'Add text labels'
      }
    ]
  },
  {
    id: 'measurement',
    name: 'Measurement',
    tools: [
      {
        id: 'measure',
        name: 'Measure',
        icon: Ruler,
        shortcut: 'M',
        description: 'Measure distances and areas'
      },
      {
        id: 'issue',
        name: 'Report Issue',
        icon: AlertTriangle,
        shortcut: 'I',
        description: 'Mark issues and problems'
      }
    ]
  },
  {
    id: 'layout',
    name: 'Layout',
    tools: [
      {
        id: 'align-left',
        name: 'Align Left',
        icon: AlignLeft,
        shortcut: 'Ctrl Shift L',
        description: 'Align selected elements to left'
      },
      {
        id: 'align-center',
        name: 'Align Center',
        icon: AlignCenter,
        shortcut: 'Ctrl Shift C',
        description: 'Align selected elements to center'
      },
      {
        id: 'align-right',
        name: 'Align Right',
        icon: AlignRight,
        shortcut: 'Ctrl Shift R',
        description: 'Align selected elements to right'
      },
      {
        id: 'distribute-horizontal',
        name: 'Distribute Horizontally',
        icon: AlignCenterHorizontal,
        shortcut: 'Ctrl Shift H',
        description: 'Distribute elements horizontally'
      },
      {
        id: 'distribute-vertical',
        name: 'Distribute Vertically',
        icon: AlignCenterVertical,
        shortcut: 'Ctrl Shift V',
        description: 'Distribute elements vertically'
      }
    ]
  },
  {
    id: 'edit',
    name: 'Edit',
    tools: [
      {
        id: 'duplicate',
        name: 'Duplicate',
        icon: Copy,
        shortcut: 'Ctrl D',
        description: 'Duplicate selected elements'
      },
      {
        id: 'delete',
        name: 'Delete',
        icon: Trash2,
        shortcut: 'Delete',
        description: 'Delete selected elements',
        variant: 'destructive'
      },
      {
        id: 'move',
        name: 'Move',
        icon: Move,
        shortcut: 'M',
        description: 'Move selected elements'
      },
      {
        id: 'rotate',
        name: 'Rotate',
        icon: RotateCw,
        shortcut: 'R',
        description: 'Rotate selected elements'
      },
      {
        id: 'flip-horizontal',
        name: 'Flip Horizontal',
        icon: FlipHorizontal,
        shortcut: 'Ctrl Shift H',
        description: 'Flip elements horizontally'
      },
      {
        id: 'flip-vertical',
        name: 'Flip Vertical',
        icon: FlipVertical,
        shortcut: 'Ctrl Shift V',
        description: 'Flip elements vertically'
      }
    ]
  },
  {
    id: 'view',
    name: 'View',
    tools: [
      {
        id: 'grid',
        name: 'Grid',
        icon: Grid,
        shortcut: 'G',
        description: 'Toggle grid visibility'
      },
      {
        id: 'layers',
        name: 'Layers',
        icon: Layers,
        shortcut: 'L',
        description: 'Toggle layers panel'
      },
      {
        id: 'fullscreen',
        name: 'Fullscreen',
        icon: Maximize,
        shortcut: 'F11',
        description: 'Toggle fullscreen mode'
      }
    ]
  },
  {
    id: 'file',
    name: 'File',
    tools: [
      {
        id: 'save',
        name: 'Save',
        icon: Save,
        shortcut: 'Ctrl S',
        description: 'Save current site map'
      },
      {
        id: 'export',
        name: 'Export',
        icon: Download,
        shortcut: 'Ctrl E',
        description: 'Export site map'
      },
      {
        id: 'import',
        name: 'Import',
        icon: Upload,
        shortcut: 'Ctrl I',
        description: 'Import site map'
      },
      {
        id: 'share',
        name: 'Share',
        icon: Share,
        shortcut: 'Ctrl Shift S',
        description: 'Share site map'
      }
    ]
  }
]

export function EnhancedToolbar({
  activeTool,
  onToolChange,
  zoom,
  onZoomChange,
  showGrid,
  onGridToggle,
  showLayers,
  onLayersToggle,
  selectedElements,
  onAction,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  className = ""
}: EnhancedToolbarProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [showShortcuts, setShowShortcuts] = useState(false)

  const toggleSection = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections)
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId)
    } else {
      newCollapsed.add(sectionId)
    }
    setCollapsedSections(newCollapsed)
  }

  const handleToolClick = (toolId: string) => {
    // Handle special tools
    if (toolId === 'zoom-in') {
      onZoomChange(Math.min(zoom * 1.2, 5))
    } else if (toolId === 'zoom-out') {
      onZoomChange(Math.max(zoom / 1.2, 0.1))
    } else if (toolId === 'fit-to-screen') {
      onZoomChange(1)
    } else if (toolId === 'grid') {
      onGridToggle()
    } else if (toolId === 'layers') {
      onLayersToggle()
    } else if (toolId === 'duplicate' || toolId === 'delete' || toolId === 'move' || toolId === 'rotate' || toolId === 'flip-horizontal' || toolId === 'flip-vertical') {
      onAction(toolId)
    } else {
      onToolChange(toolId)
    }
  }

  const isToolActive = (toolId: string) => {
    if (toolId === 'grid') return showGrid
    if (toolId === 'layers') return showLayers
    return activeTool === toolId
  }

  const isToolDisabled = (tool: ToolbarTool) => {
    if (tool.id === 'duplicate' || tool.id === 'delete' || tool.id === 'move' || tool.id === 'rotate' || tool.id === 'flip-horizontal' || tool.id === 'flip-vertical') {
      return selectedElements.length === 0
    }
    if (tool.id === 'undo') return !canUndo
    if (tool.id === 'redo') return !canRedo
    return tool.disabled || false
  }

  return (
    <TooltipProvider>
      <div className={cn(
        "bg-white/95 backdrop-blur-sm border-b border-slate-200/60 shadow-sm",
        className
      )}>
        {/* Main Toolbar */}
        <div className="flex items-center justify-between px-4 py-2">
          {/* Left Section - Navigation & Drawing */}
          <div className="flex items-center space-x-1">
            {/* Navigation */}
            <div className="flex items-center space-x-1 pr-2 border-r border-slate-200">
              {TOOLBAR_SECTIONS.find(s => s.id === 'navigation')?.tools.map((tool) => (
                <Tooltip key={tool.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isToolActive(tool.id) ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleToolClick(tool.id)}
                      className={cn(
                        "h-9 w-9 p-0",
                        isToolActive(tool.id) && "bg-blue-600 text-white hover:bg-blue-700"
                      )}
                    >
                      <tool.icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tool.description}</p>
                    {tool.shortcut && <p className="text-xs text-muted-foreground">{tool.shortcut}</p>}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>

            {/* Drawing Tools */}
            <div className="flex items-center space-x-1 pr-2 border-r border-slate-200">
              {TOOLBAR_SECTIONS.find(s => s.id === 'drawing')?.tools.map((tool) => (
                <Tooltip key={tool.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isToolActive(tool.id) ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleToolClick(tool.id)}
                      className={cn(
                        "h-9 w-9 p-0",
                        isToolActive(tool.id) && "bg-purple-600 text-white hover:bg-purple-700"
                      )}
                    >
                      <tool.icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tool.description}</p>
                    {tool.shortcut && <p className="text-xs text-muted-foreground">{tool.shortcut}</p>}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>

            {/* Measurement */}
            <div className="flex items-center space-x-1 pr-2 border-r border-slate-200">
              {TOOLBAR_SECTIONS.find(s => s.id === 'measurement')?.tools.map((tool) => (
                <Tooltip key={tool.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isToolActive(tool.id) ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleToolClick(tool.id)}
                      className={cn(
                        "h-9 w-9 p-0",
                        isToolActive(tool.id) && "bg-green-600 text-white hover:bg-green-700"
                      )}
                    >
                      <tool.icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tool.description}</p>
                    {tool.shortcut && <p className="text-xs text-muted-foreground">{tool.shortcut}</p>}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>

            {/* Edit Tools */}
            <div className="flex items-center space-x-1">
              {TOOLBAR_SECTIONS.find(s => s.id === 'edit')?.tools.map((tool) => (
                <Tooltip key={tool.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={tool.variant || (isToolActive(tool.id) ? "default" : "ghost")}
                      size="sm"
                      onClick={() => handleToolClick(tool.id)}
                      disabled={isToolDisabled(tool)}
                      className={cn(
                        "h-9 w-9 p-0",
                        isToolActive(tool.id) && !tool.variant && "bg-orange-600 text-white hover:bg-orange-700"
                      )}
                    >
                      <tool.icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tool.description}</p>
                    {tool.shortcut && <p className="text-xs text-muted-foreground">{tool.shortcut}</p>}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Center Section - Zoom & Status */}
          <div className="flex items-center space-x-4">
            {/* Zoom Controls */}
            <div className="flex items-center space-x-1 bg-slate-100 rounded-lg p-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onZoomChange(Math.max(zoom / 1.2, 0.1))}
                    className="h-8 w-8 p-0"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Zoom Out</p>
                  <p className="text-xs text-muted-foreground">Ctrl -</p>
                </TooltipContent>
              </Tooltip>

              <div className="px-2 py-1 min-w-[60px] text-center">
                <span className="text-sm font-medium">{Math.round(zoom * 100)}%</span>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onZoomChange(Math.min(zoom * 1.2, 5))}
                    className="h-8 w-8 p-0"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Zoom In</p>
                  <p className="text-xs text-muted-foreground">Ctrl +</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onZoomChange(1)}
                    className="h-8 w-8 p-0"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Fit to Screen</p>
                  <p className="text-xs text-muted-foreground">Ctrl 0</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Status */}
            <div className="flex items-center space-x-2">
              {selectedElements.length > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  {selectedElements.length} selected
                </Badge>
              )}
              
              <div className="flex items-center space-x-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={showGrid ? "default" : "ghost"}
                      size="sm"
                      onClick={onGridToggle}
                      className={cn(
                        "h-8 w-8 p-0",
                        showGrid && "bg-slate-600 text-white hover:bg-slate-700"
                      )}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Toggle Grid</p>
                    <p className="text-xs text-muted-foreground">G</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={showLayers ? "default" : "ghost"}
                      size="sm"
                      onClick={onLayersToggle}
                      className={cn(
                        "h-8 w-8 p-0",
                        showLayers && "bg-slate-600 text-white hover:bg-slate-700"
                      )}
                    >
                      <Layers className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Toggle Layers</p>
                    <p className="text-xs text-muted-foreground">L</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Right Section - File Operations */}
          <div className="flex items-center space-x-1">
            {/* Undo/Redo */}
            <div className="flex items-center space-x-1 pr-2 border-r border-slate-200">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onUndo}
                    disabled={!canUndo}
                    className="h-9 w-9 p-0"
                  >
                    <Undo className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Undo</p>
                  <p className="text-xs text-muted-foreground">Ctrl Z</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRedo}
                    disabled={!canRedo}
                    className="h-9 w-9 p-0"
                  >
                    <Redo className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Redo</p>
                  <p className="text-xs text-muted-foreground">Ctrl Y</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* File Operations */}
            <div className="flex items-center space-x-1">
              {TOOLBAR_SECTIONS.find(s => s.id === 'file')?.tools.map((tool) => (
                <Tooltip key={tool.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={tool.variant || "ghost"}
                      size="sm"
                      onClick={() => handleToolClick(tool.id)}
                      className={cn(
                        "h-9 w-9 p-0",
                        tool.id === 'save' && "bg-green-600 text-white hover:bg-green-700"
                      )}
                    >
                      <tool.icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tool.description}</p>
                    {tool.shortcut && <p className="text-xs text-muted-foreground">{tool.shortcut}</p>}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>

            {/* Settings */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowShortcuts(!showShortcuts)}
                  className="h-9 w-9 p-0"
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Keyboard Shortcuts</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Expanded Toolbar (Optional) */}
        {showShortcuts && (
          <div className="px-4 py-2 border-t border-slate-200/60 bg-slate-50/50">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {TOOLBAR_SECTIONS.map((section) => (
                <div key={section.id} className="space-y-1">
                  <h4 className="font-medium text-slate-700">{section.name}</h4>
                  <div className="space-y-1">
                    {section.tools.map((tool) => (
                      <div key={tool.id} className="flex items-center justify-between">
                        <span className="text-slate-600">{tool.name}</span>
                        {tool.shortcut && (
                          <kbd className="px-1 py-0.5 bg-slate-200 rounded text-xs">
                            {tool.shortcut}
                          </kbd>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
