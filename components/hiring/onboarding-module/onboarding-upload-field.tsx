"use client"

import { useState } from "react"
import { AlertCircle, FileCheck2, Loader2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type {
  IdDocumentUploadValue,
  OnboardingField,
  UploadedOnboardingDocument,
} from "@/types/hiring-worker-onboarding"

type DocumentSide = "front" | "back"

interface OnboardingUploadFieldProps {
  token: string
  field: OnboardingField
  value?: UploadedOnboardingDocument | IdDocumentUploadValue | null
  disabled?: boolean
  onChange: (value: UploadedOnboardingDocument | IdDocumentUploadValue | null) => void
}

function getAcceptedFileTypes(field: OnboardingField): string[] {
  return field.validation?.acceptedFileTypes ?? field.validation?.fileTypes ?? []
}

function getMaxFileSizeBytes(field: OnboardingField): number {
  const maxFileSizeMb = field.validation?.maxFileSizeMb ?? 15
  return maxFileSizeMb * 1024 * 1024
}

function isAcceptedFileType({ field, file }: { field: OnboardingField; file: File }): boolean {
  const acceptedFileTypes = getAcceptedFileTypes(field)
  if (!acceptedFileTypes || acceptedFileTypes.length === 0) return true

  return acceptedFileTypes.some((acceptedType) => {
    if (acceptedType.endsWith("/*")) {
      return file.type.startsWith(acceptedType.replace("/*", "/"))
    }

    return file.type === acceptedType || file.name.toLowerCase().endsWith(acceptedType.toLowerCase())
  })
}

function mapUploadResponse(document: Record<string, unknown>, side?: DocumentSide): UploadedOnboardingDocument {
  return {
    documentId: typeof document.documentId === "string" ? document.documentId : typeof document.id === "string" ? document.id : undefined,
    bucket: typeof document.bucket === "string" ? document.bucket : undefined,
    path: typeof document.storagePath === "string" ? document.storagePath : typeof document.path === "string" ? document.path : undefined,
    signedUrl: typeof document.signedUrl === "string" ? document.signedUrl : undefined,
    fileName: String(document.fileName ?? "document"),
    fileType: String(document.mimeType ?? document.fileType ?? "application/octet-stream"),
    fileSize: Number(document.sizeBytes ?? document.fileSize ?? 0),
    ...(side ? { side } : {}),
  }
}

function isIdDocumentValue(value: unknown): value is IdDocumentUploadValue {
  return Boolean(value && typeof value === "object" && ("front" in value || "back" in value))
}

function isSingleDocumentValue(value: unknown): value is UploadedOnboardingDocument {
  return Boolean(value && typeof value === "object" && "fileName" in value && !("front" in value) && !("back" in value))
}

/**
 * Uploads worker onboarding documents through the canonical upload API.
 * `id_document` fields require front and back photos; other file fields are single-upload.
 */
export function OnboardingUploadField({
  token,
  field,
  value,
  disabled,
  onChange,
}: OnboardingUploadFieldProps) {
  const isIdDocument = field.type === "id_document"
  const idValue: IdDocumentUploadValue = isIdDocumentValue(value) ? value : {}
  const singleValue = isSingleDocumentValue(value) ? value : null

  if (isIdDocument) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-slate-400">
          Upload clear photos of the front and back of your government-issued ID.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <SideUploadSlot
            token={token}
            field={field}
            side="front"
            label={`${field.label} — Front`}
            value={idValue.front ?? null}
            disabled={disabled}
            onChange={(next) => onChange({ ...idValue, front: next })}
          />
          <SideUploadSlot
            token={token}
            field={field}
            side="back"
            label={`${field.label} — Back`}
            value={idValue.back ?? null}
            disabled={disabled}
            onChange={(next) => onChange({ ...idValue, back: next })}
          />
        </div>
      </div>
    )
  }

  return (
    <SideUploadSlot
      token={token}
      field={field}
      label={field.label}
      value={singleValue}
      disabled={disabled}
      onChange={onChange}
    />
  )
}

interface SideUploadSlotProps {
  token: string
  field: OnboardingField
  side?: DocumentSide
  label: string
  value?: UploadedOnboardingDocument | null
  disabled?: boolean
  onChange: (value: UploadedOnboardingDocument | null) => void
}

function SideUploadSlot({
  token,
  field,
  side,
  label,
  value,
  disabled,
  onChange,
}: SideUploadSlotProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const acceptedFileTypes = getAcceptedFileTypes(field)

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
    formData.append("label", label)
    formData.append("document_type", field.type === "id_document" ? "id_document" : "general_document")
    if (field.credentialType) formData.append("credential_type", field.credentialType)
    if (side) formData.append("side", side)

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

      onChange(mapUploadResponse(result.document as Record<string, unknown>, side))
    } catch {
      setError("Upload failed. Please check your connection and try again.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      {side ? (
        <p className="text-sm font-medium text-slate-200">
          {side === "front" ? "Front" : "Back"}
          <span className="text-rose-300"> *</span>
        </p>
      ) : null}
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
          {value ? value.fileName : side ? `Upload ${side}` : "Upload document"}
        </span>
        <span className="mt-1 text-xs text-slate-500">
          Max {field.validation?.maxFileSizeMb ?? 15} MB
        </span>
        <Input
          type="file"
          className="sr-only"
          disabled={disabled || isUploading}
          accept={acceptedFileTypes.length > 0 ? acceptedFileTypes.join(",") : undefined}
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
