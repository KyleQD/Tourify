"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { useCurrentVenue } from "@/hooks/use-venue"
import StaffOnboardingSystem from "./components/staff-onboarding-system"
import EnhancedStaffOnboarding from "./components/enhanced-staff-onboarding"
import JobBoardIntegration from "./components/job-board-integration"
import { EmployeeManagementOverview } from "@/components/staff/employee-management-overview"
import { EmployeeRosterPanel } from "@/components/staff/employee-roster-panel"
import { StaffingHealthPanel } from "@/components/staff/staffing-health-panel"
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Phone,
  Mail,
  Calendar,
  Star,
  DollarSign,
  Briefcase,
  Award,
  Download,
  Eye,
  Building2,
  Zap,
  UserPlus,
  FileText,
  Target,
  BookOpen,
  UserCheck,
  MessageSquare,
  Bell,
  Activity,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Send,
  Mic,
  Video,
  Shield,
  Settings,
  BarChart3,
  Wifi,
  WifiOff,
  BrainCircuit,
  Sparkles,
  RadioTower,
  Headphones,
  MonitorSpeaker
} from "lucide-react"

interface StaffMember {
  id: string
  name: string
  role: string
  department: string
  avatar?: string
  status: 'online' | 'busy' | 'away' | 'offline'
  lastActive: string
  performance: number
  hourlyRate: number
  eventsCompleted: number
  hoursWorked: number
  reliability: number
  skills: string[]
  nextShift?: string
  isAvailable: boolean
  employmentType: string
  phone: string
  email: string
  teamIds: string[]
  roleLevel: 'entry' | 'mid' | 'senior' | 'manager' | 'director'
  permissions: string[]
  hireDate: string
  certifications: string[]
}

interface Team {
  id: string
  name: string
  department: string
  leaderId: string
  memberIds: string[]
  type: 'permanent' | 'project' | 'event'
  status: 'active' | 'inactive'
  performance: number
}

interface Role {
  id: string
  name: string
  department: string
  level: 'entry' | 'mid' | 'senior' | 'manager' | 'director'
  permissions: string[]
  color: string
}

