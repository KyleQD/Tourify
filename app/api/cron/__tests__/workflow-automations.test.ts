import { NextRequest } from 'next/server'

jest.mock('@/lib/workflows/automation', () => ({
  runWorkflowAutomations: jest.fn(),
}))

function request(headers: Record<string, string> = {}) {
  return new NextRequest('https://tourify.live/api/cron/workflow-automations', { headers })
}

describe('/api/cron/workflow-automations', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      FEATURE_UNIFIED_WORKFLOW_THREADS: '0',
    }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('rejects unauthenticated requests before feature-flag short circuiting', async () => {
    delete process.env.CRON_SECRET
    const route = await import('../workflow-automations/route')

    const response = await route.GET(request())

    expect(response.status).toBe(401)
  })

  it('allows authenticated disabled-feature checks', async () => {
    process.env.CRON_SECRET = 'cron-secret'
    const route = await import('../workflow-automations/route')

    const response = await route.GET(request({ authorization: 'Bearer cron-secret' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ success: true, skipped: true, reason: 'workflow_disabled' })
  })
})
