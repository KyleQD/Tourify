"use client"

import { useEffect, useMemo, useRef } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type {
  IdDocumentUploadValue,
  OnboardingField,
  OnboardingFieldOption,
  OnboardingResponseValue,
  UploadedOnboardingDocument,
} from "@/types/hiring-worker-onboarding"
import { OnboardingUploadField } from "./onboarding-upload-field"

function hasUploadedDocument(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && "fileName" in value)
}

function hasBothIdSides(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const record = value as IdDocumentUploadValue
  return hasUploadedDocument(record.front) && hasUploadedDocument(record.back)
}

interface DynamicOnboardingFormProps {
  token: string
  fields: OnboardingField[]
  responses: Record<string, OnboardingResponseValue>
  disabled?: boolean
  className?: string
  onResponsesChange: (responses: Record<string, OnboardingResponseValue>) => void
  onValidityChange?: (isValid: boolean) => void
}

function normalizeOptions(options?: Array<string | OnboardingFieldOption>): OnboardingFieldOption[] {
  return (options || []).map((option) => {
    if (typeof option === "string") return { label: option, value: option }
    return option
  })
}

function getAgreementBody(field: OnboardingField): string {
  const body = field.metadata?.agreementBody
  return typeof body === "string" ? body : ""
}

function isAgreementField(field: OnboardingField): boolean {
  return field.type === "waiver" || field.type === "training_acknowledgement"
}

function getFieldSchema(field: OnboardingField): z.ZodTypeAny {
  const requiredMessage = `${field.label} is required.`

  if (field.type === "checkbox" || isAgreementField(field)) {
    const acceptMessage = isAgreementField(field) ? `You must accept "${field.label}" to continue.` : requiredMessage
    return field.required || field.blocking
      ? z.literal(true, { errorMap: () => ({ message: acceptMessage }) })
      : z.boolean().optional().nullable()
  }

  if (field.type === "date") {
    const notFuture = (value: string) => {
      if (!value) return true
      const birthDate = new Date(value)
      if (Number.isNaN(birthDate.getTime())) return false
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      return birthDate.getTime() <= today.getTime()
    }

    const meetsMinimumAge = (value: string) => {
      if (!value || typeof field.validation?.minimumAge !== "number") return true
      const minimumAge = field.validation.minimumAge
      const birthDate = new Date(value)
      if (Number.isNaN(birthDate.getTime())) return false
      const now = new Date()
      let age = now.getFullYear() - birthDate.getFullYear()
      const monthDiff = now.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) age -= 1
      return age >= minimumAge
    }

    const minimumAgeMessage =
      typeof field.validation?.minimumAge === "number"
        ? `You must be at least ${field.validation.minimumAge} years old.`
        : "Invalid date of birth."

    if (field.required || field.blocking) {
      return z
        .string()
        .min(1, requiredMessage)
        .refine(notFuture, { message: "Date of birth cannot be in the future." })
        .refine(meetsMinimumAge, { message: minimumAgeMessage })
    }

    return z
      .string()
      .optional()
      .or(z.literal(""))
      .refine((value) => !value || notFuture(value), { message: "Date of birth cannot be in the future." })
      .refine((value) => !value || meetsMinimumAge(value), { message: minimumAgeMessage })
  }

  if (field.type === "number") {
    let schema = z.coerce.number({ invalid_type_error: requiredMessage })
    if (typeof field.validation?.min === "number") schema = schema.min(field.validation.min)
    if (typeof field.validation?.max === "number") schema = schema.max(field.validation.max)
    return field.required || field.blocking ? schema : schema.optional().nullable()
  }

  if (field.type === "email") {
    const schema = z.string().email("Enter a valid email address.")
    return field.required || field.blocking ? schema.min(1, requiredMessage) : schema.optional().or(z.literal(""))
  }

  if (field.type === "id_document") {
    const schema = z.custom<IdDocumentUploadValue>(
      (value) => hasBothIdSides(value),
      "Upload both the front and back of your government ID."
    )
    return field.required || field.blocking ? schema : schema.optional().nullable()
  }

  if (field.type === "file") {
    const schema = z.custom<UploadedOnboardingDocument>(
      (value) => hasUploadedDocument(value),
      requiredMessage
    )
    return field.required || field.blocking ? schema : schema.optional().nullable()
  }

  if (field.type === "multiselect") {
    const schema = z.array(z.string())
    return field.required || field.blocking ? schema.min(1, requiredMessage) : schema.optional().nullable()
  }

  if (["address", "emergency_contact", "bank_info", "tax_info"].includes(field.type)) {
    const schema = z.record(z.unknown()).refine((value) => Object.values(value || {}).some(Boolean), requiredMessage)
    return field.required || field.blocking ? schema : schema.optional().nullable()
  }

  let schema = z.string()
  if (field.validation?.regex) {
    schema = schema.regex(new RegExp(field.validation.regex), field.validation.message || `${field.label} has an invalid format.`)
  }
  if (typeof field.validation?.min === "number") schema = schema.min(field.validation.min)
  if (typeof field.validation?.max === "number") schema = schema.max(field.validation.max)

  return field.required || field.blocking ? schema.min(1, requiredMessage) : schema.optional().or(z.literal(""))
}

