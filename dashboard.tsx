"use client"

import { useEffect, useState, useRef } from "react"
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle,
  DollarSign,
  FileText,
  Globe,
  Home,
  LineChart,
  MapPin,
  MessageSquare,
  Mic,
  Music,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Ticket,
  Truck,
  type LucideIcon,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function Dashboard() {
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [eventProgress, setEventProgress] = useState(65)
  const [ticketSales, setTicketSales] = useState(78)
  const [budgetStatus, setBudgetStatus] = useState(42)
  const [staffReadiness, setStaffReadiness] = useState(85)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState("summer-festival")

  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Simulate data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  // Update time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Simulate changing data
  useEffect(() => {
    const interval = setInterval(() => {
      setTicketSales(Math.floor(Math.random() * 15) + 70)
      setBudgetStatus(Math.floor(Math.random() * 10) + 40)
      setStaffReadiness(Math.floor(Math.random() * 10) + 80)
      setEventProgress(Math.floor(Math.random() * 10) + 60)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Particle effect
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const particles: Particle[] = []
    const particleCount = 80

    class Particle {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      color: string

      constructor() {
        this.x = Math.random() * (canvas?.width || 800)
        this.y = Math.random() * (canvas?.height || 600)
        this.size = Math.random() * 2 + 0.5
        this.speedX = (Math.random() - 0.5) * 0.3
        this.speedY = (Math.random() - 0.5) * 0.3
        this.color = `rgba(${Math.floor(Math.random() * 100) + 150}, ${Math.floor(Math.random() * 100) + 100}, ${Math.floor(Math.random() * 55) + 200}, ${Math.random() * 0.4 + 0.1})`
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY

        if (this.x > (canvas?.width || 800)) this.x = 0
        if (this.x < 0) this.x = canvas?.width || 800
        if (this.y > (canvas?.height || 600)) this.y = 0
        if (this.y < 0) this.y = canvas?.height || 600
      }

      draw() {
        if (!ctx) return
        ctx.fillStyle = this.color
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle())
    }

    function animate() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const particle of particles) {
        particle.update()
        particle.draw()
      }

      requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      if (!canvas) return
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  // Toggle theme
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  // Format time
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date)
  }

  // Format date
  const formatDate = (date: Date) => {
    return formatSafeDate(date.toISOString())
  }

  // Calculate days until event
  const daysUntilEvent = () => {
    const eventDate = new Date("2023-08-15")
    const today = new Date()
    const diffTime = Math.abs(eventDate.getTime() - today.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div
      className={`${theme} min-h-screen bg-gradient-to-br from-indigo-950 to-slate-900 text-slate-100 relative overflow-hidden`}
    >
      {/* Background particle effect */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-30" />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full animate-ping"></div>
              <div className="absolute inset-2 border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-4 border-4 border-r-indigo-500 border-t-transparent border-b-transparent border-l-transparent rounded-full animate-spin-slow"></div>
              <div className="absolute inset-6 border-4 border-b-blue-500 border-t-transparent border-r-transparent border-l-transparent rounded-full animate-spin-slower"></div>
              <div className="absolute inset-8 border-4 border-l-pink-500 border-t-transparent border-r-transparent border-b-transparent rounded-full animate-spin"></div>
            </div>
            <div className="mt-4 text-purple-400 font-mono text-sm tracking-wider">LOADING TOURIFY</div>
          </div>
        </div>
      )}

      <div className="container mx-auto p-4 relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between py-4 border-b border-slate-700/50 mb-6">
          <div className="flex items-center space-x-2">
            <Music className="h-8 w-8 text-purple-500" />
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              TOURIFY
            </span>
          </div>

          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center space-x-1 bg-slate-800/50 rounded-full px-3 py-1.5 border border-slate-700/50 backdrop-blur-sm">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search events, venues, artists..."
                className="bg-transparent border-none focus:outline-none text-sm w-56 placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center space-x-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-slate-100">
                      <Bell className="h-5 w-5" />
                      <span className="absolute -top-1 -right-1 h-2 w-2 bg-purple-500 rounded-full animate-pulse"></span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Notifications</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleTheme}
                      className="text-slate-400 hover:text-slate-100"
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Settings</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Avatar>
                <AvatarImage src="/placeholder.svg?height=40&width=40" alt="User" />
                <AvatarFallback className="bg-slate-700 text-purple-500">EM</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-12 md:col-span-3 lg:col-span-2">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm h-full">
              <CardContent className="p-4">
                <nav className="space-y-2">
                  <NavItem icon={Home} label="Dashboard" active />
                  <NavItem icon={Calendar} label="Events" />
                  <NavItem icon={Ticket} label="Ticketing" />
                  <NavItem icon={Truck} label="Logistics" />
                  <NavItem icon={Users} label="Staff" />
                  <NavItem icon={DollarSign} label="Finances" />
                  <NavItem icon={Package} label="Inventory" />
                  <NavItem icon={MessageSquare} label="Communications" />
                  <NavItem icon={Settings} label="Settings" />
                </nav>

                <div className="mt-8 pt-6 border-t border-slate-700/50">
                  <div className="text-xs text-slate-500 mb-2 font-mono">ACTIVE EVENTS</div>
                  <div className="space-y-3">
                    <StatusItem label="Summer Festival" value={eventProgress} color="purple" />
                    <StatusItem label="Concert Series" value={ticketSales} color="pink" />
                    <StatusItem label="Corporate Event" value={budgetStatus} color="blue" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main dashboard */}
          <div className="col-span-12 md:col-span-9 lg:col-span-7">
            <div className="grid gap-6">
              {/* Event selector */}
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Select defaultValue={selectedEvent} onValueChange={setSelectedEvent}>
                        <SelectTrigger className="w-[240px] bg-slate-800/70 border-slate-700">
                          <SelectValue placeholder="Select Event" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="summer-festival">Summer Music Festival 2023</SelectItem>
                          <SelectItem value="concert-series">Downtown Concert Series</SelectItem>
                          <SelectItem value="corporate-event">TechCorp Annual Conference</SelectItem>
                          <SelectItem value="charity-gala">Charity Fundraiser Gala</SelectItem>
                        </SelectContent>
                      </Select>
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                        {daysUntilEvent()} days until event
                      </Badge>
                    </div>
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      <Plus className="h-4 w-4 mr-2" /> New Event
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Event overview */}
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="border-b border-slate-700/50 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-slate-100 flex items-center">
                      <Activity className="mr-2 h-5 w-5 text-purple-500" />
                      Event Overview
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-slate-800/50 text-purple-400 border-purple-500/50 text-xs">
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-500 mr-1 animate-pulse"></div>
                        LIVE
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MetricCard
                      title="Ticket Sales"
                      value={ticketSales}
                      icon={Ticket}
                      trend="up"
                      color="purple"
                      detail="3,450 / 4,500 sold"
                    />
                    <MetricCard
                      title="Budget Status"
                      value={budgetStatus}
                      icon={DollarSign}
                      trend="stable"
                      color="pink"
                      detail="$84,500 / $200,000"
                    />
                    <MetricCard
                      title="Staff Readiness"
                      value={staffReadiness}
                      icon={Users}
                      trend="up"
                      color="blue"
                      detail="42 confirmed / 50 needed"
                    />
                  </div>

                  <div className="mt-8">
                    <Tabs defaultValue="timeline" className="w-full">
                      <div className="flex items-center justify-between mb-4">
                        <TabsList className="bg-slate-800/50 p-1">
                          <TabsTrigger
                            value="timeline"
                            className="data-[state=active]:bg-slate-700 data-[state=active]:text-purple-400"
                          >
                            Timeline
                          </TabsTrigger>
                          <TabsTrigger
                            value="tasks"
                            className="data-[state=active]:bg-slate-700 data-[state=active]:text-purple-400"
                          >
                            Tasks
                          </TabsTrigger>
                          <TabsTrigger
                            value="logistics"
                            className="data-[state=active]:bg-slate-700 data-[state=active]:text-purple-400"
                          >
                            Logistics
                          </TabsTrigger>
                        </TabsList>

                        <div className="flex items-center space-x-2 text-xs text-slate-400">
                          <div className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-purple-500 mr-1"></div>
                            Planning
                          </div>
                          <div className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-pink-500 mr-1"></div>
                            Execution
                          </div>
                          <div className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-blue-500 mr-1"></div>
                            Post-event
                          </div>
                        </div>
                      </div>

                      <TabsContent value="timeline" className="mt-0">
                        <div className="h-64 w-full relative bg-slate-800/30 rounded-lg border border-slate-700/50 overflow-hidden">
                          <EventTimeline />
                          <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-sm rounded-md px-3 py-2 border border-slate-700/50">
                            <div className="text-xs text-slate-400">Event Progress</div>
                            <div className="text-lg font-mono text-purple-400">{eventProgress}%</div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="tasks" className="mt-0">
                        <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 overflow-hidden">
                          <div className="grid grid-cols-12 text-xs text-slate-400 p-3 border-b border-slate-700/50 bg-slate-800/50">
                            <div className="col-span-1">ID</div>
                            <div className="col-span-5">Task</div>
                            <div className="col-span-2">Assigned To</div>
                            <div className="col-span-2">Due Date</div>
                            <div className="col-span-2">Status</div>
                          </div>

                          <div className="divide-y divide-slate-700/30">
                            <TaskRow
                              id="T-1024"
                              name="Finalize venue contract"
                              assignee="Sarah Johnson"
                              dueDate="Jul 15"
                              status="completed"
                            />
                            <TaskRow
                              id="T-1025"
                              name="Book headline performer"
                              assignee="Michael Chen"
                              dueDate="Jul 18"
                              status="completed"
                            />
                            <TaskRow
                              id="T-1026"
                              name="Arrange transportation for artists"
                              assignee="Jessica Lee"
                              dueDate="Jul 25"
                              status="in-progress"
                            />
                            <TaskRow
                              id="T-1027"
                              name="Finalize stage equipment list"
                              assignee="David Wilson"
                              dueDate="Jul 28"
                              status="in-progress"
                            />
                            <TaskRow
                              id="T-1028"
                              name="Coordinate security team"
                              assignee="Robert Taylor"
                              dueDate="Aug 01"
                              status="pending"
                            />
                            <TaskRow
                              id="T-1029"
                              name="Confirm food vendors"
                              assignee="Amanda Garcia"
                              dueDate="Aug 05"
                              status="pending"
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="logistics" className="mt-0">
                        <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <LogisticsItem
                              name="Main Stage Equipment"
                              status="Confirmed"
                              provider="SoundMasters Pro"
                              delivery="Aug 14, 08:00 AM"
                            />
                            <LogisticsItem
                              name="Artist Transportation"
                              status="In Progress"
                              provider="Elite Transport Services"
                              delivery="Aug 14-16"
                            />
                            <LogisticsItem
                              name="VIP Area Setup"
                              status="Confirmed"
                              provider="EventSpace Designs"
                              delivery="Aug 13, 10:00 AM"
                            />
                            <LogisticsItem
                              name="Food & Beverage"
                              status="Pending"
                              provider="Gourmet Caterers"
                              delivery="Aug 15, 06:00 AM"
                            />
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </CardContent>
              </Card>

              {/* Venue & Finances */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-slate-100 flex items-center text-base">
                      <MapPin className="mr-2 h-5 w-5 text-pink-500" />
                      Venue Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-slate-800/50 rounded-lg overflow-hidden h-32 relative">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/90"></div>
                        <div className="absolute bottom-2 left-2 right-2">
                          <div className="text-sm font-medium text-white">Riverside Amphitheater</div>
                          <div className="text-xs text-slate-300 flex items-center">
                            <MapPin className="h-3 w-3 mr-1" /> 123 River Road, Musicville, CA
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-800/50 rounded-md p-3 border border-slate-700/50">
                          <div className="text-xs text-slate-500 mb-1">Capacity</div>
                          <div className="text-sm font-medium text-slate-200">4,500 people</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-md p-3 border border-slate-700/50">
                          <div className="text-xs text-slate-500 mb-1">Contact</div>
                          <div className="text-sm font-medium text-slate-200">John Venue Manager</div>
                        </div>
                      </div>

                      <div className="pt-2 mt-2 border-t border-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium">Venue Setup Progress</div>
                          <div className="text-sm text-purple-400">45%</div>
                        </div>
                        <Progress value={45} className="h-2 bg-slate-700">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                            style={{ width: "45%" }}
                          />
                        </Progress>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-slate-100 flex items-center text-base">
                      <DollarSign className="mr-2 h-5 w-5 text-green-500" />
                      Financial Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-400">Total Budget</div>
                        <div className="text-sm font-medium text-slate-200">$200,000</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-400">Spent to Date</div>
                        <div className="text-sm font-medium text-slate-200">$84,500</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-400">Remaining</div>
                        <div className="text-sm font-medium text-green-400">$115,500</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-400">Ticket Revenue</div>
                        <div className="text-sm font-medium text-purple-400">$172,500</div>
                      </div>

                      <div className="pt-2 mt-2 border-t border-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium">Budget Utilization</div>
                          <div className="text-sm text-purple-400">{budgetStatus}%</div>
                        </div>
                        <Progress value={budgetStatus} className="h-2 bg-slate-700">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                            style={{ width: `${budgetStatus}%` }}
                          />
                        </Progress>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Staff & Communications */}
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-slate-100 flex items-center text-base">
                    <MessageSquare className="mr-2 h-5 w-5 text-blue-500" />
                    Team Communications
                  </CardTitle>
                  <Badge variant="outline" className="bg-slate-800/50 text-blue-400 border-blue-500/50">
                    3 New Messages
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <CommunicationItem
                      sender="Sarah Johnson"
                      time="15:42:12"
                      message="Venue contract has been signed and finalized. All set for August 15th."
                      avatar="/placeholder.svg?height=40&width=40"
                      unread
                    />
                    <CommunicationItem
                      sender="Michael Chen"
                      time="14:30:45"
                      message="Headline performer confirmed! They'll arrive on August 14th for sound check."
                      avatar="/placeholder.svg?height=40&width=40"
                      unread
                    />
                    <CommunicationItem
                      sender="Jessica Lee"
                      time="12:15:33"
                      message="Transportation schedule for artists is being finalized. Need approval by tomorrow."
                      avatar="/placeholder.svg?height=40&width=40"
                      unread
                    />
                    <CommunicationItem
                      sender="David Wilson"
                      time="09:05:18"
                      message="Stage equipment list is 80% complete. Will finalize after meeting with sound engineers."
                      avatar="/placeholder.svg?height=40&width=40"
                    />
                  </div>
                </CardContent>
                <CardFooter className="border-t border-slate-700/50 pt-4">
                  <div className="flex items-center w-full space-x-2">
                    <input
                      type="text"
                      placeholder="Type a message to the team..."
                      className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <Button size="icon" className="bg-blue-600 hover:bg-blue-700">
                      <Mic className="h-4 w-4" />
                    </Button>
                    <Button size="icon" className="bg-purple-600 hover:bg-purple-700">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="col-span-12 lg:col-span-3">
            <div className="grid gap-6">
              {/* Event countdown */}
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-br from-purple-900 to-indigo-900 p-6 border-b border-slate-700/50">
                    <div className="text-center">
                      <div className="text-xs text-slate-400 mb-1 font-mono">EVENT COUNTDOWN</div>
                      <div className="text-3xl font-mono text-purple-400 mb-1">{daysUntilEvent()} days</div>
                      <div className="text-sm text-slate-400">Until Summer Festival</div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-800/50 rounded-md p-3 border border-slate-700/50">
                        <div className="text-xs text-slate-500 mb-1">Event Date</div>
                        <div className="text-sm font-mono text-slate-200">Aug 15, 2023</div>
                      </div>
                      <div className="bg-slate-800/50 rounded-md p-3 border border-slate-700/50">
                        <div className="text-xs text-slate-500 mb-1">Duration</div>
                        <div className="text-sm font-mono text-slate-200">3 days</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick actions */}
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-slate-100 text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <ActionButton icon={FileText} label="Event Brief" />
                    <ActionButton icon={Truck} label="Logistics" />
                    <ActionButton icon={Users} label="Staff List" />
                    <ActionButton icon={Ticket} label="Ticket Sales" />
                  </div>
                </CardContent>
              </Card>

              {/* Resource allocation */}
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-slate-100 text-base">Resource Allocation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm text-slate-400">Staff</div>
                        <div className="text-xs text-purple-400">84% allocated</div>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                          style={{ width: "84%" }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm text-slate-400">Equipment</div>
                        <div className="text-xs text-pink-400">68% allocated</div>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
                          style={{ width: "68%" }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm text-slate-400">Venue Space</div>
                        <div className="text-xs text-blue-400">55% allocated</div>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                          style={{ width: "55%" }}
                        ></div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-700/50">
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-slate-400">Priority Level</div>
                        <div className="flex items-center">
                          <Slider defaultValue={[4]} max={5} step={1} className="w-24 mr-2" />
                          <span className="text-purple-400">4/5</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming tasks */}
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-slate-100 text-base">Upcoming Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <UpcomingTask
                      title="Arrange transportation for artists"
                      dueDate="Jul 25"
                      priority="high"
                      assignee="Jessica Lee"
                    />
                    <UpcomingTask
                      title="Finalize stage equipment list"
                      dueDate="Jul 28"
                      priority="medium"
                      assignee="David Wilson"
                    />
                    <UpcomingTask
                      title="Coordinate security team"
                      dueDate="Aug 01"
                      priority="high"
                      assignee="Robert Taylor"
                    />
                    <UpcomingTask
                      title="Confirm food vendors"
                      dueDate="Aug 05"
                      priority="medium"
                      assignee="Amanda Garcia"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Weather forecast */}
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-slate-100 text-base flex items-center">
                    <Globe className="mr-2 h-4 w-4 text-blue-500" />
                    Event Weather Forecast
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="text-sm text-slate-400">Aug 15</div>
                      </div>
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-slate-200">Sunny, 78°F</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="text-sm text-slate-400">Aug 16</div>
                      </div>
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-slate-200">Partly Cloudy, 75°F</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="text-sm text-slate-400">Aug 17</div>
                      </div>
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-slate-200">Sunny, 80°F</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Component for nav items
function NavItem({ icon: Icon, label, active }: { icon: LucideIcon; label: string; active?: boolean }) {
  return (
    <Button
      variant="ghost"
      className={`w-full justify-start ${active ? "bg-slate-800/70 text-purple-400" : "text-slate-400 hover:text-slate-100"}`}
    >
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </Button>
  )
}

