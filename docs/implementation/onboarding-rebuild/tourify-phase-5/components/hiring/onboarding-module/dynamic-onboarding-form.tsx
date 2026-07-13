"use client"

import { useEffect, useMemo } from "react"
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
  OnboardingField,
  OnboardingFieldOption,
  OnboardingResponseValue,
  UploadedOnboardingDocument,
} from "@/types/hiring-worker-onboarding"
import { OnboardingUploadField } from "./onboarding-upload-field"

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

function getFieldSchema(field: OnboardingField): z.ZodTypeAny {
  const requiredMessage = `${field.label} is required.`

  if (field.type === "checkbox") {
    return field.required || field.blocking
      ? z.literal(true, { errorMap: () => ({ message: requiredMessage }) })
      : z.boolean().optional().nullable()
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

  if (field.type === "file" || field.type === "id_document") {
    const schema = z
      .custom<UploadedOnboardingDocument>((value) => Boolean(value && typeof value === "object" && "fileName" in value), requiredMessage)
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
  if (field.type === "checkbox") return false
  if (field.type === "multiselect") return []
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

  const watchedValues = form.watch()

  useEffect(() => {
    onResponsesChange({ ...responses, ...watchedValues })
    onValidityChange?.(form.formState.isValid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedValues, form.formState.isValid])

  function setFieldValue(fieldName: string, value: OnboardingResponseValue) {
    form.setValue(fieldName, value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
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
          className={cn(error ? "border-rose-500" : undefined)}
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
          onChange={(event) => setFieldValue(field.name, field.type === "number" ? Number(event.target.value) : event.target.value)}
          className={cn(error ? "border-rose-500" : undefined)}
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
          <SelectTrigger className={cn(error ? "border-rose-500" : undefined)}>
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
              <label key={option.value} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200">
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
        <label className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200">
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

    if (field.type === "file" || field.type === "id_document") {
      return (
        <OnboardingUploadField
          token={token}
          field={field}
          disabled={disabled}
          value={(value as UploadedOnboardingDocument | null) || null}
          onChange={(nextValue) => setFieldValue(field.name, nextValue)}
        />
      )
    }

    if (field.type === "address") {
      const address = isRecordValue(value)
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Street address" value={String(address.street || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "street", value: event.target.value }))} />
          <Input placeholder="City" value={String(address.city || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "city", value: event.target.value }))} />
          <Input placeholder="State" value={String(address.state || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "state", value: event.target.value }))} />
          <Input placeholder="ZIP" value={String(address.postalCode || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "postalCode", value: event.target.value }))} />
        </div>
      )
    }

    if (field.type === "emergency_contact") {
      const contact = isRecordValue(value)
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Contact name" value={String(contact.name || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "name", value: event.target.value }))} />
          <Input placeholder="Relationship" value={String(contact.relationship || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "relationship", value: event.target.value }))} />
          <Input placeholder="Phone" type="tel" value={String(contact.phone || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "phone", value: event.target.value }))} />
          <Input placeholder="Email" type="email" value={String(contact.email || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "email", value: event.target.value }))} />
        </div>
      )
    }

    if (field.type === "bank_info") {
      const bank = isRecordValue(value)
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Account holder name" value={String(bank.accountHolder || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "accountHolder", value: event.target.value }))} />
          <Input placeholder="Bank name" value={String(bank.bankName || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "bankName", value: event.target.value }))} />
          <Input placeholder="Routing number" inputMode="numeric" value={String(bank.routingNumber || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "routingNumber", value: event.target.value }))} />
          <Input placeholder="Account number" inputMode="numeric" value={String(bank.accountNumber || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "accountNumber", value: event.target.value }))} />
        </div>
      )
    }

    if (field.type === "tax_info") {
      const tax = isRecordValue(value)
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Legal name" value={String(tax.legalName || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "legalName", value: event.target.value }))} />
          <Input placeholder="Tax classification" value={String(tax.classification || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "classification", value: event.target.value }))} />
          <Input placeholder="SSN or EIN" value={String(tax.taxId || "")} disabled={disabled} onChange={(event) => setFieldValue(field.name, updateNestedRecord({ currentValue: value, key: "taxId", value: event.target.value }))} />
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
          <div key={field.id} className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <Label htmlFor={field.id} className="flex items-center gap-2 text-sm font-semibold text-white">
              {field.label}
              {field.required || field.blocking ? <span className="text-rose-300">*</span> : null}
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
