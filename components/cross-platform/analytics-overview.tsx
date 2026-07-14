'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCrossPlatformAnalytics } from '@/hooks/use-cross-platform-posting'
import { BarChart3 } from 'lucide-react'

export function CrossPlatformAnalyticsOverview() {
  const { analytics, accountPerformance, optimalTimes, loading } = useCrossPlatformAnalytics()

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-slate-200 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Cross-Platform Analytics
          </CardTitle>
          <Badge variant="outline" className="bg-slate-800/60">Last 30 days</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading || !analytics ? (
          <p className="text-sm text-slate-400">Loading analytics…</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <div className="text-slate-400 text-sm">Total Scheduled</div>
              <div className="text-2xl text-slate-200 font-semibold">{analytics.total_scheduled_posts}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <div className="text-slate-400 text-sm">Avg Success Rate</div>
              <div className="text-2xl text-slate-200 font-semibold">{Math.round((analytics.average_success_rate || 0) * 100)}%</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <div className="text-slate-400 text-sm">Total Reach</div>
              <div className="text-2xl text-slate-200 font-semibold">{analytics.total_reach?.toLocaleString?.() || analytics.total_reach}</div>
            </div>
          </div>
        )}

        {accountPerformance.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-slate-300 font-medium">Top Accounts</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {accountPerformance.slice(0,6).map(acc => (
                <div key={acc.account_id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <div className="text-slate-200 font-medium">{acc.display_name}</div>
                    <Badge variant="outline" className="capitalize">{acc.account_type}</Badge>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Avg engagement: {Math.round(acc.average_engagement * 100)}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {optimalTimes.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-slate-300 font-medium">Suggested posting times</h4>
            <p className="text-xs text-slate-500">Estimates (not live synced from providers)</p>
            <div className="flex flex-wrap gap-2">
              {optimalTimes.map(t => (
                <Badge key={`${t.account_type}-${t.hour}`} variant="secondary" className="capitalize">{t.account_type}: {t.hour}:00</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CrossPlatformAnalyticsOverview