// Component for status items
function StatusItem({ label, value, color }: { label: string; value: number; color: string }) {
  const getColor = () => {
    switch (color) {
      case "purple":
        return "from-purple-500 to-pink-500"
      case "pink":
        return "from-pink-500 to-purple-500"
      case "blue":
        return "from-blue-500 to-indigo-500"
      default:
        return "from-purple-500 to-pink-500"
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-slate-400">{label}</div>
        <div className="text-xs text-slate-400">{value}%</div>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${getColor()} rounded-full`} style={{ width: `${value}%` }}></div>
      </div>
    </div>
  )
}

// Component for metric cards
function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
  detail,
}: {
  title: string
  value: number
  icon: LucideIcon
  trend: "up" | "down" | "stable"
  color: string
  detail: string
}) {
  const getColor = () => {
    switch (color) {
      case "purple":
        return "from-purple-500 to-pink-500 border-purple-500/30"
      case "pink":
        return "from-pink-500 to-purple-500 border-pink-500/30"
      case "blue":
        return "from-blue-500 to-indigo-500 border-blue-500/30"
      default:
        return "from-purple-500 to-pink-500 border-purple-500/30"
    }
  }

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <BarChart3 className="h-4 w-4 text-green-500" />
      case "down":
        return <BarChart3 className="h-4 w-4 rotate-180 text-red-500" />
      case "stable":
        return <LineChart className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  return (
    <div className={`bg-slate-800/50 rounded-lg border ${getColor()} p-4 relative overflow-hidden`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-slate-400">{title}</div>
        <Icon className={`h-5 w-5 text-${color}-500`} />
      </div>
      <div className="text-2xl font-bold mb-1 bg-gradient-to-r bg-clip-text text-transparent from-slate-100 to-slate-300">
        {value}%
      </div>
      <div className="text-xs text-slate-500">{detail}</div>
      <div className="absolute bottom-2 right-2 flex items-center">{getTrendIcon()}</div>
      <div className="absolute -bottom-6 -right-6 h-16 w-16 rounded-full bg-gradient-to-r opacity-20 blur-xl from-purple-500 to-pink-500"></div>
    </div>
  )
}

// Event timeline component
function EventTimeline() {
  return (
    <div className="h-full w-full flex items-end justify-between px-4 pt-4 pb-8 relative">
      {/* Y-axis labels */}
      <div className="absolute left-2 top-0 h-full flex flex-col justify-between py-4">
        <div className="text-xs text-slate-500">Planning</div>
        <div className="text-xs text-slate-500">Pre-event</div>
        <div className="text-xs text-slate-500">Event Day</div>
        <div className="text-xs text-slate-500">Post-event</div>
      </div>

      {/* X-axis grid lines */}
      <div className="absolute left-0 right-0 top-0 h-full flex flex-col justify-between py-4 px-10">
        <div className="border-b border-slate-700/30 w-full"></div>
        <div className="border-b border-slate-700/30 w-full"></div>
        <div className="border-b border-slate-700/30 w-full"></div>
        <div className="border-b border-slate-700/30 w-full"></div>
      </div>

      {/* Timeline */}
      <div className="absolute left-16 right-10 top-0 bottom-0 flex flex-col justify-center">
        <div className="relative h-1 bg-slate-700/50 rounded-full">
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
            style={{ width: "65%" }}
          ></div>

          {/* Milestone markers */}
          <div className="absolute left-0 top-0 h-4 w-4 -mt-1.5 -ml-2 rounded-full bg-purple-500 border-2 border-slate-900"></div>
          <div className="absolute left-[25%] top-0 h-4 w-4 -mt-1.5 -ml-2 rounded-full bg-purple-500 border-2 border-slate-900"></div>
          <div className="absolute left-[50%] top-0 h-4 w-4 -mt-1.5 -ml-2 rounded-full bg-purple-500 border-2 border-slate-900"></div>
          <div className="absolute left-[65%] top-0 h-4 w-4 -mt-1.5 -ml-2 rounded-full bg-pink-500 border-2 border-slate-900 animate-pulse"></div>
          <div className="absolute left-[75%] top-0 h-4 w-4 -mt-1.5 -ml-2 rounded-full bg-slate-600 border-2 border-slate-900"></div>
          <div className="absolute left-[100%] top-0 h-4 w-4 -mt-1.5 -ml-2 rounded-full bg-slate-600 border-2 border-slate-900"></div>

          {/* Milestone labels */}
          <div className="absolute left-0 top-4 text-xs text-slate-400 -ml-8">Start</div>
          <div className="absolute left-[25%] top-4 text-xs text-slate-400 -ml-10">Planning</div>
          <div className="absolute left-[50%] top-4 text-xs text-slate-400 -ml-12">Pre-event</div>
          <div className="absolute left-[65%] top-4 text-xs text-purple-400 -ml-8">Now</div>
          <div className="absolute left-[75%] top-4 text-xs text-slate-400 -ml-8">Event</div>
          <div className="absolute left-[100%] top-4 text-xs text-slate-400 -ml-10">Wrap-up</div>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-10">
        <div className="text-xs text-slate-500">Jun 1</div>
        <div className="text-xs text-slate-500">Jul 1</div>
        <div className="text-xs text-slate-500">Aug 1</div>
        <div className="text-xs text-slate-500">Sep 1</div>
      </div>
    </div>
  )
}

// Task row component
function TaskRow({
  id,
  name,
  assignee,
  dueDate,
  status,
}: {
  id: string
  name: string
  assignee: string
  dueDate: string
  status: string
}) {
  const getStatusBadge = () => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Completed</Badge>
      case "in-progress":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">In Progress</Badge>
      case "pending":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Pending</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs">{status}</Badge>
    }
  }

  return (
    <div className="grid grid-cols-12 py-2 px-3 text-sm hover:bg-slate-800/50">
      <div className="col-span-1 text-slate-500">{id}</div>
      <div className="col-span-5 text-slate-300">{name}</div>
      <div className="col-span-2 text-slate-400">{assignee}</div>
      <div className="col-span-2 text-purple-400">{dueDate}</div>
      <div className="col-span-2">{getStatusBadge()}</div>
    </div>
  )
}

// Logistics item component
function LogisticsItem({
  name,
  status,
  provider,
  delivery,
}: {
  name: string
  status: string
  provider: string
  delivery: string
}) {
  const getStatusColor = () => {
    switch (status) {
      case "Confirmed":
        return "bg-green-500/10 text-green-400 border-green-500/30"
      case "In Progress":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30"
      case "Pending":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30"
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30"
    }
  }

  return (
    <div className="bg-slate-800/50 rounded-md p-3 border border-slate-700/50">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-slate-300">{name}</div>
        <Badge variant="outline" className={`${getStatusColor()} text-xs`}>
          {status}
        </Badge>
      </div>
      <div className="text-xs text-slate-500 mb-1">
        Provider: <span className="text-slate-400">{provider}</span>
      </div>
      <div className="text-xs text-slate-500">
        Delivery: <span className="text-slate-400">{delivery}</span>
      </div>
    </div>
  )
}

// Communication item component
function CommunicationItem({
  sender,
  time,
  message,
  avatar,
  unread,
}: {
  sender: string
  time: string
  message: string
  avatar: string
  unread?: boolean
}) {
  return (
    <div className={`flex space-x-3 p-2 rounded-md ${unread ? "bg-slate-800/50 border border-slate-700/50" : ""}`}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={avatar} alt={sender} />
        <AvatarFallback className="bg-slate-700 text-purple-500">{sender.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-slate-200">{sender}</div>
          <div className="text-xs text-slate-500">{time}</div>
        </div>
        <div className="text-xs text-slate-400 mt-1">{message}</div>
      </div>
      {unread && (
        <div className="flex-shrink-0 self-center">
          <div className="h-2 w-2 rounded-full bg-purple-500"></div>
        </div>
      )}
    </div>
  )
}

// Action button component
function ActionButton({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <Button
      variant="outline"
      className="h-auto py-3 px-3 border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 flex flex-col items-center justify-center space-y-1 w-full"
    >
      <Icon className="h-5 w-5 text-purple-500" />
      <span className="text-xs">{label}</span>
    </Button>
  )
}

// Upcoming task component
function UpcomingTask({
  title,
  dueDate,
  priority,
  assignee,
}: {
  title: string
  dueDate: string
  priority: "high" | "medium" | "low"
  assignee: string
}) {
  const getPriorityColor = () => {
    switch (priority) {
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "medium":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30"
      case "low":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30"
    }
  }

  return (
    <div className="bg-slate-800/50 rounded-md p-3 border border-slate-700/50">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm text-slate-300">{title}</div>
        <Badge variant="outline" className={`${getPriorityColor()} text-xs`}>
          {priority}
        </Badge>
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="text-slate-500">
          Due: <span className="text-purple-400">{dueDate}</span>
        </div>
        <div className="text-slate-500">{assignee}</div>
      </div>
    </div>
  )
}

// Add missing imports
function Info(props: React.ComponentProps<typeof AlertCircle>) {
  return <AlertCircle {...props} />
}

function Check(props: React.ComponentProps<typeof CheckCircle>) {
  return <CheckCircle {...props} />
}

