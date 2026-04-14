"use client"

import { useState, useEffect } from "react"
import { 
  Building, 
  Plane, 
  Truck, 
  Users, 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  Download, 
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  UserPlus,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  FileText,
  Loader2,
  ChevronDown,
  ChevronRight,
  Star,
  Zap,
  Target,
  TrendingUp,
  Users2,
  Bus,
  Car,
  Train,
  Ship,
  Wifi,
  Coffee,
  Utensils,
  Bed,
  Droplets,
  Tv,
  AirVent,
  Snowflake,
  Sun,
  Moon,
  Crown,
  Camera,
  Shield
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { useTravelCoordination } from "@/hooks/use-travel-coordination"
import { useLodgingBookings } from "@/hooks/use-lodging"
import type { 
  TravelGroup, 
  TravelGroupMember,
  FlightCoordination,
  GroundTransportationCoordination,
  TravelCoordinationAnalytics
} from "@/hooks/use-travel-coordination"

interface TravelCoordinationHubProps {
  eventId?: string
  tourId?: string
}

export function TravelCoordinationHub({ eventId, tourId }: TravelCoordinationHubProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("overview")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [groupTypeFilter, setGroupTypeFilter] = useState<string>("all")
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false)
  const [isAddMembersDialogOpen, setIsAddMembersDialogOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<TravelGroup | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Fetch data
  const { 
    groups, 
    groupMembers,
    flights,
    transportation,
    analytics,
    groupsLoading,
    fetchGroups, 
    fetchGroupMembers,
    fetchFlights,
    fetchTransportation,
    fetchAnalytics,
    createTravelGroup, 
    updateTravelGroup, 
    deleteTravelGroup,
    bulkCreateGroupMembers,
    autoCoordinateGroup
  } = useTravelCoordination()

  // Fetch lodging data for integration
  const { bookings: lodgingBookings, loading: lodgingBookingsLoading } = useLodgingBookings()

  // Form states
  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    group_type: "crew" as const,
    department: "",
    priority_level: 3,
    arrival_date: "",
    departure_date: "",
    arrival_location: "",
    departure_location: "",
    group_leader_id: "",
    backup_contact_id: "",
    special_requirements: [] as string[],
    dietary_restrictions: [] as string[],
    accessibility_needs: [] as string[]
  })

  const [bulkMembersForm, setBulkMembersForm] = useState({
    group_id: "",
    members: [] as Array<{
      name: string
      email: string
      phone: string
      role: string
      seat_preference: string
      meal_preference: string
      special_assistance: boolean
      wheelchair_required: boolean
    }>
  })

  // Filtered data
  const filteredGroups = groups?.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         group.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         group.department?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || group.status === statusFilter
    const matchesType = groupTypeFilter === "all" || group.group_type === groupTypeFilter
    return matchesSearch && matchesStatus && matchesType
  }) || []

  // Load data
  useEffect(() => {
    fetchGroups({ event_id: eventId, tour_id: tourId })
    fetchGroupMembers()
    fetchFlights({ event_id: eventId, tour_id: tourId })
    fetchTransportation({ event_id: eventId, tour_id: tourId })
    fetchAnalytics()
  }, [eventId, tourId, fetchGroups, fetchGroupMembers, fetchFlights, fetchTransportation, fetchAnalytics])

  // Handle form submission
  const handleCreateGroup = async () => {
    try {
      await createTravelGroup({
        ...groupForm,
        event_id: eventId,
        tour_id: tourId
      })
      setIsCreateGroupDialogOpen(false)
      setGroupForm({
        name: "",
        description: "",
        group_type: "crew",
        department: "",
        priority_level: 3,
        arrival_date: "",
        departure_date: "",
        arrival_location: "",
        departure_location: "",
        group_leader_id: "",
        backup_contact_id: "",
        special_requirements: [],
        dietary_restrictions: [],
        accessibility_needs: []
      })
    } catch (error) {
      console.error("Error creating group:", error)
    }
  }

  const handleBulkAddMembers = async () => {
    if (!bulkMembersForm.group_id || bulkMembersForm.members.length === 0) {
      toast({
        title: "Error",
        description: "Please select a group and add at least one member",
        variant: "destructive"
      })
      return
    }

    try {
      await bulkCreateGroupMembers(bulkMembersForm.group_id, bulkMembersForm.members)
      setIsAddMembersDialogOpen(false)
      setBulkMembersForm({
        group_id: "",
        members: []
      })
    } catch (error) {
      console.error("Error adding members:", error)
    }
  }

  const handleAutoCoordinate = async (groupId: string) => {
    try {
      await autoCoordinateGroup(groupId)
      toast({
        title: "Success",
        description: "Group auto-coordinated successfully! Flights, hotels, and transportation have been arranged.",
        variant: "default"
      })
    } catch (error) {
      console.error("Error auto-coordinating group:", error)
    }
  }

  const toggleGroupExpansion = (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      planning: { color: "bg-gray-500/20 text-gray-500 border-gray-500/20", label: "Planning" },
      confirmed: { color: "bg-green-500/20 text-green-500 border-green-500/20", label: "Confirmed" },
      in_transit: { color: "bg-blue-500/20 text-blue-500 border-blue-500/20", label: "In Transit" },
      arrived: { color: "bg-purple-500/20 text-purple-500 border-purple-500/20", label: "Arrived" },
      departed: { color: "bg-orange-500/20 text-orange-500 border-orange-500/20", label: "Departed" },
      cancelled: { color: "bg-red-500/20 text-red-500 border-red-500/20", label: "Cancelled" }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.planning
    return <Badge className={`${config.color} border`}>{config.label}</Badge>
  }

  const getCoordinationStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/20", label: "Pending" },
      flights_booked: { color: "bg-blue-500/20 text-blue-500 border-blue-500/20", label: "Flights Booked" },
      hotels_booked: { color: "bg-green-500/20 text-green-500 border-green-500/20", label: "Hotels Booked" },
      transport_arranged: { color: "bg-purple-500/20 text-purple-500 border-purple-500/20", label: "Transport Arranged" },
      complete: { color: "bg-emerald-500/20 text-emerald-500 border-emerald-500/20", label: "Complete" }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return <Badge className={`${config.color} border`}>{config.label}</Badge>
  }

  const getGroupTypeIcon = (type: string) => {
    const iconConfig = {
      crew: Users,
      artists: Star,
      staff: Users2,
      vendors: Truck,
      guests: Users,
      vip: Crown,
      media: Camera,
      security: Shield,
      catering: Utensils,
      technical: Zap,
      management: Target
    }
    
    const Icon = iconConfig[type as keyof typeof iconConfig] || Users
    return <Icon className="h-4 w-4" />
  }

  const getPriorityColor = (level: number) => {
    const colors = {
      1: "text-red-500 bg-red-500/10",
      2: "text-orange-500 bg-orange-500/10", 
      3: "text-yellow-500 bg-yellow-500/10",
      4: "text-blue-500 bg-blue-500/10",
      5: "text-gray-500 bg-gray-500/10"
    }
    return colors[level as keyof typeof colors] || colors[3]
  }

  const getTransportIcon = (type: string) => {
    const iconConfig = {
      shuttle_bus: Bus,
      limo: Car,
      van: Truck,
      car: Car,
      train: Train,
      subway: Train,
      walking: Users
    }
    
    const Icon = iconConfig[type as keyof typeof iconConfig] || Truck
    return <Icon className="h-4 w-4" />
  }

  // Calculate coordination metrics
  const coordinationMetrics = {
    totalGroups: groups?.length || 0,
    totalTravelers: groups?.reduce((sum, group) => sum + group.total_members, 0) || 0,
    confirmedTravelers: groups?.reduce((sum, group) => sum + group.confirmed_members, 0) || 0,
    fullyCoordinated: groups?.filter(g => g.coordination_status === 'complete').length || 0,
    pendingCoordination: groups?.filter(g => g.coordination_status === 'pending').length || 0,
    totalFlights: flights?.length || 0,
    totalTransport: transportation?.length || 0,
    totalHotelBookings: lodgingBookings?.length || 0
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Travel Coordination Hub</h2>
          <p className="text-slate-400">Manage 100+ people across flights, hotels, and transportation</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Dialog open={isCreateGroupDialogOpen} onOpenChange={setIsCreateGroupDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Travel Group
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Travel Group</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Group Name</Label>
                  <Input 
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({...groupForm, name: e.target.value})}
                    placeholder="e.g., Main Stage Crew"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Group Type</Label>
                  <Select value={groupForm.group_type} onValueChange={(value: any) => setGroupForm({...groupForm, group_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="crew">Crew</SelectItem>
                      <SelectItem value="artists">Artists</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="vendors">Vendors</SelectItem>
                      <SelectItem value="guests">Guests</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="catering">Catering</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input 
                    value={groupForm.department}
                    onChange={(e) => setGroupForm({...groupForm, department: e.target.value})}
                    placeholder="e.g., Technical, Operations"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority Level</Label>
                  <Select value={groupForm.priority_level.toString()} onValueChange={(value) => setGroupForm({...groupForm, priority_level: parseInt(value)})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Critical</SelectItem>
                      <SelectItem value="2">2 - High</SelectItem>
                      <SelectItem value="3">3 - Medium</SelectItem>
                      <SelectItem value="4">4 - Low</SelectItem>
                      <SelectItem value="5">5 - Optional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Arrival Date</Label>
                  <Input 
                    type="date"
                    value={groupForm.arrival_date}
                    onChange={(e) => setGroupForm({...groupForm, arrival_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Departure Date</Label>
                  <Input 
                    type="date"
                    value={groupForm.departure_date}
                    onChange={(e) => setGroupForm({...groupForm, departure_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Arrival Location</Label>
                  <Input 
                    value={groupForm.arrival_location}
                    onChange={(e) => setGroupForm({...groupForm, arrival_location: e.target.value})}
                    placeholder="e.g., JFK Airport"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Departure Location</Label>
                  <Input 
                    value={groupForm.departure_location}
                    onChange={(e) => setGroupForm({...groupForm, departure_location: e.target.value})}
                    placeholder="e.g., LAX Airport"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    value={groupForm.description}
                    onChange={(e) => setGroupForm({...groupForm, description: e.target.value})}
                    placeholder="Describe the group's purpose and requirements..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateGroupDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateGroup}>
                  Create Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Coordination Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Groups</p>
                <p className="text-2xl font-bold text-slate-100">{coordinationMetrics.totalGroups}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Travelers</p>
                <p className="text-2xl font-bold text-slate-100">{coordinationMetrics.totalTravelers}</p>
                <p className="text-xs text-green-500">{coordinationMetrics.confirmedTravelers} confirmed</p>
              </div>
              <Users2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Fully Coordinated</p>
                <p className="text-2xl font-bold text-slate-100">{coordinationMetrics.fullyCoordinated}</p>
                <p className="text-xs text-yellow-500">{coordinationMetrics.pendingCoordination} pending</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Bookings</p>
                <p className="text-2xl font-bold text-slate-100">
                  {coordinationMetrics.totalFlights + coordinationMetrics.totalTransport + coordinationMetrics.totalHotelBookings}
                </p>
                <p className="text-xs text-blue-500">
                  {coordinationMetrics.totalFlights} flights, {coordinationMetrics.totalTransport} transport, {coordinationMetrics.totalHotelBookings} hotels
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search groups, members, or locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="arrived">Arrived</SelectItem>
            <SelectItem value="departed">Departed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={groupTypeFilter} onValueChange={setGroupTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="crew">Crew</SelectItem>
            <SelectItem value="artists">Artists</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="vendors">Vendors</SelectItem>
            <SelectItem value="guests">Guests</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
            <SelectItem value="media">Media</SelectItem>
            <SelectItem value="security">Security</SelectItem>
            <SelectItem value="catering">Catering</SelectItem>
            <SelectItem value="technical">Technical</SelectItem>
            <SelectItem value="management">Management</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="groups">Travel Groups</TabsTrigger>
          <TabsTrigger value="coordination">Coordination</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Group Summary */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-slate-100">Travel Groups Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {groupsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredGroups.slice(0, 5).map((group) => (
                      <div key={group.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getGroupTypeIcon(group.group_type)}
                          <div>
                            <p className="font-medium text-slate-100">{group.name}</p>
                            <p className="text-sm text-slate-400">{group.total_members} members</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(group.status)}
                          {getCoordinationStatusBadge(group.coordination_status)}
                        </div>
                      </div>
                    ))}
                    {filteredGroups.length > 5 && (
                      <Button variant="outline" className="w-full">
                        View All {filteredGroups.length} Groups
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-slate-100">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-sm text-slate-100">Main Stage Crew arrived at JFK</p>
                      <p className="text-xs text-slate-400">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-sm text-slate-100">VIP Guests flight confirmed</p>
                      <p className="text-xs text-slate-400">4 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div>
                      <p className="text-sm text-slate-100">Media Team transport arranged</p>
                      <p className="text-xs text-slate-400">6 hours ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Travel Groups Tab */}
        <TabsContent value="groups" className="space-y-4">
          {groupsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGroups.map((group) => (
                <Card key={group.id} className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <button
                            onClick={() => toggleGroupExpansion(group.id)}
                            className="p-1 hover:bg-slate-700 rounded"
                          >
                            {expandedGroups.has(group.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          {getGroupTypeIcon(group.group_type)}
                          <div>
                            <h3 className="font-semibold text-slate-100">{group.name}</h3>
                            <p className="text-sm text-slate-400">{group.description}</p>
                          </div>
                          <Badge className={getPriorityColor(group.priority_level)}>
                            Priority {group.priority_level}
                          </Badge>
                          {getStatusBadge(group.status)}
                          {getCoordinationStatusBadge(group.coordination_status)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-400 mb-3">
                          <div>
                            <span className="font-medium">Members:</span> {group.total_members} ({group.confirmed_members} confirmed)
                          </div>
                          <div>
                            <span className="font-medium">Arrival:</span> {group.arrival_date}
                          </div>
                          <div>
                            <span className="font-medium">Departure:</span> {group.departure_date}
                          </div>
                          <div>
                            <span className="font-medium">Location:</span> {group.arrival_location}
                          </div>
                        </div>

                        {expandedGroups.has(group.id) && (
                          <div className="mt-4 space-y-4">
                            {/* Group Members */}
                            <div>
                              <h4 className="font-medium text-slate-100 mb-2">Group Members</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {groupMembers
                                  ?.filter(member => member.group_id === group.id)
                                  .map((member) => (
                                    <div key={member.id} className="flex items-center justify-between p-2 bg-slate-800/30 rounded">
                                      <div>
                                        <p className="text-sm font-medium text-slate-100">{member.member_name}</p>
                                        <p className="text-xs text-slate-400">{member.member_role}</p>
                                      </div>
                                      <Badge variant="outline" className="text-xs">
                                        {member.status}
                                      </Badge>
                                    </div>
                                  ))}
                              </div>
                            </div>

                            {/* Coordination Progress */}
                            <div>
                              <h4 className="font-medium text-slate-100 mb-2">Coordination Progress</h4>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-slate-400">Flights</span>
                                  <Badge variant="outline" className="text-xs">
                                    {flights?.filter(f => f.group_id === group.id).length || 0} booked
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-slate-400">Transportation</span>
                                  <Badge variant="outline" className="text-xs">
                                    {transportation?.filter(t => t.group_id === group.id).length || 0} arranged
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-slate-400">Hotel Rooms</span>
                                  <Badge variant="outline" className="text-xs">
                                    {lodgingBookings?.filter(b => b.event_id === group.event_id || b.tour_id === group.tour_id).length || 0} booked
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {group.coordination_status !== 'complete' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAutoCoordinate(group.id)}
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Auto-Coordinate
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedGroup(group)
                            setIsAddMembersDialogOpen(true)
                          }}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedGroup(group)
                            // Open edit dialog
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteTravelGroup(group.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Coordination Tab */}
        <TabsContent value="coordination" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Flights */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  Flight Coordination
                </CardTitle>
              </CardHeader>
              <CardContent>
                {groupsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {flights?.slice(0, 5).map((flight) => (
                      <div key={flight.id} className="p-3 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-slate-100">{flight.flight_number}</p>
                          <Badge variant="outline" className="text-xs">
                            {flight.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400">{flight.airline}</p>
                        <p className="text-sm text-slate-400">
                          {flight.departure_airport} → {flight.arrival_airport}
                        </p>
                        <p className="text-xs text-slate-500">
                          {flight.booked_seats}/{flight.total_seats} seats booked
                        </p>
                      </div>
                    ))}
                    {flights && flights.length > 5 && (
                      <Button variant="outline" className="w-full">
                        View All {flights.length} Flights
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transportation */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Ground Transportation
                </CardTitle>
              </CardHeader>
              <CardContent>
                {groupsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transportation?.slice(0, 5).map((transport) => (
                      <div key={transport.id} className="p-3 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getTransportIcon(transport.transport_type)}
                            <p className="font-medium text-slate-100">{transport.provider_name}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {transport.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400">
                          {transport.pickup_location} → {transport.dropoff_location}
                        </p>
                        <p className="text-xs text-slate-500">
                          {transport.assigned_passengers}/{transport.vehicle_capacity} passengers
                        </p>
                      </div>
                    ))}
                    {transportation && transportation.length > 5 && (
                      <Button variant="outline" className="w-full">
                        View All {transportation.length} Transport
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hotels */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Hotel Accommodations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lodgingBookingsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {lodgingBookings?.slice(0, 5).map((booking) => (
                      <div key={booking.id} className="p-3 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-slate-100">
                            {booking.lodging_providers?.name || 'Unknown Hotel'}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {booking.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400">{booking.primary_guest_name}</p>
                        <p className="text-sm text-slate-400">
                          {booking.check_in_date} - {booking.check_out_date}
                        </p>
                        <p className="text-xs text-slate-500">
                          {booking.rooms_booked} rooms, {booking.total_guests} guests
                        </p>
                      </div>
                    ))}
                    {lodgingBookings && lodgingBookings.length > 5 && (
                      <Button variant="outline" className="w-full">
                        View All {lodgingBookings.length} Bookings
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-slate-100">Travel Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const timelineEvents: Array<{ id: string; time: string; title: string; type: string; status: string }> = []

                flights?.forEach(f => {
                  timelineEvents.push({
                    id: `flight-${f.id}`,
                    time: f.departure_time,
                    title: `${f.airline} ${f.flight_number}: ${f.departure_airport} → ${f.arrival_airport}`,
                    type: 'flight',
                    status: f.status
                  })
                })

                transportation?.forEach(t => {
                  timelineEvents.push({
                    id: `transport-${t.id}`,
                    time: t.pickup_time,
                    title: `${t.transport_type}: ${t.pickup_location} → ${t.dropoff_location}`,
                    type: 'transport',
                    status: t.status
                  })
                })

                groups?.forEach(g => {
                  if (g.arrival_date) {
                    timelineEvents.push({
                      id: `arrival-${g.id}`,
                      time: g.arrival_date,
                      title: `${g.name} arrival (${g.total_members} members)`,
                      type: 'arrival',
                      status: g.status
                    })
                  }
                  if (g.departure_date) {
                    timelineEvents.push({
                      id: `departure-${g.id}`,
                      time: g.departure_date,
                      title: `${g.name} departure`,
                      type: 'departure',
                      status: g.status
                    })
                  }
                })

                timelineEvents.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

                if (timelineEvents.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-400">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No timeline events yet</p>
                      <p className="text-sm">Add travel groups, flights, or transport to see the timeline</p>
                    </div>
                  )
                }

                return (
                  <div className="relative pl-8 space-y-4">
                    <div className="absolute top-0 bottom-0 left-3.5 w-px bg-slate-700" />
                    {timelineEvents.map(evt => {
                      const typeColors: Record<string, string> = {
                        flight: 'bg-blue-500',
                        transport: 'bg-green-500',
                        arrival: 'bg-purple-500',
                        departure: 'bg-orange-500'
                      }
                      const dotColor = typeColors[evt.type] || 'bg-slate-500'

                      return (
                        <div key={evt.id} className="relative">
                          <div className={`absolute -left-8 mt-1.5 h-4 w-4 rounded-full border-2 border-slate-900 ${dotColor}`} />
                          <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                            <span className="text-xs text-slate-500 sm:w-32 shrink-0">
                              {new Date(evt.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-slate-200">{evt.title}</p>
                              {getStatusBadge(evt.status)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Members Dialog */}
      <Dialog open={isAddMembersDialogOpen} onOpenChange={setIsAddMembersDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Members to {selectedGroup?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Group</Label>
              <Select value={bulkMembersForm.group_id} onValueChange={(value) => setBulkMembersForm({...bulkMembersForm, group_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {groups?.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Add Members (one per line)</Label>
              <Textarea 
                placeholder="John Smith, john@example.com, +1234567890, Sound Engineer
Sarah Johnson, sarah@example.com, +1234567891, Lighting Tech
Mike Wilson, mike@example.com, +1234567892, Stage Manager"
                rows={6}
                onChange={(e) => {
                  const lines = e.target.value.split('\n').filter(line => line.trim())
                  const members = lines.map(line => {
                    const [name, email, phone, role] = line.split(',').map(s => s.trim())
                    return {
                      name: name || '',
                      email: email || '',
                      phone: phone || '',
                      role: role || '',
                      seat_preference: '',
                      meal_preference: '',
                      special_assistance: false,
                      wheelchair_required: false
                    }
                  })
                  setBulkMembersForm({...bulkMembersForm, members})
                }}
              />
              <p className="text-xs text-slate-400">
                Format: Name, Email, Phone, Role (one per line)
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddMembersDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAddMembers}>
              Add {bulkMembersForm.members.length} Members
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 