import bcrypt from 'bcryptjs'

/**
 * Verification-code storage is deliberately an interface. The production
 * implementation must be backed by the server-only database repository; the
 * MFA service must never persist a plaintext code or rely on process memory.
 *
 * The in-memory implementation below is only for deterministic unit tests and
 * local contract checks. It is not a production fallback.
 */

export const MFA_VERIFICATION_CODE_TTL_MS = 5 * 60 * 1000
export const MFA_VERIFICATION_CODE_MAX_ATTEMPTS = 3
export const MFA_VERIFICATION_CODE_MAX_ISSUES = 3
export const MFA_VERIFICATION_CODE_ISSUE_WINDOW_MS = 15 * 60 * 1000
export const MFA_VERIFICATION_CODE_RESEND_COOLDOWN_MS = 30 * 1000
export const MFA_VERIFICATION_CODE_HASH_ROUNDS = 12

const DUMMY_CODE_HASH = '$2b$12$g6WiD4lXYleaOpMQK7cPYuvWPkGdvcXk7oCkf5Lhjqdcw3LeURkjW'

export type MfaVerificationCodeKind = 'sms_setup' | 'sms_login'

export interface IssueMfaVerificationCodeInput {
  challengeId: string
  userId: string
  kind: MfaVerificationCodeKind
  code: string
  now?: number
  ttlMs?: number
}

export interface ConsumeMfaVerificationCodeInput {
  challengeId: string
  userId: string
  code: string
  now?: number
}

export type ConsumeMfaVerificationCodeStatus =
  | 'valid'
  | 'invalid'
  | 'expired'
  | 'locked'
  | 'replayed'
  | 'not_found'

export interface ConsumeMfaVerificationCodeResult {
  status: ConsumeMfaVerificationCodeStatus
  attemptsRemaining: number
}

export interface IssueMfaVerificationCodeResult {
  accepted: boolean
  retryAt?: number
}

export interface MfaVerificationCodeStore {
  /**
   * Atomically persists a hashed code and its expiry. Implementations should
   * enforce the per-user issue window and resend cooldown before inserting.
   */
  issue(input: IssueMfaVerificationCodeInput): Promise<IssueMfaVerificationCodeResult>

  /**
   * Atomically verifies and consumes a code. A successful result is terminal;
   * subsequent calls must return `replayed` even if the code matches.
   */
  consume(input: ConsumeMfaVerificationCodeInput): Promise<ConsumeMfaVerificationCodeResult>

  /** Revoke a challenge after delivery failure or completed setup. */
  revoke(challengeId: string, userId: string): Promise<void>

  /** Remove expired records without affecting active or consumed records. */
  cleanupExpired(now?: number): Promise<number>
}

type InMemoryRecord = {
  challengeId: string
  userId: string
  kind: MfaVerificationCodeKind
  codeHash: string
  expiresAt: number
  attempts: number
  consumedAt: number | null
  issuedAt: number
}

/** Test-only store used to prove the durable repository contract. */
export class InMemoryMfaVerificationCodeStore implements MfaVerificationCodeStore {
  private readonly records = new Map<string, InMemoryRecord>()
  private readonly issueHistory = new Map<string, number[]>()

