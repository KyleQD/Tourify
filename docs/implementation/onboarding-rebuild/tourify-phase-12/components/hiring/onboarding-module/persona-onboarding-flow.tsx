"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getPersonaOnboardingConfig } from "@/lib/onboarding/persona-onboarding-config"
import type { PersonaOnboardingField, PersonaOnboardingType } from "@/types/persona-onboarding"

interface PersonaOnboardingFlowProps {
  type?: PersonaOnboardingType
  status?: string
  className?: string
}

interface SubmitState {
  isSubmitting: boolean
  error?: string
}

export function PersonaOnboardingFlow({ type = "individual", status, className }: PersonaOnboardingFlowProps) {
  const router = useRouter()
  const config = useMemo(() => getPersonaOnboardingConfig({ type }), [type])
  const [responses, setResponses] = useState<Record<string, unknown>>({})
  const [submitState, setSubmitState] = useState<SubmitState>({ isSubmitting: false })

  function updateResponse(name: string, value: unknown) {
    setResponses((current) => ({ ...current, [name]: value }))
  }

  function getMissingRequiredFields(): string[] {
    return config.sections.flatMap((section) =>
      section.fields
        .filter((field) => field.required)
        .filter((field) => {
          const value = responses[field.name]
          if (Array.isArray(value)) return value.length === 0
          return value === undefined || value === null || value === ""
        })
        .map((field) => field.label)
    )
  }

  async function handleSubmit() {
    const missing = getMissingRequiredFields()
    if (missing.length > 0) {
      setSubmitState({ isSubmitting: false, error: `Missing required fields: ${missing.join(", ")}` })
      return
    }

    setSubmitState({ isSubmitting: true })

    try {
      const response = await fetch("/api/onboarding/unified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: config.type, responses }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setSubmitState({
          isSubmitting: false,
          error: payload?.error || payload?.message || "Unable to complete onboarding.",
        })
        return
      }

      const redirectTo = payload?.redirectTo || payload?.data?.redirectTo || "/dashboard"
      router.push(redirectTo)
    } catch (error) {
      setSubmitState({
        isSubmitting: false,
        error: error instanceof Error ? error.message : "Unable to complete onboarding.",
      })
    }
  }

  return (
    <main className={cn("mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8", className)}>
      <div className="mb-6 space-y-2">
        <Badge variant="outline">Platform onboarding</Badge>
        <h1 className="text-3xl font-bold tracking-tight">{config.title}</h1>
        <p className="text-muted-foreground">{config.description}</p>
        {status === "complete" ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
            Your previous onboarding flow was completed. Continue setting up your profile or return to your dashboard.
          </div>
        ) : null}
      </div>

      <div className="space-y-6">
        {config.sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              {section.description ? <CardDescription>{section.description}</CardDescription> : null}
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {section.fields.map((field) => (
                <PersonaField
                  key={field.name}
                  field={field}
                  value={responses[field.name]}
                  onChange={(value) => updateResponse(field.name, value)}
                />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {submitState.error ? (
        <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {submitState.error}
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" type="button" onClick={() => router.push("/dashboard")}>Skip for now</Button>
        <Button type="button" onClick={handleSubmit} disabled={submitState.isSubmitting}>
          {submitState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save profile
        </Button>
      </div>
    </main>
  )
}

interface PersonaFieldProps {
  field: PersonaOnboardingField
  value: unknown
  onChange: (value: unknown) => void
}

function PersonaField({ field, value, onChange }: PersonaFieldProps) {
  const wrapperClassName = field.type === "textarea" || field.type === "multiselect" ? "sm:col-span-2" : undefined

  return (
    <div className={cn("space-y-2", wrapperClassName)}>
      <Label htmlFor={field.name}>
        {field.label}
        {field.required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      {renderPersonaField({ field, value, onChange })}
      {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
    </div>
  )
}

function renderPersonaField({ field, value, onChange }: PersonaFieldProps) {
  if (field.type === "textarea") {
    return (
      <Textarea
        id={field.name}
        placeholder={field.placeholder}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  if (field.type === "select") {
    return (
      <Select value={typeof value === "string" ? value : ""} onValueChange={onChange}>
        <SelectTrigger id={field.name}>
          <SelectValue placeholder={field.placeholder || "Select one"} />
        </SelectTrigger>
        <SelectContent>
          {(field.options || []).map((option) => (
            <SelectItem key={option} value={option}>{option}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {selected.length > 0 ? selected.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onChange(selected.filter((selectedItem) => selectedItem !== item))}
              className="rounded-full border px-3 py-1 text-xs hover:bg-muted"
              aria-label={`Remove ${item}`}
            >
              {item} ×
            </button>
          )) : <p className="text-sm text-muted-foreground">No selections yet.</p>}
        </div>
        <Select
          value=""
          onValueChange={(nextValue) => {
            if (!selected.includes(nextValue)) onChange([...selected, nextValue])
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder || "Add option"} />
          </SelectTrigger>
          <SelectContent>
            {(field.options || []).filter((option) => !selected.includes(option)).map((option) => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <Input
      id={field.name}
      type={field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "url" ? "url" : "text"}
      placeholder={field.placeholder}
      value={typeof value === "string" || typeof value === "number" ? value : ""}
      onChange={(event) => onChange(field.type === "number" ? Number(event.target.value) : event.target.value)}
    />
  )
}
