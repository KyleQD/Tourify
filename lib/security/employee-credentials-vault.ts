import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'crypto'

export interface SecureEnvelope {
  version: 'v1'
  algorithm: 'aes-256-gcm'
  iv: string
  authTag: string
  ciphertext: string
  fingerprint: string
  createdAt: string
}

function isSecureEnvelope(value: unknown): value is SecureEnvelope {
  if (!value || typeof value !== 'object') return false
  const envelope = value as Record<string, unknown>
  return (
    envelope.version === 'v1' &&
    envelope.algorithm === 'aes-256-gcm' &&
    typeof envelope.iv === 'string' &&
    typeof envelope.authTag === 'string' &&
    typeof envelope.ciphertext === 'string'
  )
}

function encryptPayload(payload: string): SecureEnvelope {
  const iv = randomBytes(12)
  const salt = randomBytes(16)
  const key = deriveKey(salt)
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  const envelope = Buffer.concat([salt, encrypted])
  const fingerprint = createHash('sha256').update(payload).digest('hex')

  return {
    version: 'v1',
    algorithm: 'aes-256-gcm',
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: envelope.toString('base64'),
    fingerprint,
    createdAt: new Date().toISOString(),
  }
}

function decryptPayload(envelope: SecureEnvelope): string {
  const raw = Buffer.from(envelope.ciphertext, 'base64')
  const salt = raw.subarray(0, 16)
  const encrypted = raw.subarray(16)
  const key = deriveKey(salt)

  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'))

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

export interface EmployeeCredentialRecordInput {
  type: string
  issuing_authority?: string
  credential_id?: string
  expires_at?: string
  verified?: boolean
  notes?: string
  documents?: Array<{ name: string; url: string }>
}

export interface EmployeeCredentialSummary {
  type: string
  issuingAuthority?: string
  credentialMasked?: string
  expiresAt?: string
  verified: boolean
  documentsCount: number
}

function getVaultSecret() {
  const explicit =
    process.env.EMPLOYEE_CREDENTIALS_SECRET || process.env.ONBOARDING_CREDENTIALS_SECRET
  if (explicit) return explicit
  if (process.env.NODE_ENV === 'production')
    throw new Error('Set EMPLOYEE_CREDENTIALS_SECRET (or ONBOARDING_CREDENTIALS_SECRET) for credential encryption')
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!fallback) throw new Error('Missing credential vault secret')
  return fallback
}

function deriveKey(salt: Buffer) {
  return scryptSync(getVaultSecret(), salt, 32)
}

export function encryptCredentialRecords(records: EmployeeCredentialRecordInput[]): SecureEnvelope {
  return encryptPayload(JSON.stringify(records || []))
}

export function decryptCredentialRecords(envelope: SecureEnvelope): EmployeeCredentialRecordInput[] {
  return JSON.parse(decryptPayload(envelope)) as EmployeeCredentialRecordInput[]
}

/** Encrypt an arbitrary JSON object (e.g. sensitive onboarding field map). */
export function encryptJsonPayload(payload: Record<string, unknown>): SecureEnvelope {
  return encryptPayload(JSON.stringify(payload || {}))
}

/** Decrypt a SecureEnvelope into a JSON object. Returns {} on invalid envelope. */
export function decryptJsonPayload(envelope: unknown): Record<string, unknown> {
  if (!isSecureEnvelope(envelope)) return {}
  try {
    const parsed = JSON.parse(decryptPayload(envelope)) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as Record<string, unknown>
  } catch {
    return {}
  }
}

export function isValidSecureEnvelope(value: unknown): value is SecureEnvelope {
  return isSecureEnvelope(value)
}

function maskCredentialId(value?: string) {
  if (!value) return undefined
  const trimmed = value.trim()
  if (trimmed.length <= 4) return `****${trimmed}`
  return `${'*'.repeat(Math.max(trimmed.length - 4, 4))}${trimmed.slice(-4)}`
}

export function summarizeCredentialRecords(records: EmployeeCredentialRecordInput[]): EmployeeCredentialSummary[] {
  return (records || []).map((record) => ({
    type: record.type,
    issuingAuthority: record.issuing_authority,
    credentialMasked: maskCredentialId(record.credential_id),
    expiresAt: record.expires_at,
    verified: Boolean(record.verified),
    documentsCount: record.documents?.length || 0,
  }))
}
