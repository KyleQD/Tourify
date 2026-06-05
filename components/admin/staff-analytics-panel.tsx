"use client"

import { useCallback, useEffect, useState } from "react"
import { Users, Clock, Briefcase, ClipboardList, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminStatCard } from "@/app/admin/dashboard/components/admin-stat-card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface Analytics {
  totalStaff: number
  activeStaff: number
  openPositions: number
  pendingApplications: number
  staffByRole: Array<{ role: string; count: number }>
  shiftHoursThisMonth: number
}

export function StaffAnalyticsPanel({ venueId }: { venueId?: string }) {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (venueId) params.set('venue_id', venueId)
      params.set('limit', '200')

      const [staffRes, jobsRes, appsRes, shiftsRes] = await Promise.allSettled([
        fetch(`/api/admin/staff?${params}`, { credentials: 'include' }),
        fetch('/api/admin/staffing/job-postings', { credentials: 'include', method: 'GET' }),
        fetch(`/api/admin/applications?${venueId ? `venue_id=${venueId}&` : ''}limit=200`, { credentials: 'include' }),
        fetch(`/api/admin/staffing/shifts?${venueId ? `venueId=${venueId}&` : ''}limit=200`, { credentials: 'include' }),
      ])

      let staffList: any[] = []
      let openPositions = 0
      let pendingApplications = 0
      let shiftHours = 0

      if (staffRes.status === 'fulfilled' && staffRes.value.ok) {
        const d = await staffRes.value.json()
        staffList = d.data || []
      }

      if (jobsRes.status === 'fulfilled' && jobsRes.value.ok) {
        const d = await jobsRes.value.json()
        openPositions = (d.jobs || d.data || []).filter((j: any) => j.status === 'open' || j.status === 'published').length
      }

      if (appsRes.status === 'fulfilled' && appsRes.value.ok) {
        const d = await appsRes.value.json()
        pendingApplications = (d.applications || d.data || []).filter((a: any) => a.status === 'pending' || a.status === 'reviewed').length
      }

      if (shiftsRes.status === 'fulfilled' && shiftsRes.value.ok) {
        const d = await shiftsRes.value.json()
        const shifts = d.data || []
        // Sum hours: end_time - start_time for current month
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
        shiftHours = shifts
          .filter((s: any) => s.shift_date >= monthStart)
          .reduce((total: number, s: any) => {
            if (!s.start_time || !s.end_time) return total
            const [sh, sm] = s.start_time.split(':').map(Number)
            const [eh, em] = s.end_time.split(':').map(Number)
            return total + Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
          }, 0)
      }

      // Aggregate staff by role
      const roleCounts: Record<string, number> = {}
      for (const m of staffList) {
        const r = m.role || 'unassigned'
        roleCounts[r] = (roleCounts[r] || 0) + 1
      }
      const staffByRole = Object.entries(roleCounts)
        .map(([role, count]) => ({ role: role.replace(/_/g, ' '), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)

      setData({
        totalStaff: staffList.length,
        activeStaff: staffList.filter((m: any) => m.status === 'active').length,
        openPositions,
        pendingApplications,
        staffByRole,
        shiftHoursThisMonth: Math.round(shiftHours),
      })
    } finally {
      setLoading(false)
    }
  }, [venueId])

  useEffect(() => { void fetchAnalytics() }, [fetchAnalytics])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-5 w-5 animate-spin text-purple-400" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard title="Total Staff" value={data.totalStaff} icon={Users} color="purple" />
        <AdminStatCard title="Active Staff" value={data.activeStaff} icon={Users} color="green" />
        <AdminStatCard title="Shift Hours (MTD)" value={data.shiftHoursThisMonth} icon={Clock} color="blue" />
        <AdminStatCard title="Open Positions" value={data.openPositions} icon={Briefcase} color="orange" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Staff by role chart */}
        <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-400" />
              Staff by Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.staffByRole.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No staff data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.staffByRole} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis type="category" dataKey="role" tick={{ fill: '#94a3b8', fontSize: 11 }} width={100} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #475569', color: '#f1f5f9' }} />
                  <Bar dataKey="count" fill="#9333ea" name="Staff" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Application pipeline */}
        <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-purple-400" />
              Hiring Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-sm">
              <span className="text-slate-300 text-sm">Open Positions</span>
              <span className="text-white font-bold">{data.openPositions}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-sm">
              <span className="text-slate-300 text-sm">Pending Applications</span>
              <span className="text-yellow-400 font-bold">{data.pendingApplications}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-sm">
              <span className="text-slate-300 text-sm">Active Staff</span>
              <span className="text-green-400 font-bold">{data.activeStaff}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-sm">
              <span className="text-slate-300 text-sm">Shift Hours This Month</span>
              <span className="text-blue-400 font-bold">{data.shiftHoursThisMonth}h</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
