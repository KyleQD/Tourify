"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, subDays } from "date-fns"
import { CalendarIcon, Download, TrendingUp, Users, CheckCircle2 } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

// Mock data for analytics
const mockAttendanceData = {
  totalEvents: 24,
  totalAttendees: 4850,
  averageAttendance: 202,
  checkInRate: 87,
  topEvents: [
    { id: 1, title: "Summer Jazz Festival", attendance: 450, capacity: 500, date: "2023-07-15" },
    { id: 2, title: "Rock Night with The Amplifiers", attendance: 380, capacity: 400, date: "2023-06-22" },
    { id: 3, title: "Classical Symphony Orchestra", attendance: 320, capacity: 350, date: "2023-08-05" },
  ],
  recentEvents: [
    { id: 4, title: "Electronic Dance Night", attendance: 280, capacity: 300, date: "2023-05-01" },
    { id: 5, title: "Acoustic Sessions", attendance: 150, capacity: 200, date: "2023-04-28" },
    { id: 6, title: "Comedy Club Special", attendance: 220, capacity: 250, date: "2023-04-25" },
  ],
  attendanceByDay: [
    { day: "Monday", average: 120 },
    { day: "Tuesday", average: 150 },
    { day: "Wednesday", average: 180 },
    { day: "Thursday", average: 210 },
    { day: "Friday", average: 320 },
    { day: "Saturday", average: 380 },
    { day: "Sunday", average: 250 },
  ],
  attendanceByMonth: [
    { month: "Jan", count: 1200 },
    { month: "Feb", count: 1350 },
    { month: "Mar", count: 1500 },
    { month: "Apr", count: 1400 },
    { month: "May", count: 1600 },
    { month: "Jun", count: 1800 },
    { month: "Jul", count: 2100 },
    { month: "Aug", count: 1900 },
    { month: "Sep", count: 1700 },
    { month: "Oct", count: 1550 },
    { month: "Nov", count: 1450 },
    { month: "Dec", count: 1650 },
  ],
  ticketTypeDistribution: [
    { type: "General Admission", percentage: 65 },
    { type: "VIP", percentage: 20 },
    { type: "Early Bird", percentage: 10 },
    { type: "Group", percentage: 5 },
  ],
}

export default function AttendanceAnalytics() {
  const [dateRange, setDateRange] = useState<{
    from: Date
    to: Date
  }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })

  const [timeframe, setTimeframe] = useState("month")

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Attendance Analytics</h2>
          <p className="text-muted-foreground">Track and analyze attendance patterns across all events</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={(range) => range && setDateRange(range as { from: Date; to: Date })}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="mr-4 rounded-full bg-primary/10 p-2">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockAttendanceData.totalEvents}</p>
                <p className="text-xs text-muted-foreground">+4 from last period</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Attendees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="mr-4 rounded-full bg-primary/10 p-2">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockAttendanceData.totalAttendees.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">+12% from last period</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="mr-4 rounded-full bg-primary/10 p-2">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockAttendanceData.averageAttendance}</p>
                <p className="text-xs text-muted-foreground">Per event</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Check-in Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="mr-4 rounded-full bg-primary/10 p-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockAttendanceData.checkInRate}%</p>
                <p className="text-xs text-muted-foreground">Of registered attendees</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Attendance by Day of Week</CardTitle>
                <CardDescription>Average attendance patterns across weekdays</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <div className="h-full w-full bg-muted/20 rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">Bar chart visualization would appear here</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Attendance</CardTitle>
                <CardDescription>Total attendance by month</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <div className="h-full w-full bg-muted/20 rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">Line chart visualization would appear here</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Events by Attendance</CardTitle>
                <CardDescription>Highest attended events in the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockAttendanceData.topEvents.map((event, index) => (
                    <div key={event.id} className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                        <span className="font-bold text-primary">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">{formatSafeDate(event.date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{event.attendance}</p>
                        <p className="text-sm text-muted-foreground">
                          {Math.round((event.attendance / event.capacity) * 100)}% capacity
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ticket Type Distribution</CardTitle>
                <CardDescription>Breakdown of attendance by ticket type</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <div className="h-full w-full bg-muted/20 rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">Pie chart visualization would appear here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Event Attendance Comparison</CardTitle>
              <CardDescription>Compare attendance across different events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full bg-muted/20 rounded-md flex items-center justify-center">
                <p className="text-muted-foreground">Bar chart comparison would appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Trends</CardTitle>
              <CardDescription>Long-term attendance patterns and growth</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full bg-muted/20 rounded-md flex items-center justify-center">
                <p className="text-muted-foreground">Line chart trend analysis would appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demographics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendee Demographics</CardTitle>
              <CardDescription>Breakdown of attendee characteristics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full bg-muted/20 rounded-md flex items-center justify-center">
                <p className="text-muted-foreground">Demographics visualization would appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
