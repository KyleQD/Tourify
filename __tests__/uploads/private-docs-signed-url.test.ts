import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  isRateLimitingActive: vi.fn(),
  rateCheck: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}))

vi.mock('@/lib/utils/rate-limit', () => ({
  clientKeyFromRequest: () => '203.0.113.10',
  createRateLimiter: () => ({ check: mocks.rateCheck }),
  isRateLimitingActive: mocks.isRateLimitingActive,
}))

import { POST } from '../../app/api/upload/signed-url/route'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222'
const FIXED_EXPIRY_SECONDS = 7200

function request(body: unknown) {
  return new NextRequest('https://tourify.test/api/upload/signed-url', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createStorageClient({
  userId = USER_ID,
  signingError = null,
}: {
  userId?: string | null
  signingError?: { message: string } | null
} = {}) {
  const createSignedUploadUrl = vi.fn(async () => ({
    data: signingError
      ? null
      : { signedUrl: 'https://storage.test/signed-upload', token: 'upload-token' },
    error: signingError,
  }))
  const fromBucket = vi.fn(() => ({ createSignedUploadUrl }))
  const client = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: userId ? { id: userId } : null },
        error: null,
      })),
    },
    storage: { from: fromBucket },
  }
  mocks.createClient.mockResolvedValue(client)
  return { client, createSignedUploadUrl, fromBucket }
}

function sourceFiles(directory: string): string[] {
  const files: string[] = []

  function visit(current: string) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name)
      if (entry.isDirectory()) visit(path)
      else if (/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) files.push(path)
    }
  }

  visit(resolve(process.cwd(), directory))
  return files
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  mocks.isRateLimitingActive.mockReturnValue(true)
  mocks.rateCheck.mockResolvedValue({ success: true })
})

describe('private-docs signed upload disposition', () => {
  it('retains a zero-product-caller route pending explicit adoption or retirement authority', () => {
    const routePath = resolve(process.cwd(), 'app/api/upload/signed-url/route.ts')
    const testPath = resolve(process.cwd(), '__tests__/uploads/private-docs-signed-url.test.ts')
    const callers = ['app', 'components', 'hooks', 'lib']
      .flatMap(sourceFiles)
      .filter((path) => path !== routePath && path !== testPath)
      .filter((path) => readFileSync(path, 'utf8').includes('/api/upload/signed-url'))
      .map((path) => path.slice(process.cwd().length + 1))

    expect(callers).toEqual([])

    const toolingReferences = sourceFiles('scripts')
      .filter((path) => readFileSync(path, 'utf8').includes('app/api/upload/signed-url/route.ts'))
      .map((path) => path.slice(process.cwd().length + 1))
    expect(toolingReferences).toEqual(['scripts/agent-tools/generate-workspace-ownership.mjs'])
  })

  it('does not import or expose a service-role credential', async () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/api/upload/signed-url/route.ts'),
      'utf8'
    )
    expect(source).not.toMatch(/service[_-]?role|SUPABASE_SERVICE/i)

    createStorageClient()
    const response = await POST(request({ filePath: `${USER_ID}/document.pdf` }))
    const payload = await response.json()
    expect(JSON.stringify(payload)).not.toMatch(/service[_-]?role|secret|key/i)
  })
})

describe('POST /api/upload/signed-url', () => {
  it('requires a verified user before parsing or signing a path', async () => {
    const { createSignedUploadUrl } = createStorageClient({ userId: null })

    const response = await POST(request({ filePath: `${USER_ID}/document.pdf` }))

    expect(response.status).toBe(401)
    expect(createSignedUploadUrl).not.toHaveBeenCalled()
  })

  it('denies cross-user prefixes', async () => {
    const { createSignedUploadUrl } = createStorageClient()

    const response = await POST(request({ filePath: `${OTHER_USER_ID}/document.pdf` }))

    expect(response.status).toBe(403)
    expect(createSignedUploadUrl).not.toHaveBeenCalled()
  })

  it.each([
    `${USER_ID}/../other.pdf`,
    `${USER_ID}/%2e%2e/other.pdf`,
    `${USER_ID}/%252e%252e/other.pdf`,
    `${USER_ID}/folder%2Fother.pdf`,
    `${USER_ID}/folder%00other.pdf`,
    `${USER_ID}\\other.pdf`,
    `${USER_ID}//other.pdf`,
    `${USER_ID}/./other.pdf`,
    ` ${USER_ID}/other.pdf`,
  ])('rejects traversal or ambiguous path %s', async (filePath) => {
    const { createSignedUploadUrl } = createStorageClient()

    const response = await POST(request({ filePath }))

    expect(response.status).toBe(403)
    expect(createSignedUploadUrl).not.toHaveBeenCalled()
  })

  it('signs only the fixed private-docs bucket and exact validated own-user path', async () => {
    const { createSignedUploadUrl, fromBucket } = createStorageClient()
    const filePath = `${USER_ID}/documents/license.pdf`

    const response = await POST(request({
      bucket: 'public-or-attacker-bucket',
      filePath,
      expiresInSec: FIXED_EXPIRY_SECONDS,
    }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(fromBucket).toHaveBeenCalledWith('private-docs')
    expect(createSignedUploadUrl).toHaveBeenCalledWith(filePath)
    expect(payload).toEqual({
      bucket: 'private-docs',
      path: filePath,
      url: 'https://storage.test/signed-upload',
      token: 'upload-token',
      expiresInSec: FIXED_EXPIRY_SECONDS,
    })
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it.each([60, 300, 60 * 60 * 24 * 7, '7200', Number.NaN])(
    'rejects a misleading client expiry value %s',
    async (expiresInSec) => {
      const { createSignedUploadUrl } = createStorageClient()

      const response = await POST(request({
        filePath: `${USER_ID}/document.pdf`,
        expiresInSec,
      }))

      expect(response.status).toBe(400)
      expect(createSignedUploadUrl).not.toHaveBeenCalled()
    }
  )

  it('reports the fixed two-hour expiry when the client omits expiry input', async () => {
    createStorageClient()

    const response = await POST(request({ filePath: `${USER_ID}/document.pdf` }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ expiresInSec: FIXED_EXPIRY_SECONDS })
  })

  it('fails closed when Storage refuses to sign', async () => {
    createStorageClient({ signingError: { message: 'RLS denied' } })

    const response = await POST(request({ filePath: `${USER_ID}/document.pdf` }))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'failed' })
  })

  it('enforces limiter denial and limiter failure without creating a client', async () => {
    mocks.rateCheck.mockResolvedValueOnce({ success: false })
    let response = await POST(request({ filePath: `${USER_ID}/document.pdf` }))
    expect(response.status).toBe(429)
    expect(mocks.createClient).not.toHaveBeenCalled()

    mocks.rateCheck.mockRejectedValueOnce(new Error('Redis unavailable'))
    response = await POST(request({ filePath: `${USER_ID}/document.pdf` }))
    expect(response.status).toBe(503)
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('fails closed in production when distributed rate limiting is inactive', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    mocks.isRateLimitingActive.mockReturnValue(false)

    const response = await POST(request({ filePath: `${USER_ID}/document.pdf` }))

    expect(response.status).toBe(503)
    expect(mocks.rateCheck).not.toHaveBeenCalled()
    expect(mocks.createClient).not.toHaveBeenCalled()
  })
})
