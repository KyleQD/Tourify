import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'crypto'

interface SecureEnvelope {
  version: 'v1'
  algorithm: 'aes-256-gcm'
  iv: string
  authTag: string
  ciphertext: string
  fingerprint: string
  createdAt: string
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
  const secret =
    process.env.EMPLOYEE_CREDENTIALS_SECRET ||
    process.env.ONBOARDING_CREDENTIALS_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('Missing credential vault secret')
  return secret
}

function deriveKey(salt: Buffer) {
  return scryptSync(getVaultSecret(), salt, 32)
}

export function encryptCredentialRecords(records: EmployeeCredentialRecordInput[]): SecureEnvelope {
  const payload = JSON.stringify(records || [])
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

export function decryptCredentialRecords(envelope: SecureEnvelope): EmployeeCredentialRecordInput[] {
  const raw = Buffer.from(envelope.ciphertext, 'base64')
  const salt = raw.subarray(0, 16)
  const encrypted = raw.subarray(16)
  const key = deriveKey(salt)

  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'))

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
  return JSON.parse(decrypted) as EmployeeCredentialRecordInput[]
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
