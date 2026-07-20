'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ArrowLeft, ArrowRight, Loader2, MapPin, Upload } from 'lucide-react'
import {
  GROUND_SIZE_PRESETS,
  assertGroundSizeWithinLimit,
  formatGroundSizeLabel,
  feetToUnit,
  normalizeScaleUnit,
  presetToWorldSize,
  type ScaleUnit,
} from '@/lib/site-map/ground-size'

export interface SiteMapCreateFormState {
  name: string
  description: string
  approximateSize: string
  templateId: string
  backgroundImage: File | null
  /** Real-world units per map unit (default 1 = 1 ft or 1 m per unit). */
  pixelsPerUnit: string
  scaleUnit: ScaleUnit
  customGroundWidth: string
  customGroundHeight: string
}

export interface MapTemplateOption {
  id: string
  name: string
  category: string
  description?: string
}

export const defaultCreateForm: SiteMapCreateFormState = {
  name: '',
  description: '',
  approximateSize: 'parking',
  templateId: 'blank',
  backgroundImage: null,
  pixelsPerUnit: '1',
  scaleUnit: 'feet',
  customGroundWidth: '500',
  customGroundHeight: '400',
}

/** @deprecated Use GROUND_SIZE_PRESETS — kept for import compatibility. */
export const sizePresets = Object.fromEntries(
  Object.entries(GROUND_SIZE_PRESETS).map(([key, preset]) => [
    key,
    {
      width: preset.groundWidthFt,
      height: preset.groundHeightFt,
      label: preset.label,
      hint: preset.hint,
    },
  ])
) as Record<string, { width: number; height: number; label: string; hint: string }>

interface SiteMapCreateSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: SiteMapCreateFormState
  onFormChange: (next: SiteMapCreateFormState) => void
  templates: MapTemplateOption[]
  eventId?: string
  tourId?: string
  eventLabel?: string | null
  isCreating?: boolean
  onSubmit: () => void | Promise<void>
}

export function resolveCreateWorldSize(form: SiteMapCreateFormState) {
  const scale = Number(form.pixelsPerUnit) || 1
  const unit = normalizeScaleUnit(form.scaleUnit)
  return presetToWorldSize({
    presetId: form.approximateSize,
    scaleUnit: unit,
    scale,
    customGroundWidth: Number(form.customGroundWidth) || undefined,
    customGroundHeight: Number(form.customGroundHeight) || undefined,
  })
}

