"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  MapPin,
  Phone,
  Mail,
  Star,
  Settings,
  Filter
} from "lucide-react"

interface Shift {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  department: string
  role: string
  assignedTo?: string
  requiredSkills: string[]
  status: 'open' | 'assigned' | 'confirmed' | 'completed'
  priority: 'low' | 'medium' | 'high'
  description: string
  location: string
  payRate: number
}

interface StaffMember {
  id: string
  name: string
  email: string
  phone: string
  role: string
  department: string
  avatar?: string
  skills: string[]
  availability: {
    [date: string]: {
      available: boolean
      timeSlots: string[]
      notes?: string
    }
  }
  performance: number
  preferredShifts: string[]
}

export default function StaffScheduler() {
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [showCreateShift, setShowCreateShift] = useState(false)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [filterDepartment, setFilterDepartment] = useState<string>('all')

  // Mock data for shifts
  const [shifts, setShifts] = useState<Shift[]>([
    {
      id: "shift-1",
      title: "Evening Sound Check",
      date: "2024-02-15",
      startTime: "18:00",
      endTime: "22:00",
      department: "Technical",
      role: "Sound Engineer",
      assignedTo: "staff-3",
      requiredSkills: ["Pro Tools", "Live Sound", "Mixing"],
      status: "assigned",
      priority: "high",
      description: "Sound check and mixing for tonight's concert",
      location: "Main Stage",
      payRate: 35
    },
    {
      id: "shift-2",
      title: "Security Coverage",
      date: "2024-02-15",
      startTime: "19:00",
      endTime: "02:00",
      department: "Security",
      role: "Security Guard",
      requiredSkills: ["Crowd Control", "Emergency Response"],
      status: "open",
      priority: "high",
      description: "Main entrance and crowd control during event",
      location: "Main Entrance",
      payRate: 25
    },
    {
      id: "shift-3",
      title: "Equipment Setup",
      date: "2024-02-16",
      startTime: "08:00",
      endTime: "12:00",
      department: "Technical",
      role: "Technical Assistant",
      assignedTo: "staff-4",
      requiredSkills: ["Equipment Handling", "Setup"],
      status: "confirmed",
      priority: "medium",
      description: "Setup stage equipment for weekend shows",
      location: "Stage Area",
      payRate: 20
    },
    {
      id: "shift-4",
      title: "VIP Service",
      date: "2024-02-16",
      startTime: "20:00",
      endTime: "01:00",
      department: "Service",
      role: "VIP Coordinator",
      requiredSkills: ["Customer Service", "Hospitality"],
      status: "open",
      priority: "medium",
      description: "Manage VIP area and guest services",
      location: "VIP Lounge",
      payRate: 30
    }
  ])

  // Mock staff data
  const [staffMembers] = useState<StaffMember[]>([
    {
      id: "staff-1",
      name: "Alex Chen",
      email: "alex.chen@venue.com",
      phone: "+1-555-0101",
      role: "Venue Manager",
      department: "Management",
      skills: ["Leadership", "Event Planning", "Team Management"],
      availability: {
        "2024-02-15": { available: true, timeSlots: ["morning", "afternoon", "evening"] },
        "2024-02-16": { available: true, timeSlots: ["morning", "afternoon"] }
      },
      performance: 98,
      preferredShifts: ["morning", "afternoon"]
    },
    {
      id: "staff-2",
      name: "Maya Rodriguez",
      email: "maya.rodriguez@venue.com",
      phone: "+1-555-0102",
      role: "Technical Lead",
      department: "Technical",
      skills: ["Audio Engineering", "System Design", "Leadership"],
      availability: {
        "2024-02-15": { available: true, timeSlots: ["afternoon", "evening", "night"] },
        "2024-02-16": { available: false, timeSlots: [], notes: "Personal appointment" }
      },
      performance: 96,
      preferredShifts: ["afternoon", "evening"]
    },
    {
      id: "staff-3",
      name: "Jordan Kim",
      email: "jordan.kim@venue.com",
      phone: "+1-555-0103",
      role: "Sound Engineer",
      department: "Technical",
      skills: ["Pro Tools", "Live Sound", "Mixing"],
      availability: {
        "2024-02-15": { available: true, timeSlots: ["evening", "night"] },
        "2024-02-16": { available: true, timeSlots: ["morning", "afternoon", "evening"] }
      },
      performance: 92,
      preferredShifts: ["evening", "night"]
    }
  ])

  const [newShift, setNewShift] = useState<Partial<Shift>>({
    title: "",
    date: selectedDate,
    startTime: "",
    endTime: "",
    department: "",
    role: "",
    requiredSkills: [],
    priority: "medium",
    description: "",
    location: "",
    payRate: 0
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-500'
      case 'assigned': return 'bg-yellow-500'
      case 'confirmed': return 'bg-blue-500'
      case 'completed': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20'
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      case 'low': return 'text-green-400 bg-green-500/10 border-green-500/20'
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
    }
  }

  const getStaffMember = (staffId: string) => {
    return staffMembers.find(staff => staff.id === staffId)
  }

  const getAvailableStaff = (shift: Shift) => {
    return staffMembers.filter(staff => {
      const dayAvailability = staff.availability[shift.date]
      if (!dayAvailability?.available) return false
      
      // Check if staff has required skills
      const hasRequiredSkills = shift.requiredSkills.some(skill => 
        staff.skills.includes(skill)
      )
      
      return hasRequiredSkills && staff.department === shift.department
    })
  }

  const handleCreateShift = () => {
    const shift: Shift = {
      ...newShift as Shift,
      id: `shift-${Date.now()}`,
      status: 'open'
    }
    
    setShifts(prev => [...prev, shift])
    setShowCreateShift(false)
    setNewShift({
      title: "",
      date: selectedDate,
      startTime: "",
      endTime: "",
      department: "",
      role: "",
      requiredSkills: [],
      priority: "medium",
      description: "",
      location: "",
      payRate: 0
    })
    
    toast({
      title: "Shift Created",
      description: `Shift "${shift.title}" has been created successfully`,
    })
  }

  const handleAssignShift = (shiftId: string, staffId: string) => {
    setShifts(prev => prev.map(shift => 
      shift.id === shiftId 
        ? { ...shift, assignedTo: staffId, status: 'assigned' as const }
        : shift
    ))
    
    const staff = getStaffMember(staffId)
    toast({
      title: "Shift Assigned",
      description: `Shift assigned to ${staff?.name}`,
    })
  }

  const filteredShifts = shifts.filter(shift => 
    filterDepartment === 'all' || shift.department === filterDepartment
  )

  const todayShifts = filteredShifts.filter(shift => shift.date === selectedDate)
  
  const departments = [...new Set(shifts.map(s => s.department))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Staff Scheduler
          </h1>
          <p className="text-slate-400 mt-1">Manage shifts, schedules, and staff assignments</p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={filterDepartment} onValueChange={setFilterDepartment}>
            <SelectTrigger className="w-40 bg-slate-800/50 border-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowCreateShift(true)} className="bg-gradient-to-r from-blue-500 to-purple-600">
            <Plus className="h-4 w-4 mr-2" />
            Create Shift
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: "Total Shifts", 
            value: shifts.length, 
            icon: Calendar, 
            color: "from-blue-500 to-cyan-500" 
          },
          { 
            label: "Open Shifts", 
            value: shifts.filter(s => s.status === 'open').length, 
            icon: AlertTriangle, 
            color: "from-red-500 to-orange-500" 
          },
          { 
            label: "Assigned Today", 
            value: todayShifts.filter(s => s.assignedTo).length, 
            icon: UserCheck, 
            color: "from-green-500 to-emerald-500" 
          },
          { 
            label: "Available Staff", 
            value: staffMembers.filter(s => s.availability[selectedDate]?.available).length, 
            icon: Users, 
            color: "from-purple-500 to-pink-500" 
          }
        ].map((stat, i) => (
          <Card key={i} className="bg-slate-800/30 border-slate-700/50">
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

      {/* Date Selector */}
      <Card className="bg-slate-800/30 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Label htmlFor="date-select" className="text-white font-medium">Select Date:</Label>
              <Input
                id="date-select"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="text-slate-400 text-sm">
              {todayShifts.length} shifts scheduled for {formatSafeDate(selectedDate)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shifts for Selected Date */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {todayShifts.map((shift) => {
          const assignedStaff = shift.assignedTo ? getStaffMember(shift.assignedTo) : null
          const availableStaff = getAvailableStaff(shift)
          
          return (
            <Card key={shift.id} className="bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50 transition-all">
              <CardContent className="p-6">
                {/* Shift Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold text-lg">{shift.title}</h3>
                    <p className="text-slate-400 text-sm">{shift.department} • {shift.role}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge className={getPriorityColor(shift.priority)}>
                        {shift.priority} priority
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(shift.status)}`}></div>
                        <span className="text-xs text-slate-400 capitalize">{shift.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-400">${shift.payRate}/hr</div>
                    <div className="text-xs text-slate-400">Pay Rate</div>
                  </div>
                </div>

                {/* Shift Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="h-4 w-4 text-blue-400" />
                    <span className="text-slate-300">{shift.startTime} - {shift.endTime}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <MapPin className="h-4 w-4 text-red-400" />
                    <span className="text-slate-300">{shift.location}</span>
                  </div>
                  <p className="text-slate-300 text-sm">{shift.description}</p>
                </div>

                {/* Required Skills */}
                <div className="mb-4">
                  <div className="text-xs text-slate-400 mb-2">Required Skills</div>
                  <div className="flex flex-wrap gap-1">
                    {shift.requiredSkills.map((skill, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-slate-700/50 border-slate-600">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Assignment Status */}
                {shift.assignedTo && assignedStaff ? (
                  <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={assignedStaff.avatar} />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs">
                          {assignedStaff.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="text-white font-medium text-sm">{assignedStaff.name}</div>
                        <div className="text-green-400 text-xs">Assigned • {assignedStaff.performance}% performance</div>
                      </div>
                      <div className="flex space-x-1">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                          <Phone className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                          <Mail className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="text-red-400 text-sm font-medium mb-2">Unassigned Shift</div>
                    <div className="text-slate-300 text-xs">
                      {availableStaff.length} qualified staff available
                    </div>
                  </div>
                )}

                {/* Available Staff for Assignment */}
                {!shift.assignedTo && availableStaff.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs text-slate-400 mb-2">Available Staff</div>
                    <div className="space-y-2">
                      {availableStaff.slice(0, 2).map((staff) => (
                        <div key={staff.id} className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={staff.avatar} />
                              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs">
                                {staff.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-white text-sm font-medium">{staff.name}</div>
                              <div className="text-slate-400 text-xs">{staff.performance}% performance</div>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handleAssignShift(shift.id, staff.id)}
                            className="bg-green-600 hover:bg-green-700 text-xs"
                          >
                            Assign
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                  <div className="flex space-x-2">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-700/50">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-700/50 text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex space-x-2">
                    {shift.status === 'assigned' && (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Confirm
                      </Button>
                    )}
                    {shift.status === 'open' && (
                      <Button size="sm" variant="outline" className="border-slate-600">
                        <UserCheck className="h-4 w-4 mr-1" />
                        Find Staff
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Create Shift Dialog */}
      <Dialog open={showCreateShift} onOpenChange={setShowCreateShift}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-blue-400">Create New Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shift-title">Shift Title</Label>
                <Input
                  id="shift-title"
                  value={newShift.title}
                  onChange={(e) => setNewShift({ ...newShift, title: e.target.value })}
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              <div>
                <Label htmlFor="shift-date">Date</Label>
                <Input
                  id="shift-date"
                  type="date"
                  value={newShift.date}
                  onChange={(e) => setNewShift({ ...newShift, date: e.target.value })}
                  className="bg-slate-800 border-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={newShift.startTime}
                  onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              <div>
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={newShift.endTime}
                  onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              <div>
                <Label htmlFor="pay-rate">Pay Rate ($/hr)</Label>
                <Input
                  id="pay-rate"
                  type="number"
                  value={newShift.payRate}
                  onChange={(e) => setNewShift({ ...newShift, payRate: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-800 border-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="department">Department</Label>
                <Select value={newShift.department} onValueChange={(value) => setNewShift({ ...newShift, department: value })}>
                  <SelectTrigger className="bg-slate-800 border-slate-600">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="Technical">Technical</SelectItem>
                    <SelectItem value="Security">Security</SelectItem>
                    <SelectItem value="Service">Service</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={newShift.role}
                  onChange={(e) => setNewShift({ ...newShift, role: e.target.value })}
                  placeholder="e.g., Sound Engineer"
                  className="bg-slate-800 border-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={newShift.location}
                  onChange={(e) => setNewShift({ ...newShift, location: e.target.value })}
                  placeholder="e.g., Main Stage"
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={newShift.priority} onValueChange={(value) => setNewShift({ ...newShift, priority: value as any })}>
                  <SelectTrigger className="bg-slate-800 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newShift.description}
                onChange={(e) => setNewShift({ ...newShift, description: e.target.value })}
                placeholder="Brief description of the shift responsibilities"
                className="bg-slate-800 border-slate-600"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowCreateShift(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateShift} className="bg-blue-600 hover:bg-blue-700">
                Create Shift
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 