function buildFormSchema(fields: OnboardingField[]) {
  return z.object(
    fields.reduce<Record<string, z.ZodTypeAny>>((shape, field) => {
      shape[field.name] = getFieldSchema(field)
      return shape
    }, {})
  )
}

function getDefaultValue(field: OnboardingField, existingValue: OnboardingResponseValue): OnboardingResponseValue {
  if (typeof existingValue !== "undefined") return existingValue
  if (field.type === "checkbox" || field.type === "waiver" || field.type === "training_acknowledgement") return false
  if (field.type === "multiselect") return []
  if (field.type === "id_document") return {}
  if (["address", "emergency_contact", "bank_info", "tax_info"].includes(field.type)) return {}
  return ""
}

function getInitialValues(fields: OnboardingField[], responses: Record<string, OnboardingResponseValue>) {
  return fields.reduce<Record<string, OnboardingResponseValue>>((values, field) => {
    values[field.name] = getDefaultValue(field, responses[field.name])
    return values
  }, {})
}

function isRecordValue(value: OnboardingResponseValue): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || "fileName" in value) return {}
  return value as Record<string, unknown>
}

const glassInput =
  "rounded-xl border-white/15 bg-slate-950/60 text-slate-100 placeholder:text-slate-500 focus-visible:border-fuchsia-500/50 focus-visible:ring-fuchsia-500/20"
const glassFieldCard =
  "space-y-2 rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl"

