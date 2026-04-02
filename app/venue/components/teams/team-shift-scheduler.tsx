"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusCircle, Clock, MoreHorizontal, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

// Mock data for shifts
const mockShifts = {
  "team-1": [
    {
      id: 1,
      title: "Bar Service",
      date: "2023-12-15",
      startTime: "18:00",
      endTime: "02:00",
      location: "Main Bar",
      assignees: [
        { id: 3, name: "Jamie Lee", avatar: "/placeholder.svg?height=40&width=40&text=JL" },
        { id: 5, name: "Morgan Smith", avatar: "/placeholder.svg?height=40&width=40&text=MS" },
      ],
      notes: "Busy night expected, ensure all staff are briefed on specials",
    },
    {
      id: 2,
      title: "Security",
      date: "2023-12-15",
      startTime: "17:00",
      endTime: "03:00",
      location: "Venue Entrance",
      assignees: [{ id: 4, name: "Taylor Kim", avatar: "/placeholder.svg?height=40&width=40&text=TK" }],
      notes: "Check IDs carefully, expect large crowd",
    },
    {
      id: 3,
      title: "Floor Manager",
      date: "2023-12-15",
      startTime: "16:00",
      endTime: "03:00",
      location: "Main Floor",
      assignees: [{ id: 2, name: "Sam Rivera", avatar: "/placeholder.svg?height=40&width=40&text=SR" }],
      notes: "Oversee all operations, coordinate with security and bar staff",
    },
    {
      id: 4,
      title: "Bar Service",
      date: "2023-12-16",
      startTime: "18:00",
      endTime: "02:00",
      location: "Main Bar",
      assignees: [{ id: 3, name: "Jamie Lee", avatar: "/placeholder.svg?height=40&width=40&text=JL" }],
      notes: "Standard service, check inventory before shift",
    },
  ],
  "team-2": [
    {
      id: 5,
      title: "Sound Engineer",
      date: "2023-12-15",
      startTime: "15:00",
      endTime: "23:00",
      location: "Sound Booth",
      assignees: [{ id: 6, name: "Jordan Patel", avatar: "/placeholder.svg?height=40&width=40&text=JP" }],
      notes: "Early setup for sound check at 16:00",
    },
    {
      id: 6,
      title: "Lighting Technician",
      date: "2023-12-15",
      startTime: "16:00",
      endTime: "23:00",
      location: "Lighting Booth",
      assignees: [{ id: 7, name: "Casey Wong", avatar: "/placeholder.svg?height=40&width=40&text=CW" }],
      notes: "Program lighting cues before doors open",
    },
  ],
  "team-3": [
    {
      id: 7,
      title: "Event Coordinator",
      date: "2023-12-15",
      startTime: "14:00",
      endTime: "23:00",
      location: "Venue",
      assignees: [{ id: 9, name: "Quinn Murphy", avatar: "/placeholder.svg?height=40&width=40&text=QM" }],
      notes: "Oversee event setup and coordinate with all departments",
    },
    {
      id: 8,
      title: "Guest Relations",
      date: "2023-12-15",
      startTime: "17:30",
      endTime: "22:30",
      location: "Front Entrance",
      assignees: [{ id: 10, name: "Avery Wilson", avatar: "/placeholder.svg?height=40&width=40&text=AW" }],
      notes: "Handle VIP guests and any customer issues",
    },
  ],
  "team-4": [
    {
      id: 9,
      title: "Social Media Coverage",
      date: "2023-12-15",
      startTime: "18:00",
      endTime: "23:00",
      location: "Venue",
      assignees: [{ id: 11, name: "Dakota Lee", avatar: "/placeholder.svg?height=40&width=40&text=DL" }],
      notes: "Live posting throughout the event",
    },
  ],
  "team-5": [
    {
      id: 10,
      title: "Merchandise Sales",
      date: "2023-12-15",
      startTime: "17:00",
      endTime: "23:00",
      location: "Merch Booth",
      assignees: [{ id: 14, name: "Parker Davis", avatar: "/placeholder.svg?height=40&width=40&text=PD" }],
      notes: "Set up merchandise display before doors open",
    },
  ],
}

