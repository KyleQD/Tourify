"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { 
  Truck, 
  Building, 
  Box, 
  Zap, 
  Utensils, 
  MessageSquare, 
  Users, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ExternalLink
} from "lucide-react"
import Link from "next/link"

interface LogisticsMetrics {
  transportation: { percentage: number; items: number; completed: number; status: string }
  accommodations: { percentage: number; items: number; completed: number; status: string }
  equipment: { percentage: number; items: number; completed: number; status: string }
  backline: { percentage: number; items: number; completed: number; status: string }
  rentals: { percentage: number; items: number; completed: number; status: string; revenue: number }
  lodging: { percentage: number; items: number; completed: number; status: string; revenue: number }
  travelCoordination: { percentage: number; items: number; completed: number; status: string; travelers: number }
  catering: { percentage: number; items: number; completed: number; status: string }
  communication: { percentage: number; items: number; completed: number; status: string }
}

interface LogisticsIntegrationProps {
  eventId?: string
  tourId?: string
  compact?: boolean
  showDetails?: boolean
}

export function LogisticsIntegration({ 
  eventId, 
  tourId, 
  compact = false, 
  showDetails = true 
}: LogisticsIntegrationProps) {
  const [metrics, setMetrics] = useState<LogisticsMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function buildNoStoreInit(): RequestInit {
    return {
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    }
  }

  const fetchLogisticsMetrics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (eventId) params.append('eventId', eventId)
      if (tourId) params.append('tourId', tourId)

      const response = await fetch(`/api/admin/logistics/metrics?${params.toString()}`, buildNoStoreInit())

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setMetrics(data.metrics)
    } catch (err) {
      console.error('[LogisticsIntegration] Error fetching metrics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch logistics data')
      
      // Set default metrics for graceful fallback
      setMetrics({
        transportation: { percentage: 0, items: 0, completed: 0, status: 'Not Started' },
        accommodations: { percentage: 0, items: 0, completed: 0, status: 'Not Started' },
        equipment: { percentage: 0, items: 0, completed: 0, status: 'Not Started' },
        backline: { percentage: 0, items: 0, completed: 0, status: 'Not Started' },
        rentals: { percentage: 0, items: 0, completed: 0, status: 'No Rentals', revenue: 0 },
        lodging: { percentage: 0, items: 0, completed: 0, status: 'No Bookings', revenue: 0 },
        travelCoordination: { percentage: 0, items: 0, completed: 0, status: 'Not Started', travelers: 0 },
        catering: { percentage: 0, items: 0, completed: 0, status: 'Not Started' },
        communication: { percentage: 0, items: 0, completed: 0, status: 'Not Started' }
      })
    } finally {
      setLoading(false)
    }
  }, [eventId, tourId])

  useEffect(() => {
    fetchLogisticsMetrics()
  }, [fetchLogisticsMetrics])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Confirmed':
      case 'Active':
        return 'bg-green-500'
      case 'In Progress':
        return 'bg-yellow-500'
      case 'Not Started':
      case 'No Rentals':
      case 'No Bookings':
        return 'bg-slate-500'
      default:
        return 'bg-slate-500'
    }
  }

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Confirmed':
      case 'Active':
        return 'text-green-400'
      case 'In Progress':
        return 'text-yellow-400'
      case 'Not Started':
      case 'No Rentals':
      case 'No Bookings':
        return 'text-slate-400'
      default:
        return 'text-slate-400'
    }
  }

  const calculateOverallProgress = () => {
    if (!metrics) return 0
    const total = Object.values(metrics).reduce((sum, metric) => sum + metric.percentage, 0)
    return Math.round(total / Object.keys(metrics).length)
  }

  const getCriticalIssues = () => {
    if (!metrics) return []
    
    const issues = []
    if (metrics.transportation.status === 'Not Started') {
      issues.push({ type: 'Transportation', severity: 'high', message: 'Transportation not configured' })
    }
    if (metrics.accommodations.status === 'Not Started') {
      issues.push({ type: 'Accommodations', severity: 'high', message: 'Hotel bookings needed' })
    }
    if (metrics.equipment.status === 'Not Started') {
      issues.push({ type: 'Equipment', severity: 'medium', message: 'Equipment not assigned' })
    }
    if (metrics.catering.status === 'Not Started') {
      issues.push({ type: 'Catering', severity: 'medium', message: 'Catering not arranged' })
    }
    
    return issues
  }

  const criticalIssues = getCriticalIssues()
  const overallProgress = calculateOverallProgress()

  if (compact) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-slate-100 flex items-center justify-between text-sm">
            <span>Logistics Status</span>
            <Link href="/admin/dashboard/logistics">
              <Button variant="ghost" size="sm" className="h-6 px-2">
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Overall Progress</span>
              <span className="text-sm font-medium text-white">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
            
            {criticalIssues.length > 0 && (
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-xs text-yellow-400">{criticalIssues.length} critical issues</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center justify-between">
            <span>Logistics Overview</span>
            <Link href="/admin/dashboard/logistics">
              <Button variant="outline" size="sm">
                Manage Logistics <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overall Progress */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Overall Progress</span>
                <span className="text-2xl font-bold text-white">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${overallProgress >= 80 ? 'bg-green-500' : overallProgress >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                <span className={`text-xs ${overallProgress >= 80 ? 'text-green-400' : overallProgress >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {overallProgress >= 80 ? 'On Track' : overallProgress >= 50 ? 'In Progress' : 'Needs Attention'}
                </span>
              </div>
            </div>

            {/* Critical Issues */}
            <div className="space-y-3">
              <span className="text-sm text-slate-400">Critical Issues</span>
              <div className="space-y-2">
                {criticalIssues.slice(0, 3).map((issue, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${issue.severity === 'high' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                    <span className="text-xs text-slate-300">{issue.type}</span>
                  </div>
                ))}
                {criticalIssues.length === 0 && (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-green-400">No critical issues</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <span className="text-sm text-slate-400">Quick Actions</span>
              <div className="space-y-2">
                <Link href="/admin/dashboard/logistics">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Truck className="h-3 w-3 mr-2" />
                    View Details
                  </Button>
                </Link>
                <Link href="/admin/dashboard/logistics?tab=transportation">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Calendar className="h-3 w-3 mr-2" />
                    Schedule Transport
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      {showDetails && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(metrics).map(([key, metric]) => (
            <Card key={key} className="bg-slate-800/50 border-slate-600/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {key === 'transportation' && <Truck className="h-4 w-4 text-blue-400" />}
                    {key === 'accommodations' && <Building className="h-4 w-4 text-green-400" />}
                    {key === 'equipment' && <Box className="h-4 w-4 text-orange-400" />}
                    {key === 'backline' && <Zap className="h-4 w-4 text-purple-400" />}
                    {key === 'catering' && <Utensils className="h-4 w-4 text-yellow-400" />}
                    {key === 'communication' && <MessageSquare className="h-4 w-4 text-cyan-400" />}
                    {key === 'travelCoordination' && <Users className="h-4 w-4 text-indigo-400" />}
                    <span className="text-sm font-medium text-white capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(metric.status)}`} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Progress</span>
                    <span className="text-sm font-medium text-white">{metric.percentage}%</span>
                  </div>
                  <Progress value={metric.percentage} className="h-2" />
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      {metric.completed}/{metric.items} completed
                    </span>
                    <span className={getStatusTextColor(metric.status)}>
                      {metric.status}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 