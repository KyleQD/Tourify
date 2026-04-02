"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Calendar, Users, Settings, MessageSquare, DollarSign, FileText } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import type { Project, ProjectMember } from "@/types/database.types"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface ProjectWithMembers extends Project {
  members: ProjectMember[]
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [project, setProject] = useState<ProjectWithMembers | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [projectId, setProjectId] = useState<string>("")
  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => {
      setProjectId(id)
      fetchProject(id)
    })
  }, [params])

  const fetchProject = async (id: string) => {
    try {
      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

      if (projectError) throw projectError

      // Fetch project members
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', id)

      if (membersError) throw membersError

      setProject({ ...projectData, members: membersData || [] })
    } catch (error) {
      console.error('Error fetching project:', error)
      router.push('/projects')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-500'
      case 'planning': return 'bg-blue-500'
      case 'in_progress': return 'bg-green-500'
      case 'completed': return 'bg-purple-500'
      case 'cancelled': return 'bg-red-500'
      default: return 'bg-slate-500'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-white mb-4">Project not found</h1>
        <Button
          onClick={() => router.push('/projects')}
          variant="outline"
          className="border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300"
        >
          Back to Projects
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className={getStatusColor(project.status)}>
              {project.status}
            </Badge>
            <Badge variant="outline" className="border-slate-700 text-slate-300">
              {project.project_type}
            </Badge>
          </div>
        </div>
        <Button
          onClick={() => router.push(`/projects/${projectId}/settings`)}
          variant="outline"
          className="border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300"
        >
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-slate-800/50 border-slate-700">
          <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700">
            <FileText className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="schedule" className="data-[state=active]:bg-slate-700">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:bg-slate-700">
            <Users className="w-4 h-4 mr-2" />
            Team
          </TabsTrigger>
          <TabsTrigger value="budget" className="data-[state=active]:bg-slate-700">
            <DollarSign className="w-4 h-4 mr-2" />
            Budget
          </TabsTrigger>
          <TabsTrigger value="messages" className="data-[state=active]:bg-slate-700">
            <MessageSquare className="w-4 h-4 mr-2" />
            Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-slate-900/70 border-slate-700/50">
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300">
                  {project.description || 'No description provided'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/70 border-slate-700/50">
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Venue Type</span>
                  <span className="text-slate-300">{project.venue_type || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Genre</span>
                  <span className="text-slate-300">{project.genre || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Capacity</span>
                  <span className="text-slate-300">{project.capacity || 'Not specified'}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/70 border-slate-700/50">
              <CardHeader>
                <CardTitle>Team</CardTitle>
                <CardDescription>Project members</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex -space-x-2">
                  {project.members.map((member, index) => (
                    <Avatar key={member.id} className="border-2 border-slate-800">
                      <AvatarFallback>
                        {member.user_id.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full w-8 h-8 border-slate-700 bg-slate-800/50 hover:bg-slate-700/50"
                  >
                    +
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <Card className="bg-slate-900/70 border-slate-700/50">
            <CardHeader>
              <CardTitle>Project Timeline</CardTitle>
              <CardDescription>
                {project.start_date && project.end_date
                  ? `${formatSafeDate(project.start_date)} - ${formatSafeDate(project.end_date)}`
                  : 'No dates specified'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add Calendar or Timeline component here */}
              <div className="text-slate-400">Calendar implementation coming soon...</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card className="bg-slate-900/70 border-slate-700/50">
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage project team and roles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {project.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {member.user_id.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-slate-200">{member.user_id}</div>
                        <div className="text-sm text-slate-400">{member.role}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-slate-700 text-slate-300">
                      {member.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget">
          <Card className="bg-slate-900/70 border-slate-700/50">
            <CardHeader>
              <CardTitle>Budget Overview</CardTitle>
              <CardDescription>
                Total Budget: ${project.budget?.toLocaleString() || '0'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add Budget breakdown component here */}
              <div className="text-slate-400">Budget tracking implementation coming soon...</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card className="bg-slate-900/70 border-slate-700/50">
            <CardHeader>
              <CardTitle>Project Messages</CardTitle>
              <CardDescription>Team communication</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add Messages component here */}
              <div className="text-slate-400">Messages implementation coming soon...</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 