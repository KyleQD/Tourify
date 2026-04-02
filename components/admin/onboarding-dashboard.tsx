"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Users, 
  Clock, 
  GraduationCap, 
  FileText, 
  CheckCircle, 
  XSquare, 
  Target,
  Plus,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  AlertCircle,
  Star
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface OnboardingStats {
  total: number
  pending: number
  in_progress: number
  completed: number
  approved: number
  rejected: number
  average_progress: number
  recent_activity: Array<{
    id: string
    type: 'invitation' | 'completion' | 'approval' | 'rejection'
    candidate_name: string
    position: string
    timestamp: string
  }>
  top_performers: Array<{
    id: string
    name: string
    position: string
    completion_rate: number
    avg_time: number
  }>
}

interface OnboardingDashboardProps {
  venueId: string
  onViewCandidates: () => void
  onViewTemplates: () => void
  onAddCandidate: () => void
}

export default function OnboardingDashboard({ 
  venueId, 
  onViewCandidates, 
  onViewTemplates, 
  onAddCandidate 
}: OnboardingDashboardProps) {
  const { toast } = useToast()
  const [stats, setStats] = useState<OnboardingStats>({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    approved: 0,
    rejected: 0,
    average_progress: 0,
    recent_activity: [],
    top_performers: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [venueId])

  async function fetchDashboardData() {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/onboarding/dashboard?venue_id=${venueId}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data.data || stats)
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400'
      case 'in_progress': return 'bg-blue-500/20 text-blue-400'
      case 'completed': return 'bg-purple-500/20 text-purple-400'
      case 'approved': return 'bg-green-500/20 text-green-400'
      case 'rejected': return 'bg-red-500/20 text-red-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'invitation': return <Users className="h-4 w-4" />
      case 'completion': return <FileText className="h-4 w-4" />
      case 'approval': return <CheckCircle className="h-4 w-4" />
      case 'rejection': return <XSquare className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'invitation': return 'text-blue-400'
      case 'completion': return 'text-purple-400'
      case 'approval': return 'text-green-400'
      case 'rejection': return 'text-red-400'
      default: return 'text-slate-400'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {[...Array(7)].map((_, i) => (
            <Card key={i} className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-slate-800 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Onboarding Dashboard</h2>
          <p className="text-slate-400">Manage your team onboarding process</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={onAddCandidate}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Candidate
          </Button>
          <Button 
            variant="outline" 
            onClick={onViewTemplates}
            className="border-slate-600 hover:bg-slate-800"
          >
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20">
                <Clock className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Pending</p>
                <p className="text-2xl font-bold text-white">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20">
                <GraduationCap className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">In Progress</p>
                <p className="text-2xl font-bold text-white">{stats.in_progress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                <FileText className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Completed</p>
                <p className="text-2xl font-bold text-white">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Approved</p>
                <p className="text-2xl font-bold text-white">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-red-500/20 to-pink-500/20">
                <XSquare className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Rejected</p>
                <p className="text-2xl font-bold text-white">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                <Target className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Avg Progress</p>
                <p className="text-2xl font-bold text-white">{stats.average_progress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-400" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recent_activity.length > 0 ? (
                stats.recent_activity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50">
                    <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{activity.candidate_name}</p>
                      <p className="text-slate-400 text-sm">{activity.position}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-sm">
                        {formatSafeDate(activity.timestamp)}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {activity.type}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-400" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.top_performers.length > 0 ? (
                stats.top_performers.map((performer) => (
                  <div key={performer.id} className="p-3 rounded-lg bg-slate-800/50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white font-medium">{performer.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {performer.completion_rate}%
                      </Badge>
                    </div>
                    <p className="text-slate-400 text-sm mb-2">{performer.position}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <TrendingUp className="h-3 w-3" />
                      <span>Avg: {performer.avg_time} days</span>
                    </div>
                    <Progress value={performer.completion_rate} className="mt-2" />
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Star className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">No performance data yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button 
              onClick={onViewCandidates}
              variant="outline" 
              className="h-20 flex flex-col gap-2 border-slate-600 hover:bg-slate-800"
            >
              <Users className="h-6 w-6" />
              <span>View Candidates</span>
            </Button>
            <Button 
              onClick={onViewTemplates}
              variant="outline" 
              className="h-20 flex flex-col gap-2 border-slate-600 hover:bg-slate-800"
            >
              <FileText className="h-6 w-6" />
              <span>Manage Templates</span>
            </Button>
            <Button 
              onClick={onAddCandidate}
              variant="outline" 
              className="h-20 flex flex-col gap-2 border-slate-600 hover:bg-slate-800"
            >
              <Plus className="h-6 w-6" />
              <span>Add Candidate</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2 border-slate-600 hover:bg-slate-800"
            >
              <Search className="h-6 w-6" />
              <span>Search & Filter</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 