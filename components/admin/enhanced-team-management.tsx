"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { 
  Search,
  Filter,
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Download,
  Send,
  MessageSquare,
  FileText,
  Shield,
  Award,
  AlertTriangle,
  CheckSquare,
  Square,
  Users,
  Calendar,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Download as DownloadIcon,
  Upload,
  Send as SendIcon,
  MessageSquare as MessageSquareIcon,
  FileText as FileTextIcon,
  Shield as ShieldIcon,
  Award as AwardIcon,
  AlertTriangle as AlertTriangleIcon,
  CheckSquare as CheckSquareIcon,
  Square as SquareIcon,
  Users as UsersIcon,
  Calendar as CalendarIcon,
  MapPin as MapPinIcon,
  Phone as PhoneIcon,
  Mail as MailIcon,
  ExternalLink as ExternalLinkIcon,
  Plus,
  Edit,
  Trash2,
  Settings,
  BarChart3,
  TrendingUp,
  Activity,
  Target,
  Zap,
  Crown,
  UserCheck,
  UserPlus,
  Building,
  Globe,
  RadioTower,
  Wifi,
  Mic,
  Video,
  PhoneCall,
  X,
  RotateCcw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  Building as BuildingIcon,
  Globe as GlobeIcon,
  RadioTower as RadioTowerIcon,
  Wifi as WifiIcon,
  Mic as MicIcon,
  Video as VideoIcon,
  PhoneCall as PhoneCallIcon,
  X as XIcon,
  RotateCcw as RotateCcwIcon,
  Play as PlayIcon,
  Pause as PauseIcon,
  Volume2 as Volume2Icon,
  VolumeX as VolumeXIcon,
  Sparkles as SparklesIcon
} from 'lucide-react'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'
import type { StaffMember, OnboardingCandidate, TeamCommunication } from '@/types/admin-onboarding'

interface EnhancedTeamManagementProps {
  staffMembers: StaffMember[]
  onboardingCandidates: OnboardingCandidate[]
  communications: TeamCommunication[]
  onUpdateStaffStatus: (staffId: string, status: string) => Promise<void>
  onAssignShift: (staffId: string, shiftData: any) => Promise<void>
  onAssignZone: (staffId: string, zoneData: any) => Promise<void>
  onSendMessage: (recipients: string[], message: string, messageType: string) => Promise<void>
  onExportTeamData: (staffMembers: StaffMember[]) => Promise<void>
  venueId: string
}

interface TeamFilters {
  status: string
  department: string
  shift: string
  zone: string
  certification: string
  searchQuery: string
}

interface ShiftData {
  id: string
  name: string
  start_time: string
  end_time: string
  date: string
  staff_assigned: string[]
  max_staff: number
}

interface ZoneData {
  id: string
  name: string
  description: string
  staff_assigned: string[]
  max_staff: number
  priority: 'low' | 'medium' | 'high'
}

interface PerformanceMetrics {
  staffId: string
  attendance_rate: number
  performance_rating: number
  incidents: number
  commendations: number
  training_completed: number
  certifications_valid: number
}

