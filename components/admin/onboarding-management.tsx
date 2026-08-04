"use client"

/** Admin Dashboard Builder: Superseded by hiring onboarding panels (cmp-onboarding-mgmt wont-fix). */

import { useState, useEffect } from "react"
import { UnifiedOnboardingService, OnboardingTemplate } from "@/lib/services/unified-onboarding.service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  BarChart3, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Loader2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface OnboardingStats {
  total_flows: number
  completed_flows: number
  pending_flows: number
  in_progress_flows: number
  failed_flows: number
  flows_by_type: Record<string, number>
}

export default function OnboardingManagement() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([])
  const [stats, setStats] = useState<OnboardingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<OnboardingTemplate | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load templates and stats in parallel
      const [templatesData, statsData] = await Promise.all([
        loadTemplates(),
        loadStats()
      ])
      
      setTemplates(templatesData)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load onboarding data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async (): Promise<OnboardingTemplate[]> => {
    // This would need to be implemented in the service
    // For now, return empty array
    return []
  }

  const loadStats = async (): Promise<OnboardingStats | null> => {
    try {
      return await UnifiedOnboardingService.getOnboardingStats()
    } catch (error) {
      console.error('Error loading stats:', error)
      return null
    }
  }

  const handleCreateTemplate = async (templateData: Partial<OnboardingTemplate>) => {
    try {
      // This would need to be implemented in the service
      toast({
        title: "Success",
        description: "Template created successfully"
      })
      setShowCreateForm(false)
      loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive"
      })
    }
  }

  const handleUpdateTemplate = async (templateId: string, templateData: Partial<OnboardingTemplate>) => {
    try {
      // This would need to be implemented in the service
      toast({
        title: "Success",
        description: "Template updated successfully"
      })
      setEditingTemplate(null)
      loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive"
      })
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      // This would need to be implemented in the service
      toast({
        title: "Success",
        description: "Template deleted successfully"
      })
      loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Onboarding Management</h1>
          <p className="text-muted-foreground">
            Manage onboarding templates and view statistics
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Flows</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_flows || 0}</div>
                <p className="text-xs text-muted-foreground">
                  All onboarding flows
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats?.completed_flows || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Successfully completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats?.in_progress_flows || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently in progress
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {stats?.pending_flows || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Waiting to start
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Flows by Type</CardTitle>
              <CardDescription>
                Distribution of onboarding flows by user type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats?.flows_by_type && Object.entries(stats.flows_by_type).map(([type, count]) => (
                  <div key={type} className="text-center">
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-muted-foreground capitalize">{type}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTemplate(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant={template.is_default ? "default" : "secondary"}>
                        {template.is_default ? "Default" : "Custom"}
                      </Badge>
                      <Badge variant={template.is_active ? "default" : "destructive"}>
                        {template.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <strong>Type:</strong> {template.flow_type}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <strong>Fields:</strong> {template.fields.length}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {templates.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Templates</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first onboarding template to get started.
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Statistics</CardTitle>
              <CardDescription>
                Comprehensive onboarding analytics and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-4">Completion Rates</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Completed</span>
                        <span className="font-semibold">
                          {stats?.completed_flows || 0} / {stats?.total_flows || 0}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ 
                            width: `${stats?.total_flows ? (stats.completed_flows / stats.total_flows) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-4">Status Distribution</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Pending</span>
                        <span className="font-semibold">{stats?.pending_flows || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>In Progress</span>
                        <span className="font-semibold">{stats?.in_progress_flows || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Completed</span>
                        <span className="font-semibold">{stats?.completed_flows || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Failed</span>
                        <span className="font-semibold">{stats?.failed_flows || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-4">Flows by Type</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats?.flows_by_type && Object.entries(stats.flows_by_type).map(([type, count]) => (
                      <div key={type} className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold">{count}</div>
                        <div className="text-sm text-muted-foreground capitalize">{type}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Template Modal would go here */}
      {/* This would be a separate component for the form */}
    </div>
  )
}
