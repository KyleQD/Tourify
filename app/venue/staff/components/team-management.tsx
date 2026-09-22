"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { detailSurfacePattern } from "@/components/dashboard/detail-surface-pattern"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Settings,
  Star,
  Award,
  Target,
  Calendar,
  MessageSquare,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Building2,
  UserPlus,
  UserMinus
} from "lucide-react"

interface Team {
  id: string
  name: string
  description: string
  department: string
  type: 'permanent' | 'project' | 'event'
  leader: string
  members: string[]
  objectives: string[]
  status: 'active' | 'inactive' | 'completed'
  createdDate: string
  performance: number
  currentProjects: number
  completedTasks: number
  color: string
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  department: string
  avatar?: string
  skills: string[]
  performance: number
  availability: 'available' | 'busy' | 'unavailable'
  teamIds: string[]
}

export default function TeamManagement() {
  const { toast } = useToast()
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [showAddMembers, setShowAddMembers] = useState(false)

  // Mock data for teams
  const [teams, setTeams] = useState<Team[]>([
    {
      id: "team-1",
      name: "Technical Operations",
      description: "Core technical team responsible for sound, lighting, and AV systems",
      department: "Technical",
      type: "permanent",
      leader: "member-2",
      members: ["member-2", "member-3", "member-4"],
      objectives: [
        "Maintain 99% system uptime",
        "Complete equipment upgrades",
        "Train new technical staff"
      ],
      status: "active",
      createdDate: "2024-01-01",
      performance: 96,
      currentProjects: 3,
      completedTasks: 42,
      color: "from-blue-500 to-cyan-500"
    },
    {
      id: "team-2",
      name: "Event Security",
      description: "Security team for event management and venue safety",
      department: "Security",
      type: "permanent",
      leader: "member-5",
      members: ["member-5", "member-6", "member-7"],
      objectives: [
        "Zero security incidents",
        "Improve response time",
        "Enhance crowd control"
      ],
      status: "active",
      createdDate: "2024-01-15",
      performance: 94,
      currentProjects: 2,
      completedTasks: 38,
      color: "from-red-500 to-orange-500"
    },
    {
      id: "team-3",
      name: "Winter Festival Crew",
      description: "Temporary team for the upcoming winter music festival",
      department: "Events",
      type: "project",
      leader: "member-1",
      members: ["member-1", "member-8", "member-9", "member-10"],
      objectives: [
        "Setup festival infrastructure",
        "Coordinate 50+ artists",
        "Manage 3-day event"
      ],
      status: "active",
      createdDate: "2024-01-20",
      performance: 98,
      currentProjects: 1,
      completedTasks: 15,
      color: "from-purple-500 to-pink-500"
    }
  ])

  // Mock data for team members
  const [teamMembers] = useState<TeamMember[]>([
    {
      id: "member-1",
      name: "Alex Chen",
      email: "alex.chen@venue.com",
      role: "Venue Manager",
      department: "Management",
      skills: ["Leadership", "Event Planning", "Team Management"],
      performance: 98,
      availability: "available",
      teamIds: ["team-3"]
    },
    {
      id: "member-2",
      name: "Maya Rodriguez",
      email: "maya.rodriguez@venue.com",
      role: "Technical Lead",
      department: "Technical",
      skills: ["Audio Engineering", "System Design", "Leadership"],
      performance: 96,
      availability: "busy",
      teamIds: ["team-1"]
    },
    {
      id: "member-3",
      name: "Jordan Kim",
      email: "jordan.kim@venue.com",
      role: "Sound Engineer",
      department: "Technical",
      skills: ["Pro Tools", "Live Sound", "Mixing"],
      performance: 92,
      availability: "available",
      teamIds: ["team-1"]
    },
    {
      id: "member-4",
      name: "Sam Taylor",
      email: "sam.taylor@venue.com",
      role: "Lighting Tech",
      department: "Technical",
      skills: ["Lighting Design", "DMX", "Programming"],
      performance: 90,
      availability: "available",
      teamIds: ["team-1"]
    }
  ])

  const [newTeam, setNewTeam] = useState<Partial<Team>>({
    name: "",
    description: "",
    department: "",
    type: "permanent",
    objectives: [""],
    status: "active",
    color: "from-gray-500 to-gray-600"
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'inactive': return 'bg-yellow-500'
      case 'completed': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'bg-green-500'
      case 'busy': return 'bg-yellow-500'
      case 'unavailable': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getTeamLeader = (leaderId: string) => {
    return teamMembers.find(member => member.id === leaderId)
  }

  const getTeamMembersByIds = (memberIds: string[]) => {
    return teamMembers.filter(member => memberIds.includes(member.id))
  }

  const handleCreateTeam = () => {
    const team: Team = {
      ...newTeam as Team,
      id: `team-${Date.now()}`,
      members: [],
      createdDate: new Date().toISOString(),
      performance: 0,
      currentProjects: 0,
      completedTasks: 0
    }
    
    setTeams(prev => [...prev, team])
    setShowCreateTeam(false)
    setNewTeam({
      name: "",
      description: "",
      department: "",
      type: "permanent",
      objectives: [""],
      status: "active",
      color: "from-gray-500 to-gray-600"
    })
    
    toast({
      title: "Team Created",
      description: `Team "${team.name}" has been created successfully`,
    })
  }

  const handleAddObjective = () => {
    setNewTeam({
      ...newTeam,
      objectives: [...(newTeam.objectives || []), ""]
    })
  }

  const handleUpdateObjective = (index: number, value: string) => {
    const objectives = [...(newTeam.objectives || [])]
    objectives[index] = value
    setNewTeam({
      ...newTeam,
      objectives
    })
  }

  const handleRemoveObjective = (index: number) => {
    const objectives = [...(newTeam.objectives || [])]
    objectives.splice(index, 1)
    setNewTeam({
      ...newTeam,
      objectives
    })
  }

  const stats = {
    totalTeams: teams.length,
    activeTeams: teams.filter(t => t.status === 'active').length,
    totalMembers: new Set(teams.flatMap(t => t.members)).size,
    avgPerformance: Math.round(teams.reduce((sum, t) => sum + t.performance, 0) / teams.length)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
            Team Management
          </h1>
          <p className="text-slate-400 mt-1">Create, manage, and optimize team performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            onClick={() => setShowAddMembers(true)}
            className={detailSurfacePattern.input}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Manage Members
          </Button>
          <Button onClick={() => setShowCreateTeam(true)} className="bg-gradient-to-r from-blue-500 to-green-600">
            <Plus className="h-4 w-4 mr-2" />
            Create Team
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: "Total Teams", 
            value: stats.totalTeams, 
            icon: Users, 
            color: "from-blue-500 to-cyan-500" 
          },
          { 
            label: "Active Teams", 
            value: stats.activeTeams, 
            icon: CheckCircle, 
            color: "from-green-500 to-emerald-500" 
          },
          { 
            label: "Team Members", 
            value: stats.totalMembers, 
            icon: UserPlus, 
            color: "from-purple-500 to-pink-500" 
          },
          { 
            label: "Avg Performance", 
            value: `${stats.avgPerformance}%`, 
            icon: TrendingUp, 
            color: "from-orange-500 to-red-500" 
          }
        ].map((stat, i) => (
          <Card key={i} className={detailSurfacePattern.panel}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {teams.map((team) => {
          const leader = getTeamLeader(team.leader)
          const members = getTeamMembersByIds(team.members)
          
          return (
            <Card key={team.id} className={cn(detailSurfacePattern.panel, "transition-all hover:bg-white/[0.06]")}>
              <CardContent className="p-6">
                {/* Team Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${team.color} flex items-center justify-center`}>
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{team.name}</h3>
                      <p className="text-slate-400 text-sm">{team.department}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className={cn("text-xs capitalize", detailSurfacePattern.badgeOutline)}>
                          {team.type}
                        </Badge>
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(team.status)}`}></div>
                        <span className="text-xs text-slate-400 capitalize">{team.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-400">{team.performance}%</div>
                    <div className="text-xs text-slate-400">Performance</div>
                  </div>
                </div>

                {/* Team Description */}
                <p className="text-slate-300 text-sm mb-4 line-clamp-2">
                  {team.description}
                </p>

                {/* Team Leader */}
                {leader && (
                  <div className="mb-4">
                    <div className="text-xs text-slate-400 mb-2">Team Leader</div>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={leader.avatar} />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs">
                          {leader.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-white text-sm font-medium">{leader.name}</span>
                      <Badge variant="outline" className={cn("text-xs", detailSurfacePattern.badgeOutline)}>
                        {leader.role}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Team Members */}
                <div className="mb-4">
                  <div className="text-xs text-slate-400 mb-2">Members ({team.members.length})</div>
                  <div className="flex items-center space-x-1">
                    {members.slice(0, 4).map((member) => (
                      <Avatar key={member.id} className="h-8 w-8 ring-2 ring-slate-600">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {team.members.length > 4 && (
                      <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-300">
                        +{team.members.length - 4}
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-white font-semibold">{team.currentProjects}</div>
                    <div className="text-xs text-slate-400">Active Projects</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-semibold">{team.completedTasks}</div>
                    <div className="text-xs text-slate-400">Completed Tasks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-semibold">{team.objectives.length}</div>
                    <div className="text-xs text-slate-400">Objectives</div>
                  </div>
                </div>

                {/* Recent Objectives */}
                <div className="mb-4">
                  <div className="text-xs text-slate-400 mb-2">Current Objectives</div>
                  <div className="space-y-1">
                    {team.objectives.slice(0, 2).map((objective, i) => (
                      <div key={i} className="text-xs text-slate-300 flex items-start space-x-2">
                        <Target className="h-3 w-3 text-blue-400 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-1">{objective}</span>
                      </div>
                    ))}
                    {team.objectives.length > 2 && (
                      <div className="text-xs text-slate-400">+{team.objectives.length - 2} more objectives</div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-700/50">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-700/50">
                      <Calendar className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-700/50">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Button 
                    size="sm" 
                    onClick={() => setSelectedTeam(team)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Create Team Dialog */}
      <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
        <DialogContent className={cn("max-w-2xl max-h-[90vh] overflow-y-auto", detailSurfacePattern.dialogContent)}>
          <div className={detailSurfacePattern.topAccent} />
          <DialogHeader>
            <DialogTitle className={detailSurfacePattern.title}>Create New Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="team-name" className={detailSurfacePattern.label}>Team Name</Label>
                <Input
                  id="team-name"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  className={detailSurfacePattern.input}
                />
              </div>
              <div>
                <Label htmlFor="department" className={detailSurfacePattern.label}>Department</Label>
                <Select value={newTeam.department} onValueChange={(value) => setNewTeam({ ...newTeam, department: value })}>
                  <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="Technical">Technical</SelectItem>
                    <SelectItem value="Security">Security</SelectItem>
                    <SelectItem value="Service">Service</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Events">Events</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description" className={detailSurfacePattern.label}>Description</Label>
              <Textarea
                id="description"
                value={newTeam.description}
                onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                className={detailSurfacePattern.textarea}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type" className={detailSurfacePattern.label}>Team Type</Label>
                <Select value={newTeam.type} onValueChange={(value) => setNewTeam({ ...newTeam, type: value as any })}>
                  <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="permanent">Permanent Team</SelectItem>
                    <SelectItem value="project">Project Team</SelectItem>
                    <SelectItem value="event">Event Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="leader" className={detailSurfacePattern.label}>Team Leader</Label>
                <Select>
                  <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                    <SelectValue placeholder="Select team leader" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} - {member.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Team Objectives */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className={detailSurfacePattern.label}>Team Objectives</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleAddObjective}
                  className={detailSurfacePattern.btnOutline}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Objective
                </Button>
              </div>
              <div className="space-y-2">
                {newTeam.objectives?.map((objective, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={objective}
                      onChange={(e) => handleUpdateObjective(index, e.target.value)}
                      placeholder={`Objective ${index + 1}`}
                      className={detailSurfacePattern.input}
                    />
                    {newTeam.objectives!.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveObjective(index)}
                        className={detailSurfacePattern.btnDestructive}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowCreateTeam(false)} className={detailSurfacePattern.btnOutline}>
                Cancel
              </Button>
              <Button onClick={handleCreateTeam} className={detailSurfacePattern.btnPrimary}>
                Create Team
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Members Dialog */}
      <Dialog open={showAddMembers} onOpenChange={setShowAddMembers}>
        <DialogContent className={cn("max-w-4xl", detailSurfacePattern.dialogContent)}>
          <div className={detailSurfacePattern.topAccent} />
          <DialogHeader>
            <DialogTitle className={detailSurfacePattern.title}>Manage Team Members</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Available Members */}
              <div>
                <h3 className={cn("mb-4 text-lg font-semibold", detailSurfacePattern.title)}>Available Staff</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {teamMembers.map((member) => (
                    <div key={member.id} className={cn("flex items-center justify-between", detailSurfacePattern.listRow)}>
                      <div className="flex items-center space-x-3">
                        <Avatar className={cn("h-8 w-8", detailSurfacePattern.avatarRing)}>
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback className={cn(detailSurfacePattern.avatarFallback, "text-xs")}>
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className={cn("text-sm font-medium", detailSurfacePattern.title)}>{member.name}</div>
                          <div className={cn("text-xs", detailSurfacePattern.subtleText)}>{member.role}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${getAvailabilityColor(member.availability)}`}></div>
                        <Badge variant="outline" className={cn("text-xs", detailSurfacePattern.badgeOutline)}>
                          {member.teamIds.length} teams
                        </Badge>
                        <Button size="sm" variant="outline" className={cn("text-xs", detailSurfacePattern.btnOutline)}>
                          <UserPlus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team Assignments */}
              <div>
                <h3 className={cn("mb-4 text-lg font-semibold", detailSurfacePattern.title)}>Team Assignments</h3>
                <div className="space-y-4">
                  {teams.slice(0, 3).map((team) => (
                    <div key={team.id} className={cn("p-4", detailSurfacePattern.panel)}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className={cn("font-medium", detailSurfacePattern.title)}>{team.name}</h4>
                          <p className={detailSurfacePattern.subtleText}>{team.members.length} members</p>
                        </div>
                        <Button size="sm" variant="outline" className={cn("text-xs", detailSurfacePattern.btnOutline)}>
                          Manage
                        </Button>
                      </div>
                      <div className="flex items-center space-x-1">
                        {getTeamMembersByIds(team.members).slice(0, 4).map((member) => (
                          <Avatar key={member.id} className="h-6 w-6">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback className={cn(detailSurfacePattern.avatarFallback, "text-xs")}>
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {team.members.length > 4 && (
                          <div className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs", detailSurfacePattern.badgeSoft)}>
                            +{team.members.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setShowAddMembers(false)} className={detailSurfacePattern.btnPrimary}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 