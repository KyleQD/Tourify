import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAuthorizedInternalRequest } from '@/lib/auth/route-guards'

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  environment: string
  services: {
    database: ServiceStatus
    redis: ServiceStatus
    supabase: ServiceStatus
  }
  metrics: {
    memoryUsage: NodeJS.MemoryUsage
    cpuUsage: number[]
  }
}

interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime?: number
  error?: string
}

const startTime = Date.now()

export async function GET(request: NextRequest) {
  const isInternal = isAuthorizedInternalRequest(request)
  if (!isInternal) {
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    })
  }

  const supabase = await createClient()
  const healthCheck: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: await checkDatabase(supabase),
      redis: await checkRedis(),
      supabase: await checkSupabase(supabase)
    },
    metrics: {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage ? Object.values(process.cpuUsage()) : []
    }
  }

  // Determine overall health status
  const serviceStatuses = Object.values(healthCheck.services).map(s => s.status)
  if (serviceStatuses.includes('unhealthy')) {
    healthCheck.status = 'unhealthy'
  } else if (serviceStatuses.includes('degraded')) {
    healthCheck.status = 'degraded'
  }

  const statusCode = healthCheck.status === 'healthy' ? 200 : 
                    healthCheck.status === 'degraded' ? 200 : 503

  return NextResponse.json(healthCheck, { status: statusCode })
}

async function checkDatabase(supabase: Awaited<ReturnType<typeof createClient>>): Promise<ServiceStatus> {
  try {
    const start = Date.now()
    
    const { error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
      .single()

    const responseTime = Date.now() - start

    if (error && !error.message.includes('No rows')) {
      return {
        status: 'unhealthy',
        responseTime,
        error: error.message
      }
    }

    return {
      status: responseTime > 1000 ? 'degraded' : 'healthy',
      responseTime
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown database error'
    }
  }
}

async function checkRedis(): Promise<ServiceStatus> {
  try {
    const redisUrl = process.env.REDIS_URL || process.env.KV_REST_API_URL
    if (!redisUrl) {
      return {
        status: 'healthy',
        error: 'Redis not configured (optional)'
      }
    }

    const start = Date.now()

    const { Redis } = await import('@upstash/redis').catch(() => ({ Redis: null }))
    if (!Redis) {
      return { status: 'healthy', error: 'Redis SDK not available' }
    }

    const redis = new Redis({
      url: process.env.KV_REST_API_URL || redisUrl,
      token: process.env.KV_REST_API_TOKEN || ''
    })
    await redis.ping()

    const responseTime = Date.now() - start
    return {
      status: responseTime > 500 ? 'degraded' : 'healthy',
      responseTime
    }
  } catch (error) {
    return {
      status: 'degraded',
      error: error instanceof Error ? error.message : 'Unknown Redis error'
    }
  }
}

async function checkSupabase(supabase: Awaited<ReturnType<typeof createClient>>): Promise<ServiceStatus> {
  try {
    const start = Date.now()
    
    const { error } = await supabase.auth.getUser()

    const responseTime = Date.now() - start

    if (error) {
      return {
        status: 'degraded',
        responseTime,
        error: error.message
      }
    }

    return {
      status: responseTime > 2000 ? 'degraded' : 'healthy',
      responseTime
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown Supabase error'
    }
  }
}

// Readiness probe endpoint
export async function HEAD(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.getUser()
    
    if (error) {
      return new NextResponse(null, { status: 503 })
    }

    return new NextResponse(null, { status: 200 })
  } catch (error) {
    return new NextResponse(null, { status: 503 })
  }
} 