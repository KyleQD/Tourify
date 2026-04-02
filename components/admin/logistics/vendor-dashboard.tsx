"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Users, 
  MapPin, 
  Zap, 
  Truck, 
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Calendar,
  Settings,
  Eye,
  Download,
  Filter,
  Search,
  Plus,
  MoreHorizontal
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatSafeCurrency } from "@/lib/format/number-format"

interface VendorDashboardProps {
  vendorId?: string
  siteMapId?: string
}

interface DashboardStats {
  totalEvents: number
  activeEquipment: number
  completedSetups: number
  revenueThisMonth: number
  pendingTasks: number
  equipmentUtilization: number
  averageSetupTime: number
  customerSatisfaction: number
}

interface EquipmentStatus {
  id: string
  name: string
  category: string
  status: 'available' | 'in_use' | 'maintenance' | 'damaged'
  location: string
  lastUsed: string
  utilizationRate: number
}

interface SetupWorkflow {
  id: string
  name: string
  event: string
  status: 'planned' | 'in_progress' | 'completed' | 'delayed'
  progress: number
  teamSize: number
  estimatedCompletion: string
  equipmentCount: number
}

export function VendorDashboard({ vendorId, siteMapId }: VendorDashboardProps) {
  const { toast } = useToast()
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    activeEquipment: 0,
    completedSetups: 0,
    revenueThisMonth: 0,
    pendingTasks: 0,
    equipmentUtilization: 0,
    averageSetupTime: 0,
    customerSatisfaction: 0
  })
  const [equipmentStatus, setEquipmentStatus] = useState<EquipmentStatus[]>([])
  const [activeWorkflows, setActiveWorkflows] = useState<SetupWorkflow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month')

  useEffect(() => {
    loadDashboardData()
  }, [vendorId, siteMapId, selectedPeriod])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      // Mock data - replace with actual API calls
      const mockStats: DashboardStats = {
        totalEvents: 24,
        activeEquipment: 156,
        completedSetups: 18,
        revenueThisMonth: 45750,
        pendingTasks: 12,
        equipmentUtilization: 87.5,
        averageSetupTime: 4.2,
        customerSatisfaction: 4.8
      }

      const mockEquipment: EquipmentStatus[] = [
        {
          id: '1',
          name: 'Main Stage Speaker System',
          category: 'Sound',
          status: 'in_use',
          location: 'Coachella Valley',
          lastUsed: '2 hours ago',
          utilizationRate: 95
        },
        {
          id: '2',
          name: 'LED Stage Lighting',
          category: 'Lighting',
          status: 'available',
          location: 'Warehouse A',
          lastUsed: '1 day ago',
          utilizationRate: 78
        },
        {
          id: '3',
          name: 'Generator 500kW',
          category: 'Power',
          status: 'maintenance',
          location: 'Service Center',
          lastUsed: '3 days ago',
          utilizationRate: 82
        },
        {
          id: '4',
          name: 'Bell Tent Set (50 units)',
          category: 'Tent',
          status: 'available',
          location: 'Storage Facility',
          lastUsed: '1 week ago',
          utilizationRate: 65
        }
      ]

      const mockWorkflows: SetupWorkflow[] = [
        {
          id: '1',
          name: 'Coachella Main Stage Setup',
          event: 'Coachella 2024',
          status: 'in_progress',
          progress: 75,
          teamSize: 12,
          estimatedCompletion: '2 hours',
          equipmentCount: 45
        },
        {
          id: '2',
          name: 'Glamping Village Setup',
          event: 'Burning Man 2024',
          status: 'planned',
          progress: 0,
          teamSize: 8,
          estimatedCompletion: '6 hours',
          equipmentCount: 120
        },
        {
          id: '3',
          name: 'VIP Tent Installation',
          event: 'Tomorrowland 2024',
          status: 'completed',
          progress: 100,
          teamSize: 6,
          estimatedCompletion: 'Completed',
          equipmentCount: 25
        }
      ]

      setStats(mockStats)
      setEquipmentStatus(mockEquipment)
      setActiveWorkflows(mockWorkflows)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800'
      case 'in_use': return 'bg-blue-100 text-blue-800'
      case 'maintenance': return 'bg-yellow-100 text-yellow-800'
      case 'damaged': return 'bg-red-100 text-red-800'
      case 'planned': return 'bg-gray-100 text-gray-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'delayed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="h-4 w-4" />
      case 'in_use': return <Users className="h-4 w-4" />
      case 'maintenance': return <Settings className="h-4 w-4" />
      case 'damaged': return <AlertTriangle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading vendor dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Vendor Dashboard</h2>
          <p className="text-gray-600">Monitor your equipment and operations</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-2xl font-bold">{stats.totalEvents}</p>
                <p className="text-xs text-green-600">+12% from last month</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Equipment</p>
                <p className="text-2xl font-bold">{stats.activeEquipment}</p>
                <p className="text-xs text-blue-600">{stats.equipmentUtilization}% utilization</p>
              </div>
              <Truck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-2xl font-bold">{formatSafeCurrency(stats.revenueThisMonth)}</p>
                <p className="text-xs text-green-600">+8% from last month</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
                <p className="text-2xl font-bold">{stats.pendingTasks}</p>
                <p className="text-xs text-orange-600">3 urgent</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium">Coachella Main Stage Setup Completed</p>
                    <p className="text-sm text-gray-600">2 hours ago • 12 team members</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div className="flex-1">
                    <p className="font-medium">Generator Maintenance Required</p>
                    <p className="text-sm text-gray-600">4 hours ago • Service Center</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <Truck className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium">Equipment Delivered to Burning Man</p>
                    <p className="text-sm text-gray-600">1 day ago • 45 items</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Equipment Utilization</span>
                  <span className="text-sm font-bold">{stats.equipmentUtilization}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${stats.equipmentUtilization}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Average Setup Time</span>
                  <span className="text-sm font-bold">{stats.averageSetupTime}h</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: '85%' }}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Customer Satisfaction</span>
                  <span className="text-sm font-bold">{stats.customerSatisfaction}/5</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{ width: '96%' }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="equipment" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Equipment Status</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Equipment
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {equipmentStatus.map((equipment) => (
                  <div key={equipment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(equipment.status)}
                        <div>
                          <h4 className="font-medium">{equipment.name}</h4>
                          <p className="text-sm text-gray-600">{equipment.category} • {equipment.location}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={getStatusColor(equipment.status)}>
                        {equipment.status.replace('_', ' ')}
                      </Badge>
                      <div className="text-right">
                        <p className="text-sm font-medium">{equipment.utilizationRate}% utilization</p>
                        <p className="text-xs text-gray-600">Last used: {equipment.lastUsed}</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Active Setup Workflows</CardTitle>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Workflow
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeWorkflows.map((workflow) => (
                  <div key={workflow.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{workflow.name}</h4>
                        <p className="text-sm text-gray-600">{workflow.event}</p>
                      </div>
                      <Badge className={getStatusColor(workflow.status)}>
                        {workflow.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {workflow.teamSize} team members
                        </span>
                        <span className="flex items-center gap-1">
                          <Truck className="h-4 w-4" />
                          {workflow.equipmentCount} equipment
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {workflow.estimatedCompletion}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all" 
                            style={{ width: `${workflow.progress}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium">{workflow.progress}%</span>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Equipment Utilization Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <p className="text-gray-600">Chart visualization would go here</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Sound Equipment</span>
                    <span className="text-sm font-bold">$18,500</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Lighting Equipment</span>
                    <span className="text-sm font-bold">$12,300</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Tent Rentals</span>
                    <span className="text-sm font-bold">$8,950</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Power Equipment</span>
                    <span className="text-sm font-bold">$6,000</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Company Name</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Contact Email</label>
                  <input 
                    type="email" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter contact email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Service Areas</label>
                  <textarea 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder="Enter service areas"
                  />
                </div>
                <Button>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
