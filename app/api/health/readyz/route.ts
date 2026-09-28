import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ENVIRONMENT_CONTRACT } from '@/lib/config/environment-contract'
import { getReleaseMetadataHeaders } from '@/lib/config/release-metadata'

type ReadinessStatus = 'ready' | 'degraded' | 'not_ready'
type ServiceReadinessStatus = 'ready' | 'degraded' | 'not_configured' | 'unavailable'

interface ServiceReadiness {
  status: ServiceReadinessStatus
  responseTimeMs?: number
}

interface ReadinessReport {
  status: ReadinessStatus
  timestamp: string
  services: {
    supabase: ServiceReadiness
    redis: ServiceReadiness
  }
  requiredServices: {
    status: 'ready' | 'not_configured'
    services: Record<string, boolean>
  }
}

const REQUIRED_SERVICE_NAMES = ENVIRONMENT_CONTRACT
  .filter((item) => item.requirement === 'required')
  .map((item) => item.name)

function requiredServiceConfiguration(environment: NodeJS.ProcessEnv = process.env): Record<string, boolean> {
  const services: Record<string, boolean> = {}
  for (const name of REQUIRED_SERVICE_NAMES) {
    services[name] = Boolean(environment[name]?.trim())
  }
  return services
}

/**
 * Readiness probe contract (RELEASE-003). Reports only redacted derived state:
 * service status, never URLs, keys, tokens, or error stacks. Uptime providers
 * and orchestrators may call this endpoint unauthenticated.
 */
function readinessStatusCode(report: ReadinessReport): number {
  return report.status === 'not_ready' ? 503 : 200
}

export async function GET() {
  const report = await buildReadinessReport()
  const releaseHeaders = getReleaseMetadataHeaders()
  return NextResponse.json(report, { status: readinessStatusCode(report), headers: releaseHeaders })
}

export async function HEAD() {
  const report = await buildReadinessReport()
  const releaseHeaders = getReleaseMetadataHeaders()
  return new NextResponse(null, { status: readinessStatusCode(report), headers: releaseHeaders })
}

async function buildReadinessReport(): Promise<ReadinessReport> {
  const services = {
    supabase: await checkSupabase(),
    redis: await checkRedis(),
  }
  const required = requiredServiceConfiguration()

  const configured = Object.values(required).every(Boolean)
  const requiredStatus = configured ? 'ready' : 'not_configured'

  const status: ReadinessStatus =
    requiredStatus === 'not_configured' || Object.values(services).some((s) => s.status === 'unavailable')
      ? 'not_ready'
      : Object.values(services).some((s) => s.status === 'degraded')
        ? 'degraded'
        : 'ready'

  return {
    status,
    timestamp: new Date().toISOString(),
    services,
    requiredServices: {
      status: requiredStatus,
      services: required,
    },
  }
}

async function checkSupabase(): Promise<ServiceReadiness> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
    return { status: 'not_configured' }
  }

  const start = Date.now()
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.getUser()
    const responseTimeMs = Date.now() - start
    if (error) {
      return { status: 'degraded', responseTimeMs }
    }
    return {
      status: responseTimeMs > 2000 ? 'degraded' : 'ready',
      responseTimeMs,
    }
  } catch {
    return { status: 'unavailable' }
  }
}

async function checkRedis(): Promise<ServiceReadiness> {
  if (!process.env.UPSTASH_REDIS_REST_URL?.trim() || !process.env.UPSTASH_REDIS_REST_TOKEN?.trim()) {
    return { status: 'not_configured' }
  }

  const start = Date.now()
  try {
    const { Redis } = await import('@upstash/redis').catch(() => ({ Redis: null }))
    if (!Redis) {
      return { status: 'unavailable' }
    }

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    await redis.ping()

    const responseTimeMs = Date.now() - start
    return {
      status: responseTimeMs > 500 ? 'degraded' : 'ready',
      responseTimeMs,
    }
  } catch {
    return { status: 'unavailable' }
  }
}