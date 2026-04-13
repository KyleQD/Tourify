import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Plus, Users, Music, Calendar, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

export default async function CollaborationProjectsPage() {
  const supabase = await createClient()
  // Get current user
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth/login')
  }

  // Get user's collaboration projects
  const { data: projects, error: projectsError } = await supabase
    .from('project_collaborators')
    .select(`
      role,
      joined_at,
      collaboration_projects (
        id,
        name,
        description,
        type,
        status,
        genre,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: false })

  const collaborationProjects = (projects || []).map((p: any) => {
    const proj = Array.isArray(p.collaboration_projects) ? p.collaboration_projects[0] : p.collaboration_projects
    return {
      ...(proj || {}),
      user_role: p.role,
      joined_at: p.joined_at
    }
  }).filter((p: any) => p && p.id)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-500'
      case 'in_progress': return 'bg-yellow-500'
      case 'recording': return 'bg-purple-500'
      case 'mixing': return 'bg-orange-500'
      case 'mastering': return 'bg-pink-500'
      case 'completed': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Collaboration Projects</h1>
            <p className="text-slate-400 mt-2">
              Manage your creative collaborations and project workspaces
            </p>
          </div>
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Projects Grid */}
        {collaborationProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collaborationProjects.map((project) => (
              <Link key={project.id} href={`/collaboration/projects/${project.id}`}>
                <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/30 hover:bg-slate-800/70 transition-all duration-200 cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-white text-lg mb-2">
                          {project.name}
                        </CardTitle>
                        <p className="text-slate-400 text-sm line-clamp-2">
                          {project.description || 'No description provided'}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Status and Type */}
                      <div className="flex items-center gap-2">
                        <Badge className={`text-white ${getStatusColor(project.status)}`}>
                          {project.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline">
                          {project.type}
                        </Badge>
                      </div>

                      {/* Genres */}
                      {project.genre && project.genre.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <Music className="h-4 w-4 text-slate-400" />
                          {project.genre.slice(0, 2).map((genre: any) => (
                            <Badge key={genre} variant="secondary" className="text-xs">
                              {genre}
                            </Badge>
                          ))}
                          {project.genre.length > 2 && (
                            <span className="text-xs text-slate-400">
                              +{project.genre.length - 2} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Role and Join Date */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-slate-400">
                          <Users className="h-4 w-4" />
                          <span className="capitalize">{project.user_role}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {formatDistanceToNow(new Date(project.joined_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
              <Users className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No collaborations yet
            </h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Start your musical journey by creating your first collaboration project or joining existing ones.
            </p>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Project
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}