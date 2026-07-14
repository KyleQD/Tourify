"use client"

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { isAgreementField } from "@/lib/hiring/template-builder-utils"
import type { OnboardingFormField } from "@/types/onboarding-template-resolver"

interface FieldEditorCardProps {
  field: OnboardingFormField
  index: number
  total: number
  readOnly?: boolean
  onChange: (next: OnboardingFormField) => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
}

const AGREEMENT_TYPES = ["worker", "safety", "volunteer", "media_release", "nda", "security_conduct", "policy"]

export function FieldEditorCard({ field, index, total, readOnly, onChange, onRemove, onMove }: FieldEditorCardProps) {
  const agreement = isAgreementField(field)
  const metadata = (field.metadata as Record<string, unknown> | undefined) ?? {}

  function update(patch: Partial<OnboardingFormField>) {
    onChange({ ...field, ...patch })
  }

  function updateMetadata(patch: Record<string, unknown>) {
    onChange({ ...field, metadata: { ...metadata, ...patch } })
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px] uppercase">
          {field.type}
        </Badge>
        {agreement ? <Badge variant="secondary">Agreement</Badge> : null}
        <span className="ml-auto flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={readOnly || index === 0} onClick={() => onMove(-1)}>
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={readOnly || index === total - 1} onClick={() => onMove(1)}>
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-rose-300" disabled={readOnly} onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Label</Label>
          <Input value={field.label} disabled={readOnly} onChange={(e) => update({ label: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Section</Label>
          <Input value={field.section ?? ""} disabled={readOnly} onChange={(e) => update({ section: e.target.value })} />
        </div>
      </div>

      {(field.type === "select" || field.type === "multiselect") ? (
        <div className="space-y-1">
          <Label className="text-xs">Options (comma separated)</Label>
          <Input
            value={(field.options ?? []).map((option) => String(option)).join(", ")}
            disabled={readOnly}
            onChange={(e) => update({ options: e.target.value.split(",").map((value) => value.trim()).filter(Boolean) })}
          />
        </div>
      ) : null}

      {field.type === "date" ? (
        <div className="space-y-1">
          <Label className="text-xs">Minimum age</Label>
          <Input
            type="number"
            min={0}
            value={field.validation?.minimumAge ?? ""}
            disabled={readOnly}
            onChange={(e) =>
              update({
                validation: { ...field.validation, minimumAge: e.target.value ? Number(e.target.value) : undefined },
              })
            }
          />
        </div>
      ) : null}

      {agreement ? (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Agreement type</Label>
            <select
              value={typeof metadata.agreementType === "string" ? metadata.agreementType : "policy"}
              disabled={readOnly}
              onChange={(e) => updateMetadata({ agreementType: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            >
              {AGREEMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Agreement text (worker accepts with one click)</Label>
            <Textarea
              rows={4}
              value={typeof metadata.agreementBody === "string" ? metadata.agreementBody : ""}
              disabled={readOnly}
              onChange={(e) => updateMetadata({ agreementBody: e.target.value, requiresAcknowledgement: true })}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <Label className="text-xs">Help text</Label>
          <Input value={field.helpText ?? ""} disabled={readOnly} onChange={(e) => update({ helpText: e.target.value })} />
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-xs text-slate-300">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={Boolean(field.required)} disabled={readOnly} onChange={(e) => update({ required: e.target.checked })} className="h-4 w-4 rounded border-slate-600 bg-slate-900" />
          Required
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={Boolean(field.blocking)} disabled={readOnly} onChange={(e) => update({ blocking: e.target.checked })} className="h-4 w-4 rounded border-slate-600 bg-slate-900" />
          Blocks submission
        </label>
        {field.type === "file" || field.type === "id_document" ? (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={Boolean(field.requiresAdminReview)} disabled={readOnly} onChange={(e) => update({ requiresAdminReview: e.target.checked })} className="h-4 w-4 rounded border-slate-600 bg-slate-900" />
            Admin review
          </label>
        ) : null}
      </div>
    </div>
  )
}
