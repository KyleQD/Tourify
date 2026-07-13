"use client"

import { useState } from "react"
import { AlertCircle, FileCheck2, Loader2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { HiringDocumentType, HiringStoredDocument } from "@/types/hiring-compliance"

interface SecureOnboardingUploadFieldProps {
  token?: string
  candidateId?: string
  staffMemberId?: string
  employerEntityType?: "venue" | "organization" | "artist"
  employerEntityId?: string
  fieldId?: string
  label?: string
  credentialType?: string
  documentType?: HiringDocumentType
  value?: HiringStoredDocument | null
  acceptedFileTypes?: string[]
  maxFileSizeMb?: number
  disabled?: boolean
  onChange: (value: HiringStoredDocument | null) => void
}

function isAcceptedFileType(file: File, acceptedFileTypes?: string[]): boolean {
  if (!acceptedFileTypes || acceptedFileTypes.length === 0) return true

  return acceptedFileTypes.some((acceptedType) => {
    if (acceptedType.endsWith("/*")) return file.type.startsWith(acceptedType.replace("/*", "/"))
    return file.type === acceptedType || file.name.toLowerCase().endsWith(acceptedType.toLowerCase())
  })
}

export function SecureOnboardingUploadField({
  token,
  candidateId,
  staffMemberId,
  employerEntityType,
  employerEntityId,
  fieldId,
  label,
  credentialType,
  documentType = "general_document",
  value,
  acceptedFileTypes,
  maxFileSizeMb = 15,
  disabled,
  onChange,
}: SecureOnboardingUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(file: File | undefined) {
    setError(null)
    if (!file) return

    if (file.size > maxFileSizeMb * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${maxFileSizeMb} MB.`)
      return
    }

    if (!isAcceptedFileType(file, acceptedFileTypes)) {
      setError("This file type is not accepted for this field.")
      return
    }

    const formData = new FormData()
    formData.append("file", file)
    formData.append("document_type", documentType)
    if (token) formData.append("token", token)
    if (candidateId) formData.append("candidate_id", candidateId)
    if (staffMemberId) formData.append("staff_member_id", staffMemberId)
    if (employerEntityType) formData.append("employer_entity_type", employerEntityType)
    if (employerEntityId) formData.append("employer_entity_id", employerEntityId)
    if (fieldId) formData.append("field_id", fieldId)
    if (label) formData.append("label", label)
    if (credentialType) formData.append("credential_type", credentialType)

    setIsUploading(true)

    try {
      const response = await fetch("/api/hiring/onboarding/upload", {
        method: "POST",
        headers: token ? { "x-onboarding-token": token } : undefined,
        body: formData,
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.data) {
        setError(payload?.error ?? "Upload failed. Please try again.")
        return
      }

      onChange(payload.data)
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
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center transition hover:border-primary/60",
          disabled ? "cursor-not-allowed opacity-60" : undefined,
          error ? "border-destructive" : "border-border"
        )}
      >
        {isUploading ? (
          <Loader2 className="mb-2 h-6 w-6 animate-spin text-muted-foreground" />
        ) : value ? (
          <FileCheck2 className="mb-2 h-6 w-6 text-emerald-500" />
        ) : (
          <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">{value ? value.fileName : "Upload document"}</span>
        <span className="mt-1 text-xs text-muted-foreground">Max {maxFileSizeMb} MB</span>
        <Input
          type="file"
          className="sr-only"
          disabled={disabled || isUploading}
          accept={acceptedFileTypes?.join(",")}
          onChange={(event) => handleFileChange(event.target.files?.[0])}
        />
      </label>

      {value ? (
        <Button type="button" variant="outline" size="sm" disabled={disabled || isUploading} onClick={() => onChange(null)}>
          Remove file
        </Button>
      ) : null}

      {error ? (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      ) : null}
    </div>
  )
}