  async issue(input: IssueMfaVerificationCodeInput): Promise<IssueMfaVerificationCodeResult> {
    const now = input.now ?? Date.now()
    await this.cleanupExpired(now)

    const historyKey = `${input.userId}:${input.kind}`
    const recentIssues = (this.issueHistory.get(historyKey) ?? []).filter(
      (issuedAt) => now - issuedAt < MFA_VERIFICATION_CODE_ISSUE_WINDOW_MS,
    )

    const lastIssuedAt = recentIssues.at(-1)
    if (lastIssuedAt !== undefined && now - lastIssuedAt < MFA_VERIFICATION_CODE_RESEND_COOLDOWN_MS) {
      return {
        accepted: false,
        retryAt: lastIssuedAt + MFA_VERIFICATION_CODE_RESEND_COOLDOWN_MS,
      }
    }

    if (recentIssues.length >= MFA_VERIFICATION_CODE_MAX_ISSUES) {
      return {
        accepted: false,
        retryAt: recentIssues[0] + MFA_VERIFICATION_CODE_ISSUE_WINDOW_MS,
      }
    }

    const record: InMemoryRecord = {
      challengeId: input.challengeId,
      userId: input.userId,
      kind: input.kind,
      codeHash: await bcrypt.hash(input.code, MFA_VERIFICATION_CODE_HASH_ROUNDS),
      expiresAt: now + (input.ttlMs ?? MFA_VERIFICATION_CODE_TTL_MS),
      attempts: 0,
      consumedAt: null,
      issuedAt: now,
    }

    this.records.set(input.challengeId, record)
    this.issueHistory.set(historyKey, [...recentIssues, now])
    return { accepted: true }
  }

  async consume(input: ConsumeMfaVerificationCodeInput): Promise<ConsumeMfaVerificationCodeResult> {
    const now = input.now ?? Date.now()
    const record = this.records.get(input.challengeId)

    // Always perform a bcrypt comparison, including for unknown or mismatched
    // challenges, to avoid exposing code/challenge existence through timing.
    if (!record || record.userId !== input.userId) {
      await bcrypt.compare(input.code, DUMMY_CODE_HASH)
      return { status: 'not_found', attemptsRemaining: 0 }
    }

    if (record.consumedAt !== null) {
      await bcrypt.compare(input.code, DUMMY_CODE_HASH)
      return { status: 'replayed', attemptsRemaining: 0 }
    }

    if (now >= record.expiresAt) {
      await bcrypt.compare(input.code, DUMMY_CODE_HASH)
      this.records.delete(input.challengeId)
      return { status: 'expired', attemptsRemaining: 0 }
    }

    if (record.attempts >= MFA_VERIFICATION_CODE_MAX_ATTEMPTS) {
      await bcrypt.compare(input.code, DUMMY_CODE_HASH)
      return { status: 'locked', attemptsRemaining: 0 }
    }

    record.attempts += 1
    const matches = await bcrypt.compare(input.code, record.codeHash)
    if (!matches) {
      const attemptsRemaining = Math.max(0, MFA_VERIFICATION_CODE_MAX_ATTEMPTS - record.attempts)
      return {
        status: attemptsRemaining === 0 ? 'locked' : 'invalid',
        attemptsRemaining,
      }
    }

    record.consumedAt = now
    return { status: 'valid', attemptsRemaining: MFA_VERIFICATION_CODE_MAX_ATTEMPTS - record.attempts }
  }

  async revoke(challengeId: string, userId: string): Promise<void> {
    const record = this.records.get(challengeId)
    if (record?.userId === userId) this.records.delete(challengeId)
  }

  async cleanupExpired(now = Date.now()): Promise<number> {
    let removed = 0
    for (const [challengeId, record] of this.records) {
      if (now >= record.expiresAt && record.consumedAt === null) {
        this.records.delete(challengeId)
        removed += 1
      }
    }
    return removed
  }
}

/** Fail-closed default until the server-only durable repository is wired. */
export class UnconfiguredMfaVerificationCodeStore implements MfaVerificationCodeStore {
  private unavailable(): Error {
    return new Error('MFA verification-code store is not configured; enable the server-only durable repository before production')
  }

  issue(_input: IssueMfaVerificationCodeInput): Promise<IssueMfaVerificationCodeResult> {
    return Promise.reject(this.unavailable())
  }

  consume(_input: ConsumeMfaVerificationCodeInput): Promise<ConsumeMfaVerificationCodeResult> {
    return Promise.reject(this.unavailable())
  }

  revoke(_challengeId: string, _userId: string): Promise<void> {
    return Promise.reject(this.unavailable())
  }

  cleanupExpired(_now?: number): Promise<number> {
    return Promise.reject(this.unavailable())
  }
}
