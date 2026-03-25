'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { 
  Copy, 
  Plus, 
  Minus,
  RotateCw,
  Move,
  Grid,
  Circle,
  Square,
  ArrowRight,
  ArrowDown,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownRight,
  Settings,
  Check,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DuplicationSystemProps {
  selectedElements: string[]
  onDuplicate: (type: 'single' | 'multiple' | 'array', options: DuplicationOptions) => void
  className?: string
}

interface DuplicationOptions {
  // Single duplication
  offsetX?: number
  offsetY?: number
  mirror?: 'none' | 'horizontal' | 'vertical' | 'both'
  
  // Multiple duplication
  count?: number
  spacingX?: number
  spacingY?: number
  
  // Array duplication
  arrayType?: 'linear' | 'grid' | 'radial'
  rows?: number
  columns?: number
  spacing?: number
  angle?: number
  radius?: number
}

interface ArrayPreview {
  positions: Array<{ x: number; y: number; rotation: number }>
  totalWidth: number
  totalHeight: number
}

export function DuplicationSystem({ selectedElements, onDuplicate, className }: DuplicationSystemProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [duplicationType, setDuplicationType] = useState<'single' | 'multiple' | 'array'>('single')
  const [options, setOptions] = useState<DuplicationOptions>({
    offsetX: 20,
    offsetY: 0,
    mirror: 'none',
    count: 3,
    spacingX: 100,
    spacingY: 100,
    arrayType: 'linear',
    rows: 3,
    columns: 3,
    spacing: 50,
    angle: 0,
    radius: 100
  })

  const hasSelection = selectedElements.length > 0

  // Generate array preview
  const generateArrayPreview = useCallback((): ArrayPreview => {
    if (duplicationType !== 'array' || !options.rows || !options.columns) {
      return { positions: [], totalWidth: 0, totalHeight: 0 }
    }

    const positions: Array<{ x: number; y: number; rotation: number }> = []
    const spacing = options.spacing || 50
    const angle = (options.angle || 0) * (Math.PI / 180)

    if (options.arrayType === 'linear') {
      // Linear array (horizontal or vertical)
      const direction = options.rows === 1 ? 'horizontal' : 'vertical'
      
      for (let i = 0; i < options.rows * options.columns; i++) {
        const x = direction === 'horizontal' ? i * spacing : 0
        const y = direction === 'vertical' ? i * spacing : 0
        positions.push({ x, y, rotation: angle })
      }
    } else if (options.arrayType === 'grid') {
      // Grid array
      for (let row = 0; row < options.rows; row++) {
        for (let col = 0; col < options.columns; col++) {
          positions.push({
            x: col * spacing,
            y: row * spacing,
            rotation: angle
          })
        }
      }
    } else if (options.arrayType === 'radial') {
      // Radial array
      const radius = options.radius || 100
      const totalElements = options.rows * options.columns
      const angleStep = (2 * Math.PI) / totalElements

      for (let i = 0; i < totalElements; i++) {
        const elementAngle = i * angleStep
        positions.push({
          x: Math.cos(elementAngle) * radius,
          y: Math.sin(elementAngle) * radius,
          rotation: angle
        })
      }
    }

    // Calculate total dimensions
    const xs = positions.map(p => p.x)
    const ys = positions.map(p => p.y)
    const totalWidth = Math.max(...xs) - Math.min(...xs) + 100 // Add element width
    const totalHeight = Math.max(...ys) - Math.min(...ys) + 100 // Add element height

    return { positions, totalWidth, totalHeight }
  }, [duplicationType, options])

  const arrayPreview = generateArrayPreview()

  const handleApply = () => {
    onDuplicate(duplicationType, options)
    setShowDialog(false)
  }

  const updateOption = (key: keyof DuplicationOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Quick Actions */}
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDuplicate('single', { offsetX: 20, offsetY: 0 })}
          disabled={!hasSelection}
          className="flex items-center gap-2"
        >
          <Copy className="h-4 w-4" />
          Duplicate
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDialog(true)}
          disabled={!hasSelection}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Advanced
        </Button>

        {!hasSelection && (
          <span className="text-sm text-slate-500">Select elements to duplicate</span>
        )}
      </div>

      {/* Advanced Duplication Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Advanced Duplication
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Duplication Type */}
            <div className="space-y-3">
              <Label>Duplication Type</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={duplicationType === 'single' ? 'default' : 'outline'}
                  onClick={() => setDuplicationType('single')}
                  className="flex flex-col items-center gap-2 h-20"
                >
                  <Copy className="h-5 w-5" />
                  <span className="text-sm">Single</span>
                </Button>
                <Button
                  variant={duplicationType === 'multiple' ? 'default' : 'outline'}
                  onClick={() => setDuplicationType('multiple')}
                  className="flex flex-col items-center gap-2 h-20"
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-sm">Multiple</span>
                </Button>
                <Button
                  variant={duplicationType === 'array' ? 'default' : 'outline'}
                  onClick={() => setDuplicationType('array')}
                  className="flex flex-col items-center gap-2 h-20"
                >
                  <Grid className="h-5 w-5" />
                  <span className="text-sm">Array</span>
                </Button>
              </div>
            </div>

            {/* Single Duplication Options */}
            {duplicationType === 'single' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="offsetX">Offset X (px)</Label>
                    <Input
                      id="offsetX"
                      type="number"
                      value={options.offsetX}
                      onChange={(e) => updateOption('offsetX', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="offsetY">Offset Y (px)</Label>
                    <Input
                      id="offsetY"
                      type="number"
                      value={options.offsetY}
                      onChange={(e) => updateOption('offsetY', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Mirror</Label>
                  <Select value={options.mirror} onValueChange={(value: any) => updateOption('mirror', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="horizontal">Horizontal</SelectItem>
                      <SelectItem value="vertical">Vertical</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Multiple Duplication Options */}
            {duplicationType === 'multiple' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="count">Number of Copies</Label>
                  <Input
                    id="count"
                    type="number"
                    min="1"
                    max="20"
                    value={options.count}
                    onChange={(e) => updateOption('count', parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="spacingX">Spacing X (px)</Label>
                    <Input
                      id="spacingX"
                      type="number"
                      value={options.spacingX}
                      onChange={(e) => updateOption('spacingX', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="spacingY">Spacing Y (px)</Label>
                    <Input
                      id="spacingY"
                      type="number"
                      value={options.spacingY}
                      onChange={(e) => updateOption('spacingY', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Array Duplication Options */}
            {duplicationType === 'array' && (
              <div className="space-y-4">
                <div>
                  <Label>Array Type</Label>
                  <Select value={options.arrayType} onValueChange={(value: any) => updateOption('arrayType', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linear">Linear</SelectItem>
                      <SelectItem value="grid">Grid</SelectItem>
                      <SelectItem value="radial">Radial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rows">Rows</Label>
                    <Input
                      id="rows"
                      type="number"
                      min="1"
                      max="10"
                      value={options.rows}
                      onChange={(e) => updateOption('rows', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="columns">Columns</Label>
                    <Input
                      id="columns"
                      type="number"
                      min="1"
                      max="10"
                      value={options.columns}
                      onChange={(e) => updateOption('columns', parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="spacing">Spacing (px)</Label>
                  <Slider
                    id="spacing"
                    min={10}
                    max={200}
                    step={10}
                    value={[options.spacing || 50]}
                    onValueChange={(value) => updateOption('spacing', value[0])}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>10px</span>
                    <span>{options.spacing || 50}px</span>
                    <span>200px</span>
                  </div>
                </div>

                {options.arrayType === 'radial' && (
                  <div>
                    <Label htmlFor="radius">Radius (px)</Label>
                    <Slider
                      id="radius"
                      min={50}
                      max={300}
                      step={10}
                      value={[options.radius || 100]}
                      onValueChange={(value) => updateOption('radius', value[0])}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>50px</span>
                      <span>{options.radius || 100}px</span>
                      <span>300px</span>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="angle">Rotation Angle (degrees)</Label>
                  <Slider
                    id="angle"
                    min={0}
                    max={360}
                    step={15}
                    value={[options.angle || 0]}
                    onValueChange={(value) => updateOption('angle', value[0])}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>0°</span>
                    <span>{options.angle || 0}°</span>
                    <span>360°</span>
                  </div>
                </div>
              </div>
            )}

            {/* Preview */}
            {duplicationType === 'array' && arrayPreview.positions.length > 0 && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <Card className="p-4">
                  <div className="relative w-full h-32 bg-slate-100 rounded border overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative" style={{ 
                        width: arrayPreview.totalWidth, 
                        height: arrayPreview.totalHeight 
                      }}>
                        {arrayPreview.positions.map((pos, index) => (
                          <div
                            key={index}
                            className="absolute w-4 h-4 bg-blue-500 rounded border-2 border-blue-600"
                            style={{
                              left: pos.x - 8,
                              top: pos.y - 8,
                              transform: `rotate(${pos.rotation}deg)`
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-slate-600">
                    <span>{arrayPreview.positions.length} elements</span>
                    <span>{Math.round(arrayPreview.totalWidth)} × {Math.round(arrayPreview.totalHeight)}px</span>
                  </div>
                </Card>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleApply} className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Apply Duplication
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Hook for managing duplication state
export function useDuplication() {
  const [duplicationHistory, setDuplicationHistory] = useState<Array<{
    id: string
    type: 'single' | 'multiple' | 'array'
    options: DuplicationOptions
    timestamp: Date
  }>>([])

  const addToHistory = useCallback((type: 'single' | 'multiple' | 'array', options: DuplicationOptions) => {
    const newEntry = {
      id: `dup_${Date.now()}`,
      type,
      options,
      timestamp: new Date()
    }
    setDuplicationHistory(prev => [newEntry, ...prev.slice(0, 9)]) // Keep last 10
  }, [])

  const clearHistory = useCallback(() => {
    setDuplicationHistory([])
  }, [])

  return {
    duplicationHistory,
    addToHistory,
    clearHistory
  }
}
