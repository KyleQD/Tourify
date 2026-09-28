import bcrypt from "bcryptjs"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  InMemoryMfaVerificationCodeStore,
  MFA_VERIFICATION_CODE_MAX_ATTEMPTS,
  MFA_VERIFICATION_CODE_MAX_ISSUES,
  MFA_VERIFICATION_CODE_RESEND_COOLDOWN_MS,
  MFA_VERIFICATION_CODE_ISSUE_WINDOW_MS,
} from "@/lib/services/mfa-verification-code-store"
import { SupabaseMfaVerificationCodeStore } from "@/lib/services/mfa-verification-code-store.server"

type BackupCodeRow = {
  id: string
  user_id: string
  code_hash: string
  is_used: boolean
  used_at?: string
}

const state = vi.hoisted(() => ({
  backupCodes: [] as BackupCodeRow[],
  lastInsertedRows: [] as Array<Record<string, unknown>>,
  lastUpdate: null as Record<string, unknown> | null,
}))

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === "user_mfa_backup_codes") {
        let filters: Array<[string, unknown]> = []
        let updatePayload: Record<string, unknown> | null = null
        const builder: Record<string, any> = {}

        builder.select = vi.fn(() => builder)
        builder.eq = vi.fn((field: string, value: unknown) => {
          filters = [...filters, [field, value]]
          return builder
        })
        builder.insert = vi.fn(async (rows: Array<Record<string, unknown>>) => {
          state.lastInsertedRows = rows
          state.backupCodes = rows.map((row, index) => ({
            id: `backup-${index + 1}`,
            user_id: String(row.user_id),
            code_hash: String(row.code_hash),
            is_used: Boolean(row.is_used),
          }))
          return { error: null }
        })
        builder.update = vi.fn((payload: Record<string, unknown>) => {
          updatePayload = payload
          state.lastUpdate = payload
          return builder
        })
        builder.maybeSingle = vi.fn(async () => {
          const row = state.backupCodes.find((candidate) =>
            filters.every(([field, value]) => candidate[field as keyof BackupCodeRow] === value),
          )

          if (!row || !updatePayload) return { data: null, error: null }

          Object.assign(row, updatePayload)
          return { data: { id: row.id }, error: null }
        })
        builder.then = (
          onFulfilled: (value: { data: BackupCodeRow[]; error: null }) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) => {
          const rows = state.backupCodes.filter((candidate) =>
            filters.every(([field, value]) => candidate[field as keyof BackupCodeRow] === value),
          )
          return Promise.resolve({ data: rows, error: null }).then(onFulfilled, onRejected)
        }
        return builder
      }

      const builder: Record<string, any> = {}
      builder.upsert = vi.fn().mockResolvedValue({ error: null })
      builder.update = vi.fn(() => builder)
      builder.eq = vi.fn(() => builder)
      builder.then = (
        onFulfilled: (value: { error: null }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => Promise.resolve({ error: null }).then(onFulfilled, onRejected)
      return builder
    }),
  },
}))

import { mfaService } from "@/lib/services/mfa.service"

describe("MFA backup codes", () => {
  beforeEach(() => {
    state.backupCodes = []
    state.lastInsertedRows = []
    state.lastUpdate = null
  })

  it("stores bcrypt hashes instead of reversible or plaintext code values", async () => {
    const codes = await mfaService.generateBackupCodes("user-1")

    expect(codes).toHaveLength(10)
    expect(state.lastInsertedRows).toHaveLength(10)
    expect(state.lastInsertedRows[0]?.code_hash).toMatch(/^\$2[aby]\$/)
    expect(state.lastInsertedRows[0]?.code_hash).not.toBe(codes[0])
    await expect(bcrypt.compare(codes[0], String(state.lastInsertedRows[0]?.code_hash))).resolves.toBe(true)
  }, 30000)

  it("redeems a matching backup code once and conditionally marks it used", async () => {
    const codes = await mfaService.generateBackupCodes("user-1")

    await expect(mfaService.verifyMFAToken("user-1", "challenge-1", codes[0], "backup_codes")).resolves.toMatchObject({
      success: true,
      methodUsed: "backup_codes",
    })
    expect(state.lastUpdate).toMatchObject({ is_used: true })

    await expect(mfaService.verifyMFAToken("user-1", "challenge-1", codes[0], "backup_codes")).resolves.toMatchObject({
      success: false,
    })
  }, 15000)
})