function stableSerialize(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function updateNestedRecord({
  currentValue,
  key,
  value,
}: {
  currentValue: OnboardingResponseValue
  key: string
  value: unknown
}) {
  return {
    ...isRecordValue(currentValue),
    [key]: value,
  }
}

/**
 * Template-driven worker onboarding form.
 * It renders real template fields and keeps raw uploaded File objects out of response state.
 */
export function DynamicOnboardingForm({
  token,
  fields,
  responses,
  disabled,
  className,
  onResponsesChange,
  onValidityChange,
}: DynamicOnboardingFormProps) {
  const orderedFields = useMemo(
    () => [...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [fields]
  )
  const formSchema = useMemo(() => buildFormSchema(orderedFields), [orderedFields])

  const form = useForm<Record<string, OnboardingResponseValue>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: getInitialValues(orderedFields, responses),
  })

  const responsesRef = useRef(responses)
  const lastSyncedRef = useRef<string>("")

  useEffect(() => {
    responsesRef.current = responses
  }, [responses])

  // Reset defaults when the active step's fields change (section navigation).
  useEffect(() => {
    const nextDefaults = getInitialValues(orderedFields, responsesRef.current)
    form.reset(nextDefaults)
    lastSyncedRef.current = stableSerialize(nextDefaults)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedFields.map((field) => field.id).join("|")])

  useEffect(() => {
    onValidityChange?.(form.formState.isValid)
  }, [form.formState.isValid, onValidityChange])

  function syncResponsesToParent(nextStepValues: Record<string, OnboardingResponseValue>) {
    const merged = { ...responsesRef.current, ...nextStepValues }
    const serialized = stableSerialize(merged)
    if (serialized === lastSyncedRef.current) return
    lastSyncedRef.current = serialized
    responsesRef.current = merged
    onResponsesChange(merged)
  }

  function setFieldValue(fieldName: string, value: OnboardingResponseValue) {
    form.setValue(fieldName, value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
    const nextStepValues = { ...form.getValues(), [fieldName]: value }
    syncResponsesToParent(nextStepValues)
  }

  function renderPrimitiveField(field: OnboardingField) {
    const error = form.formState.errors[field.name]?.message?.toString()
    const value = form.getValues(field.name)

    if (field.type === "textarea") {
      return (
        <Textarea
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          disabled={disabled}
          rows={4}
          onChange={(event) => setFieldValue(field.name, event.target.value)}
          className={cn(glassInput, error ? "border-rose-500" : undefined)}
        />
      )
    }

    if (["text", "email", "phone", "date", "number"].includes(field.type)) {
      return (
        <Input
          value={typeof value === "string" || typeof value === "number" ? value : ""}
          type={field.type === "phone" ? "tel" : field.type}
          placeholder={field.placeholder}
          disabled={disabled}
          max={field.type === "date" ? todayIsoDate() : undefined}
          onChange={(event) => setFieldValue(field.name, field.type === "number" ? Number(event.target.value) : event.target.value)}
          className={cn(glassInput, error ? "border-rose-500" : undefined)}
        />
      )
    }

    if (field.type === "select") {
      return (
        <Select
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          onValueChange={(selectedValue) => setFieldValue(field.name, selectedValue)}
        >
          <SelectTrigger className={cn(glassInput, error ? "border-rose-500" : undefined)}>
            <SelectValue placeholder={field.placeholder || "Select an option"} />
          </SelectTrigger>
          <SelectContent>
            {normalizeOptions(field.options).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (field.type === "multiselect") {
      const selectedValues = Array.isArray(value) ? value : []
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          {normalizeOptions(field.options).map((option) => {
            const isChecked = selectedValues.includes(option.value)
            return (
              <label key={option.value} className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-200">
                <Checkbox
                  checked={isChecked}
                  disabled={disabled}
                  onCheckedChange={(checked) => {
                    const nextValues = checked
                      ? [...selectedValues, option.value]
                      : selectedValues.filter((selectedValue) => selectedValue !== option.value)
                    setFieldValue(field.name, nextValues)
                  }}
                />
                {option.label}
              </label>
            )
          })}
        </div>
      )
    }

    if (field.type === "checkbox") {
      return (
        <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-200">
          <Checkbox
            checked={Boolean(value)}
            disabled={disabled}
            onCheckedChange={(checked) => setFieldValue(field.name, Boolean(checked))}
          />
          <span>{field.placeholder || field.helpText || "I confirm this item."}</span>
        </label>
      )
    }

    return null
  }

  function renderComplexField(field: OnboardingField) {
    const value = form.getValues(field.name)

    if (isAgreementField(field)) {
      const body = getAgreementBody(field)
      return (
        <div className="space-y-3">
          {body ? (
            <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/50 p-3 text-sm leading-relaxed text-slate-300">
              {body}
            </div>
          ) : null}
          <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-200">
            <Checkbox
              checked={Boolean(value)}
              disabled={disabled}
              onCheckedChange={(checked) => setFieldValue(field.name, Boolean(checked))}
            />
            <span>{field.placeholder || field.helpText || "I have read and agree to the terms above."}</span>
          </label>
        </div>
      )
    }

    if (field.type === "file" || field.type === "id_document") {
      return (
        <OnboardingUploadField
          token={token}
          field={field}
          disabled={disabled}
          value={(value as UploadedOnboardingDocument | IdDocumentUploadValue | null) || null}
          onChange={(nextValue) => setFieldValue(field.name, nextValue)}
        />
      )
    }

    if (field.type === "address") {
      const address = isRecordValue(value)
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Input className={glassInput} placeholder="Street address" value={String(address.street || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "street", value: event.target.value }))} />
          <Input className={glassInput} placeholder="City" value={String(address.city || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "city", value: event.target.value }))} />
          <Input className={glassInput} placeholder="State" value={String(address.state || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "state", value: event.target.value }))} />
          <Input className={glassInput} placeholder="ZIP" value={String(address.postalCode || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "postalCode", value: event.target.value }))} />
        </div>
      )
    }

    if (field.type === "emergency_contact") {
      const contact = isRecordValue(value)
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Input className={glassInput} placeholder="Contact name" value={String(contact.name || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "name", value: event.target.value }))} />
          <Input className={glassInput} placeholder="Relationship" value={String(contact.relationship || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "relationship", value: event.target.value }))} />
          <Input className={glassInput} placeholder="Phone" type="tel" value={String(contact.phone || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "phone", value: event.target.value }))} />
          <Input className={glassInput} placeholder="Email" type="email" value={String(contact.email || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "email", value: event.target.value }))} />
        </div>
      )
    }

    if (field.type === "bank_info") {
      const bank = isRecordValue(value)
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Input className={glassInput} placeholder="Account holder name" value={String(bank.accountHolder || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "accountHolder", value: event.target.value }))} />
          <Input className={glassInput} placeholder="Bank name" value={String(bank.bankName || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "bankName", value: event.target.value }))} />
          <Input className={glassInput} placeholder="Routing number" inputMode="numeric" value={String(bank.routingNumber || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "routingNumber", value: event.target.value }))} />
          <Input className={glassInput} placeholder="Account number" inputMode="numeric" value={String(bank.accountNumber || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "accountNumber", value: event.target.value }))} />
        </div>
      )
    }

    if (field.type === "tax_info") {
      const tax = isRecordValue(value)
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Input className={glassInput} placeholder="Legal name" value={String(tax.legalName || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "legalName", value: event.target.value }))} />
          <Input className={glassInput} placeholder="Tax classification" value={String(tax.classification || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "classification", value: event.target.value }))} />
          <Input className={glassInput} placeholder="SSN or EIN" value={String(tax.taxId || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "taxId", value: event.target.value }))} />
        </div>
      )
    }

    return renderPrimitiveField(field)
  }

  if (orderedFields.length === 0) {
    return <p className="text-sm text-slate-400">There are no fields in this onboarding step.</p>
  }

  return (
    <form className={cn("space-y-5", className)} onSubmit={(event) => event.preventDefault()}>
      {orderedFields.map((field) => {
        const error = form.formState.errors[field.name]?.message?.toString()

        return (
          <div key={field.id} className={glassFieldCard}>
            <Label htmlFor={field.id} className="flex items-center gap-2 text-sm font-semibold text-white">
              {field.label}
              {field.required || field.blocking ? <span className="text-fuchsia-300">*</span> : null}
            </Label>
            {field.helpText && field.type !== "checkbox" ? (
              <p className="text-sm text-slate-400">{field.helpText}</p>
            ) : null}
            {renderComplexField(field)}
            {error ? (
              <p className="flex items-center gap-2 text-sm text-rose-300">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            ) : null}
          </div>
        )
      })}
    </form>
  )
}
