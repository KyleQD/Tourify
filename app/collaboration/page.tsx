import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Music, 
  Plus,
  Headphones,
  MessageCircle,
  Settings,
  ArrowRight,
  TrendingUp,
  Clock,
  Star
} from 'lucide-react'
import Link from 'next/link'

export default async function CollaborationOverviewPage() {
  const supabase = await createClient()
  // Get current user
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth/login')
  }

  // Get collaboration stats
  const [
    { count: totalProjects },
    { count: activeProjects },
    { count: completedProjects }
  ] = await Promise.all([
    supabase
      .from('project_collaborators')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active'),
    supabase
      .from('project_collaborators')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('collaboration_projects.status', ['planning', 'in_progress', 'recording', 'mixing', 'mastering']),
    supabase
      .from('project_collaborators')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('collaboration_projects.status', 'completed')
  ])

  const stats = [
    {
      title: 'Total Projects',
      value: totalProjects || 0,
      icon: Users,
      color: 'text-blue-500'
    },
    {
      title: 'Active Projects',
      value: activeProjects || 0,
      icon: TrendingUp,
      color: 'text-green-500'
    },
    {
      title: 'Completed',
      value: completedProjects || 0,
      icon: Star,
      color: 'text-yellow-500'
    }
  ]

  const quickActions = [
    {
      title: 'Create New Project',
      description: 'Start a new collaboration workspace',
      icon: Plus,
      href: '/collaboration/projects/new',
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      title: 'My Projects',
      description: 'View and manage your collaborations',
      icon: Users,
      href: '/collaboration/projects',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      title: 'Discover Artists',
      description: 'Find new collaborators',
      icon: Music,
      href: '/collaboration/discover',
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      title: 'Messages',
      description: 'Check your collaboration messages',
      icon: MessageCircle,
      href: '/messages',
      color: 'bg-orange-600 hover:bg-orange-700'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Collaboration Hub
          </h1>
          <p className="text-slate-400">
            Your central space for musical collaborations and creative partnerships
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.title} className="bg-slate-800/50 backdrop-blur-xl border-slate-700/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">{stat.title}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href}>
                <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/30 hover:bg-slate-800/70 transition-all duration-200 cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${action.color} mb-3 group-hover:scale-110 transition-transform`}>
                        <action.icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-white mb-1 group-hover:text-purple-400 transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {action.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Project Workspaces */}
          <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5" />
                Project Workspaces
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-slate-400">
                  Organized spaces for your collaborative projects with file sharing, 
                  task management, and real-time communication.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">File Sharing</Badge>
                  <Badge variant="secondary">Task Management</Badge>
                  <Badge variant="secondary">Version Control</Badge>
                  <Badge variant="secondary">Real-time Chat</Badge>
                </div>
                <Link href="/collaboration/projects">
                  <Button variant="outline" className="w-full group">
                    View Projects
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Collaboration Features */}
          <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Headphones className="h-5 w-5" />
                Creative Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-slate-400">
                  Professional collaboration tools designed for musicians, 
                  including audio sharing, timeline comments, and live sessions.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Audio Players</Badge>
                  <Badge variant="secondary">Timeline Comments</Badge>
                  <Badge variant="secondary">Live Sessions</Badge>
                  <Badge variant="secondary">Voice Notes</Badge>
                </div>
                <Button variant="outline" className="w-full" disabled>
                  <Clock className="h-4 w-4 mr-2" />
                  Coming Soon
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started */}
        {totalProjects === 0 && (
          <Card className="bg-gradient-to-r from-purple-800/50 to-blue-800/50 backdrop-blur-xl border-purple-700/30 mt-8">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-semibold text-white mb-4">
                Welcome to Collaboration Hub! 🎵
              </h3>
              <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
                Ready to start collaborating? Create your first project to organize your 
                creative work, invite collaborators, and bring your musical ideas to life.
              </p>
              <Link href="/collaboration/projects/new">
                <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Project
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}