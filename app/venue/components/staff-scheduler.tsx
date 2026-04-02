"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ChevronLeft, ChevronRight, Download, Edit, Plus, Save, Trash2 } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

// Mock staff data
const mockStaff = [
  {
    id: "staff-1",
    name: "Alex Johnson",
    role: "Venue Manager",
    avatar: "/abstract-aj.png",
    email: "alex@echolounge.com",
    phone: "(323) 555-1234",
    color: "#8b5cf6",
  },
  {
    id: "staff-2",
    name: "Sarah Williams",
    role: "Booking Manager",
    avatar: "/abstract-southwest.png",
    email: "sarah@echolounge.com",
    phone: "(323) 555-2345",
    color: "#3b82f6",
  },
  {
    id: "staff-3",
    name: "Michael Chen",
    role: "Technical Director",
    avatar: "/microphone-crowd.png",
    email: "michael@echolounge.com",
    phone: "(323) 555-3456",
    color: "#ec4899",
  },
  {
    id: "staff-4",
    name: "Jessica Rodriguez",
    role: "Bar Manager",
    avatar: "/abstract-jr.png",
    email: "jessica@echolounge.com",
    phone: "(323) 555-4567",
    color: "#10b981",
  },
  {
    id: "staff-5",
    name: "David Kim",
    role: "Sound Engineer",
    avatar: "/placeholder.svg?key=f4b89",
    email: "david@echolounge.com",
    phone: "(323) 555-5678",
    color: "#f59e0b",
  },
  {
    id: "staff-6",
    name: "Emily Taylor",
    role: "Bartender",
    avatar: "/placeholder.svg?key=cp42u",
    email: "emily@echolounge.com",
    phone: "(323) 555-6789",
    color: "#6366f1",
  },
  {
    id: "staff-7",
    name: "James Wilson",
    role: "Security Lead",
    avatar: "/placeholder.svg?key=tk3sn",
    email: "james@echolounge.com",
    phone: "(323) 555-7890",
    color: "#ef4444",
  },
]

// Mock shift data
const mockShifts = [
  {
    id: "shift-1",
    staffId: "staff-1",
    date: "2025-06-15",
    startTime: "14:00",
    endTime: "22:00",
    notes: "Summer Jam Festival",
  },
  {
    id: "shift-2",
    staffId: "staff-2",
    date: "2025-06-15",
    startTime: "12:00",
    endTime: "20:00",
    notes: "Summer Jam Festival",
  },
  {
    id: "shift-3",
    staffId: "staff-3",
    date: "2025-06-15",
    startTime: "10:00",
    endTime: "22:00",
    notes: "Summer Jam Festival - Sound Setup",
  },
  {
    id: "shift-4",
    staffId: "staff-4",
    date: "2025-06-15",
    startTime: "16:00",
    endTime: "02:00",
    notes: "Summer Jam Festival - Bar Service",
  },
  {
    id: "shift-5",
    staffId: "staff-5",
    date: "2025-06-15",
    startTime: "10:00",
    endTime: "22:00",
    notes: "Summer Jam Festival - Sound Engineer",
  },
  {
    id: "shift-6",
    staffId: "staff-6",
    date: "2025-06-15",
    startTime: "16:00",
    endTime: "02:00",
    notes: "Summer Jam Festival - Bar Service",
  },
  {
    id: "shift-7",
    staffId: "staff-7",
    date: "2025-06-15",
    startTime: "14:00",
    endTime: "02:00",
    notes: "Summer Jam Festival - Security",
  },
  {
    id: "shift-8",
    staffId: "staff-1",
    date: "2025-06-22",
    startTime: "17:00",
    endTime: "23:00",
    notes: "Midnight Echo",
  },
  {
    id: "shift-9",
    staffId: "staff-3",
    date: "2025-06-22",
    startTime: "15:00",
    endTime: "23:00",
    notes: "Midnight Echo - Sound Setup",
  },
  {
    id: "shift-10",
    staffId: "staff-4",
    date: "2025-06-22",
    startTime: "17:00",
    endTime: "01:00",
    notes: "Midnight Echo - Bar Service",
  },
  {
    id: "shift-11",
    staffId: "staff-7",
    date: "2025-06-22",
    startTime: "17:00",
    endTime: "01:00",
    notes: "Midnight Echo - Security",
  },
]