describe("MFA verification-code store contract", () => {
  it("enforces user scoping, bounded attempts, and replay prevention", async () => {
    const store = new InMemoryMfaVerificationCodeStore()
    await expect(store.issue({
      challengeId: "challenge-1",
      userId: "user-1",
      kind: "sms_login",
      code: "123456",
      now: 1_000,
    })).resolves.toMatchObject({ accepted: true })

    await expect(store.consume({
      challengeId: "challenge-1",
      userId: "user-2",
      code: "123456",
      now: 1_001,
    })).resolves.toMatchObject({ status: "not_found" })

    for (let attempt = 1; attempt <= MFA_VERIFICATION_CODE_MAX_ATTEMPTS; attempt += 1) {
      await expect(store.consume({
        challengeId: "challenge-1",
        userId: "user-1",
        code: "000000",
        now: 1_001 + attempt,
      })).resolves.toMatchObject({
        status: attempt === MFA_VERIFICATION_CODE_MAX_ATTEMPTS ? "locked" : "invalid",
      })
    }

    await expect(store.consume({
      challengeId: "challenge-1",
      userId: "user-1",
      code: "123456",
      now: 1_010,
    })).resolves.toMatchObject({ status: "locked", attemptsRemaining: 0 })
  })

  it("expires codes and rejects replay after an atomic successful consume", async () => {
    const store = new InMemoryMfaVerificationCodeStore()
    await store.issue({
      challengeId: "challenge-expired",
      userId: "user-1",
      kind: "sms_setup",
      code: "123456",
      now: 2_000,
      ttlMs: 100,
    })
    await expect(store.consume({
      challengeId: "challenge-expired",
      userId: "user-1",
      code: "123456",
      now: 2_100,
    })).resolves.toMatchObject({ status: "expired" })

    await store.issue({
      challengeId: "challenge-valid",
      userId: "user-1",
      kind: "sms_setup",
      code: "654321",
      now: 60_000,
    })
    await expect(store.consume({
      challengeId: "challenge-valid",
      userId: "user-1",
      code: "654321",
      now: 60_001,
    })).resolves.toMatchObject({ status: "valid" })
    await expect(store.consume({
      challengeId: "challenge-valid",
      userId: "user-1",
      code: "654321",
      now: 60_002,
    })).resolves.toMatchObject({ status: "replayed" })
  })

  it("cleans up expired unconsumed codes without deleting replay evidence", async () => {
    const store = new InMemoryMfaVerificationCodeStore()
    await store.issue({
      challengeId: "challenge-cleanup-expired",
      userId: "user-cleanup-expired",
      kind: "sms_setup",
      code: "123456",
      now: 10_000,
      ttlMs: 100,
    })
    await store.issue({
      challengeId: "challenge-cleanup-consumed",
      userId: "user-cleanup-consumed",
      kind: "sms_setup",
      code: "654321",
      now: 10_000,
      ttlMs: 100,
    })
    await expect(store.consume({
      challengeId: "challenge-cleanup-consumed",
      userId: "user-cleanup-consumed",
      code: "654321",
      now: 10_050,
    })).resolves.toMatchObject({ status: "valid" })

    await expect(store.cleanupExpired(10_100)).resolves.toBe(1)
    await expect(store.consume({
      challengeId: "challenge-cleanup-expired",
      userId: "user-cleanup-expired",
      code: "123456",
      now: 10_101,
    })).resolves.toMatchObject({ status: "not_found" })
    await expect(store.consume({
      challengeId: "challenge-cleanup-consumed",
      userId: "user-cleanup-consumed",
      code: "654321",
      now: 10_101,
    })).resolves.toMatchObject({ status: "replayed" })
  })

  it("rate-limits resend issuance with deterministic retry windows", async () => {
    const store = new InMemoryMfaVerificationCodeStore()
    const issue = (challengeId: string, now: number) => store.issue({
      challengeId,
      userId: "user-rate-limited",
      kind: "sms_setup",
      code: "123456",
      now,
    })

    await expect(issue("rate-1", 100_000)).resolves.toMatchObject({ accepted: true })
    await expect(issue("rate-2", 100_000 + MFA_VERIFICATION_CODE_RESEND_COOLDOWN_MS - 1))
      .resolves.toMatchObject({ accepted: false, retryAt: 100_000 + MFA_VERIFICATION_CODE_RESEND_COOLDOWN_MS })

    const firstAllowed = 100_000 + MFA_VERIFICATION_CODE_RESEND_COOLDOWN_MS
    await expect(issue("rate-2", firstAllowed)).resolves.toMatchObject({ accepted: true })
    await expect(issue("rate-3", firstAllowed + MFA_VERIFICATION_CODE_RESEND_COOLDOWN_MS))
      .resolves.toMatchObject({ accepted: true })
    await expect(issue("rate-4", firstAllowed + MFA_VERIFICATION_CODE_RESEND_COOLDOWN_MS * 2))
      .resolves.toMatchObject({
        accepted: false,
        retryAt: 100_000 + MFA_VERIFICATION_CODE_ISSUE_WINDOW_MS,
      })
    expect(MFA_VERIFICATION_CODE_MAX_ISSUES).toBe(3)
  })
})

