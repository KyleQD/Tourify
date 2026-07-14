"use client"

import { FileCheck2, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { getAgreementBody, groupFieldsBySection, isAgreementField } from "@/lib/hiring/template-builder-utils"
import type { OnboardingFormField } from "@/types/onboarding-template-resolver"

interface TemplatePreviewProps {
  fields: OnboardingFormField[]
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  textarea: "Long text",
  email: "Email",
  phone: "Phone",
  number: "Number",
  date: "Date",
  select: "Dropdown",
  multiselect: "Multi-select",
  checkbox: "Checkbox",
  address: "Address",
  emergency_contact: "Emergency contact",
  tax_info: "Tax form",
  bank_info: "Payment info",
  id_document: "Government ID",
  file: "File upload",
  waiver: "Agreement",
  training_acknowledgement: "Acknowledgement",
}

export function TemplatePreview({ fields }: TemplatePreviewProps) {
  const sections = groupFieldsBySection(fields)

  if (fields.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-700/60 bg-slate-900/30 p-6 text-center text-sm text-muted-foreground">
        Add fields to preview the worker experience.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {sections.map(({ section, fields: sectionFields }) => (
        <div key={section} className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{section}</h3>
          <div className="space-y-3">
            {sectionFields.map((field) => (
              <div key={field.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {isAgreementField(field) ? (
                    <ShieldCheck className="h-4 w-4 text-cyan-300" />
                  ) : (
                    <FileCheck2 className="h-4 w-4 text-slate-400" />
                  )}
                  <span className="text-sm font-medium text-white">{field.label}</span>
                  {field.required || field.blocking ? <span className="text-rose-300">*</span> : null}
                  <Badge variant="outline" className="ml-auto text-[10px] uppercase">
                    {FIELD_TYPE_LABELS[field.type] ?? field.type}
                  </Badge>
                  {field.requiresAdminReview ? <Badge variant="secondary">Admin review</Badge> : null}
                </div>
                {field.helpText ? <p className="mt-2 text-xs text-slate-400">{field.helpText}</p> : null}
                {isAgreementField(field) ? (
                  <div className="mt-3 space-y-2">
                    <p className="max-h-32 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs leading-relaxed text-slate-300">
                      {getAgreementBody(field) || "Agreement text will appear here."}
                    </p>
                    <label className="flex items-center gap-2 text-xs text-slate-300">
                      <span className="flex h-4 w-4 items-center justify-center rounded border border-slate-600" />
                      I agree
                    </label>
                  </div>
                ) : null}
                {(field.type === "select" || field.type === "multiselect") && Array.isArray(field.options) ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {field.options.map((option) => (
                      <Badge key={String(option)} variant="outline" className="text-[10px]">
                        {String(option)}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