export default function FuturisticStaffManagement() {
  const { toast } = useToast()
  const { venue, loading: venueLoading } = useCurrentVenue()
  const [activeTab, setActiveTab] = useState("overview")
  const [searchQuery, setSearchQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null)
  const [broadcastMessage, setBroadcastMessage] = useState("")
  const [isEmergencyMode, setIsEmergencyMode] = useState(false)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [showTeamDialog, setShowTeamDialog] = useState(false)
  const [staffingPermissions, setStaffingPermissions] = useState({
    can_manage_staffing: false,
    can_review_staffing: false,
  })
  const [selectedStaffForRole, setSelectedStaffForRole] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState<string>("")

  useEffect(() => {
    const venueId = venue?.id
    if (venueLoading || !venueId) return
    const resolvedVenueId: string = venueId
    let cancelled = false
    async function loadPermissions() {
      try {
        const response = await fetch(
          `/api/staffing/permissions?venue_id=${encodeURIComponent(resolvedVenueId)}`,
          { cache: 'no-store' }
        )
        const payload = await response.json()
        if (!cancelled && payload?.success && payload?.data) setStaffingPermissions(payload.data)
      } catch {}
    }
    loadPermissions()
    return () => {
      cancelled = true
    }
  }, [venue?.id, venueLoading])

  // Enhanced mock data with more realistic staff
  const staffMembers: StaffMember[] = [
    {
      id: "staff-1",
      name: "Alex Chen",
      role: "Venue Manager",
      department: "Operations",
      avatar: "/placeholder.svg",
      status: "online",
      lastActive: "Active now",
      performance: 98,
      hourlyRate: 35,
      eventsCompleted: 124,
      hoursWorked: 2240,
      reliability: 99,
      skills: ["Team Leadership", "Event Planning", "Crisis Management", "Budget Management"],
      nextShift: "Tomorrow 2:00 PM",
      isAvailable: true,
      employmentType: "Full-time",
      phone: "(555) 123-4567",
      email: "alex.chen@venue.com",
      teamIds: ["team-1", "team-management"],
      roleLevel: "manager",
      permissions: ["manage_staff", "view_finances", "create_events", "broadcast_messages"],
      hireDate: "2022-01-15",
      certifications: ["Venue Management", "Safety Certification", "Leadership Training"]
    },
    {
      id: "staff-2",
      name: "Maya Rodriguez",
      role: "Sound Engineer",
      department: "Technical",
      avatar: "/placeholder.svg",
      status: "busy",
      lastActive: "2 min ago",
      performance: 95,
      hourlyRate: 42,
      eventsCompleted: 89,
      hoursWorked: 1680,
      reliability: 97,
      skills: ["Live Sound", "Pro Tools", "System Design", "Mixing"],
      nextShift: "Today 6:00 PM",
      isAvailable: false,
      employmentType: "Full-time",
      phone: "(555) 234-5678",
      email: "maya.rodriguez@venue.com",
      teamIds: ["team-technical"],
      roleLevel: "senior",
      permissions: ["manage_equipment", "view_events", "technical_access"],
      hireDate: "2022-03-22",
      certifications: ["Pro Tools Certification", "Live Sound Engineering", "System Design"]
    },
    {
      id: "staff-3",
      name: "Jordan Kim",
      role: "Bar Manager",
      department: "Service",
      avatar: "/placeholder.svg",
      status: "online",
      lastActive: "5 min ago",
      performance: 92,
      hourlyRate: 28,
      eventsCompleted: 156,
      hoursWorked: 1920,
      reliability: 94,
      skills: ["Mixology", "Inventory Management", "Staff Training", "POS Systems"],
      nextShift: "Tomorrow 5:00 PM",
      isAvailable: true,
      employmentType: "Full-time",
      phone: "(555) 345-6789",
      email: "jordan.kim@venue.com",
      teamIds: ["team-service"],
      roleLevel: "senior",
      permissions: ["manage_service", "view_inventory", "staff_training"],
      hireDate: "2021-08-10",
      certifications: ["Bartending License", "Food Safety", "Service Management"]
    },
    {
      id: "staff-4",
      name: "Sam Taylor",
      role: "Security Lead",
      department: "Security",
      avatar: "/placeholder.svg",
      status: "away",
      lastActive: "15 min ago",
      performance: 96,
      hourlyRate: 32,
      eventsCompleted: 78,
      hoursWorked: 1560,
      reliability: 98,
      skills: ["Crowd Control", "De-escalation", "Emergency Response", "Team Coordination"],
      nextShift: "Today 8:00 PM",
      isAvailable: true,
      employmentType: "Full-time",
      phone: "(555) 456-7890",
      email: "sam.taylor@venue.com",
      teamIds: ["team-security"],
      roleLevel: "senior",
      permissions: ["security_access", "emergency_response", "crowd_control"],
      hireDate: "2022-06-05",
      certifications: ["Security License", "CPR Certification", "Emergency Response"]
    }
  ]

  // Mock data for teams
  const teams: Team[] = [
    {
      id: "team-1",
      name: "Operations Team",
      department: "Operations",
      leaderId: "staff-1",
      memberIds: ["staff-1"],
      type: "permanent",
      status: "active",
      performance: 98
    },
    {
      id: "team-technical",
      name: "Technical Team",
      department: "Technical",
      leaderId: "staff-2",
      memberIds: ["staff-2"],
      type: "permanent",
      status: "active",
      performance: 95
    },
    {
      id: "team-service",
      name: "Service Team",
      department: "Service",
      leaderId: "staff-3",
      memberIds: ["staff-3"],
      type: "permanent",
      status: "active",
      performance: 92
    },
    {
      id: "team-security",
      name: "Security Team",
      department: "Security",
      leaderId: "staff-4",
      memberIds: ["staff-4"],
      type: "permanent",
      status: "active",
      performance: 96
    }
  ]

  // Mock data for roles
  const roles: Role[] = [
    {
      id: "role-manager",
      name: "Manager",
      department: "Operations",
      level: "manager",
      permissions: ["manage_staff", "view_finances", "create_events", "broadcast_messages"],
      color: "from-purple-500 to-pink-500"
    },
    {
      id: "role-senior",
      name: "Senior Staff",
      department: "All",
      level: "senior",
      permissions: ["manage_equipment", "view_events", "staff_training"],
      color: "from-blue-500 to-cyan-500"
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'busy': return 'bg-yellow-500'
      case 'away': return 'bg-orange-500'
      case 'offline': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getPerformanceColor = (performance: number) => {
    if (performance >= 95) return 'text-green-400'
    if (performance >= 85) return 'text-blue-400'
    return 'text-yellow-400'
  }

  const handleBroadcast = () => {
    if (!broadcastMessage.trim()) return
    
    toast({
      title: isEmergencyMode ? "🚨 Emergency Alert Sent" : "📢 Broadcast Sent",
      description: `Message sent to all ${staffMembers.length} staff members`,
    })
    
    setBroadcastMessage("")
    setIsEmergencyMode(false)
  }

  const handleAssignRole = (staffIds: string[], roleId: string) => {
    const role = roles.find(r => r.id === roleId)
    toast({
      title: "Role Assigned",
      description: `${role?.name} role assigned to ${staffIds.length} staff member(s)`,
    })
    setShowRoleDialog(false)
    setSelectedStaffForRole([])
  }

  const handleCreateTeam = (teamName: string, department: string, memberIds: string[]) => {
    toast({
      title: "Team Created",
      description: `Team "${teamName}" created with ${memberIds.length} members`,
    })
    setShowTeamDialog(false)
  }

  const handleBulkAction = (action: string, staffIds: string[]) => {
    let actionName = ""
    switch (action) {
      case "activate":
        actionName = "Activated"
        break
      case "deactivate":
        actionName = "Deactivated"
        break
      case "promote":
        actionName = "Promoted"
        break
      case "message":
        actionName = "Messaged"
        break
      default:
        actionName = "Updated"
    }
    
    toast({
      title: "Bulk Action Completed",
      description: `${actionName} ${staffIds.length} staff member(s)`,
    })
  }

  const getRoleLevelColor = (level: string) => {
    switch (level) {
      case 'director': return 'text-purple-400 bg-purple-500/10 border-purple-500/20'
      case 'manager': return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
      case 'senior': return 'text-green-400 bg-green-500/10 border-green-500/20'
      case 'mid': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      case 'entry': return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
    }
  }

  const getTeamsByStaff = (staffId: string) => {
    return teams.filter(team => team.memberIds.includes(staffId))
  }

  const stats = {
    totalStaff: staffMembers.length,
    onlineStaff: staffMembers.filter(s => s.status === 'online').length,
    avgPerformance: Math.round(staffMembers.reduce((acc, s) => acc + s.performance, 0) / staffMembers.length),
    totalHours: staffMembers.reduce((acc, s) => acc + s.hoursWorked, 0),
    upcomingShifts: staffMembers.filter(s => s.nextShift).length,
    totalEvents: staffMembers.reduce((acc, s) => acc + s.eventsCompleted, 0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      {/* Futuristic Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center">
                <BrainCircuit className="h-6 w-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Neural Staff Command
              </h1>
              <p className="text-slate-400">Advanced workforce intelligence & communication hub</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              disabled={!staffingPermissions.can_manage_staffing}
              className="bg-slate-800/50 border-slate-600 hover:bg-slate-700/50 backdrop-blur-sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  disabled={!staffingPermissions.can_manage_staffing}
                  className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700 backdrop-blur-sm">
                <DialogHeader>
                  <DialogTitle className="text-cyan-400">Add New Staff Member</DialogTitle>
                </DialogHeader>
                {/* Add staff form would go here */}
                <div className="p-4">
                  <p className="text-slate-400">Staff onboarding form coming soon...</p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

      <div className="mb-6">
        <EmployeeManagementOverview
          venueId={venue?.id || ''}
          rolesHref={venue?.id ? `/venue/staff/roles-permissions?venueId=${encodeURIComponent(venue.id)}` : '/venue/staff/roles-permissions'}
        />
      </div>
      <div className="mb-6">
        <EmployeeRosterPanel venueId={venue?.id || ''} />
      </div>
      <div className="mb-6">
        <StaffingHealthPanel venueId={venue?.id || ''} />
      </div>

        {/* Real-time Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          {[
            { label: "Total Staff", value: stats.totalStaff, icon: Users, color: "from-blue-500 to-cyan-500" },
            { label: "Online Now", value: stats.onlineStaff, icon: Wifi, color: "from-green-500 to-emerald-500" },
            { label: "Avg Performance", value: `${stats.avgPerformance}%`, icon: TrendingUp, color: "from-purple-500 to-pink-500" },
            { label: "Total Hours", value: stats.totalHours.toLocaleString(), icon: Clock, color: "from-orange-500 to-red-500" },
            { label: "Upcoming Shifts", value: stats.upcomingShifts, icon: Calendar, color: "from-teal-500 to-cyan-500" },
            { label: "Events Complete", value: stats.totalEvents, icon: CheckCircle, color: "from-indigo-500 to-purple-500" }
          ].map((stat, i) => (
            <Card key={i} className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm hover:bg-slate-800/40 transition-all duration-300">
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

        {/* Emergency Broadcast System */}
        <Card className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border-red-500/30 backdrop-blur-sm mb-6">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <RadioTower className="h-5 w-5 text-red-400" />
                <span className="text-red-400 font-semibold">Broadcast System</span>
              </div>
              <div className="flex-1 flex items-center space-x-2">
                <Input 
                  placeholder="Send message to all staff..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="bg-slate-800/50 border-slate-600 text-white placeholder-slate-400"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEmergencyMode(!isEmergencyMode)}
                  className={`${isEmergencyMode ? 'bg-red-600 border-red-500 text-white' : 'border-slate-600'}`}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Emergency
                </Button>
                <Button 
                  onClick={handleBroadcast}
                  className="bg-gradient-to-r from-cyan-500 to-purple-600"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 grid w-full grid-cols-7">
          <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-600">
            <Activity className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="staff" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-600">
            <Users className="h-4 w-4 mr-2" />
            Active Staff
          </TabsTrigger>
          <TabsTrigger value="onboarding" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-600">
            <UserPlus className="h-4 w-4 mr-2" />
            Onboarding
          </TabsTrigger>
          <TabsTrigger value="jobs" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-600">
            <Briefcase className="h-4 w-4 mr-2" />
            Job Board
          </TabsTrigger>
          <TabsTrigger value="communications" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-600">
            <MessageSquare className="h-4 w-4 mr-2" />
            Communications
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-600">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="scheduler" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-600">
            <Calendar className="h-4 w-4 mr-2" />
            Scheduler
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Activity Feed */}
            <Card className="lg:col-span-2 bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-cyan-400" />
                  <span className="text-cyan-400">Live Activity Feed</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-auto"></div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  <div className="space-y-4">
                    {[
                      { user: "Maya Rodriguez", action: "Started sound check for tonight's event", time: "2 min ago", type: "work" },
                      { user: "Alex Chen", action: "Approved overtime request for weekend event", time: "5 min ago", type: "admin" },
                      { user: "Jordan Kim", action: "Updated bar inventory levels", time: "8 min ago", type: "update" },
                      { user: "Sam Taylor", action: "Completed security briefing", time: "12 min ago", type: "complete" },
                      { user: "System", action: "Automated staff performance review initiated", time: "15 min ago", type: "system" }
                    ].map((activity, i) => (
                      <div key={i} className="flex items-start space-x-3 p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          activity.type === 'work' ? 'bg-green-400' :
                          activity.type === 'admin' ? 'bg-blue-400' :
                          activity.type === 'update' ? 'bg-yellow-400' :
                          activity.type === 'complete' ? 'bg-purple-400' :
                          'bg-cyan-400'
                        }`}></div>
                        <div className="flex-1">
                          <p className="text-white text-sm">{activity.user}</p>
                          <p className="text-slate-400 text-xs">{activity.action}</p>
                          <p className="text-slate-500 text-xs">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-purple-400">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 hover:from-blue-600/30 hover:to-cyan-600/30">
                  <Mic className="h-4 w-4 mr-2" />
                  Voice Broadcast
                </Button>
                <Button className="w-full justify-start bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 hover:from-green-600/30 hover:to-emerald-600/30">
                  <Video className="h-4 w-4 mr-2" />
                  Video Conference
                </Button>
                <Button className="w-full justify-start bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:from-purple-600/30 hover:to-pink-600/30">
                  <Calendar className="h-4 w-4 mr-2" />
                  Emergency Schedule
                </Button>
                <Button className="w-full justify-start bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/30 hover:from-orange-600/30 hover:to-red-600/30">
                  <Shield className="h-4 w-4 mr-2" />
                  Security Alert
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Staff Tab */}
        <TabsContent value="staff" className="space-y-6">
          {/* Advanced Search and Filters */}
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search staff..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Technical">Technical</SelectItem>
                    <SelectItem value="Service">Service</SelectItem>
                    <SelectItem value="Security">Security</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="away">Away</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={bulkAction} onValueChange={setBulkAction}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue placeholder="Bulk Actions" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="assign_role">Assign Role</SelectItem>
                    <SelectItem value="create_team">Create Team</SelectItem>
                    <SelectItem value="send_message">Send Message</SelectItem>
                    <SelectItem value="update_schedule">Update Schedule</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="border-slate-600 bg-slate-700/50 hover:bg-slate-700">
                  <Filter className="h-4 w-4 mr-2" />
                  Advanced
                </Button>
              </div>

              {/* Management Action Bar */}
              <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                <div className="flex items-center space-x-4">
                  <Button 
                    onClick={() => setShowRoleDialog(true)}
                    className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:from-purple-600/30 hover:to-pink-600/30"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Manage Roles
                  </Button>
                  <Button 
                    onClick={() => setShowTeamDialog(true)}
                    className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 hover:from-blue-600/30 hover:to-cyan-600/30"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Manage Teams
                  </Button>
                  <Button 
                    variant="outline"
                    className="border-slate-600 bg-slate-700/50 hover:bg-slate-700"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Manager
                  </Button>
                </div>
                <div className="text-slate-400 text-sm">
                  {staffMembers.length} staff members • {teams.length} teams • {roles.length} roles
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Staff Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {staffMembers.map((staff) => (
              <Card key={staff.id} className="group bg-slate-800/30 border-slate-700/50 backdrop-blur-sm hover:bg-slate-800/50 hover:border-slate-600/50 transition-all duration-300 hover:scale-[1.02]">
                <CardContent className="p-6">
                  {/* Staff Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12 ring-2 ring-slate-600">
                          <AvatarImage src={staff.avatar} alt={staff.name} />
                          <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white">
                            {staff.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(staff.status)} rounded-full border-2 border-slate-800`}></div>
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{staff.name}</h3>
                        <p className="text-slate-400 text-sm">{staff.role}</p>
                                              <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs bg-slate-700/50 border-slate-600">
                          {staff.department}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-slate-700/50 border-slate-600">
                          {staff.employmentType}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${getRoleLevelColor(staff.roleLevel)} capitalize`}>
                          {staff.roleLevel}
                        </Badge>
                      </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getPerformanceColor(staff.performance)}`}>
                        {staff.performance}%
                      </div>
                      <div className="text-xs text-slate-400">Performance</div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-white font-semibold">{staff.eventsCompleted}</div>
                      <div className="text-xs text-slate-400">Events</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-semibold">{staff.hoursWorked.toLocaleString()}</div>
                      <div className="text-xs text-slate-400">Hours</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-semibold">{staff.reliability}%</div>
                      <div className="text-xs text-slate-400">Reliable</div>
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="mb-4">
                    <div className="text-xs text-slate-400 mb-2">Skills</div>
                    <div className="flex flex-wrap gap-1">
                      {staff.skills.slice(0, 3).map((skill, i) => (
                        <Badge key={i} variant="outline" className="text-xs bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-500/30 text-cyan-400">
                          {skill}
                        </Badge>
                      ))}
                      {staff.skills.length > 3 && (
                        <Badge variant="outline" className="text-xs bg-slate-700/50 border-slate-600 text-slate-400">
                          +{staff.skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Teams */}
                  <div className="mb-4">
                    <div className="text-xs text-slate-400 mb-2">Teams ({getTeamsByStaff(staff.id).length})</div>
                    <div className="flex flex-wrap gap-1">
                      {getTeamsByStaff(staff.id).slice(0, 2).map((team) => (
                        <Badge key={team.id} variant="outline" className="text-xs bg-blue-500/20 border-blue-500/30 text-blue-400">
                          {team.name}
                        </Badge>
                      ))}
                      {getTeamsByStaff(staff.id).length > 2 && (
                        <Badge variant="outline" className="text-xs bg-slate-700/50 border-slate-600 text-slate-400">
                          +{getTeamsByStaff(staff.id).length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Certifications */}
                  <div className="mb-4">
                    <div className="text-xs text-slate-400 mb-2">Certifications</div>
                    <div className="flex flex-wrap gap-1">
                      {staff.certifications.slice(0, 2).map((cert, i) => (
                        <Badge key={i} variant="outline" className="text-xs bg-green-500/20 border-green-500/30 text-green-400">
                          {cert}
                        </Badge>
                      ))}
                      {staff.certifications.length > 2 && (
                        <Badge variant="outline" className="text-xs bg-slate-700/50 border-slate-600 text-slate-400">
                          +{staff.certifications.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Next Shift */}
                  {staff.nextShift && (
                    <div className="mb-4 p-2 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-3 w-3 text-cyan-400" />
                        <span className="text-xs text-slate-400">Next Shift:</span>
                        <span className="text-xs text-white">{staff.nextShift}</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                    <div className="flex space-x-2">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-700/50" title="Send Message">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-700/50" title="Call">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-700/50" title="Schedule">
                        <Calendar className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-700/50" title="Assign Role">
                        <Shield className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-700/50" title="Add to Team">
                        <Users className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" className="border-slate-600 text-xs">
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700">
                        <Eye className="h-4 w-4 mr-1" />
                        View Profile
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Onboarding Tab */}
        <TabsContent value="onboarding" className="space-y-6">
          {venueLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
                <p className="text-slate-400">Loading venue data...</p>
              </div>
            </div>
          ) : venue ? (
            <StaffOnboardingSystem venueId={venue.id} />
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-400">No venue found. Please create a venue first.</p>
            </div>
          )}
        </TabsContent>

        {/* Job Board Tab */}
        <TabsContent value="jobs" className="space-y-6">
          <JobBoardIntegration />
        </TabsContent>

        {/* Communications Tab */}
        <TabsContent value="communications" className="space-y-6">
          {/* Enhanced Communication System */}
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-cyan-400">Staff Communication Hub</CardTitle>
              <CardDescription>
                Send messages, broadcast announcements, and manage staff communications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Button className="h-20 flex-col bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30">
                  <MonitorSpeaker className="h-8 w-8 mb-2 text-blue-400" />
                  <span className="text-blue-400">Broadcast to All</span>
                </Button>
                <Button className="h-20 flex-col bg-green-600/20 hover:bg-green-600/30 border border-green-500/30">
                  <Users className="h-8 w-8 mb-2 text-green-400" />
                  <span className="text-green-400">Department Message</span>
                </Button>
                <Button className="h-20 flex-col bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30">
                  <Calendar className="h-8 w-8 mb-2 text-purple-400" />
                  <span className="text-purple-400">Schedule Update</span>
                </Button>
                <Button className="h-20 flex-col bg-red-600/20 hover:bg-red-600/30 border border-red-500/30">
                  <AlertTriangle className="h-8 w-8 mb-2 text-red-400" />
                  <span className="text-red-400">Emergency Alert</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Messages */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Recent Messages</h3>
                  <div className="space-y-3">
                    {[
                      { sender: "You", message: "Team meeting at 3 PM today", time: "10 min ago", type: "announcement" },
                      { sender: "Maya Rodriguez", message: "Sound check complete for tonight", time: "25 min ago", type: "update" },
                      { sender: "System", message: "New staff member Sarah Johnson onboarded", time: "1 hour ago", type: "system" }
                    ].map((msg, i) => (
                      <div key={i} className="p-3 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-medium text-sm">{msg.sender}</span>
                          <span className="text-slate-400 text-xs">{msg.time}</span>
                        </div>
                        <p className="text-slate-300 text-sm">{msg.message}</p>
                        <Badge variant="outline" className="text-xs mt-1 bg-slate-600/50 border-slate-500">
                          {msg.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Message */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Send Quick Message</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="recipients">Recipients</Label>
                      <Select>
                        <SelectTrigger className="bg-slate-700/50 border-slate-600">
                          <SelectValue placeholder="Select recipients" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="all">All Staff</SelectItem>
                          <SelectItem value="technical">Technical Team</SelectItem>
                          <SelectItem value="security">Security Team</SelectItem>
                          <SelectItem value="service">Service Team</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select>
                        <SelectTrigger className="bg-slate-700/50 border-slate-600">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        placeholder="Type your message..."
                        className="bg-slate-700/50 border-slate-600"
                        rows={4}
                      />
                    </div>
                    <Button className="w-full bg-cyan-600 hover:bg-cyan-700">
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Message Center */}
            <Card className="lg:col-span-2 bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-cyan-400" />
                  <span className="text-cyan-400">Message Center</span>
                  <div className="ml-auto flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-400">Live</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {[
                      { sender: "Maya Rodriguez", message: "Sound system check complete. All levels optimal.", time: "2 min ago", avatar: "/placeholder.svg" },
                      { sender: "You", message: "Great work! How's the new mixing board?", time: "1 min ago", isMe: true },
                      { sender: "Jordan Kim", message: "Bar inventory restocked. Ready for tonight's rush.", time: "5 min ago", avatar: "/placeholder.svg" },
                      { sender: "Sam Taylor", message: "Security briefing complete. Team is positioned.", time: "8 min ago", avatar: "/placeholder.svg" }
                    ].map((msg, i) => (
                      <div key={i} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex items-start space-x-2 max-w-xs ${msg.isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          {!msg.isMe && (
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={msg.avatar} />
                              <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-xs">
                                {msg.sender.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div>
                            <div className={`p-3 rounded-lg ${
                              msg.isMe 
                                ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white' 
                                : 'bg-slate-700/50 text-white'
                            }`}>
                              <p className="text-sm">{msg.message}</p>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{msg.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex items-center space-x-2 mt-4">
                  <Input 
                    placeholder="Type your message..."
                    className="flex-1 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                  />
                  <Button className="bg-gradient-to-r from-cyan-500 to-purple-600">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Communication Tools */}
            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-purple-400">Communication Hub</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full justify-start bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 hover:from-green-600/30 hover:to-emerald-600/30">
                  <MonitorSpeaker className="h-4 w-4 mr-2" />
                  All-Call System
                </Button>
                <Button className="w-full justify-start bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 hover:from-blue-600/30 hover:to-cyan-600/30">
                  <Headphones className="h-4 w-4 mr-2" />
                  Team Channels
                </Button>
                <Button className="w-full justify-start bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:from-purple-600/30 hover:to-pink-600/30">
                  <Bell className="h-4 w-4 mr-2" />
                  Priority Alerts
                </Button>
                <Button className="w-full justify-start bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 hover:from-yellow-600/30 hover:to-orange-600/30">
                  <FileText className="h-4 w-4 mr-2" />
                  Task Assignments
                </Button>
                
                {/* Online Staff */}
                <div className="pt-4 border-t border-slate-700">
                  <div className="text-sm text-slate-400 mb-3">Online Staff ({stats.onlineStaff})</div>
                  <div className="space-y-2">
                    {staffMembers.filter(s => s.status === 'online').map((staff) => (
                      <div key={staff.id} className="flex items-center space-x-2 p-2 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors cursor-pointer">
                        <div className="relative">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={staff.avatar} />
                            <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-xs">
                              {staff.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-slate-800"></div>
                        </div>
                        <div className="flex-1">
                          <div className="text-white text-sm">{staff.name}</div>
                          <div className="text-slate-400 text-xs">{staff.role}</div>
                        </div>
                        <MessageSquare className="h-4 w-4 text-slate-400 hover:text-cyan-400 transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
            {[
              { title: "Performance Trend", value: "+12%", subtitle: "vs last month", color: "from-green-500 to-emerald-500" },
              { title: "Team Efficiency", value: "94.2%", subtitle: "across all teams", color: "from-blue-500 to-cyan-500" },
              { title: "Role Coverage", value: "98%", subtitle: "positions filled", color: "from-purple-500 to-pink-500" },
              { title: "Cost Savings", value: "$4.2K", subtitle: "optimized scheduling", color: "from-orange-500 to-red-500" }
            ].map((metric, i) => (
              <Card key={i} className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">{metric.title}</p>
                      <p className="text-3xl font-bold text-white">{metric.value}</p>
                      <p className="text-slate-500 text-xs">{metric.subtitle}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${metric.color} flex items-center justify-center`}>
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Team Performance */}
            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-cyan-400">Team Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teams.map((team) => (
                    <div key={team.id} className="p-3 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">{team.name}</span>
                        <Badge variant="outline" className={`text-xs ${getPerformanceColor(team.performance)}`}>
                          {team.performance}%
                        </Badge>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${team.performance >= 95 ? 'bg-green-500' : team.performance >= 85 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                          style={{ width: `${team.performance}%` }}
                        ></div>
                      </div>
                      <div className="text-slate-400 text-xs mt-1">
                        {team.memberIds.length} members • {team.department}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Role Distribution */}
            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-purple-400">Role Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['manager', 'senior', 'mid', 'entry'].map((level) => {
                    const count = staffMembers.filter(s => s.roleLevel === level).length
                    const percentage = (count / staffMembers.length) * 100
                    return (
                      <div key={level} className="p-3 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium capitalize">{level} Level</span>
                          <span className="text-slate-400 text-sm">{count} staff</span>
                        </div>
                        <div className="w-full bg-slate-600 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getRoleLevelColor(level).includes('purple') ? 'bg-purple-500' : getRoleLevelColor(level).includes('blue') ? 'bg-blue-500' : getRoleLevelColor(level).includes('green') ? 'bg-green-500' : 'bg-yellow-500'}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="text-slate-400 text-xs mt-1">
                          {percentage.toFixed(1)}% of total staff
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-orange-400">Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {staffMembers
                    .sort((a, b) => b.performance - a.performance)
                    .slice(0, 4)
                    .map((staff, i) => (
                    <div key={staff.id} className="flex items-center space-x-3 p-3 bg-slate-700/30 rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        i === 0 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                        i === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                        i === 2 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                        'bg-gradient-to-r from-slate-500 to-slate-600'
                      }`}>
                        {i + 1}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={staff.avatar} />
                        <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white">
                          {staff.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="text-white font-medium">{staff.name}</div>
                        <div className="text-slate-400 text-sm">{staff.role}</div>
                        <Badge variant="outline" className={`text-xs ${getRoleLevelColor(staff.roleLevel)} mt-1`}>
                          {staff.roleLevel}
                        </Badge>
                      </div>
                      <div className={`text-lg font-bold ${getPerformanceColor(staff.performance)}`}>
                        {staff.performance}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Department Analytics */}
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-green-400">Department Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {['Operations', 'Technical', 'Service', 'Security'].map((dept) => {
                  const staffInDept = staffMembers.filter(s => s.department === dept)
                  const avgPerformance = staffInDept.reduce((sum, s) => sum + s.performance, 0) / staffInDept.length || 0
                  const teamsInDept = teams.filter(t => t.department === dept)
                  
                  return (
                    <div key={dept} className="p-4 bg-slate-700/30 rounded-lg">
                      <h3 className="text-white font-semibold mb-3">{dept}</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-sm">Staff</span>
                          <span className="text-white font-medium">{staffInDept.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-sm">Teams</span>
                          <span className="text-white font-medium">{teamsInDept.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-sm">Avg Performance</span>
                          <span className={`font-medium ${getPerformanceColor(avgPerformance)}`}>
                            {avgPerformance.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-sm">Total Hours</span>
                          <span className="text-white font-medium">
                            {staffInDept.reduce((sum, s) => sum + s.hoursWorked, 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Smart Scheduler Tab */}
        <TabsContent value="scheduler" className="space-y-6">
          {/* Scheduler Header */}
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Staff Scheduler</h2>
                    <p className="text-slate-400 text-sm">Manage shifts, assignments, and availability</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Button variant="outline" className="border-slate-600">
                    <Download className="h-4 w-4 mr-2" />
                    Export Schedule
                  </Button>
                  <Button className="bg-gradient-to-r from-cyan-500 to-purple-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Shift
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: "Today's Shifts", value: "8", icon: Clock, color: "from-blue-500 to-cyan-500" },
                  { label: "Staff Available", value: "12", icon: UserCheck, color: "from-green-500 to-emerald-500" },
                  { label: "Open Positions", value: "3", icon: AlertTriangle, color: "from-red-500 to-orange-500" },
                  { label: "Coverage Rate", value: "94%", icon: Target, color: "from-purple-500 to-pink-500" }
                ].map((stat, i) => (
                  <div key={i} className="p-4 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-sm">{stat.label}</p>
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                      </div>
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                        <stat.icon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Schedule Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's Schedule */}
            <Card className="lg:col-span-2 bg-slate-800/30 border-slate-700/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-cyan-400">Today's Schedule</span>
                  <div className="flex items-center space-x-2">
                    <Input 
                      type="date" 
                      className="bg-slate-700/50 border-slate-600 text-white w-auto"
                      defaultValue={new Date().toISOString().split('T')[0]}
                    />
                    <Button size="sm" variant="outline" className="border-slate-600">
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { time: "08:00 - 12:00", title: "Setup Crew", department: "Technical", assigned: "Maya Rodriguez", status: "confirmed" },
                    { time: "14:00 - 18:00", title: "Sound Check", department: "Technical", assigned: "Jordan Kim", status: "assigned" },
                    { time: "18:00 - 23:00", title: "Event Security", department: "Security", assigned: "Sam Taylor", status: "confirmed" },
                    { time: "20:00 - 02:00", title: "Bar Service", department: "Service", assigned: null, status: "open" },
                    { time: "19:00 - 01:00", title: "Stage Management", department: "Operations", assigned: "Alex Chen", status: "confirmed" }
                  ].map((shift, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="text-cyan-400 font-mono text-sm">{shift.time}</div>
                          <div>
                            <h4 className="text-white font-medium">{shift.title}</h4>
                            <p className="text-slate-400 text-sm">{shift.department}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className={`text-xs ${
                            shift.status === 'confirmed' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                            shift.status === 'assigned' ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' :
                            'bg-red-500/20 border-red-500/30 text-red-400'
                          }`}>
                            {shift.status}
                          </Badge>
                        </div>
                      </div>
                      
                      {shift.assigned ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-xs">
                                {shift.assigned.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-slate-300 text-sm">{shift.assigned}</span>
                          </div>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                              <MessageSquare className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-red-400 text-sm">Position Open</span>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 h-6 text-xs">
                            Assign Staff
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Staff Availability & AI Scheduler */}
            <div className="space-y-6">
              {/* Staff Availability */}
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-green-400">Staff Availability</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {staffMembers.map((staff) => (
                      <div key={staff.id} className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={staff.avatar} />
                            <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-xs">
                              {staff.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-white text-sm font-medium">{staff.name}</div>
                            <div className="text-slate-400 text-xs">{staff.department}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(staff.status)}`}></div>
                          <Badge variant="outline" className="text-xs bg-slate-600/50 border-slate-500">
                            {staff.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* AI Scheduler */}
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BrainCircuit className="h-5 w-5 text-purple-400" />
                    <span className="text-purple-400">AI Scheduler</span>
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">BETA</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <h4 className="text-purple-400 font-medium mb-2">Optimization Suggestions</h4>
                      <div className="text-slate-300 text-sm space-y-1">
                        <p>• Move Maya to evening shift for better performance match</p>
                        <p>• Jordan has availability conflict at 18:00</p>
                        <p>• Recommend hiring additional security staff</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Button className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:from-purple-600/30 hover:to-pink-600/30 text-purple-400">
                        <Sparkles className="h-4 w-4 mr-1" />
                        Auto-Assign
                      </Button>
                      <Button className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 hover:from-cyan-600/30 hover:to-blue-600/30 text-cyan-400">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        Optimize
                      </Button>
                    </div>
                    
                    <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure AI Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Schedule Management Tools */}
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-orange-400">Schedule Management Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Button className="h-20 flex-col bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30">
                  <Calendar className="h-8 w-8 mb-2 text-blue-400" />
                  <span className="text-blue-400">Weekly View</span>
                </Button>
                <Button className="h-20 flex-col bg-green-600/20 hover:bg-green-600/30 border border-green-500/30">
                  <UserPlus className="h-8 w-8 mb-2 text-green-400" />
                  <span className="text-green-400">Quick Assign</span>
                </Button>
                <Button className="h-20 flex-col bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30">
                  <Target className="h-8 w-8 mb-2 text-purple-400" />
                  <span className="text-purple-400">Coverage Report</span>
                </Button>
                <Button className="h-20 flex-col bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30">
                  <Bell className="h-8 w-8 mb-2 text-orange-400" />
                  <span className="text-orange-400">Send Notifications</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Role Management Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-purple-400">Assign Roles to Staff</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label>Select Role</Label>
              <Select>
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue placeholder="Choose a role to assign" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name} - {role.department} ({role.level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Select Staff Members</Label>
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                {staffMembers.map((staff) => (
                  <div key={staff.id} className="flex items-center space-x-3 p-3 bg-slate-800/50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={selectedStaffForRole.includes(staff.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStaffForRole([...selectedStaffForRole, staff.id])
                        } else {
                          setSelectedStaffForRole(selectedStaffForRole.filter(id => id !== staff.id))
                        }
                      }}
                      className="rounded border-slate-600"
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={staff.avatar} />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs">
                        {staff.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-white font-medium">{staff.name}</div>
                      <div className="text-slate-400 text-sm">
                        Current: {staff.role} - {staff.department}
                      </div>
                      <Badge variant="outline" className={`text-xs ${getRoleLevelColor(staff.roleLevel)} mt-1`}>
                        {staff.roleLevel}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-xs bg-slate-700/50 border-slate-600">
                      {staff.performance}% performance
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => handleAssignRole(selectedStaffForRole, "role-1")}
                disabled={selectedStaffForRole.length === 0}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Assign Role ({selectedStaffForRole.length} selected)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Management Dialog */}
      <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
        <DialogContent className="max-w-4xl bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-blue-400">Team Management</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Create New Team Section */}
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Create New Team</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="team-name">Team Name</Label>
                  <Input
                    id="team-name"
                    placeholder="e.g., Winter Festival Crew"
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div>
                  <Label htmlFor="team-department">Department</Label>
                  <Select>
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Technical">Technical</SelectItem>
                      <SelectItem value="Service">Service</SelectItem>
                      <SelectItem value="Security">Security</SelectItem>
                      <SelectItem value="Events">Events</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="team-type">Team Type</Label>
                  <Select>
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="permanent">Permanent Team</SelectItem>
                      <SelectItem value="project">Project Team</SelectItem>
                      <SelectItem value="event">Event Team</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            </div>

            {/* Existing Teams */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Existing Teams</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {teams.map((team) => {
                  const leader = staffMembers.find(s => s.id === team.leaderId)
                  const members = staffMembers.filter(s => team.memberIds.includes(s.id))
                  
                  return (
                    <div key={team.id} className="p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-white font-medium">{team.name}</h4>
                          <p className="text-slate-400 text-sm">{team.department} • {team.type}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className={`text-xs ${getPerformanceColor(team.performance)}`}>
                            {team.performance}%
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-slate-700/50 border-slate-600">
                            {team.status}
                          </Badge>
                        </div>
                      </div>
                      
                      {leader && (
                        <div className="mb-3">
                          <div className="text-xs text-slate-400 mb-1">Team Leader</div>
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={leader.avatar} />
                              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs">
                                {leader.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-white text-sm">{leader.name}</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="mb-3">
                        <div className="text-xs text-slate-400 mb-1">Members ({team.memberIds.length})</div>
                        <div className="flex items-center space-x-1">
                          {members.slice(0, 4).map((member) => (
                            <Avatar key={member.id} className="h-6 w-6">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-xs">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {team.memberIds.length > 4 && (
                            <div className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-300">
                              +{team.memberIds.length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline" className="border-slate-600 text-xs">
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" className="border-slate-600 text-xs">
                          <UserPlus className="h-3 w-3 mr-1" />
                          Add Member
                        </Button>
                        <Button size="sm" variant="outline" className="border-slate-600 text-xs">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Message
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setShowTeamDialog(false)} className="bg-blue-600 hover:bg-blue-700">
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 