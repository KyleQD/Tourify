'use client'

import React, { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Minus, Plus, Ruler, Tent, Layers, MapPin } from 'lucide-react'

interface PublicSiteMapViewerProps {
  siteMap: any
}

function getNumber(value: any, fallback: number) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

export function PublicSiteMapViewer({ siteMap }: PublicSiteMapViewerProps) {
  const [zoom, setZoom] = useState(1)
  const zones = siteMap.zones || []
  const tents = siteMap.tents || []
  const elements = siteMap.elements || []
  const measurements = siteMap.measurements || []
  const visibleLayers = siteMap.layers || []
  const width = getNumber(siteMap.width, 1000)
  const height = getNumber(siteMap.height, 1000)

  const objectCount = zones.length + tents.length + elements.length
  const scaleLabel = siteMap.scale ? `${siteMap.scale} ${siteMap.scale_unit || 'meters'} / px` : null

  const measurementLines = useMemo(() => measurements.map((measurement: any) => {
    const startX = getNumber(measurement.start_x ?? measurement.startX, 0)
    const startY = getNumber(measurement.start_y ?? measurement.startY, 0)
    const endX = getNumber(measurement.end_x ?? measurement.endX, startX)
    const endY = getNumber(measurement.end_y ?? measurement.endY, startY)
    return { ...measurement, startX, startY, endX, endY }
  }), [measurements])

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="border-b border-white/10 bg-neutral-950/95 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold truncate">{siteMap.name}</h1>
            {siteMap.description && <p className="text-xs text-neutral-400 truncate">{siteMap.description}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className="border-white/15 bg-white/5 text-neutral-200">
              <MapPin className="mr-1 h-3 w-3" />
              {objectCount} objects
            </Badge>
            <Badge variant="outline" className="border-white/15 bg-white/5 text-neutral-200">
              <Layers className="mr-1 h-3 w-3" />
              {visibleLayers.length} layers
            </Badge>
            <Badge variant="outline" className="border-white/15 bg-white/5 text-neutral-200">
              <Ruler className="mr-1 h-3 w-3" />
              {measurements.length} measurements
            </Badge>
            {scaleLabel && <span className="text-neutral-500">{scaleLabel}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-white/10 bg-neutral-900 px-4 py-2">
        <div className="text-xs text-neutral-400">
          Read-only shared map
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-neutral-300" onClick={() => setZoom(value => Math.max(0.25, value - 0.1))}>
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-12 text-center text-xs text-neutral-300">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-neutral-300" onClick={() => setZoom(value => Math.min(3, value + 0.1))}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="h-[calc(100vh-105px)] overflow-auto bg-neutral-950 p-4">
        <div
          className="relative origin-top-left overflow-hidden border border-white/10 bg-neutral-900 shadow-2xl"
          style={{
            width,
            height,
            transform: `scale(${zoom})`,
            backgroundColor: siteMap.background_color || '#111827',
            backgroundImage: siteMap.background_image_url ? `url(${siteMap.background_image_url})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {siteMap.grid_enabled && (
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(255,255,255,.18) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(255,255,255,.18) 1px, transparent 1px)
                `,
                backgroundSize: `${siteMap.grid_size || 20}px ${siteMap.grid_size || 20}px`,
              }}
            />
          )}

          {zones.map((zone: any, index: number) => {
            const x = getNumber(zone.x, 80 + index * 24)
            const y = getNumber(zone.y, 80 + index * 24)
            const zoneWidth = getNumber(zone.width, 220)
            const zoneHeight = getNumber(zone.height, 140)
            return (
              <div
                key={zone.id || index}
                className="absolute border-2 border-dashed px-2 py-1 text-xs font-semibold"
                style={{
                  left: x,
                  top: y,
                  width: zoneWidth,
                  height: zoneHeight,
                  borderColor: zone.border_color || zone.color || '#a855f7',
                  backgroundColor: `${zone.color || '#a855f7'}33`,
                  transform: `rotate(${zone.rotation || 0}deg)`,
                }}
              >
                <span className="rounded bg-neutral-950/80 px-2 py-0.5">{zone.name}</span>
              </div>
            )
          })}

          {tents.map((tent: any, index: number) => {
            const x = getNumber(tent.x, 120 + (index % 5) * 120)
            const y = getNumber(tent.y, 140 + Math.floor(index / 5) * 110)
            const tentWidth = getNumber(tent.width, 100)
            const tentHeight = getNumber(tent.height, 80)
            return (
              <div
                key={tent.id || index}
                className="absolute flex items-center justify-center rounded border bg-neutral-950/85 text-[11px] font-semibold"
                style={{
                  left: x,
                  top: y,
                  width: tentWidth,
                  height: tentHeight,
                  borderColor: tent.status === 'maintenance' ? '#ef4444' : '#38bdf8',
                  transform: `rotate(${tent.rotation || 0}deg)`,
                }}
              >
                <Tent className="mr-1 h-3 w-3 text-sky-300" />
                <span className="truncate px-1">{tent.tent_number || 'Structure'}</span>
              </div>
            )
          })}

          {elements.map((element: any, index: number) => {
            const x = getNumber(element.x, 0)
            const y = getNumber(element.y, 0)
            return (
              <div
                key={element.id || index}
                className={cn("absolute flex items-end justify-center overflow-hidden rounded border text-[10px] font-semibold", element.name ? "text-white" : "text-transparent")}
                style={{
                  left: x,
                  top: y,
                  width: getNumber(element.width, 60),
                  height: getNumber(element.height, 60),
                  backgroundColor: element.color || '#2563eb',
                  borderColor: element.stroke_color || '#bfdbfe',
                  transform: `rotate(${element.rotation || 0}deg)`,
                  opacity: element.opacity ?? 0.9,
                }}
              >
                {element.name && <span className="w-full truncate bg-black/60 px-1 py-0.5 text-center">{element.name}</span>}
              </div>
            )
          })}

          <svg className="pointer-events-none absolute inset-0" width={width} height={height}>
            {measurementLines.map((measurement: any, index: number) => (
              <g key={measurement.id || index}>
                <line
                  x1={measurement.startX}
                  y1={measurement.startY}
                  x2={measurement.endX}
                  y2={measurement.endY}
                  stroke={measurement.color || '#fb7185'}
                  strokeWidth="3"
                  strokeDasharray="8 6"
                />
                <text
                  x={(measurement.startX + measurement.endX) / 2}
                  y={(measurement.startY + measurement.endY) / 2 - 8}
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {measurement.label || `${measurement.value || ''} ${measurement.unit || ''}`}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  )
}