// Mock data for team members (for assignee selection)
const mockMembers = {
  "team-1": [
    { id: 1, name: "Alex Johnson", avatar: "/placeholder.svg?height=40&width=40&text=AJ" },
    { id: 2, name: "Sam Rivera", avatar: "/placeholder.svg?height=40&width=40&text=SR" },
    { id: 3, name: "Jamie Lee", avatar: "/placeholder.svg?height=40&width=40&text=JL" },
    { id: 4, name: "Taylor Kim", avatar: "/placeholder.svg?height=40&width=40&text=TK" },
    { id: 5, name: "Morgan Smith", avatar: "/placeholder.svg?height=40&width=40&text=MS" },
  ],
  "team-2": [
    { id: 6, name: "Jordan Patel", avatar: "/placeholder.svg?height=40&width=40&text=JP" },
    { id: 7, name: "Casey Wong", avatar: "/placeholder.svg?height=40&width=40&text=CW" },
    { id: 8, name: "Riley Garcia", avatar: "/placeholder.svg?height=40&width=40&text=RG" },
  ],
  "team-3": [
    { id: 9, name: "Quinn Murphy", avatar: "/placeholder.svg?height=40&width=40&text=QM" },
    { id: 10, name: "Avery Wilson", avatar: "/placeholder.svg?height=40&width=40&text=AW" },
  ],
  "team-4": [
    { id: 11, name: "Dakota Lee", avatar: "/placeholder.svg?height=40&width=40&text=DL" },
    { id: 12, name: "Skyler Chen", avatar: "/placeholder.svg?height=40&width=40&text=SC" },
  ],
  "team-5": [
    { id: 13, name: "Reese Johnson", avatar: "/placeholder.svg?height=40&width=40&text=RJ" },
    { id: 14, name: "Parker Davis", avatar: "/placeholder.svg?height=40&width=40&text=PD" },
  ],
}

interface TeamShiftSchedulerProps {
  teamId: string
}