export default function EnhancedTeamManagement({
  staffMembers,
  onboardingCandidates,
  communications,
  onUpdateStaffStatus,
  onAssignShift,
  onAssignZone,
  onSendMessage,
  onExportTeamData,
  venueId
}: EnhancedTeamManagementProps) {
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>(staffMembers)
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])
  const [filters, setFilters] = useState<TeamFilters>({
    status: 'all',
    department: 'all',
    shift: 'all',
    zone: 'all',
    certification: 'all',
    searchQuery: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedStaffMember, setSelectedStaffMember] = useState<StaffMember | null>(null)
  const [showStaffDetail, setShowStaffDetail] = useState(false)
  const [showShiftAssignment, setShowShiftAssignment] = useState(false)
  const [showZoneAssignment, setShowZoneAssignment] = useState(false)
  const [showMessageDialog, setShowMessageDialog] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [messageType, setMessageType] = useState<string>('general')
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics[]>([])
  const [shifts, setShifts] = useState<ShiftData[]>([])
  const [zones, setZones] = useState<ZoneData[]>([])
  const { toast } = useToast()

  // Initialize sample data
  useEffect(() => {
    // Sample shifts
    const sampleShifts: ShiftData[] = [
      {
        id: '1',
        name: 'Morning Shift',
        start_time: '06:00',
        end_time: '14:00',
        date: '2024-01-15',
        staff_assigned: [],
        max_staff: 20
      },
      {
        id: '2',
        name: 'Afternoon Shift',
        start_time: '14:00',
        end_time: '22:00',
        date: '2024-01-15',
        staff_assigned: [],
        max_staff: 25
      },
      {
        id: '3',
        name: 'Night Shift',
        start_time: '22:00',
        end_time: '06:00',
        date: '2024-01-15',
        staff_assigned: [],
        max_staff: 15
      }
    ]

    // Sample zones
    const sampleZones: ZoneData[] = [
      {
        id: '1',
        name: 'Main Entrance',
        description: 'Primary entry point security and crowd control',
        staff_assigned: [],
        max_staff: 8,
        priority: 'high'
      },
      {
        id: '2',
        name: 'VIP Section',
        description: 'Exclusive area security and service',
        staff_assigned: [],
        max_staff: 6,
        priority: 'high'
      },
      {
        id: '3',
        name: 'General Floor',
        description: 'General crowd management and safety',
        staff_assigned: [],
        max_staff: 12,
        priority: 'medium'
      },
      {
        id: '4',
        name: 'Backstage',
        description: 'Artist and crew area security',
        staff_assigned: [],
        max_staff: 4,
        priority: 'high'
      }
    ]

    setShifts(sampleShifts)
    setZones(sampleZones)

    // Sample performance metrics
    const sampleMetrics: PerformanceMetrics[] = staffMembers.map(staff => ({
      staffId: staff.id,
      attendance_rate: Math.floor(Math.random() * 30) + 70, // 70-100%
      performance_rating: Math.floor(Math.random() * 3) + 3, // 3-5 stars
      incidents: Math.floor(Math.random() * 5),
      commendations: Math.floor(Math.random() * 10),
      training_completed: Math.floor(Math.random() * 5) + 1,
      certifications_valid: Math.floor(Math.random() * 3) + 1
    }))

    setPerformanceMetrics(sampleMetrics)
  }, [staffMembers])

  // Filter staff based on current filters
  useEffect(() => {
    let filtered = staffMembers

    if (filters.status !== 'all') {
      filtered = filtered.filter(staff => staff.status === filters.status)
    }

    if (filters.department !== 'all') {
      filtered = filtered.filter(staff => staff.department === filters.department)
    }

    if (filters.shift !== 'all') {
      const shift = shifts.find(s => s.id === filters.shift)
      if (shift) {
        filtered = filtered.filter(staff => shift.staff_assigned.includes(staff.id))
      }
    }

    if (filters.zone !== 'all') {
      const zone = zones.find(z => z.id === filters.zone)
      if (zone) {
        filtered = filtered.filter(staff => zone.staff_assigned.includes(staff.id))
      }
    }

    if (filters.certification !== 'all') {
      filtered = filtered.filter(staff => 
        staff.permissions && staff.permissions[filters.certification]
      )
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      filtered = filtered.filter(staff => 
        staff.name.toLowerCase().includes(query) ||
        staff.email.toLowerCase().includes(query) ||
        staff.role.toLowerCase().includes(query)
      )
    }

    setFilteredStaff(filtered)
  }, [staffMembers, filters, shifts, zones])

  const handleAssignShift = async (staffId: string, shiftId: string) => {
    try {
      const shift = shifts.find(s => s.id === shiftId)
      if (shift) {
        await onAssignShift(staffId, shift)
        toast({
          title: "Shift Assigned",
          description: "Staff member has been assigned to the shift.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign shift. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAssignZone = async (staffId: string, zoneId: string) => {
    try {
      const zone = zones.find(z => z.id === zoneId)
      if (zone) {
        await onAssignZone(staffId, zone)
        toast({
          title: "Zone Assigned",
          description: "Staff member has been assigned to the zone.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign zone. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSendMessage = async () => {
    try {
      await onSendMessage(selectedRecipients, messageText, messageType)
      setShowMessageDialog(false)
      setMessageText('')
      setSelectedRecipients([])
      toast({
        title: "Message Sent",
        description: "Message has been sent to the selected staff members.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleExport = async () => {
    try {
      await onExportTeamData(filteredStaff)
      toast({
        title: "Export Complete",
        description: "Team data has been exported successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export team data. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      active: { label: 'Active', variant: 'default' as const, color: 'bg-green-500' },
      inactive: { label: 'Inactive', variant: 'secondary' as const, color: 'bg-gray-500' },
      on_leave: { label: 'On Leave', variant: 'outline' as const, color: 'bg-yellow-500' },
      terminated: { label: 'Terminated', variant: 'destructive' as const, color: 'bg-red-500' }
    }

    const statusConfig = config[status as keyof typeof config] || config.active
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
  }

  const getPerformanceRating = (staffId: string) => {
    const metrics = performanceMetrics.find(m => m.staffId === staffId)
    if (!metrics) return null

    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${i < metrics.performance_rating ? 'text-yellow-400 fill-current' : 'text-gray-400'}`}
          />
        ))}
        <span className="text-xs text-slate-400 ml-1">({metrics.performance_rating})</span>
      </div>
    )
  }

  const getAttendanceRate = (staffId: string) => {
    const metrics = performanceMetrics.find(m => m.staffId === staffId)
    if (!metrics) return null

    return (
      <div className="flex items-center gap-2">
        <Progress value={metrics.attendance_rate} className="w-16 h-2" />
        <span className="text-xs text-slate-400">{metrics.attendance_rate}%</span>
      </div>
    )
  }

  const departments = [...new Set(staffMembers.map(staff => staff.department))]

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Team Management</h2>
          <p className="text-slate-400">
            {filteredStaff.length} staff members • {onboardingCandidates.length} onboarding
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowMessageDialog(true)}
            variant="outline"
            className="bg-slate-700 border-slate-600"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Send Message
          </Button>
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className="bg-slate-700 border-slate-600"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            className="bg-slate-700 border-slate-600"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Team Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Active Staff</p>
                <p className="text-2xl font-bold text-white">
                  {staffMembers.filter(s => s.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">On Shift</p>
                <p className="text-2xl font-bold text-white">
                  {shifts.reduce((total, shift) => total + shift.staff_assigned.length, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600 rounded-lg">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Zones Covered</p>
                <p className="text-2xl font-bold text-white">
                  {zones.filter(z => z.staff_assigned.length > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-600 rounded-lg">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Onboarding</p>
                <p className="text-2xl font-bold text-white">
                  {onboardingCandidates.filter(c => c.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-white text-sm">Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white text-sm">Department</Label>
                <Select value={filters.department} onValueChange={(value) => setFilters({...filters, department: value})}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.filter(Boolean).map(dept => (
                      <SelectItem key={dept!} value={dept!}>{dept!}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white text-sm">Shift</Label>
                <Select value={filters.shift} onValueChange={(value) => setFilters({...filters, shift: value})}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shifts</SelectItem>
                    {shifts.map(shift => (
                      <SelectItem key={shift.id} value={shift.id}>{shift.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white text-sm">Zone</Label>
                <Select value={filters.zone} onValueChange={(value) => setFilters({...filters, zone: value})}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Zones</SelectItem>
                    {zones.map(zone => (
                      <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white text-sm">Certification</Label>
                <Select value={filters.certification} onValueChange={(value) => setFilters({...filters, certification: value})}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Certifications</SelectItem>
                    <SelectItem value="security_license">Security License</SelectItem>
                    <SelectItem value="first_aid">First Aid/CPR</SelectItem>
                    <SelectItem value="alcohol_license">Alcohol License</SelectItem>
                    <SelectItem value="food_handler">Food Handler</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white text-sm">Search</Label>
                <Input
                  placeholder="Search staff members..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters({...filters, searchQuery: e.target.value})}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff List */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-white">Staff Members</CardTitle>
            {selectedStaff.length > 0 && (
              <Button
                onClick={() => setShowMessageDialog(true)}
                variant="outline"
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Selected ({selectedStaff.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredStaff.map((staff) => {
              const isSelected = selectedStaff.includes(staff.id)
              const metrics = performanceMetrics.find(m => m.staffId === staff.id)
              const assignedShifts = shifts.filter(s => s.staff_assigned.includes(staff.id))
              const assignedZones = zones.filter(z => z.staff_assigned.includes(staff.id))

              return (
                <div
                  key={staff.id}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-purple-500 bg-purple-900/20' 
                      : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                  }`}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedStaff(selectedStaff.filter(id => id !== staff.id))
                    } else {
                      setSelectedStaff([...selectedStaff, staff.id])
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            setSelectedStaff(selectedStaff.filter(id => id !== staff.id))
                          } else {
                            setSelectedStaff([...selectedStaff, staff.id])
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-purple-600 text-white">
                          {staff.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-white">{staff.name}</h4>
                          {getStatusBadge(staff.status)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {staff.email}
                          </div>
                          {staff.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {staff.phone}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {staff.department}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {staff.role}
                          </Badge>
                          {assignedShifts.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {assignedShifts.length} shifts
                            </Badge>
                          )}
                          {assignedZones.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {assignedZones.length} zones
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        {getPerformanceRating(staff.id)}
                        {getAttendanceRate(staff.id)}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedStaffMember(staff)
                            setShowStaffDetail(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedStaffMember(staff)
                            setShowShiftAssignment(true)
                          }}
                          className="text-blue-500 hover:text-blue-400"
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedStaffMember(staff)
                            setShowZoneAssignment(true)
                          }}
                          className="text-green-500 hover:text-green-400"
                        >
                          <MapPin className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {metrics && (
                    <div className="mt-3 p-3 bg-slate-600 rounded">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">Incidents:</span>
                          <span className="text-white ml-2">{metrics.incidents}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Commendations:</span>
                          <span className="text-white ml-2">{metrics.commendations}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Training:</span>
                          <span className="text-white ml-2">{metrics.training_completed}/5</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Certifications:</span>
                          <span className="text-white ml-2">{metrics.certifications_valid}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Staff Detail Dialog */}
      <Dialog open={showStaffDetail} onOpenChange={setShowStaffDetail}>
        <DialogContent className="max-w-4xl bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Staff Member Details</DialogTitle>
          </DialogHeader>
          
          {selectedStaffMember && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Personal Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Name:</span>
                      <span className="text-white">{selectedStaffMember.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Email:</span>
                      <span className="text-white">{selectedStaffMember.email}</span>
                    </div>
                    {selectedStaffMember.phone && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Phone:</span>
                        <span className="text-white">{selectedStaffMember.phone}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Role:</span>
                      <span className="text-white">{selectedStaffMember.role}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Department:</span>
                      <span className="text-white">{selectedStaffMember.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      {getStatusBadge(selectedStaffMember.status)}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Employment Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Employment Type:</span>
                      <span className="text-white">{selectedStaffMember.employment_type}</span>
                    </div>
                    {selectedStaffMember.hire_date && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Hire Date:</span>
                        <span className="text-white">
                          {formatSafeDate(selectedStaffMember.hire_date)}
                        </span>
                      </div>
                    )}
                    {selectedStaffMember.hourly_rate && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Hourly Rate:</span>
                        <span className="text-white">${selectedStaffMember.hourly_rate}/hr</span>
                      </div>
                    )}
                    {selectedStaffMember.last_active && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Last Active:</span>
                        <span className="text-white">
                          {formatSafeDate(selectedStaffMember.last_active)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Performance Metrics</h3>
                {performanceMetrics.find(m => m.staffId === selectedStaffMember.id) && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(() => {
                      const metrics = performanceMetrics.find(m => m.staffId === selectedStaffMember.id)!
                      return (
                        <>
                          <Card className="bg-slate-700 border-slate-600">
                            <CardContent className="p-4 text-center">
                              <p className="text-slate-400 text-sm">Attendance</p>
                              <p className="text-2xl font-bold text-white">{metrics.attendance_rate}%</p>
                            </CardContent>
                          </Card>
                          <Card className="bg-slate-700 border-slate-600">
                            <CardContent className="p-4 text-center">
                              <p className="text-slate-400 text-sm">Rating</p>
                              <div className="flex justify-center">{getPerformanceRating(selectedStaffMember.id)}</div>
                            </CardContent>
                          </Card>
                          <Card className="bg-slate-700 border-slate-600">
                            <CardContent className="p-4 text-center">
                              <p className="text-slate-400 text-sm">Incidents</p>
                              <p className="text-2xl font-bold text-red-500">{metrics.incidents}</p>
                            </CardContent>
                          </Card>
                          <Card className="bg-slate-700 border-slate-600">
                            <CardContent className="p-4 text-center">
                              <p className="text-slate-400 text-sm">Commendations</p>
                              <p className="text-2xl font-bold text-green-500">{metrics.commendations}</p>
                            </CardContent>
                          </Card>
                        </>
                      )
                    })()}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-slate-600">
                <Button
                  onClick={() => onUpdateStaffStatus(selectedStaffMember.id, 'active')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Activate
                </Button>
                <Button
                  onClick={() => onUpdateStaffStatus(selectedStaffMember.id, 'inactive')}
                  variant="outline"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Deactivate
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedRecipients([selectedStaffMember.id])
                    setShowMessageDialog(true)
                    setShowStaffDetail(false)
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Shift Assignment Dialog */}
      <Dialog open={showShiftAssignment} onOpenChange={setShowShiftAssignment}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Assign Shift</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Select Shift</Label>
              <Select onValueChange={(value) => {
                if (selectedStaffMember) {
                  handleAssignShift(selectedStaffMember.id, value)
                  setShowShiftAssignment(false)
                }
              }}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Choose a shift" />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map(shift => (
                    <SelectItem key={shift.id} value={shift.id}>
                      {shift.name} ({shift.start_time} - {shift.end_time})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Zone Assignment Dialog */}
      <Dialog open={showZoneAssignment} onOpenChange={setShowZoneAssignment}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Assign Zone</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Select Zone</Label>
              <Select onValueChange={(value) => {
                if (selectedStaffMember) {
                  handleAssignZone(selectedStaffMember.id, value)
                  setShowZoneAssignment(false)
                }
              }}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Choose a zone" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map(zone => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name} ({zone.staff_assigned.length}/{zone.max_staff})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Send Team Message</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Recipients</Label>
              <Select onValueChange={(value) => {
                if (value === 'all') {
                  setSelectedRecipients(filteredStaff.map(s => s.id))
                } else if (value === 'selected') {
                  // Keep current selection
                } else {
                  setSelectedRecipients([value])
                }
              }}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select recipients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  <SelectItem value="selected">Selected Staff</SelectItem>
                  {filteredStaff.map(staff => (
                    <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-white">Message Type</Label>
              <Select value={messageType} onValueChange={setMessageType}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="schedule">Schedule Update</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-white">Message</Label>
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message..."
                className="bg-slate-700 border-slate-600 text-white min-h-[120px]"
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSendMessage}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
              <Button
                onClick={() => setShowMessageDialog(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 