export function SiteMapCreateSheet({
  open,
  onOpenChange,
  form,
  onFormChange,
  templates,
  eventId,
  tourId,
  eventLabel,
  isCreating,
  onSubmit,
}: SiteMapCreateSheetProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [nameTouched, setNameTouched] = useState(false)

  useEffect(() => {
    if (!open) {
      setStep(1)
      setNameTouched(false)
    }
  }, [open])

  const nameInvalid = nameTouched && !form.name.trim()
  const canContinue = Boolean(form.name.trim())

  const preview = useMemo(() => {
    try {
      const world = resolveCreateWorldSize(form)
      const limit = assertGroundSizeWithinLimit(world)
      return {
        world,
        label: formatGroundSizeLabel(world),
        error: limit.ok ? null : limit.error,
      }
    } catch (error) {
      return {
        world: null,
        label: '—',
        error: error instanceof Error ? error.message : 'Invalid ground size',
      }
    }
  }, [form])

  const presetKeys = Object.keys(GROUND_SIZE_PRESETS)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-teal-900/40 bg-[#0c1219]/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-white tracking-tight">Create Site Map</DialogTitle>
          <div className="mt-2 flex items-center gap-2">
            <Badge
              className={cn(
                'rounded-md text-[10px] uppercase tracking-wide',
                step === 1 ? 'border-teal-400/40 bg-teal-400/15 text-teal-100' : 'border-slate-600 bg-slate-800 text-slate-400'
              )}
            >
              1 · Essentials
            </Badge>
            <div className="h-px flex-1 bg-slate-700/60" />
            <Badge
              className={cn(
                'rounded-md text-[10px] uppercase tracking-wide',
                step === 2 ? 'border-amber-400/40 bg-amber-400/15 text-amber-100' : 'border-slate-600 bg-slate-800 text-slate-400'
              )}
            >
              2 · Ground size
            </Badge>
          </div>
        </DialogHeader>

        <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 px-3 py-2 text-xs text-teal-100/90">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {eventId || tourId ? (
              <span>
                Scoped to {eventLabel || (eventId ? 'selected event' : 'tour')}
                {tourId && !eventId ? ' (tour)' : ''}
              </span>
            ) : (
              <span>
                No event linked — create now and attach an event later if needed.
              </span>
            )}
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Name</Label>
              <Input
                value={form.name}
                onBlur={() => setNameTouched(true)}
                onChange={(e) => onFormChange({ ...form, name: e.target.value })}
                placeholder="Main stage layout"
                className={cn(
                  'mt-1 border-slate-700 bg-slate-950 text-white',
                  nameInvalid && 'border-rose-500/60'
                )}
              />
              {nameInvalid && <p className="mt-1 text-[11px] text-rose-400">Name is required</p>}
            </div>

            <div>
              <Label className="text-slate-300">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => onFormChange({ ...form, description: e.target.value })}
                placeholder="Optional notes for the crew"
                className="mt-1 min-h-[72px] border-slate-700 bg-slate-950 text-white"
              />
            </div>

            <div>
              <Label className="mb-2 block text-slate-300">Ground size (max 1×1 mile)</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {presetKeys.map((key) => {
                  const preset = GROUND_SIZE_PRESETS[key]
                  const active = form.approximateSize === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        const unit = normalizeScaleUnit(form.scaleUnit)
                        onFormChange({
                          ...form,
                          approximateSize: key,
                          customGroundWidth: String(Math.round(feetToUnit(preset.groundWidthFt, unit))),
                          customGroundHeight: String(Math.round(feetToUnit(preset.groundHeightFt, unit))),
                        })
                      }}
                      className={cn(
                        'rounded-lg border px-2 py-2.5 text-left transition',
                        active
                          ? 'border-teal-400/45 bg-teal-400/10 text-white'
                          : 'border-slate-700/60 bg-slate-950/60 text-slate-300 hover:border-slate-500'
                      )}
                    >
                      <div className="text-xs font-semibold">{preset.label}</div>
                      <div className="font-mono text-[10px] text-slate-500">{preset.hint}</div>
                    </button>
                  )
                })}
              </div>
              {form.approximateSize === 'custom' && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-slate-400">Width ({form.scaleUnit})</Label>
                    <Input
                      type="number"
                      min="1"
                      value={form.customGroundWidth}
                      onChange={(e) => onFormChange({ ...form, customGroundWidth: e.target.value })}
                      className="mt-1 border-slate-700 bg-slate-950 font-mono text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-400">Height ({form.scaleUnit})</Label>
                    <Input
                      type="number"
                      min="1"
                      value={form.customGroundHeight}
                      onChange={(e) => onFormChange({ ...form, customGroundHeight: e.target.value })}
                      className="mt-1 border-slate-700 bg-slate-950 font-mono text-white"
                    />
                  </div>
                </div>
              )}
              <p className="mt-2 font-mono text-[11px] text-amber-200/90">
                Preview: {preview.label}
                {preview.error ? <span className="ml-2 text-rose-400">{preview.error}</span> : null}
              </p>
            </div>

            <div>
              <Label className="text-slate-300">Template</Label>
              <Select
                value={form.templateId}
                onValueChange={(value) => onFormChange({ ...form, templateId: value })}
              >
                <SelectTrigger className="mt-1 border-slate-700 bg-slate-950 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blank">Blank canvas</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                disabled={!canContinue || Boolean(preview.error)}
                className="bg-teal-500 text-slate-950 hover:bg-teal-400"
                onClick={() => setStep(2)}
              >
                Continue
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Floor plan / aerial (optional)</Label>
              <label className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-600 bg-slate-950/50 px-4 py-6 text-center hover:border-teal-400/40">
                <Upload className="mb-2 h-5 w-5 text-slate-400" />
                <span className="text-xs text-slate-300">
                  {form.backgroundImage ? form.backgroundImage.name : 'Choose image file'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    onFormChange({ ...form, backgroundImage: e.target.files?.[0] || null })
                  }
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-300">Units per map unit</Label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={form.pixelsPerUnit}
                  onChange={(e) => onFormChange({ ...form, pixelsPerUnit: e.target.value })}
                  className="mt-1 border-slate-700 bg-slate-950 font-mono text-white"
                />
                <p className="mt-1 text-[10px] text-slate-500">Default 1 = one foot/meter per grid unit</p>
              </div>
              <div>
                <Label className="text-slate-300">Unit</Label>
                <Select
                  value={form.scaleUnit}
                  onValueChange={(value: ScaleUnit) =>
                    onFormChange({ ...form, scaleUnit: value })
                  }
                >
                  <SelectTrigger className="mt-1 border-slate-700 bg-slate-950 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feet">Feet</SelectItem>
                    <SelectItem value="meters">Meters</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border border-slate-700/60 bg-slate-950/70 px-3 py-2 font-mono text-[11px] text-slate-300">
              World: {preview.world ? `${preview.world.width}×${preview.world.height} units` : '—'} · Ground: {preview.label}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                className="text-slate-300"
                onClick={() => setStep(1)}
                disabled={isCreating}
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back
              </Button>
              <Button
                type="button"
                disabled={isCreating || !canContinue || Boolean(preview.error)}
                className="bg-amber-500 text-slate-950 hover:bg-amber-400"
                onClick={() => void onSubmit()}
              >
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create & open builder
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