export function TeamShiftScheduler({ teamId }: TeamShiftSchedulerProps) {
  const [shifts, setShifts] = useState(mockShifts[teamId as keyof typeof mockShifts] || [])
  const [viewMode, setViewMode] = useState("day")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false)
  const [newShift, setNewShift] = useState({
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    assigneeIds: [] as string[],
    notes: "",
  })

  const teamMembers = mockMembers[teamId as keyof typeof mockMembers] || []

  // Format date for display
  const formatDate = (date: Date) => {
    return formatSafeDate(date.toISOString())
  }

  // Navigate to previous/next day or week
  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    if (viewMode === "day") {
      newDate.setDate(currentDate.getDate() + (direction === "next" ? 1 : -1))
    } else {
      newDate.setDate(currentDate.getDate() + (direction === "next" ? 7 : -7))
    }
    setCurrentDate(newDate)
  }

  // Filter shifts for the current view (day or week)
  const getFilteredShifts = () => {
    const currentDateStr = currentDate.toISOString().split("T")[0]

    if (viewMode === "day") {
      return shifts.filter((shift) => shift.date === currentDateStr)
    } else {
      // For week view, get start and end of week
      const startOfWeek = new Date(currentDate)
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()) // Sunday

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6) // Saturday

      return shifts.filter((shift) => {
        const shiftDate = new Date(shift.date)
        return shiftDate >= startOfWeek && shiftDate <= endOfWeek
      })
    }
  }

  const handleAddShift = () => {
    const assignees = newShift.assigneeIds.map((id) => {
      const member = teamMembers.find((m) => m.id.toString() === id)
      return {
        id: Number.parseInt(id),
        name: member?.name || "",
        avatar: member?.avatar || "",
      }
    })

    const newShiftObj = {
      id: shifts.length + 1,
      title: newShift.title,
      date: newShift.date,
      startTime: newShift.startTime,
      endTime: newShift.endTime,
      location: newShift.location,
      assignees,
      notes: newShift.notes,
    }

    setShifts([...shifts, newShiftObj])
    setIsAddShiftOpen(false)
    setNewShift({
      title: "",
      date: "",
      startTime: "",
      endTime: "",
      location: "",
      assigneeIds: [],
      notes: "",
    })
  }

  const handleDeleteShift = (id: number) => {
    setShifts(shifts.filter((shift) => shift.id !== id))
  }

  // Generate week days for week view
  const getWeekDays = () => {
    const days = []
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()) // Sunday

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }

    return days
  }

  // Get shifts for a specific day in week view
  const getShiftsForDay = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0]
    return shifts.filter((shift) => shift.date === dateStr)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Shift Scheduler</h3>
        <div className="flex items-center space-x-2">
          <Tabs value={viewMode} onValueChange={setViewMode} className="w-[180px]">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
            </TabsList>
          </Tabs>
          <Dialog open={isAddShiftOpen} onOpenChange={setIsAddShiftOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Shift
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule New Shift</DialogTitle>
                <DialogDescription>Create a new shift and assign team members.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">
                    Shift Title
                  </Label>
                  <Input
                    id="title"
                    value={newShift.title}
                    onChange={(e) => setNewShift({ ...newShift, title: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date" className="text-right">
                    Date
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={newShift.date}
                    onChange={(e) => setNewShift({ ...newShift, date: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="startTime" className="text-right">
                    Start Time
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={newShift.startTime}
                    onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="endTime" className="text-right">
                    End Time
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={newShift.endTime}
                    onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="location" className="text-right">
                    Location
                  </Label>
                  <Input
                    id="location"
                    value={newShift.location}
                    onChange={(e) => setNewShift({ ...newShift, location: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="assignees" className="text-right">
                    Assignees
                  </Label>
                  <Select
                    onValueChange={(value) => {
                      if (!newShift.assigneeIds.includes(value)) {
                        setNewShift({
                          ...newShift,
                          assigneeIds: [...newShift.assigneeIds, value],
                        })
                      }
                    }}
                  >
                    <SelectTrigger id="assignees" className="col-span-3">
                      <SelectValue placeholder="Add team members" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          <div className="flex items-center">
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarImage src={member.avatar || "/placeholder.svg"} />
                              <AvatarFallback>
                                {member.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            {member.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {newShift.assigneeIds.length > 0 && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <div className="text-right">Selected:</div>
                    <div className="col-span-3 flex flex-wrap gap-2">
                      {newShift.assigneeIds.map((id) => {
                        const member = teamMembers.find((m) => m.id.toString() === id)
                        return (
                          <Badge key={id} variant="secondary" className="flex items-center gap-1">
                            {member?.name}
                            <button
                              onClick={() =>
                                setNewShift({
                                  ...newShift,
                                  assigneeIds: newShift.assigneeIds.filter((a) => a !== id),
                                })
                              }
                              className="ml-1 rounded-full hover:bg-muted p-0.5"
                            >
                              ✕
                            </button>
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="notes" className="text-right">
                    Notes
                  </Label>
                  <Input
                    id="notes"
                    value={newShift.notes}
                    onChange={(e) => setNewShift({ ...newShift, notes: e.target.value })}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddShiftOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddShift}>Schedule Shift</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => navigateDate("prev")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h4 className="text-lg font-medium">
          {viewMode === "day"
            ? formatDate(currentDate)
            : `Week of ${formatDate(getWeekDays()[0])} - ${formatDate(getWeekDays()[6])}`}
        </h4>
        <Button variant="outline" size="icon" onClick={() => navigateDate("next")}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <TabsContent value="day" className="mt-0">
        {getFilteredShifts().length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No shifts scheduled for this day</p>
            <Button variant="outline" className="mt-4" onClick={() => setIsAddShiftOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Schedule a Shift
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {getFilteredShifts().map((shift) => (
              <Card key={shift.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{shift.title}</h4>
                      <div className="flex items-center mt-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>
                          {shift.startTime} - {shift.endTime}
                        </span>
                        <span className="mx-2">•</span>
                        <span>{shift.location}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Shift
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteShift(shift.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Shift
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-4">
                    <h5 className="text-sm font-medium mb-2">Assigned Staff:</h5>
                    <div className="flex flex-wrap gap-2">
                      {shift.assignees.map((assignee) => (
                        <div key={assignee.id} className="flex items-center bg-muted rounded-full px-3 py-1">
                          <Avatar className="h-5 w-5 mr-2">
                            <AvatarImage src={assignee.avatar || "/placeholder.svg"} alt={assignee.name} />
                            <AvatarFallback>
                              {assignee.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{assignee.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {shift.notes && (
                    <div className="mt-4 p-3 bg-muted rounded-md text-sm">
                      <p className="font-medium mb-1">Notes:</p>
                      <p>{shift.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="week" className="mt-0">
        <div className="grid grid-cols-7 gap-2">
          {getWeekDays().map((day, index) => {
            const dayShifts = getShiftsForDay(day)
            const dateStr = formatSafeDate(day.toISOString())
            const dayName = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(day)
            const isToday = new Date().toDateString() === day.toDateString()

            return (
              <div key={index} className="min-h-[200px]">
                <div
                  className={`text-center p-2 mb-2 rounded-t-md ${isToday ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  <div className="font-medium">{dayName}</div>
                  <div className="text-sm">{dateStr}</div>
                </div>
                <div className="space-y-2">
                  {dayShifts.length === 0 ? (
                    <div className="text-center p-4 text-xs text-muted-foreground border border-dashed rounded-md">
                      No shifts
                    </div>
                  ) : (
                    dayShifts.map((shift) => (
                      <Card key={shift.id} className="overflow-hidden">
                        <CardContent className="p-2">
                          <div className="font-medium text-sm">{shift.title}</div>
                          <div className="text-xs text-muted-foreground flex items-center mt-1">
                            <Clock className="h-3 w-3 mr-1" />
                            {shift.startTime} - {shift.endTime}
                          </div>
                          <div className="mt-2 flex -space-x-2">
                            {shift.assignees.map((assignee, i) => (
                              <Avatar key={i} className="h-6 w-6 border-2 border-background">
                                <AvatarImage src={assignee.avatar || "/placeholder.svg"} alt={assignee.name} />
                                <AvatarFallback>
                                  {assignee.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </TabsContent>
    </div>
  )
}
