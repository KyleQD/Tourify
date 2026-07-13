'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ArrowLeft, ArrowRight, Loader2, MapPin, Upload } from 'lucide-react'

export interface SiteMapCreateFormState {
  name: string
  description: string
  approximateSize: string
  templateId: string
  backgroundImage: File | null
  pixelsPerUnit: string
  scaleUnit: 'feet' | 'meters'
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
  approximateSize: 'medium',
  templateId: 'blank',
  backgroundImage: null,
  pixelsPerUnit: '1',
  scaleUnit: 'meters',
}

export const sizePresets = {
  small: { width: 800, height: 600, label: 'Small', hint: '800×600' },
  medium: { width: 1200, height: 900, label: 'Medium', hint: '1200×900' },
  large: { width: 1600, height: 1200, label: 'Large', hint: '1600×1200' },
  xlarge: { width: 2000, height: 1500, label: 'X-Large', hint: '2000×1500' },
} as const

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-slate-700/60 bg-slate-950/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-white">Create Site Map</DialogTitle>
          <div className="mt-2 flex items-center gap-2">
            <Badge
              className={cn(
                'text-[10px] uppercase tracking-wide',
                step === 1 ? 'border-cyan-400/40 bg-cyan-400/15 text-cyan-100' : 'border-slate-600 bg-slate-800 text-slate-400'
              )}
            >
              1 · Essentials
            </Badge>
            <div className="h-px flex-1 bg-slate-700/60" />
            <Badge
              className={cn(
                'text-[10px] uppercase tracking-wide',
                step === 2 ? 'border-cyan-400/40 bg-cyan-400/15 text-cyan-100' : 'border-slate-600 bg-slate-800 text-slate-400'
              )}
            >
              2 · Layout
            </Badge>
          </div>
        </DialogHeader>

        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-100/90">
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
                  'mt-1 border-slate-700 bg-slate-900 text-white',
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
                className="mt-1 min-h-[72px] border-slate-700 bg-slate-900 text-white"
              />
            </div>

            <div>
              <Label className="mb-2 block text-slate-300">Canvas size</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(sizePresets) as Array<keyof typeof sizePresets>).map((key) => {
                  const preset = sizePresets[key]
                  const active = form.approximateSize === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onFormChange({ ...form, approximateSize: key })}
                      className={cn(
                        'rounded-xl border px-2 py-2.5 text-left transition',
                        active
                          ? 'border-cyan-400/40 bg-cyan-400/10 text-white'
                          : 'border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-slate-500'
                      )}
                    >
                      <div className="text-xs font-semibold">{preset.label}</div>
                      <div className="text-[10px] text-slate-500">{preset.hint}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Template</Label>
              <Select
                value={form.templateId}
                onValueChange={(value) => onFormChange({ ...form, templateId: value })}
              >
                <SelectTrigger className="mt-1 border-slate-700 bg-slate-900 text-white">
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
              <p className="mt-1 text-[11px] text-slate-500">
                {form.templateId === 'blank'
                  ? 'Start empty and place zones, structures, and elements in the builder.'
                  : templates.find((t) => t.id === form.templateId)?.description || 'Seeds starter elements from the template.'}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                disabled={!canContinue}
                className="bg-cyan-500/90 text-slate-950 hover:bg-cyan-400"
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
              <label className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900/50 px-4 py-6 text-center hover:border-cyan-400/40">
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
                <Label className="text-slate-300">Pixels per unit</Label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={form.pixelsPerUnit}
                  onChange={(e) => onFormChange({ ...form, pixelsPerUnit: e.target.value })}
                  className="mt-1 border-slate-700 bg-slate-900 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Unit</Label>
                <Select
                  value={form.scaleUnit}
                  onValueChange={(value: 'feet' | 'meters') =>
                    onFormChange({ ...form, scaleUnit: value })
                  }
                >
                  <SelectTrigger className="mt-1 border-slate-700 bg-slate-900 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meters">Meters</SelectItem>
                    <SelectItem value="feet">Feet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                disabled={isCreating || !canContinue}
                className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
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
