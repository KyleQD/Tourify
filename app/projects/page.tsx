"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import type { Project } from "@/types/database.types"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
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

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">My Projects</h1>
        <Button
          onClick={() => router.push('/projects/new')}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="bg-slate-900/70 border-slate-700/50 hover:border-purple-500/50 transition-colors cursor-pointer"
            onClick={() => router.push(`/projects/${project.id}`)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">{project.name}</CardTitle>
                <div className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(project.status)}`}>
                  {project.status}
                </div>
              </div>
              <CardDescription className="text-slate-400">
                {project.project_type}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300 line-clamp-2">
                {project.description || 'No description provided'}
              </p>
              <div className="mt-4 flex items-center text-xs text-slate-400">
                <span>Created: {formatSafeDate(project.created_at)}</span>
                {project.start_date && (
                  <span className="ml-4">
                    Starts: {formatSafeDate(project.start_date)}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {projects.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-center">
            <div className="text-slate-400 mb-4">No projects yet</div>
            <Button
              onClick={() => router.push('/projects/new')}
              variant="outline"
              className="border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300"
            >
              Create your first project
            </Button>
          </div>
        )}
      </div>
    </div>
  )
} 