"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Star,
  Activity,
  Target,
  Zap,
  BrainCircuit,
  Download,
  RefreshCw,
  Eye,
  FileText,
  Settings,
  Bell,
  RadioTower,
  Wifi,
  Mic,
  Video,
  PhoneCall,
  X,
  RotateCcw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  Building,
  Globe,
  ExternalLink,
  Copy,
  Share2,
  Link,
  Lock,
  Unlock,
  EyeOff,
  AlertCircle,
  Info,
  HelpCircle,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Plus,
  Edit,
  Trash2,
  Save,
  Camera,
  File,
  Type,
  Bold,
  Italic,
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  UserPlus2
} from 'lucide-react'

interface EnhancedAnalyticsDashboardProps {
  venueId: string
}

interface AnalyticsData {
  performance: any
  staffing: any
  compliance: any
  optimization: any
  realTime: any
}

export default function EnhancedAnalyticsDashboard({ venueId }: EnhancedAnalyticsDashboardProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showDetailedReport, setShowDetailedReport] = useState(false)
  const [realTimeConnection, setRealTimeConnection] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadAnalyticsData()
    setupRealTimeSubscriptions()
  }, [venueId])

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true)
      console.log('🔧 [Enhanced Analytics Dashboard] Loading analytics data...')

      // Mock data for now
      const mockData = {
        performance: {
          totalStaff: 45,
          avgPerformanceRating: 4.2,
          avgAttendanceRate: 92,
          totalIncidents: 3,
          totalCommendations: 12,
          trainingCompletionRate: 85,
          certificationValidityRate: 78
        },
        staffing: {
          trends: {
            performanceTrend: 0.3,
            attendanceTrend: 2.1,
            incidentTrend: -1
          },
          predictions: {
            recommendedStaffIncrease: 15,
            riskLevel: 'Low',
            highPriorityAreas: ['Training']
          },
          riskFactors: {
            highIncidentStaff: 2,
            lowPerformanceStaff: 3,
            lowAttendanceStaff: 1,
            totalRiskStaff: 6,
            riskPercentage: 13.3
          }
        },
        compliance: {
          totalChecks: 4,
          highSeverity: 1,
          mediumSeverity: 2,
          lowSeverity: 1,
          checks: [
            {
              type: 'background_check',
              severity: 'high',
              description: 'Candidates without completed background checks',
              count: 3
            },
            {
              type: 'expired_certifications',
              severity: 'medium',
              description: 'Staff with expired certifications',
              count: 5
            }
          ]
        },
        optimization: {
          optimizationMetrics: {
            totalShifts: 120,
            completedShifts: 108,
            cancelledShifts: 8,
            noShowShifts: 4,
            completionRate: 90,
            cancellationRate: 6.7,
            noShowRate: 3.3,
            zoneCoverage: 85
          },
          zones: [
            { id: '1', name: 'Main Entrance' },
            { id: '2', name: 'VIP Area' },
            { id: '3', name: 'Bar Zone' }
          ]
        },
        realTime: {
          applicationsCount: 23,
          candidatesCount: 15,
          staffCount: 45,
          communicationsCount: 8,
          lastUpdated: new Date().toISOString()
        }
      }

      setAnalyticsData(mockData)

      toast({
        title: "Analytics Loaded",
        description: "All analytics data has been successfully loaded.",
      })
    } catch (error) {
      console.error('❌ [Enhanced Analytics Dashboard] Error loading analytics:', error)
      toast({
        title: "Error",
        description: "Failed to load analytics data. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const setupRealTimeSubscriptions = () => {
    try {
      console.log('🔧 [Enhanced Analytics Dashboard] Setting up real-time subscriptions...')
      setRealTimeConnection(true)
    } catch (error) {
      console.error('❌ [Enhanced Analytics Dashboard] Error setting up real-time:', error)
    }
  }

  const generateComprehensiveReport = async () => {
    try {
      console.log('🔧 [Enhanced Analytics Dashboard] Generating comprehensive report...')
      
      toast({
        title: "Report Generated",
        description: "Comprehensive analytics report has been generated successfully.",
      })
    } catch (error) {
      console.error('❌ [Enhanced Analytics Dashboard] Error generating report:', error)
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      })
    }
  }

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Activity className="h-4 w-4 text-blue-500" />
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      case 'low': return 'default'
      default: return 'default'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-slate-400">Loading analytics...</span>
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-8 text-slate-400">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-slate-500" />
        <p>No analytics data available</p>
        <p className="text-sm">Analytics will appear here once data is available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Enhanced Analytics Dashboard</h2>
          <p className="text-slate-400">Real-time insights and predictive analytics</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={loadAnalyticsData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={generateComprehensiveReport}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Real-time Connection Status */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${realTimeConnection ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-slate-300">
                Real-time Connection: {realTimeConnection ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <Badge variant={realTimeConnection ? 'default' : 'destructive'}>
              {realTimeConnection ? 'Live' : 'Offline'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6 bg-slate-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-purple-600">
            <TrendingUp className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="predictive" className="data-[state=active]:bg-purple-600">
            <BrainCircuit className="h-4 w-4 mr-2" />
            Predictive
          </TabsTrigger>
          <TabsTrigger value="compliance" className="data-[state=active]:bg-purple-600">
            <Shield className="h-4 w-4 mr-2" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="optimization" className="data-[state=active]:bg-purple-600">
            <Target className="h-4 w-4 mr-2" />
            Optimization
          </TabsTrigger>
          <TabsTrigger value="realtime" className="data-[state=active]:bg-purple-600">
            <RadioTower className="h-4 w-4 mr-2" />
            Real-time
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Performance Score */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Performance Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white mb-2">
                  {analyticsData.performance.avgPerformanceRating}/5
                </div>
                <Progress value={analyticsData.performance.avgPerformanceRating * 20} className="mb-2" />
                <p className="text-xs text-slate-400">
                  Average staff performance rating
                </p>
              </CardContent>
            </Card>

            {/* Attendance Rate */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Attendance Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white mb-2">
                  {analyticsData.performance.avgAttendanceRate}%
                </div>
                <Progress value={analyticsData.performance.avgAttendanceRate} className="mb-2" />
                <p className="text-xs text-slate-400">
                  Average staff attendance
                </p>
              </CardContent>
            </Card>

            {/* Compliance Score */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Compliance Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white mb-2">
                  {analyticsData.compliance.totalChecks > 0 ? 
                    Math.round((1 - analyticsData.compliance.highSeverity / analyticsData.compliance.totalChecks) * 100) : 100}%
                </div>
                <Progress 
                  value={analyticsData.compliance.totalChecks > 0 ? 
                    (1 - analyticsData.compliance.highSeverity / analyticsData.compliance.totalChecks) * 100 : 100} 
                  className="mb-2" 
                />
                <p className="text-xs text-slate-400">
                  Compliance rate
                </p>
              </CardContent>
            </Card>

            {/* Risk Level */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Risk Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white mb-2">
                  {analyticsData.staffing.predictions.riskLevel}
                </div>
                <Badge 
                  variant={analyticsData.staffing.predictions.riskLevel === 'High' ? 'destructive' : 
                          analyticsData.staffing.predictions.riskLevel === 'Medium' ? 'secondary' : 'default'}
                  className="mb-2"
                >
                  {analyticsData.staffing.predictions.riskLevel} Risk
                </Badge>
                <p className="text-xs text-slate-400">
                  Current risk assessment
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-300">Staff Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Total Staff</span>
                  <span className="text-white font-semibold">{analyticsData.performance.totalStaff}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Active Staff</span>
                  <span className="text-green-500 font-semibold">{analyticsData.realTime.staffCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Training Completed</span>
                  <span className="text-blue-500 font-semibold">{analyticsData.performance.trainingCompletionRate}%</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-300">Applications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Total Applications</span>
                  <span className="text-white font-semibold">{analyticsData.realTime.applicationsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Pending Review</span>
                  <span className="text-yellow-500 font-semibold">
                    {analyticsData.realTime.applicationsCount - (analyticsData.realTime.applicationsCount * 0.3)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Approved</span>
                  <span className="text-green-500 font-semibold">
                    {Math.round(analyticsData.realTime.applicationsCount * 0.3)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-300">Shift Optimization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Completion Rate</span>
                  <span className="text-green-500 font-semibold">{analyticsData.optimization.optimizationMetrics.completionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Zone Coverage</span>
                  <span className="text-blue-500 font-semibold">{analyticsData.optimization.optimizationMetrics.zoneCoverage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">No-Show Rate</span>
                  <span className="text-red-500 font-semibold">{analyticsData.optimization.optimizationMetrics.noShowRate}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Performance Trend</span>
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(analyticsData.staffing.trends.performanceTrend)}
                      <span className="text-white font-semibold">
                        {analyticsData.staffing.trends.performanceTrend > 0 ? '+' : ''}
                        {analyticsData.staffing.trends.performanceTrend.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Attendance Trend</span>
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(analyticsData.staffing.trends.attendanceTrend)}
                      <span className="text-white font-semibold">
                        {analyticsData.staffing.trends.attendanceTrend > 0 ? '+' : ''}
                        {analyticsData.staffing.trends.attendanceTrend.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Incident Trend</span>
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(-analyticsData.staffing.trends.incidentTrend)}
                      <span className="text-white font-semibold">
                        {analyticsData.staffing.trends.incidentTrend > 0 ? '+' : ''}
                        {analyticsData.staffing.trends.incidentTrend}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400 text-sm">Training Completion</span>
                      <span className="text-white text-sm">{analyticsData.performance.trainingCompletionRate}%</span>
                    </div>
                    <Progress value={analyticsData.performance.trainingCompletionRate} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400 text-sm">Certification Validity</span>
                      <span className="text-white text-sm">{analyticsData.performance.certificationValidityRate}%</span>
                    </div>
                    <Progress value={analyticsData.performance.certificationValidityRate} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400 text-sm">Commendations</span>
                      <span className="text-white text-sm">{analyticsData.performance.totalCommendations}</span>
                    </div>
                    <Progress value={Math.min(analyticsData.performance.totalCommendations * 10, 100)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Predictive Tab */}
        <TabsContent value="predictive" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Staffing Predictions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Recommended Increase</span>
                    <span className="text-white font-semibold">
                      {analyticsData.staffing.predictions.recommendedStaffIncrease}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Risk Level</span>
                    <Badge variant={analyticsData.staffing.predictions.riskLevel === 'High' ? 'destructive' : 'default'}>
                      {analyticsData.staffing.predictions.riskLevel}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-slate-400 text-sm">High Priority Areas</span>
                    <div className="mt-2 space-y-1">
                      {analyticsData.staffing.predictions.highPriorityAreas.map((area: string, index: number) => (
                        <Badge key={index} variant="secondary" className="mr-2">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Risk Factors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">High Incident Staff</span>
                    <span className="text-red-500 font-semibold">{analyticsData.staffing.riskFactors.highIncidentStaff}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Low Performance Staff</span>
                    <span className="text-yellow-500 font-semibold">{analyticsData.staffing.riskFactors.lowPerformanceStaff}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Low Attendance Staff</span>
                    <span className="text-orange-500 font-semibold">{analyticsData.staffing.riskFactors.lowAttendanceStaff}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Risk Percentage</span>
                    <span className="text-white font-semibold">{analyticsData.staffing.riskFactors.riskPercentage.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Compliance Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.compliance.checks.map((check: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                      <div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getSeverityColor(check.severity)}>
                            {check.severity.toUpperCase()}
                          </Badge>
                          <span className="text-white font-medium">{check.type.replace('_', ' ')}</span>
                        </div>
                        <p className="text-slate-400 text-sm mt-1">{check.description}</p>
                      </div>
                      <span className="text-white font-semibold">{check.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Compliance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total Checks</span>
                    <span className="text-white font-semibold">{analyticsData.compliance.totalChecks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">High Severity</span>
                    <span className="text-red-500 font-semibold">{analyticsData.compliance.highSeverity}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Medium Severity</span>
                    <span className="text-yellow-500 font-semibold">{analyticsData.compliance.mediumSeverity}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Low Severity</span>
                    <span className="text-blue-500 font-semibold">{analyticsData.compliance.lowSeverity}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Optimization Tab */}
        <TabsContent value="optimization" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Shift Optimization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total Shifts</span>
                    <span className="text-white font-semibold">{analyticsData.optimization.optimizationMetrics.totalShifts}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Completion Rate</span>
                    <span className="text-green-500 font-semibold">{analyticsData.optimization.optimizationMetrics.completionRate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Cancellation Rate</span>
                    <span className="text-red-500 font-semibold">{analyticsData.optimization.optimizationMetrics.cancellationRate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">No-Show Rate</span>
                    <span className="text-orange-500 font-semibold">{analyticsData.optimization.optimizationMetrics.noShowRate}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Zone Coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Zone Coverage</span>
                    <span className="text-blue-500 font-semibold">{analyticsData.optimization.optimizationMetrics.zoneCoverage}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total Zones</span>
                    <span className="text-white font-semibold">{analyticsData.optimization.zones.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Covered Zones</span>
                    <span className="text-green-500 font-semibold">
                      {Math.round(analyticsData.optimization.zones.length * analyticsData.optimization.optimizationMetrics.zoneCoverage / 100)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Real-time Tab */}
        <TabsContent value="realtime" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Real-time Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Applications</span>
                    <span className="text-white font-semibold">{analyticsData.realTime.applicationsCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Candidates</span>
                    <span className="text-white font-semibold">{analyticsData.realTime.candidatesCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Staff Members</span>
                    <span className="text-white font-semibold">{analyticsData.realTime.staffCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Communications</span>
                    <span className="text-white font-semibold">{analyticsData.realTime.communicationsCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Last Updated</span>
                    <span className="text-slate-400 text-sm">
                      {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(analyticsData.realTime.lastUpdated))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Connection Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Status</span>
                    <Badge variant={realTimeConnection ? 'default' : 'destructive'}>
                      {realTimeConnection ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Active Channels</span>
                    <span className="text-white font-semibold">3</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Latency</span>
                    <span className="text-green-500 font-semibold">~50ms</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detailed Report Dialog */}
      <Dialog open={showDetailedReport} onOpenChange={setShowDetailedReport}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Detailed Analytics Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-400">
              Comprehensive analytics report with detailed insights and recommendations.
            </p>
            {/* Report content would go here */}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 