'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Clock,
  Users,
  MapPin,
  Edit,
  Trash2,
  UserPlus,
  MoreHorizontal,
  Filter,
  Search
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { VenueShift, VenueShiftAssignment, VenueTeamMember, ShiftStatus, AssignmentStatus } from '@/types/database.types'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'

interface ShiftCalendarProps {
  venueId: string
}

interface CalendarDay {
  date: Date
  isToday: boolean
  isCurrentMonth: boolean
  shifts: VenueShift[]
}

export function ShiftCalendar({ venueId }: ShiftCalendarProps) {
  const { toast } = useToast()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')
  const [shifts, setShifts] = useState<VenueShift[]>([])
  const [assignments, setAssignments] = useState<VenueShiftAssignment[]>([])
  const [staffMembers, setStaffMembers] = useState<VenueTeamMember[]>([])
  const [selectedShift, setSelectedShift] = useState<VenueShift | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [filterDepartment, setFilterDepartment] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  // Form state for creating shifts
  const [newShift, setNewShift] = useState({
    shift_title: '',
    shift_description: '',
    shift_date: '',
    start_time: '',
    end_time: '',
    location: '',
    department: '',
    role_required: '',
    staff_needed: 1,
    hourly_rate: 0,
    priority: 'normal' as const,
    dress_code: '',
    special_requirements: '',
    notes: ''
  })

  // Form state for assigning staff
  const [assignmentData, setAssignmentData] = useState({
    shift_id: '',
    staff_member_id: '',
    notes: ''
  })

  useEffect(() => {
    fetchShifts()
    fetchStaffMembers()
  }, [venueId, currentDate, filterDepartment])

  const fetchShifts = async () => {
    try {
      setLoading(true)
      const startDate = getStartOfView()
      const endDate = getEndOfView()
      
      const response = await fetch(
        `/api/venue/shifts?venue_id=${venueId}&start_date=${startDate}&end_date=${endDate}${filterDepartment !== 'all' ? `&department=${filterDepartment}` : ''}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setShifts(data.shifts || [])
      }
    } catch (error) {
      console.error('Error fetching shifts:', error)
      toast({
        title: 'Error',
        description: 'Failed to load shifts',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStaffMembers = async () => {
    try {
      const response = await fetch(`/api/venue/staff-profiles?venue_id=${venueId}`)
      if (response.ok) {
        const data = await response.json()
        setStaffMembers(data.profiles || [])
      }
    } catch (error) {
      console.error('Error fetching staff members:', error)
    }
  }

  const getStartOfView = (): string => {
    const date = new Date(currentDate)
    if (viewMode === 'month') {
      date.setDate(1)
    } else if (viewMode === 'week') {
      const day = date.getDay()
      date.setDate(date.getDate() - day)
    }
    return date.toISOString().split('T')[0]
  }

  const getEndOfView = (): string => {
    const date = new Date(currentDate)
    if (viewMode === 'month') {
      date.setMonth(date.getMonth() + 1, 0)
    } else if (viewMode === 'week') {
      const day = date.getDay()
      date.setDate(date.getDate() + (6 - day))
    }
    return date.toISOString().split('T')[0]
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    }
    setCurrentDate(newDate)
  }

  const getCalendarDays = (): CalendarDay[] => {
    const days: CalendarDay[] = []
    const startDate = new Date(getStartOfView())
    const endDate = new Date(getEndOfView())
    const today = new Date()

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0]
      const dayShifts = shifts.filter(shift => shift.shift_date === dateStr)
      
      days.push({
        date: new Date(date),
        isToday: date.toDateString() === today.toDateString(),
        isCurrentMonth: date.getMonth() === currentDate.getMonth(),
        shifts: dayShifts
      })
    }

    return days
  }

  const handleCreateShift = async () => {
    try {
      const response = await fetch('/api/venue/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newShift,
          venue_id: venueId
        })
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Shift created successfully'
        })
        setIsCreateDialogOpen(false)
        setNewShift({
          shift_title: '',
          shift_description: '',
          shift_date: '',
          start_time: '',
          end_time: '',
          location: '',
          department: '',
          role_required: '',
          staff_needed: 1,
          hourly_rate: 0,
          priority: 'normal',
          dress_code: '',
          special_requirements: '',
          notes: ''
        })
        fetchShifts()
      } else {
        throw new Error('Failed to create shift')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create shift',
        variant: 'destructive'
      })
    }
  }

  const handleAssignStaff = async () => {
    try {
      const response = await fetch('/api/venue/shifts/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignmentData)
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Staff assigned successfully'
        })
        setIsAssignDialogOpen(false)
        setAssignmentData({
          shift_id: '',
          staff_member_id: '',
          notes: ''
        })
        fetchShifts()
      } else {
        throw new Error('Failed to assign staff')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign staff',
        variant: 'destructive'
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500'
      case 'filled': return 'bg-green-500'
      case 'in_progress': return 'bg-yellow-500'
      case 'completed': return 'bg-gray-500'
      case 'cancelled': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 bg-red-500/10 border-red-500/20'
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/20'
      case 'normal': return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
      case 'low': return 'text-green-400 bg-green-500/10 border-green-500/20'
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
    }
  }

  const formatTime = (time: string) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(new Date(`2000-01-01T${time}`))
  }

  const calendarDays = getCalendarDays()
  const filteredShifts = shifts.filter(shift => 
    searchTerm === '' || 
    shift.shift_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shift.department?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Calendar Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h2 className="text-lg font-semibold">
            {formatSafeDate(currentDate.toISOString())}
          </h2>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Select value={viewMode} onValueChange={(value: 'month' | 'week' | 'day') => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="day">Day</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterDepartment} onValueChange={setFilterDepartment}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="service">Service</SelectItem>
              <SelectItem value="management">Management</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shifts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Shift
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Shift</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shift_title">Shift Title</Label>
                  <Input
                    id="shift_title"
                    value={newShift.shift_title}
                    onChange={(e) => setNewShift({ ...newShift, shift_title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shift_date">Date</Label>
                  <Input
                    id="shift_date"
                    type="date"
                    value={newShift.shift_date}
                    onChange={(e) => setNewShift({ ...newShift, shift_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={newShift.start_time}
                    onChange={(e) => setNewShift({ ...newShift, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={newShift.end_time}
                    onChange={(e) => setNewShift({ ...newShift, end_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select value={newShift.department} onValueChange={(value) => setNewShift({ ...newShift, department: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff_needed">Staff Needed</Label>
                  <Input
                    id="staff_needed"
                    type="number"
                    min="1"
                    value={newShift.staff_needed}
                    onChange={(e) => setNewShift({ ...newShift, staff_needed: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="shift_description">Description</Label>
                  <Textarea
                    id="shift_description"
                    value={newShift.shift_description}
                    onChange={(e) => setNewShift({ ...newShift, shift_description: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newShift.location}
                    onChange={(e) => setNewShift({ ...newShift, location: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateShift}>
                  Create Shift
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar Grid */}
      {viewMode === 'month' && (
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center font-medium text-sm text-muted-foreground">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {calendarDays.map((day, index) => (
            <Card
              key={index}
              className={`min-h-[120px] p-2 ${
                day.isToday ? 'ring-2 ring-blue-500' : ''
              } ${!day.isCurrentMonth ? 'opacity-50' : ''}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-sm font-medium ${
                  day.isToday ? 'text-blue-600' : ''
                }`}>
                  {day.date.getDate()}
                </span>
                {day.shifts.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {day.shifts.length}
                  </Badge>
                )}
              </div>
              
              <div className="space-y-1">
                {day.shifts.slice(0, 3).map((shift) => (
                  <div
                    key={shift.id}
                    className="p-1 text-xs bg-blue-50 rounded cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => setSelectedShift(shift)}
                  >
                    <div className="font-medium truncate">{shift.shift_title}</div>
                    <div className="text-muted-foreground">
                      {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge className={`text-xs ${getPriorityColor(shift.priority)}`}>
                        {shift.priority}
                      </Badge>
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(shift.shift_status)}`} />
                    </div>
                  </div>
                ))}
                {day.shifts.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{day.shifts.length - 3} more
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Shift Details Dialog */}
      {selectedShift && (
        <Dialog open={!!selectedShift} onOpenChange={() => setSelectedShift(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedShift.shift_title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Date & Time</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatSafeDate(selectedShift.shift_date)} • {formatTime(selectedShift.start_time)} - {formatTime(selectedShift.end_time)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Location</Label>
                  <p className="text-sm text-muted-foreground">{selectedShift.location || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Department</Label>
                  <p className="text-sm text-muted-foreground">{selectedShift.department || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Staff Needed</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedShift.staff_assigned}/{selectedShift.staff_needed}
                  </p>
                </div>
              </div>
              
              {selectedShift.shift_description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground">{selectedShift.shift_description}</p>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <Badge className={getPriorityColor(selectedShift.priority)}>
                  {selectedShift.priority} priority
                </Badge>
                <div className={`w-3 h-3 rounded-full ${getStatusColor(selectedShift.shift_status)}`} />
                <span className="text-sm capitalize">{selectedShift.shift_status}</span>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAssignmentData({ ...assignmentData, shift_id: selectedShift.id })
                    setIsAssignDialogOpen(true)
                    setSelectedShift(null)
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign Staff
                </Button>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Assign Staff Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Staff to Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff_member">Staff Member</Label>
              <Select
                value={assignmentData.staff_member_id}
                onValueChange={(value) => setAssignmentData({ ...assignmentData, staff_member_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name} - {staff.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={assignmentData.notes}
                onChange={(e) => setAssignmentData({ ...assignmentData, notes: e.target.value })}
                placeholder="Optional notes for this assignment"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignStaff}>
                Assign Staff
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 