import 'server-only'
import bcrypt from 'bcryptjs'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import {
  MFA_VERIFICATION_CODE_HASH_ROUNDS,
  MFA_VERIFICATION_CODE_ISSUE_WINDOW_MS,
  MFA_VERIFICATION_CODE_MAX_ATTEMPTS,
  MFA_VERIFICATION_CODE_MAX_ISSUES,
  MFA_VERIFICATION_CODE_RESEND_COOLDOWN_MS,
  MFA_VERIFICATION_CODE_TTL_MS,
  type ConsumeMfaVerificationCodeInput,
  type ConsumeMfaVerificationCodeResult,
  type ConsumeMfaVerificationCodeStatus,
  type IssueMfaVerificationCodeInput,
  type IssueMfaVerificationCodeResult,
  type MfaVerificationCodeStore,
} from './mfa-verification-code-store'

const DUMMY_CODE_HASH = '$2b$12$g6WiD4lXYleaOpMQK7cPYuvWPkGdvcXk7oCkf5Lhjqdcw3LeURkjW'

type RpcError = { message?: string } | null

interface MfaVerificationCodeRpcClient {
  rpc(
    functionName: string,
    parameters: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: RpcError }>
}

type IssueRow = {
  accepted: boolean
  retry_at: string | null
}

type BeginAttemptRow = {
  code_id: string | null
  status: 'ready' | Exclude<ConsumeMfaVerificationCodeStatus, 'valid' | 'invalid'>
  code_hash: string | null
  attempt_number: number
  attempts_remaining: number
}

type FinishAttemptRow = {
  status: ConsumeMfaVerificationCodeStatus
  attempts_remaining: number
}

function firstRpcRow<T>(data: unknown, operation: string): T {
  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object') {
    throw new Error(`MFA verification-code ${operation} returned no result`)
  }
  return row as T
}

function throwRpcError(operation: string, error: RpcError): never {
  throw new Error(`MFA verification-code ${operation} failed`, {
    cause: error?.message,
  })
}

/**
 * Server-only Supabase repository for verification codes.
 *
 * The privileged client is created lazily so importing the MFA service does
 * not read a service-role secret until a server-side verification operation is
 * actually requested. The database functions own locking and rate-limit state;
 * plaintext codes never leave this process.
 */
export class SupabaseMfaVerificationCodeStore implements MfaVerificationCodeStore {
  private client: MfaVerificationCodeRpcClient | null

  constructor(client?: SupabaseClient | MfaVerificationCodeRpcClient) {
    this.client = client ? client as MfaVerificationCodeRpcClient : null
  }

  private getClient(): MfaVerificationCodeRpcClient {
    if (!this.client) {
      this.client = createServiceRoleClient() as unknown as MfaVerificationCodeRpcClient
    }
    return this.client
  }

  async issue(input: IssueMfaVerificationCodeInput): Promise<IssueMfaVerificationCodeResult> {
    const now = input.now ?? Date.now()
    const codeHash = await bcrypt.hash(input.code, MFA_VERIFICATION_CODE_HASH_ROUNDS)
    const { data, error } = await this.getClient().rpc('issue_mfa_verification_code', {
      p_challenge_id: input.challengeId,
      p_user_id: input.userId,
      p_kind: input.kind,
      p_code_hash: codeHash,
      p_issued_at: new Date(now).toISOString(),
      p_expires_at: new Date(now + (input.ttlMs ?? MFA_VERIFICATION_CODE_TTL_MS)).toISOString(),
      p_max_issues: MFA_VERIFICATION_CODE_MAX_ISSUES,
      p_issue_window_seconds: MFA_VERIFICATION_CODE_ISSUE_WINDOW_MS / 1000,
      p_resend_cooldown_seconds: MFA_VERIFICATION_CODE_RESEND_COOLDOWN_MS / 1000,
    })

    if (error) throwRpcError('issue', error)
    const row = firstRpcRow<IssueRow>(data, 'issue')
    return {
      accepted: row.accepted,
      ...(row.retry_at ? { retryAt: Date.parse(row.retry_at) } : {}),
    }
  }

  async consume(input: ConsumeMfaVerificationCodeInput): Promise<ConsumeMfaVerificationCodeResult> {
    const now = input.now ?? Date.now()
    const { data: beginData, error: beginError } = await this.getClient().rpc(
      'begin_mfa_verification_attempt',
      {
        p_challenge_id: input.challengeId,
        p_user_id: input.userId,
        p_attempted_at: new Date(now).toISOString(),
      },
    )

    if (beginError) throwRpcError('attempt', beginError)
    const attempt = firstRpcRow<BeginAttemptRow>(beginData, 'attempt')

    if (attempt.status !== 'ready' || !attempt.code_id || !attempt.code_hash) {
      await bcrypt.compare(input.code, DUMMY_CODE_HASH)
      return {
        status: attempt.status,
        attemptsRemaining: attempt.attempts_remaining,
      }
    }

    const matches = await bcrypt.compare(input.code, attempt.code_hash)
    const { data: finishData, error: finishError } = await this.getClient().rpc(
      'finish_mfa_verification_attempt',
      {
        p_code_id: attempt.code_id,
        p_user_id: input.userId,
        p_attempt_number: attempt.attempt_number,
        p_matches: matches,
        p_completed_at: new Date(now).toISOString(),
      },
    )

    if (finishError) throwRpcError('completion', finishError)
    const result = firstRpcRow<FinishAttemptRow>(finishData, 'completion')
    return {
      status: result.status,
      attemptsRemaining: result.attempts_remaining,
    }
  }

  async revoke(challengeId: string, userId: string): Promise<void> {
    const { error } = await this.getClient().rpc('revoke_mfa_verification_code', {
      p_challenge_id: challengeId,
      p_user_id: userId,
      p_revoked_at: new Date().toISOString(),
    })
    if (error) throwRpcError('revocation', error)
  }

  async cleanupExpired(now = Date.now()): Promise<number> {
    const { data, error } = await this.getClient().rpc('cleanup_expired_mfa_verification_codes', {
      p_now: new Date(now).toISOString(),
      p_issue_window_seconds: MFA_VERIFICATION_CODE_ISSUE_WINDOW_MS / 1000,
    })
    if (error) throwRpcError('cleanup', error)
    if (typeof data !== 'number') {
      throw new Error('MFA verification-code cleanup returned an invalid result')
    }
    return data
  }
}
