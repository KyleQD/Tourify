import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { metrics } = await request.json()
    
    if (!Array.isArray(metrics) || metrics.length === 0) {
      return NextResponse.json({ error: 'Invalid metrics data' }, { status: 400 })
    }

    const { error } = await supabase
      .from('performance_metrics')
      .insert(metrics.map((metric: any) => ({
        ...metric,
        created_at: new Date().toISOString()
      })))

    if (error) {
      console.error('Error storing metrics:', error)
      return NextResponse.json({ error: 'Failed to store metrics' }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: metrics.length })
  } catch (error) {
    console.error('Analytics metrics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const timeRange = searchParams.get('timeRange') || '24h'
    
    let query = supabase.from('performance_metrics').select('*')
    
    if (sessionId) {
      query = query.eq('sessionId', sessionId)
    }
    
    const hoursAgo = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : 168
    const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()
    query = query.gte('created_at', cutoffTime)
    
    const { data, error } = await query.order('created_at', { ascending: false }).limit(1000)
    
    if (error) {
      console.error('Error fetching metrics:', error)
      return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
    }

    const aggregated = aggregateMetrics(data || [])
    
    return NextResponse.json({ metrics: data, aggregated })
  } catch (error) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function aggregateMetrics(metrics: any[]) {
  const grouped = metrics.reduce((acc, metric) => {
    const key = metric.name
    if (!acc[key]) {
      acc[key] = { count: 0, totalValue: 0, avgValue: 0, values: [] }
    }
    acc[key].count++
    acc[key].totalValue += metric.value
    acc[key].values.push(metric.value)
    return acc
  }, {} as Record<string, any>)

  // Calculate averages and percentiles
  Object.keys(grouped).forEach(key => {
    const data = grouped[key]
    data.avgValue = data.totalValue / data.count
    data.values.sort((a: number, b: number) => a - b)
    data.p50 = percentile(data.values, 0.5)
    data.p95 = percentile(data.values, 0.95)
    data.p99 = percentile(data.values, 0.99)
    delete data.values // Remove raw values to reduce response size
  })

  return grouped
}

function percentile(arr: number[], p: number): number {
  const index = p * (arr.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index % 1
  
  if (upper >= arr.length) return arr[lower]
  return arr[lower] * (1 - weight) + arr[upper] * weight
} 