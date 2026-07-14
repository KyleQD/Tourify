import type { HiringDocumentBucket, HiringDocumentType, HiringUploadPolicy } from "@/types/hiring-compliance"

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const PDF_TYPES = ["application/pdf"]
const DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"]
const DOCUMENT_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx"]

const TEN_MB = 10 * 1024 * 1024
const TWENTY_MB = 20 * 1024 * 1024

const UPLOAD_POLICIES: Record<HiringDocumentType, HiringUploadPolicy> = {
  general_document: {
    bucket: "staff-documents",
    maxBytes: TWENTY_MB,
    allowedMimeTypes: DOCUMENT_TYPES,
    allowedExtensions: DOCUMENT_EXTENSIONS,
  },
  certification: {
    bucket: "staff-certifications",
    maxBytes: TEN_MB,
    allowedMimeTypes: DOCUMENT_TYPES,
    allowedExtensions: DOCUMENT_EXTENSIONS,
  },
  id_document: {
    bucket: "staff-id-documents",
    maxBytes: TEN_MB,
    allowedMimeTypes: [...PDF_TYPES, ...IMAGE_TYPES],
    allowedExtensions: ["pdf", ...IMAGE_EXTENSIONS],
  },
  waiver: {
    bucket: "staff-waivers",
    maxBytes: TEN_MB,
    allowedMimeTypes: PDF_TYPES,
    allowedExtensions: ["pdf"],
  },
  tax_document: {
    bucket: "staff-documents",
    maxBytes: TEN_MB,
    allowedMimeTypes: PDF_TYPES,
    allowedExtensions: ["pdf"],
  },
  payment_document: {
    bucket: "staff-documents",
    maxBytes: TEN_MB,
    allowedMimeTypes: PDF_TYPES,
    allowedExtensions: ["pdf"],
  },
  license: {
    bucket: "staff-certifications",
    maxBytes: TEN_MB,
    allowedMimeTypes: DOCUMENT_TYPES,
    allowedExtensions: DOCUMENT_EXTENSIONS,
  },
  background_check: {
    bucket: "staff-documents",
    maxBytes: TEN_MB,
    allowedMimeTypes: PDF_TYPES,
    allowedExtensions: ["pdf"],
  },
}

interface ValidateHiringFileArgs {
  fileName: string
  mimeType: string
  sizeBytes: number
  documentType: HiringDocumentType
}

interface BuildStoragePathArgs {
  employerEntityType: "venue" | "organization" | "artist"
  employerEntityId: string
  candidateId?: string
  staffMemberId?: string
  userId?: string
  fileName: string
  documentType: HiringDocumentType
}

export interface HiringFileValidationResult {
  valid: boolean
  bucket?: HiringDocumentBucket
  error?: string
}

export function getUploadPolicy(documentType: HiringDocumentType): HiringUploadPolicy {
  return UPLOAD_POLICIES[documentType] ?? UPLOAD_POLICIES.general_document
}

export function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split(".")
  return parts.length > 1 ? parts[parts.length - 1] : ""
}

export function sanitizeFileName(fileName: string): string {
  const extension = getFileExtension(fileName)
  const baseName = fileName
    .replace(new RegExp(`\\.${extension}$`, "i"), "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80)

  return extension ? `${baseName || "document"}.${extension}` : baseName || "document"
}

export function validateHiringFile({
  fileName,
  mimeType,
  sizeBytes,
  documentType,
}: ValidateHiringFileArgs): HiringFileValidationResult {
  const policy = getUploadPolicy(documentType)
  const extension = getFileExtension(fileName)

  if (!fileName.trim()) return { valid: false, error: "A file name is required." }
  if (sizeBytes <= 0) return { valid: false, error: "The uploaded file is empty." }
  if (sizeBytes > policy.maxBytes) {
    return {
      valid: false,
      error: `File is too large. Maximum size is ${Math.round(policy.maxBytes / 1024 / 1024)} MB.`,
    }
  }
  if (!policy.allowedMimeTypes.includes(mimeType)) {
    return { valid: false, error: `File type ${mimeType || "unknown"} is not allowed for this document.` }
  }
  if (!policy.allowedExtensions.includes(extension)) {
    return { valid: false, error: `File extension .${extension || "unknown"} is not allowed for this document.` }
  }

  return { valid: true, bucket: policy.bucket }
}

export function buildHiringStoragePath({
  employerEntityType,
  employerEntityId,
  candidateId,
  staffMemberId,
  userId,
  fileName,
  documentType,
}: BuildStoragePathArgs): string {
  const ownerSegment = candidateId
    ? `candidates/${candidateId}`
    : staffMemberId
      ? `staff/${staffMemberId}`
      : userId
        ? `users/${userId}`
        : "unassigned"

  const safeName = sanitizeFileName(fileName)
  const uniquePrefix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  return [
    employerEntityType,
    employerEntityId,
    ownerSegment,
    documentType,
    `${uniquePrefix}-${safeName}`,
  ].join("/")
}
