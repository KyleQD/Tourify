import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export async function GET(request: NextRequest) {
  return withAdminAuth(async () => {
    const supabase = await createClient()

    // Count tasks by type and status
    const types = ['transportation','equipment','backline','lodging','catering','communication','rental']
    const metrics: Record<string, any> = {}

    for (const t of types) {
      const { data, error } = await supabase
        .from('logistics_tasks')
        .select('status')
        .eq('type', t)

      if (error) throw error

      const total = data?.length || 0
      const completed = data?.filter(d => d.status === 'completed').length || 0
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
      const statusLabel = percentage === 100 ? 'Completed' : percentage > 0 ? 'In Progress' : 'Not Started'

      metrics[t] = { percentage, items: total, completed, status: statusLabel }
    }

    // Provide placeholders for domains not backed yet
    metrics['rentals'] = metrics['rentals'] || { percentage: 0, items: 0, completed: 0, status: 'No Rentals', revenue: 0 }
    metrics['lodging'] = metrics['lodging'] || { percentage: 0, items: 0, completed: 0, status: 'No Bookings', revenue: 0 }
    metrics['travelCoordination'] = { percentage: 0, items: 0, completed: 0, status: 'Not Started', travelers: 0 }
    metrics['accommodations'] = metrics['lodging']

    return NextResponse.json({ success: true, metrics, timestamp: new Date().toISOString() })
  })(request)
}