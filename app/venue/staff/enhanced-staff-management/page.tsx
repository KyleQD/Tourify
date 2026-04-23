"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useCurrentVenue } from "@/hooks/use-venue"
import { StaffProfileCard } from "@/components/venue/staff/staff-profile-card"
import { StaffProfileForm } from "@/components/venue/staff/staff-profile-form"
import { VenueTeamAccessCard } from "@/components/venue/staff/venue-team-access-card"
import { EnhancedStaffProfilesService, StaffProfileData, CreateStaffProfileData, UpdateStaffProfileData } from "@/lib/services/enhanced-staff-profiles.service"
import {
  Users,
  Plus,
  Search,
  Filter,
  Settings,
  BarChart3,
  Calendar,
  FileText,
  Award,
  Shield,
  Building2,
  Wrench,
  Crown,
  User,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  Bell,
  Star,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Clock,
  DollarSign,
  Target,
  Sparkles,
  Zap,
  Brain,
  Heart,
  FileCheck,
  CalendarDays,
  UserPlus,
  UserCheck,
  UserX,
  Crown as CrownIcon,
  Medal,
  Trophy,
  Gem
} from "lucide-react"

export default function EnhancedStaffManagement() {
  const { toast } = useToast()
  const { venue, loading: venueLoading } = useCurrentVenue()
  const [staff, setStaff] = useState<StaffProfileData[]>([])
  const [filteredStaff, setFilteredStaff] = useState<StaffProfileData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffProfileData | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<StaffProfileData | null>(null)
  const venueId = venue?.id ?? ""

  useEffect(() => {
    if (venueLoading) return
    if (venueId) void loadStaffData()
    else {
      setStaff([])
      setFilteredStaff([])
      setIsLoading(false)
    }
  }, [venueId, venueLoading])

  // Filter staff based on search and filters
  useEffect(() => {
    let filtered = staff

    if (searchQuery) {
      filtered = filtered.filter(member => 
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.first_name && member.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (member.last_name && member.last_name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter(member => member.role_category === roleFilter)
    }

    if (departmentFilter !== "all") {
      filtered = filtered.filter(member => member.department === departmentFilter)
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(member => member.status === statusFilter)
    }

    setFilteredStaff(filtered)
  }, [staff, searchQuery, roleFilter, departmentFilter, statusFilter])

  const loadStaffData = async () => {
    try {
      setIsLoading(true)
      const staffData = await EnhancedStaffProfilesService.getStaffProfiles(venueId)
      setStaff(staffData)
    } catch (error) {
      console.error('Error loading staff data:', error)
      toast({
        title: "Error",
        description: "Failed to load staff data. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateStaff = async (data: CreateStaffProfileData) => {
    try {
      await EnhancedStaffProfilesService.createStaffProfile(data)
      await loadStaffData()
      setIsCreateDialogOpen(false)
      toast({
        title: "Success",
        description: "Staff member created successfully!",
      })
    } catch (error) {
      console.error('Error creating staff:', error)
      toast({
        title: "Error",
        description: "Failed to create staff member. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleUpdateStaff = async (data: UpdateStaffProfileData) => {
    if (!editingStaff) return
    
    try {
      await EnhancedStaffProfilesService.updateStaffProfile(editingStaff.id, data)
      await loadStaffData()
      setEditingStaff(null)
      toast({
        title: "Success",
        description: "Staff profile updated successfully!",
      })
    } catch (error) {
      console.error('Error updating staff:', error)
      toast({
        title: "Error",
        description: "Failed to update staff profile. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleSaveStaff = async (data: CreateStaffProfileData | UpdateStaffProfileData) => {
    if ('venue_id' in data) {
      // This is CreateStaffProfileData
      await handleCreateStaff(data as CreateStaffProfileData)
    } else {
      // This is UpdateStaffProfileData
      await handleUpdateStaff(data as UpdateStaffProfileData)
    }
  }

  const handleDeleteStaff = async (staffId: string) => {
    try {
      await EnhancedStaffProfilesService.deleteStaffProfile(staffId)
      await loadStaffData()
      toast({
        title: "Success",
        description: "Staff member removed successfully!",
      })
    } catch (error) {
      console.error('Error deleting staff:', error)
      toast({
        title: "Error",
        description: "Failed to remove staff member. Please try again.",
        variant: "destructive"
      })
    }
  }

  const getRoleCategoryIcon = (category: string) => {
    switch (category) {
      case 'foh': return Users
      case 'tech': return Settings
      case 'security': return Shield
      case 'bar': return Building2
      case 'kitchen': return Wrench
      case 'management': return Crown
      case 'marketing': return BarChart3
      case 'maintenance': return Wrench
      default: return User
    }
  }

  const getRoleCategoryColor = (category: string) => {
    switch (category) {
      case 'foh': return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
      case 'tech': return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case 'security': return "bg-red-500/20 text-red-400 border-red-500/30"
      case 'bar': return "bg-green-500/20 text-green-400 border-green-500/30"
      case 'kitchen': return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      case 'management': return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      case 'marketing': return "bg-pink-500/20 text-pink-400 border-pink-500/30"
      case 'maintenance': return "bg-gray-500/20 text-gray-400 border-gray-500/30"
      default: return "bg-slate-500/20 text-slate-400 border-slate-500/30"
    }
  }

  const getRoleLevelColor = (level: string) => {
    switch (level) {
      case 'entry': return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case 'mid': return "bg-green-500/20 text-green-400 border-green-500/30"
      case 'senior': return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      case 'manager': return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      case 'director': return "bg-red-500/20 text-red-400 border-red-500/30"
      default: return "bg-slate-500/20 text-slate-400 border-slate-500/30"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return "bg-green-500/20 text-green-400 border-green-500/30"
      case 'inactive': return "bg-gray-500/20 text-gray-400 border-gray-500/30"
      case 'terminated': return "bg-red-500/20 text-red-400 border-red-500/30"
      default: return "bg-slate-500/20 text-slate-400 border-slate-500/30"
    }
  }

  // Calculate statistics
  const totalStaff = staff.length
  const activeStaff = staff.filter(s => s.status === 'active').length
  const availableStaff = staff.filter(s => s.is_available).length
  const avgPerformance = staff.length > 0 
    ? staff.reduce((sum, s) => sum + (s.performance_rating || 0), 0) / staff.length 
    : 0

  const roleCategories = Array.from(new Set(staff.map(s => s.role_category).filter(Boolean)))
  const departments = Array.from(new Set(staff.map(s => s.department).filter(Boolean)))

  if (venueLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading venue…</p>
        </div>
      </div>
    )
  }

  if (!venueId) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-8 text-center text-amber-100">
        <p className="font-medium">No venue found for your account.</p>
        <p className="mt-2 text-sm text-amber-200/90">Create or join a venue to manage staff profiles.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading staff data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-3 text-3xl font-bold text-white">
            <Sparkles className="h-8 w-8 shrink-0 text-blue-400" />
            <span className="break-words">Enhanced Staff Management</span>
          </h1>
          <p className="mt-2 break-words text-gray-400">
            Comprehensive staff profile management with advanced features
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Staff</p>
                <p className="text-2xl font-bold text-white">{totalStaff}</p>
              </div>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Staff</p>
                <p className="text-2xl font-bold text-white">{activeStaff}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Available</p>
                <p className="text-2xl font-bold text-white">{availableStaff}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg Performance</p>
                <p className="text-2xl font-bold text-white">{avgPerformance.toFixed(1)}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800 border-gray-700">
          <TabsTrigger value="overview" className="text-gray-300">Overview</TabsTrigger>
          <TabsTrigger value="profiles" className="text-gray-300">Staff Profiles</TabsTrigger>
          <TabsTrigger value="analytics" className="text-gray-300">Analytics</TabsTrigger>
          <TabsTrigger value="settings" className="text-gray-300">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {venueId ? <VenueTeamAccessCard venueId={venueId} /> : null}
          {/* Search and Filters */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search staff by name, email, or role..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Role Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="all">All Roles</SelectItem>
                      {roleCategories.filter((category) => category !== null).map((category) => (
                        <SelectItem key={category!} value={category!}>
                          {category!.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.filter((dept) => dept !== null).map((dept) => (
                        <SelectItem key={dept!} value={dept!}>
                          {dept!}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Staff Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaff.map((staffMember) => (
              <StaffProfileCard
                key={staffMember.id}
                staff={staffMember}
                onEdit={(staffId) => {
                  const staff = filteredStaff.find(s => s.id === staffId)
                  if (staff) setEditingStaff(staff)
                }}
                onView={(staffId) => {
                  const staff = filteredStaff.find(s => s.id === staffId)
                  if (staff) setSelectedStaff(staff)
                }}
                isAdmin={true}
              />
            ))}
          </div>

          {filteredStaff.length === 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-12 text-center">
                <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No staff members found</h3>
                <p className="text-gray-400 mb-4">
                  {searchQuery || roleFilter !== "all" || departmentFilter !== "all" || statusFilter !== "all"
                    ? "Try adjusting your search criteria or filters."
                    : "Get started by adding your first staff member."
                  }
                </p>
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Staff Member
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Staff Profiles Tab */}
        <TabsContent value="profiles" className="space-y-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Detailed Staff Profiles</span>
              </CardTitle>
              <CardDescription className="text-gray-400">
                Comprehensive view of all staff profiles with detailed information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staff.map((staffMember) => (
                  <StaffProfileCard
                    key={staffMember.id}
                    staff={staffMember}
                    onEdit={(staffId) => {
                      const staff = filteredStaff.find(s => s.id === staffId)
                      if (staff) setEditingStaff(staff)
                    }}
                    onView={(staffId) => {
                      const staff = filteredStaff.find(s => s.id === staffId)
                      if (staff) setSelectedStaff(staff)
                    }}
                    isAdmin={true}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Overview */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Performance Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {staff.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {member.first_name?.[0]}{member.last_name?.[0] || member.name?.[0]}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {member.first_name && member.last_name 
                              ? `${member.first_name} ${member.last_name}`
                              : member.name
                            }
                          </p>
                          <p className="text-gray-400 text-sm">{member.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">
                          {member.performance_rating ? member.performance_rating.toFixed(1) : "N/A"}
                        </div>
                        <div className="text-gray-400 text-sm">Rating</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Role Distribution */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Role Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {roleCategories.map((category) => {
                    const count = staff.filter(s => s.role_category === category).length
                    const percentage = (count / totalStaff) * 100
                    const Icon = getRoleCategoryIcon(category || 'other')
                    
                    return (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Icon className="h-5 w-5 text-gray-400" />
                          <span className="text-white capitalize">{(category || 'other').replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-32 bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-white font-medium">{count}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Staff Management Settings</span>
              </CardTitle>
              <CardDescription className="text-gray-400">
                Configure staff management preferences and defaults
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-white font-medium">Default Settings</h4>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-gray-300">Default Role Level</Label>
                      <Select defaultValue="entry">
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="entry">Entry Level</SelectItem>
                          <SelectItem value="mid">Mid Level</SelectItem>
                          <SelectItem value="senior">Senior</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="director">Director</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-300">Default Employment Type</Label>
                      <Select defaultValue="full_time">
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="full_time">Full Time</SelectItem>
                          <SelectItem value="part_time">Part Time</SelectItem>
                          <SelectItem value="contractor">Contractor</SelectItem>
                          <SelectItem value="volunteer">Volunteer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-white font-medium">Notifications</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" id="expiring_certs" className="rounded border-gray-600" />
                      <Label htmlFor="expiring_certs" className="text-gray-300">
                        Expiring certifications alerts
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" id="performance_reviews" className="rounded border-gray-600" />
                      <Label htmlFor="performance_reviews" className="text-gray-300">
                        Performance review reminders
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" id="time_off_requests" className="rounded border-gray-600" />
                      <Label htmlFor="time_off_requests" className="text-gray-300">
                        Time off request notifications
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Staff Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">
              Add New Staff Member
            </DialogTitle>
          </DialogHeader>
          <StaffProfileForm
            venueId={venueId}
            onSave={handleSaveStaff}
            onCancel={() => setIsCreateDialogOpen(false)}
            isEditing={false}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      {editingStaff && (
        <Dialog open={!!editingStaff} onOpenChange={() => setEditingStaff(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-900 border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-white text-xl font-bold">
                Edit Staff Profile: {editingStaff.first_name && editingStaff.last_name 
                  ? `${editingStaff.first_name} ${editingStaff.last_name}`
                  : editingStaff.name
                }
              </DialogTitle>
            </DialogHeader>
            <StaffProfileForm
              venueId={venueId}
              staff={editingStaff}
              onSave={handleUpdateStaff}
              onCancel={() => setEditingStaff(null)}
              isEditing={true}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
} 