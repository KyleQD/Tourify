"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { resolveAvatarSrc } from "@/lib/utils/avatar-utils"
import { 
  Users, 
  FolderOpen, 
  GitBranch,
  Star,
  Clock,
  MessageSquare,
  Plus,
  CheckCircle,
  Music,
  Mic,
  UserPlus,
  Heart,
  Loader2,
} from "lucide-react"

interface CollaborationProject {
  id: string
  name: string
  description: string
  status: string
  progress: number
  collaborators: Array<{
    id: string
    name: string
    avatar: string
    role: string
  }>
  lastActivity: string
  genre: string[]
}

interface CollaborationOpportunity {
  id: string
  title: string
  description: string
  artist: {
    name: string
    avatar: string
    verified: boolean
  }
  instruments: string[]
  genre: string[]
  deadline: string
  applications: number
  isLiked: boolean
  location?: string
}

function ProjectCard({ project }: { project: CollaborationProject }) {
  const statusColors: Record<string, string> = {
    planning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    in_progress: "bg-blue-500/20 text-blue-400 border-blue-500/30", 
    recording: "bg-red-500/20 text-red-400 border-red-500/30",
    mixing: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    completed: "bg-green-500/20 text-green-400 border-green-500/30",
    active: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  }

  return (
    <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ duration: 0.3 }}>
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:border-purple-500/50 transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <CardTitle className="text-lg font-semibold text-white truncate">{project.name}</CardTitle>
              <CardDescription className="text-slate-400 text-sm line-clamp-2">{project.description}</CardDescription>
            </div>
            <Badge className={`text-xs ml-2 flex-shrink-0 ${statusColors[project.status] || statusColors.active}`}>
              {project.status.replace('_', ' ')}
            </Badge>
          </div>
          
          {project.genre.length > 0 && (
            <div className="flex items-center space-x-2 mt-3">
              {project.genre.slice(0, 3).map(g => (
                <Badge key={g} variant="outline" className="text-xs bg-slate-800/50 text-slate-300 border-slate-600">
                  {g}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Progress</span>
              <span className="text-purple-400 font-medium">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-2 bg-slate-800" />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex -space-x-2">
              {project.collaborators.slice(0, 4).map(collab => (
                <Avatar key={collab.id} className="h-8 w-8 border-2 border-slate-900">
                  <AvatarImage src={collab.avatar} alt={collab.name} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-xs">
                    {collab.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {project.collaborators.length > 4 && (
                <div className="h-8 w-8 border-2 border-slate-900 rounded-full bg-slate-700/50 flex items-center justify-center text-xs text-slate-400">
                  +{project.collaborators.length - 4}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-500">{project.lastActivity}</span>
              <Link href={`/collaboration/projects/${project.id}`}>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                  Open
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function OpportunityCard({ opportunity }: { opportunity: CollaborationOpportunity }) {
  const [isLiked, setIsLiked] = useState(opportunity.isLiked)
  
  return (
    <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ duration: 0.3 }}>
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:border-blue-500/50 transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={resolveAvatarSrc(opportunity.artist.avatar)} alt={opportunity.artist.name} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                  {opportunity.artist.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-white text-sm">{opportunity.artist.name}</h3>
                  {opportunity.artist.verified && (
                    <CheckCircle className="h-4 w-4 text-blue-400" />
                  )}
                </div>
                <p className="text-xs text-slate-400">{opportunity.location || "Remote"}</p>
              </div>
            </div>
            
            <Button variant="ghost" size="sm" onClick={() => setIsLiked(!isLiked)} className="p-2">
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
            </Button>
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-base font-semibold text-white">{opportunity.title}</CardTitle>
            <CardDescription className="text-slate-400 text-sm line-clamp-2">{opportunity.description}</CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {opportunity.instruments.slice(0, 3).map(instrument => (
              <Badge key={instrument} className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                <Mic className="h-3 w-3 mr-1" />
                {instrument}
              </Badge>
            ))}
            {opportunity.genre.slice(0, 2).map(genre => (
              <Badge key={genre} variant="outline" className="text-xs bg-slate-800/50 text-slate-300 border-slate-600">
                {genre}
              </Badge>
            ))}
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
            <div className="flex items-center space-x-4 text-sm text-slate-400">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{opportunity.deadline}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{opportunity.applications} applied</span>
              </div>
            </div>
            
            <Link href={`/artist/collaborations/${opportunity.id}`}>
              <Button size="sm" variant="outline" className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10">
                Apply
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function CollabSkeleton() {
  return (
    <Card className="bg-slate-900/50 border-slate-700/50 animate-pulse">
      <CardHeader className="pb-3">
        <div className="h-5 bg-slate-700/50 rounded w-3/4 mb-2" />
        <div className="h-4 bg-slate-700/30 rounded w-1/2" />
      </CardHeader>
      <CardContent>
        <div className="h-2 bg-slate-700/50 rounded w-full mb-4" />
        <div className="flex justify-between">
          <div className="flex -space-x-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-8 w-8 rounded-full bg-slate-700/50 border-2 border-slate-900" />
            ))}
          </div>
          <div className="h-8 w-16 bg-slate-700/50 rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

export function EnhancedCollaborationHub() {
  const [activeTab, setActiveTab] = useState("overview")
  const [projects, setProjects] = useState<CollaborationProject[]>([])
  const [opportunities, setOpportunities] = useState<CollaborationOpportunity[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
  const [isLoadingJobs, setIsLoadingJobs] = useState(true)

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch('/api/community/stats')
        if (!res.ok) return
        // Projects come from collaboration_projects — use a simple approach
        // since there's no dedicated projects list API yet
        setProjects([])
      } catch {
        // Graceful fallback
      } finally {
        setIsLoadingProjects(false)
      }
    }

    async function fetchJobs() {
      try {
        const res = await fetch('/api/artist-jobs?per_page=6')
        if (!res.ok) return

        const data = await res.json()
        const jobs = data.jobs || data.data || []
        
        setOpportunities(jobs.map((job: any) => ({
          id: job.id,
          title: job.title || 'Untitled Opportunity',
          description: job.description || '',
          artist: {
            name: job.company_name || job.posted_by_name || 'Artist',
            avatar: job.company_logo || '',
            verified: job.is_verified || false,
          },
          instruments: job.required_skills || [],
          genre: job.required_genres || [],
          deadline: job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Open',
          applications: job.applications_count || 0,
          isLiked: false,
          location: job.location_type === 'remote' ? 'Remote' : (job.city || job.location || 'TBD'),
        })))
      } catch {
        // Graceful fallback
      } finally {
        setIsLoadingJobs(false)
      }
    }

    fetchProjects()
    fetchJobs()
  }, [])

  const isLoading = isLoadingProjects || isLoadingJobs
  const hasProjects = projects.length > 0
  const hasOpportunities = opportunities.length > 0

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Collaboration Central
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Your hub for creative partnerships and project management
                </CardDescription>
              </div>
              <div className="flex items-center space-x-3">
                <Link href="/collaboration/projects/create">
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Start Project
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-slate-900/50 border-slate-700/50">
          <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600">Overview</TabsTrigger>
          <TabsTrigger value="projects" className="data-[state=active]:bg-purple-600">My Projects</TabsTrigger>
          <TabsTrigger value="opportunities" className="data-[state=active]:bg-purple-600">Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: "Active Projects", value: String(projects.length), icon: FolderOpen, color: "purple" },
              { label: "Opportunities", value: String(opportunities.length), icon: Star, color: "blue" },
              { label: "Collaborators", value: String(projects.reduce((sum, p) => sum + p.collaborators.length, 0)), icon: Users, color: "green" },
              { label: "Applications", value: "0", icon: GitBranch, color: "emerald" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className={`h-10 w-10 rounded-lg bg-${stat.color}-500/20 flex items-center justify-center`}>
                        <stat.icon className={`h-5 w-5 text-${stat.color}-400`} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-white">{isLoading ? '-' : stat.value}</p>
                        <p className="text-sm text-slate-400">{stat.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Recent Projects</h3>
                <Link href="/collaboration/projects">
                  <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">
                    View All →
                  </Button>
                </Link>
              </div>
              {isLoadingProjects ? (
                <div className="space-y-4">
                  <CollabSkeleton />
                  <CollabSkeleton />
                </div>
              ) : hasProjects ? (
                <div className="space-y-4">
                  {projects.slice(0, 2).map(project => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              ) : (
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="p-8 text-center">
                    <FolderOpen className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                    <p className="text-slate-400 mb-4">No projects yet</p>
                    <Link href="/collaboration/projects/create">
                      <Button variant="outline" className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Project
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Opportunities</h3>
                <Link href="/artist/collaborations?tab=browse">
                  <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                    Browse All →
                  </Button>
                </Link>
              </div>
              {isLoadingJobs ? (
                <div className="space-y-4">
                  <CollabSkeleton />
                  <CollabSkeleton />
                </div>
              ) : hasOpportunities ? (
                <div className="space-y-4">
                  {opportunities.slice(0, 2).map(opportunity => (
                    <OpportunityCard key={opportunity.id} opportunity={opportunity} />
                  ))}
                </div>
              ) : (
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="p-8 text-center">
                    <Star className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                    <p className="text-slate-400 mb-4">No open opportunities</p>
                    <Link href="/artist/collaborations">
                      <Button variant="outline" className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Browse Collaborations
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          {isLoadingProjects ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map(i => <CollabSkeleton key={i} />)}
            </div>
          ) : hasProjects ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardContent className="p-12 text-center">
                <FolderOpen className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                <h3 className="text-lg font-semibold text-white mb-2">No Projects Yet</h3>
                <p className="text-slate-400 mb-6 max-w-md mx-auto">
                  Start a collaboration project to manage files, tasks, and team members in one place.
                </p>
                <Link href="/collaboration/projects/create">
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Project
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-6">
          {isLoadingJobs ? (
            <div className="grid gap-6 md:grid-cols-2">
              {[0, 1].map(i => <CollabSkeleton key={i} />)}
            </div>
          ) : hasOpportunities ? (
            <div className="grid gap-6 md:grid-cols-2">
              {opportunities.map(opportunity => (
                <OpportunityCard key={opportunity.id} opportunity={opportunity} />
              ))}
            </div>
          ) : (
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardContent className="p-12 text-center">
                <Star className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                <h3 className="text-lg font-semibold text-white mb-2">No Opportunities Available</h3>
                <p className="text-slate-400 mb-6 max-w-md mx-auto">
                  Check back soon for new collaboration opportunities from artists and producers.
                </p>
                <Link href="/artist/collaborations">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    Browse Collaborations
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
