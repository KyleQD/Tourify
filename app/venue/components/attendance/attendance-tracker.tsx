"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle2, Clock, Download, Search, UserPlus, X, QrCode } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import QRCode from "./qr-code-scanner"
import { useRouter } from "next/navigation"
import { formatSafeDate, formatSafeTime } from "@/lib/events/admin-event-normalization"

interface Attendee {
  id: string
  name: string
  email: string
  ticketType: string
  ticketId: string
  checkedIn: boolean
  checkInTime?: string
  notes?: string
}

interface AttendanceTrackerProps {
  eventId: string | number
  eventTitle: string
  eventDate: Date
  capacity: number
}

export default function AttendanceTracker({ eventId, eventTitle, eventDate, capacity }: AttendanceTrackerProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("list")
  const [searchQuery, setSearchQuery] = useState("")
  const [showScanner, setShowScanner] = useState(false)
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null)
  const router = useRouter()

  // Mock data - in a real app, this would come from an API
  const [attendees, setAttendees] = useState<Attendee[]>([
    {
      id: "a1",
      name: "Alex Johnson",
      email: "alex@example.com",
      ticketType: "VIP",
      ticketId: "VIP-001",
      checkedIn: true,
      checkInTime: "2023-05-04T18:30:00",
    },
    {
      id: "a2",
      name: "Sam Wilson",
      email: "sam@example.com",
      ticketType: "General",
      ticketId: "GEN-045",
      checkedIn: true,
      checkInTime: "2023-05-04T19:15:00",
    },
    {
      id: "a3",
      name: "Jamie Smith",
      email: "jamie@example.com",
      ticketType: "General",
      ticketId: "GEN-102",
      checkedIn: false,
    },
    {
      id: "a4",
      name: "Taylor Brown",
      email: "taylor@example.com",
      ticketType: "VIP",
      ticketId: "VIP-022",
      checkedIn: false,
    },
    {
      id: "a5",
      name: "Jordan Lee",
      email: "jordan@example.com",
      ticketType: "General",
      ticketId: "GEN-187",
      checkedIn: true,
      checkInTime: "2023-05-04T20:05:00",
    },
  ])

  // Filter attendees based on search query
  const filteredAttendees = attendees.filter(
    (attendee) =>
      attendee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attendee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attendee.ticketId.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Calculate attendance metrics
  const totalAttendees = attendees.length
  const checkedInCount = attendees.filter((a) => a.checkedIn).length
  const attendanceRate = capacity > 0 ? Math.round((totalAttendees / capacity) * 100) : 0
  const checkInRate = totalAttendees > 0 ? Math.round((checkedInCount / totalAttendees) * 100) : 0

  // Ticket type breakdown
  const vipCount = attendees.filter((a) => a.ticketType === "VIP").length
  const generalCount = attendees.filter((a) => a.ticketType === "General").length
  const vipPercentage = totalAttendees > 0 ? Math.round((vipCount / totalAttendees) * 100) : 0
  const generalPercentage = totalAttendees > 0 ? Math.round((generalCount / totalAttendees) * 100) : 0

  // Handle check-in
  const handleCheckIn = (attendeeId: string) => {
    setAttendees((prev) =>
      prev.map((attendee) => {
        if (attendee.id === attendeeId) {
          const now = new Date()
          return {
            ...attendee,
            checkedIn: !attendee.checkedIn,
            checkInTime: attendee.checkedIn ? undefined : now.toISOString(),
          }
        }
        return attendee
      }),
    )

    const attendee = attendees.find((a) => a.id === attendeeId)
    if (attendee) {
      toast({
        title: attendee.checkedIn ? "Check-in Reversed" : "Checked In Successfully",
        description: `${attendee.name} has been ${attendee.checkedIn ? "unchecked" : "checked"} in.`,
        variant: attendee.checkedIn ? "destructive" : "default",
      })
    }
  }

  // Handle QR code scan result
  const handleScanResult = (result: string) => {
    // In a real app, you would validate the QR code against your ticket database
    // For this demo, we'll just check if it matches any ticket IDs
    const attendee = attendees.find((a) => a.ticketId === result)

    if (attendee) {
      handleCheckIn(attendee.id)
      setShowScanner(false)
    } else {
      toast({
        title: "Invalid Ticket",
        description: "No matching ticket found for this QR code.",
        variant: "destructive",
      })
    }
  }

  // Handle adding a new attendee
  const handleAddAttendee = () => {
    // In a real app, this would open a form to add a new attendee
    // For this demo, we'll just add a mock attendee
    const newAttendee: Attendee = {
      id: `a${attendees.length + 1}`,
      name: "New Attendee",
      email: "new@example.com",
      ticketType: "General",
      ticketId: `GEN-${Math.floor(Math.random() * 1000)}`,
      checkedIn: false,
    }

    setAttendees((prev) => [...prev, newAttendee])
    toast({
      title: "Attendee Added",
      description: "New attendee has been added to the event.",
    })
  }

  // Handle exporting attendance data
  const handleExportData = () => {
    // Create a dropdown menu or modal for export options
    const exportOptions = [
      { id: "csv", label: "Export to CSV" },
      { id: "excel", label: "Export to Excel" },
      { id: "ticketing", label: "Export to Ticketing Platform" },
    ]

    // For this demo, we'll just show a toast and simulate the download
    toast({
      title: "Export Options",
      description: "Choose your export format or destination",
      action: (
        <div className="flex gap-2 mt-2">
          <Button size="sm" onClick={() => exportToFile("csv")}>
            CSV
          </Button>
          <Button size="sm" onClick={() => exportToFile("excel")}>
            Excel
          </Button>
          <Button size="sm" onClick={() => exportToTicketingPlatform()}>
            Ticketing Platform
          </Button>
        </div>
      ),
    })
  }

  // Export to file (CSV or Excel)
  const exportToFile = (format: string) => {
    toast({
      title: `${format.toUpperCase()} Export Started`,
      description: `Attendance data is being exported to ${format.toUpperCase()}. It will download shortly.`,
    })

    // Mock download after a short delay
    setTimeout(() => {
      const element = document.createElement("a")
      const file = new Blob([JSON.stringify(attendees, null, 2)], { type: "application/json" })
      element.href = URL.createObjectURL(file)
      element.download = `attendance-${eventId}-${new Date().toISOString().split("T")[0]}.${format}`
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
    }, 1000)
  }

  // Export to ticketing platform
  const exportToTicketingPlatform = () => {
    toast({
      title: "Redirecting to Export Tool",
      description: "Opening the ticketing platform export tool...",
    })

    router.push("/integrations/export")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{eventTitle} Attendance</h2>
          <p className="text-muted-foreground">
            {formatSafeDate(eventDate.toISOString())} • {totalAttendees} attendees
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowScanner(true)}>
            <QrCode className="h-4 w-4 mr-2" />
            Scan QR Code
          </Button>
          <Button variant="outline" onClick={handleAddAttendee}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Attendee
          </Button>
          <Button variant="outline" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* QR Code Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Scan Ticket QR Code</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowScanner(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <QRCode onScan={handleScanResult} />
            <p className="text-sm text-center mt-4 text-muted-foreground">
              Position the QR code within the scanner area
            </p>
          </div>
        </div>
      )}

      {/* Attendance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Attendees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold">{totalAttendees}</p>
                <p className="text-xs text-muted-foreground">
                  {capacity ? `of ${capacity} capacity` : "No capacity set"}
                </p>
              </div>
              <div className="w-24">
                <Progress value={attendanceRate} className="h-2" />
                <p className="text-xs text-right mt-1">{attendanceRate}% full</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Checked In</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold">{checkedInCount}</p>
                <p className="text-xs text-muted-foreground">of {totalAttendees} registered</p>
              </div>
              <div className="w-24">
                <Progress value={checkInRate} className="h-2" />
                <p className="text-xs text-right mt-1">{checkInRate}% checked in</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ticket Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">VIP</span>
                <span className="text-sm font-medium">{vipCount}</span>
              </div>
              <Progress value={vipPercentage} className="h-2" />

              <div className="flex justify-between mt-2">
                <span className="text-sm">General</span>
                <span className="text-sm font-medium">{generalCount}</span>
              </div>
              <Progress value={generalPercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="list">Attendee List</TabsTrigger>
          <TabsTrigger value="checkin">Check-in Status</TabsTrigger>
        </TabsList>

        {/* Search Bar */}
        <div className="relative my-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or ticket ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <TabsContent value="list" className="mt-0">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No attendees found matching your search
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAttendees.map((attendee) => (
                      <TableRow key={attendee.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={`/abstract-geometric-shapes.png?height=32&width=32&query=${attendee.name}`}
                              />
                              <AvatarFallback>{attendee.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span>{attendee.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{attendee.email}</TableCell>
                        <TableCell>
                          <Badge variant={attendee.ticketType === "VIP" ? "default" : "secondary"}>
                            {attendee.ticketType}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">{attendee.ticketId}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {attendee.checkedIn ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span className="text-sm">Checked In</span>
                              </>
                            ) : (
                              <>
                                <Clock className="h-4 w-4 text-amber-500" />
                                <span className="text-sm">Not Checked In</span>
                              </>
                            )}
                          </div>
                          {attendee.checkInTime && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatSafeTime(attendee.checkInTime)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleCheckIn(attendee.id)}>
                            {attendee.checkedIn ? "Undo Check-in" : "Check In"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checkin" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Check-in Status</CardTitle>
              <CardDescription>
                {checkedInCount} of {totalAttendees} attendees checked in ({checkInRate}%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between mb-2">
                    <h3 className="font-medium">Overall Check-in Progress</h3>
                    <span>
                      {checkedInCount}/{totalAttendees}
                    </span>
                  </div>
                  <Progress value={checkInRate} className="h-3" />
                </div>

                <div>
                  <h3 className="font-medium mb-4">Check-in by Ticket Type</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <div className="flex items-center">
                          <Badge variant="default" className="mr-2">
                            VIP
                          </Badge>
                          <span>VIP Tickets</span>
                        </div>
                        <span>
                          {attendees.filter((a) => a.ticketType === "VIP" && a.checkedIn).length}/{vipCount}
                        </span>
                      </div>
                      <Progress
                        value={
                          vipCount > 0
                            ? (attendees.filter((a) => a.ticketType === "VIP" && a.checkedIn).length / vipCount) * 100
                            : 0
                        }
                        className="h-2"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <div className="flex items-center">
                          <Badge variant="secondary" className="mr-2">
                            GEN
                          </Badge>
                          <span>General Admission</span>
                        </div>
                        <span>
                          {attendees.filter((a) => a.ticketType === "General" && a.checkedIn).length}/{generalCount}
                        </span>
                      </div>
                      <Progress
                        value={
                          generalCount > 0
                            ? (attendees.filter((a) => a.ticketType === "General" && a.checkedIn).length /
                                generalCount) *
                              100
                            : 0
                        }
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-4">Check-in Timeline</h3>
                  <div className="h-[200px] w-full bg-muted/20 rounded-md flex items-center justify-center">
                    <p className="text-muted-foreground">Check-in timeline chart would appear here</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