export function StaffScheduler() {
  const [date, setDate] = useState<Date>(new Date("2025-06-15"))
  const [view, setView] = useState<"day" | "week">("day")
  const [shifts, setShifts] = useState(mockShifts)
  const [selectedShift, setSelectedShift] = useState<string | null>(null)
  const [isAddingShift, setIsAddingShift] = useState(false)
  const [newShift, setNewShift] = useState({
    staffId: "",
    date: "",
    startTime: "09:00",
    endTime: "17:00",
    notes: "",
  })

  // Format date for display
  const formatDate = (date: Date) => {
    return formatSafeDate(date.toISOString())
  }

  // Get shifts for the selected date
  const getShiftsForDate = (date: Date) => {
    const dateString = date.toISOString().split("T")[0]
    return shifts.filter((shift) => shift.date === dateString)
  }

  // Get staff member by ID
  const getStaffMember = (id: string) => {
    return mockStaff.find((staff) => staff.id === id)
  }

  // Handle adding a new shift
  const handleAddShift = () => {
    const dateString = date.toISOString().split("T")[0]
    const newShiftObj = {
      id: `shift-${shifts.length + 1}`,
      staffId: newShift.staffId,
      date: dateString,
      startTime: newShift.startTime,
      endTime: newShift.endTime,
      notes: newShift.notes,
    }

    setShifts([...shifts, newShiftObj])
    setIsAddingShift(false)
    setNewShift({
      staffId: "",
      date: "",
      startTime: "09:00",
      endTime: "17:00",
      notes: "",
    })
  }

  // Handle deleting a shift
  const handleDeleteShift = (id: string) => {
    setShifts(shifts.filter((shift) => shift.id !== id))
    setSelectedShift(null)
  }

  // Navigate to previous day
  const goToPreviousDay = () => {
    const newDate = new Date(date)
    newDate.setDate(date.getDate() - 1)
    setDate(newDate)
  }

  // Navigate to next day
  const goToNextDay = () => {
    const newDate = new Date(date)
    newDate.setDate(date.getDate() + 1)
    setDate(newDate)
  }

  // Time slots for the scheduler
  const timeSlots = Array.from({ length: 17 }, (_, i) => {
    const hour = i + 8 // Start at 8 AM
    return `${hour.toString().padStart(2, "0")}:00`
  })

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg">Staff Scheduler</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Schedule
            </Button>
            <Dialog open={isAddingShift} onOpenChange={setIsAddingShift}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Shift
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-800">
                <DialogHeader>
                  <DialogTitle>Add New Shift</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Staff Member</label>
                    <Select
                      value={newShift.staffId}
                      onValueChange={(value) => setNewShift({ ...newShift, staffId: value })}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700">
                        <SelectValue placeholder="Select staff member" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {mockStaff.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            <div className="flex items-center">
                              <div className="h-3 w-3 rounded-full mr-2" style={{ backgroundColor: staff.color }}></div>
                              {staff.name} - {staff.role}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start Time</label>
                      <Input
                        type="time"
                        className="bg-gray-800 border-gray-700"
                        value={newShift.startTime}
                        onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">End Time</label>
                      <Input
                        type="time"
                        className="bg-gray-800 border-gray-700"
                        value={newShift.endTime}
                        onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes</label>
                    <Input
                      className="bg-gray-800 border-gray-700"
                      placeholder="Event or shift notes"
                      value={newShift.notes}
                      onChange={(e) => setNewShift({ ...newShift, notes: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setIsAddingShift(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddShift} disabled={!newShift.staffId}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Shift
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="schedule">
          <TabsList className="bg-gray-800 mb-4">
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goToPreviousDay}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-lg font-medium">{formatDate(date)}</div>
                <Button variant="outline" size="icon" onClick={goToNextDay}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant={view === "day" ? "default" : "outline"} size="sm" onClick={() => setView("day")}>
                  Day
                </Button>
                <Button variant={view === "week" ? "default" : "outline"} size="sm" onClick={() => setView("week")}>
                  Week
                </Button>
              </div>
            </div>

            <div className="rounded-md border border-gray-800 overflow-hidden">
              <div className="grid grid-cols-[100px_1fr] bg-gray-800">
                <div className="p-3 border-r border-gray-700 font-medium">Time</div>
                <div className="p-3 font-medium">Staff</div>
              </div>

              <div className="grid grid-cols-[100px_1fr]">
                <div className="border-r border-gray-800">
                  {timeSlots.map((time) => (
                    <div key={time} className="p-3 border-b border-gray-800 text-sm text-gray-400">
                      {time}
                    </div>
                  ))}
                </div>

                <div className="relative min-h-[600px]">
                  {getShiftsForDate(date).map((shift) => {
                    const staff = getStaffMember(shift.staffId)
                    if (!staff) return null

                    // Calculate position and height
                    const startHour = Number.parseInt(shift.startTime.split(":")[0])
                    const startMinute = Number.parseInt(shift.startTime.split(":")[1])
                    const endHour = Number.parseInt(shift.endTime.split(":")[0])
                    const endMinute = Number.parseInt(shift.endTime.split(":")[1])

                    const startPosition = (startHour - 8) * 60 + startMinute
                    const endPosition = (endHour - 8) * 60 + endMinute
                    const duration = endPosition - startPosition

                    return (
                      <div
                        key={shift.id}
                        className={`absolute left-0 right-0 mx-2 p-2 rounded-md cursor-pointer ${
                          selectedShift === shift.id ? "ring-2 ring-white" : ""
                        }`}
                        style={{
                          top: `${startPosition}px`,
                          height: `${duration}px`,
                          backgroundColor: `${staff.color}20`,
                          borderLeft: `4px solid ${staff.color}`,
                        }}
                        onClick={() => setSelectedShift(shift.id === selectedShift ? null : shift.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={staff.avatar || "/placeholder.svg"} alt={staff.name} />
                            <AvatarFallback>{staff.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">{staff.name}</div>
                            <div className="text-xs text-gray-400">
                              {shift.startTime} - {shift.endTime}
                            </div>
                          </div>
                        </div>
                        {shift.notes && <div className="text-xs mt-1">{shift.notes}</div>}

                        {selectedShift === shift.id && (
                          <div className="absolute top-2 right-2 flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-500"
                              onClick={() => handleDeleteShift(shift.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Time indicator lines */}
                  {timeSlots.map((time, index) => (
                    <div
                      key={`line-${time}`}
                      className="absolute left-0 right-0 border-b border-gray-800"
                      style={{ top: `${index * 60}px` }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="staff">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Staff Members</h3>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Staff
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockStaff.map((staff) => (
                  <div
                    key={staff.id}
                    className="p-4 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={staff.avatar || "/placeholder.svg"} alt={staff.name} />
                        <AvatarFallback>{staff.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{staff.name}</div>
                        <div className="text-sm text-gray-400">{staff.role}</div>
                        <div className="text-xs text-gray-500 mt-1">{staff.email}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-500 border-red-800 hover:bg-red-900/20">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="availability">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Staff Availability</h3>
                <div className="space-y-4">
                  {mockStaff.slice(0, 4).map((staff) => (
                    <div key={staff.id} className="p-4 rounded-lg bg-gray-800 border border-gray-700">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={staff.avatar || "/placeholder.svg"} alt={staff.name} />
                          <AvatarFallback>{staff.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{staff.name}</div>
                          <div className="text-sm text-gray-400">{staff.role}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center text-xs">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                          <div key={day} className="font-medium text-gray-400">
                            {day}
                          </div>
                        ))}

                        {/* Mock availability - in a real app, this would be dynamic */}
                        <div className="bg-green-900/20 text-green-400 rounded p-1">AM/PM</div>
                        <div className="bg-green-900/20 text-green-400 rounded p-1">AM/PM</div>
                        <div className="bg-green-900/20 text-green-400 rounded p-1">AM/PM</div>
                        <div className="bg-green-900/20 text-green-400 rounded p-1">AM/PM</div>
                        <div className="bg-green-900/20 text-green-400 rounded p-1">AM/PM</div>
                        <div className="bg-yellow-900/20 text-yellow-400 rounded p-1">PM</div>
                        <div className="bg-red-900/20 text-red-400 rounded p-1">N/A</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Set Availability</h3>
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Staff Member</label>
                        <Select defaultValue="staff-1">
                          <SelectTrigger className="bg-gray-700 border-gray-600">
                            <SelectValue placeholder="Select staff member" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 border-gray-600">
                            {mockStaff.map((staff) => (
                              <SelectItem key={staff.id} value={staff.id}>
                                {staff.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Select Date Range</label>
                        <div className="bg-gray-700 border border-gray-600 rounded-md p-4">
                          <Calendar
                            mode="range"
                            className="mx-auto"
                            classNames={{
                              day_selected: "bg-purple-600 text-white hover:bg-purple-500 focus:bg-purple-500",
                              day_today: "bg-gray-800 text-white",
                              day: "text-gray-300 hover:bg-gray-800",
                              head_cell: "text-gray-400",
                              cell: "text-gray-300",
                              nav_button: "border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700",
                              nav_button_previous: "absolute left-1",
                              nav_button_next: "absolute right-1",
                              caption: "flex items-center justify-center gap-1 py-4 relative",
                              caption_label: "text-gray-200 font-medium",
                              table: "w-full border-collapse",
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Availability Type</label>
                          <Select defaultValue="available">
                            <SelectTrigger className="bg-gray-700 border-gray-600">
                              <SelectValue placeholder="Select availability" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-700 border-gray-600">
                              <SelectItem value="available">Available</SelectItem>
                              <SelectItem value="unavailable">Unavailable</SelectItem>
                              <SelectItem value="limited">Limited Hours</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Recurring</label>
                          <Select defaultValue="no">
                            <SelectTrigger className="bg-gray-700 border-gray-600">
                              <SelectValue placeholder="Select recurring option" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-700 border-gray-600">
                              <SelectItem value="no">One-time</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="biweekly">Bi-weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Notes</label>
                        <Input className="bg-gray-700 border-gray-600" placeholder="Add any notes about availability" />
                      </div>

                      <Button className="w-full">Save Availability</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
