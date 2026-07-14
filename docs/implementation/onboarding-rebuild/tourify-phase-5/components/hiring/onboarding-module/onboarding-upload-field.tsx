"use client"

import { useState } from "react"
import { AlertCircle, FileCheck2, Loader2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { OnboardingField, UploadedOnboardingDocument } from "@/types/hiring-worker-onboarding"

interface OnboardingUploadFieldProps {
  token: string
  field: OnboardingField
  value?: UploadedOnboardingDocument | null
  disabled?: boolean
  onChange: (value: UploadedOnboardingDocument | null) => void
}

function getMaxFileSizeBytes(field: OnboardingField): number {
  const maxFileSizeMb = field.validation?.maxFileSizeMb ?? 15
  return maxFileSizeMb * 1024 * 1024
}

function isAcceptedFileType({ field, file }: { field: OnboardingField; file: File }): boolean {
  const acceptedFileTypes = field.validation?.acceptedFileTypes
  if (!acceptedFileTypes || acceptedFileTypes.length === 0) return true

  return acceptedFileTypes.some((acceptedType) => {
    if (acceptedType.endsWith("/*")) {
      return file.type.startsWith(acceptedType.replace("/*", "/"))
    }

    return file.type === acceptedType || file.name.toLowerCase().endsWith(acceptedType.toLowerCase())
  })
}

/**
 * Uploads worker onboarding documents through the canonical upload API.
 * The field never stores raw File objects in final form state.
 */
export function OnboardingUploadField({
  token,
  field,
  value,
  disabled,
  onChange,
}: OnboardingUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(file: File | undefined) {
    setError(null)

    if (!file) return

    if (file.size > getMaxFileSizeBytes(field)) {
      setError(`File is too large. Maximum size is ${field.validation?.maxFileSizeMb ?? 15} MB.`)
      return
    }

    if (!isAcceptedFileType({ field, file })) {
      setError("This file type is not accepted for this field.")
      return
    }

    const formData = new FormData()
    formData.append("file", file)
    formData.append("field_id", field.id)
    formData.append("field_name", field.name)
    if (field.credentialType) formData.append("credential_type", field.credentialType)

    setIsUploading(true)

    try {
      const response = await fetch("/api/hiring/onboarding/upload", {
        method: "POST",
        headers: {
          "x-onboarding-token": token,
        },
        body: formData,
      })

      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.ok || !result?.document) {
        setError(result?.error || "Upload failed. Please try again.")
        return
      }

      onChange(result.document)
    } catch {
      setError("Upload failed. Please check your connection and try again.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <label
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/70 px-4 py-6 text-center transition hover:border-purple-500/60",
          disabled ? "cursor-not-allowed opacity-60" : undefined,
          error ? "border-rose-500/70" : undefined
        )}
      >
        {isUploading ? (
          <Loader2 className="mb-2 h-6 w-6 animate-spin text-purple-300" />
        ) : value ? (
          <FileCheck2 className="mb-2 h-6 w-6 text-emerald-300" />
        ) : (
          <Upload className="mb-2 h-6 w-6 text-slate-400" />
        )}
        <span className="text-sm font-medium text-white">
          {value ? value.fileName : "Upload document"}
        </span>
        <span className="mt-1 text-xs text-slate-500">
          Max {field.validation?.maxFileSizeMb ?? 15} MB
        </span>
        <Input
          type="file"
          className="sr-only"
          disabled={disabled || isUploading}
          accept={field.validation?.acceptedFileTypes?.join(",")}
          onChange={(event) => handleFileChange(event.target.files?.[0])}
        />
      </label>

      {value ? (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(null)} disabled={disabled || isUploading}>
          Remove file
        </Button>
      ) : null}

      {error ? (
        <p className="flex items-center gap-2 text-sm text-rose-300">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      ) : null}
    </div>
  )
}
