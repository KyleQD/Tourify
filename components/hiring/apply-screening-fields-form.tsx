"use client"

import { useState } from "react"
import { Loader2, Paperclip, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import type { ApplicationFormField } from "@/types/admin-onboarding"

export interface UploadedFileDescriptor {
  url: string
  path: string
  name: string
  mimeType: string
  size: number
}

interface ApplyScreeningFieldsFormProps {
  fields: ApplicationFormField[]
  values: Record<string, unknown>
  onChange: (name: string, value: unknown) => void
}

export function ApplyScreeningFieldsForm({ fields, values, onChange }: ApplyScreeningFieldsFormProps) {
  const { toast } = useToast()
  const [uploadingField, setUploadingField] = useState<string | null>(null)

  async function handleFileUpload(field: ApplicationFormField, file: File) {
    setUploadingField(field.name)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch("/api/hiring/applications/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || "Upload failed")
      onChange(field.name, data.data as UploadedFileDescriptor)
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setUploadingField(null)
    }
  }

  function renderField(field: ApplicationFormField) {
    const value = values[field.name]

    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            id={field.name}
            value={typeof value === "string" ? value : ""}
            placeholder={field.placeholder}
            onChange={(event) => onChange(field.name, event.target.value)}
            className="min-h-[100px] border-slate-600 bg-slate-700 text-white"
          />
        )

      case "select":
        return (
          <Select value={typeof value === "string" ? value : ""} onValueChange={(next) => onChange(field.name, next)}>
            <SelectTrigger className="border-slate-600 bg-slate-700 text-white">
              <SelectValue placeholder={field.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case "multiselect": {
        const selected = Array.isArray(value) ? (value as string[]) : []
        return (
          <div className="flex flex-wrap gap-3">
            {(field.options || []).map((option) => {
              const checked = selected.includes(option)
              return (
                <label key={option} className="flex items-center gap-2 text-sm text-slate-200">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(next) => {
                      const nextValues = next
                        ? [...selected, option]
                        : selected.filter((entry) => entry !== option)
                      onChange(field.name, nextValues)
                    }}
                  />
                  {option}
                </label>
              )
            })}
          </div>
        )
      }

      case "checkbox":
        return (
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <Checkbox checked={value === true} onCheckedChange={(next) => onChange(field.name, next === true)} />
            {field.placeholder || "Yes"}
          </label>
        )

      case "file": {
        const descriptor = value as UploadedFileDescriptor | undefined
        return (
          <div className="space-y-2">
            <input
              id={field.name}
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void handleFileUpload(field, file)
              }}
            />
            <label
              htmlFor={field.name}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-slate-300 hover:border-purple-500"
            >
              {uploadingField === field.name ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {descriptor ? "Replace file" : "Upload file"}
            </label>
            {descriptor ? (
              <p className="flex items-center gap-1 text-xs text-slate-400">
                <Paperclip className="h-3 w-3" />
                {descriptor.name}
              </p>
            ) : null}
          </div>
        )
      }

      case "number":
        return (
          <Input
            id={field.name}
            type="number"
            value={typeof value === "number" || typeof value === "string" ? String(value) : ""}
            placeholder={field.placeholder}
            onChange={(event) => onChange(field.name, event.target.value === "" ? "" : Number(event.target.value))}
            className="border-slate-600 bg-slate-700 text-white"
          />
        )

      default:
        return (
          <Input
            id={field.name}
            type={field.type === "date" ? "date" : field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
            value={typeof value === "string" ? value : ""}
            placeholder={field.placeholder}
            onChange={(event) => onChange(field.name, event.target.value)}
            className="border-slate-600 bg-slate-700 text-white"
          />
        )
    }
  }

  if (fields.length === 0) {
    return <p className="text-sm text-slate-400">No additional questions. Just confirm and submit below.</p>
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.id || field.name} className="space-y-1.5">
          <Label htmlFor={field.name} className="text-white">
            {field.label}
            {field.required ? <span className="text-red-400"> *</span> : null}
          </Label>
          {field.description ? <p className="text-xs text-slate-400">{field.description}</p> : null}
          {renderField(field)}
        </div>
      ))}
    </div>
  )
}