describe("Supabase MFA verification-code repository", () => {
  it("hashes codes before the atomic issue RPC and maps deterministic retry time", async () => {
    const calls: Array<{ name: string; parameters: Record<string, unknown> }> = []
    const client = {
      rpc: vi.fn(async (name: string, parameters: Record<string, unknown>) => {
        calls.push({ name, parameters })
        return {
          data: [{ accepted: false, retry_at: "2026-09-18T22:00:30.000Z" }],
          error: null,
        }
      }),
    }
    const store = new SupabaseMfaVerificationCodeStore(client)

    await expect(store.issue({
      challengeId: "challenge-persistent",
      userId: "00000000-0000-4000-8000-000000000001",
      kind: "sms_login",
      code: "123456",
      now: Date.parse("2026-09-18T22:00:00.000Z"),
    })).resolves.toEqual({
      accepted: false,
      retryAt: Date.parse("2026-09-18T22:00:30.000Z"),
    })

    expect(calls[0]?.name).toBe("issue_mfa_verification_code")
    expect(JSON.stringify(calls[0]?.parameters)).not.toContain("123456")
    const persistedHash = String(calls[0]?.parameters.p_code_hash)
    expect(persistedHash).toMatch(/^\$2[aby]\$12\$/)
    await expect(bcrypt.compare("123456", persistedHash)).resolves.toBe(true)
  })

  it("claims and completes a matching attempt through the atomic RPC boundary", async () => {
    const codeHash = await bcrypt.hash("654321", 12)
    const calls: Array<{ name: string; parameters: Record<string, unknown> }> = []
    const client = {
      rpc: vi.fn(async (name: string, parameters: Record<string, unknown>) => {
        calls.push({ name, parameters })
        if (name === "begin_mfa_verification_attempt") {
          return {
            data: [{
              code_id: "10000000-0000-4000-8000-000000000001",
              status: "ready",
              code_hash: codeHash,
              attempt_number: 1,
              attempts_remaining: 2,
            }],
            error: null,
          }
        }
        return {
          data: [{ status: "valid", attempts_remaining: 2 }],
          error: null,
        }
      }),
    }
    const store = new SupabaseMfaVerificationCodeStore(client)

    await expect(store.consume({
      challengeId: "challenge-persistent",
      userId: "00000000-0000-4000-8000-000000000001",
      code: "654321",
      now: Date.parse("2026-09-18T22:01:00.000Z"),
    })).resolves.toEqual({ status: "valid", attemptsRemaining: 2 })

    expect(calls.map((call) => call.name)).toEqual([
      "begin_mfa_verification_attempt",
      "finish_mfa_verification_attempt",
    ])
    expect(calls[1]?.parameters).toMatchObject({
      p_attempt_number: 1,
      p_matches: true,
      p_user_id: "00000000-0000-4000-8000-000000000001",
    })
    expect(JSON.stringify(calls)).not.toContain("654321")
  })
})
