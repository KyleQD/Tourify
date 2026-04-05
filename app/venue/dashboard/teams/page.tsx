"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlusCircle, Search, Users, CheckSquare, Calendar, MessageCircle, Settings } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSearchParams, useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

// Mock data for teams
const mockTeams = [
  {
    id: "team-1",
    name: "Venue Staff",
    description: "Staff for venue management and operations",
    memberCount: 12,
    type: "Venue",
    color: "bg-blue-500",
    avatar: "/backstage-coordination.png",
  },
  {
    id: "team-2",
    name: "Tech Crew",
    description: "Sound, lighting, and technical support",
    memberCount: 8,
    type: "Technical",
    color: "bg-purple-500",
    avatar: "/cyber-guardian.png",
  },
  {
    id: "team-3",
    name: "Event Team",
    description: "Event planning and coordination",
    memberCount: 6,
    type: "Event",
    color: "bg-green-500",
    avatar: "/diverse-team-planning.png",
  },
  {
    id: "team-4",
    name: "Marketing Team",
    description: "Promotion and social media management",
    memberCount: 5,
    type: "Marketing",
    color: "bg-amber-500",
    avatar: "/strategic-marketing-session.png",
  },
  {
    id: "team-5",
    name: "Tour Management",
    description: "Tour planning and logistics",
    memberCount: 7,
    type: "Tour",
    color: "bg-red-500",
    avatar: "/placeholder.svg?height=80&width=80&text=Tour",
  },
]

export default function TeamsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const [selectedTeam, setSelectedTeam] = useState(mockTeams[0])
  const [searchQuery, setSearchQuery] = useState("")
  const [teamFilter, setTeamFilter] = useState("all")

  // Get the tab from URL or default to "members"
  const defaultTab = searchParams.get("tab") || "members"
  const [activeTab, setActiveTab] = useState(defaultTab)

  // Filter teams based on search query and team type filter
  const filteredTeams = mockTeams.filter((team) => {
    const matchesSearch =
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = teamFilter === "all" || team.type === teamFilter
    return matchesSearch && matchesFilter
  })

  // Handle tab change and update URL
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    router.push(`/venue/dashboard/teams?tab=${value}`, { scroll: false })
  }

  // Handle navigation
  const handleNavigation = (path: string) => {
    toast({
      title: "Navigating",
      description: `Going to ${path}`,
    })
    router.push(path)
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Teams Management</h1>
        <p className="text-muted-foreground">
          Manage your teams, assign tasks, schedule shifts, and communicate with team members.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Teams Sidebar */}
        <Card className="md:col-span-1">
          <CardHeader className="px-4 py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">My Teams</CardTitle>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => handleNavigation("/venue/dashboard/teams")}
              >
                <PlusCircle className="h-4 w-4" />
                <span className="sr-only">Add team</span>
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search teams..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Venue">Venue</SelectItem>
                  <SelectItem value="Technical">Technical</SelectItem>
                  <SelectItem value="Event">Event</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Tour">Tour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-300px)]">
              {filteredTeams.length === 0 ? (
                <div className="px-4 py-3 text-center text-sm text-muted-foreground">No teams found</div>
              ) : (
                <div className="space-y-1 p-2">
                  {filteredTeams.map((team) => (
                    <Button
                      key={team.id}
                      variant={selectedTeam.id === team.id ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setSelectedTeam(team)}
                    >
                      <div className="flex items-center w-full">
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarImage src={team.avatar || "/placeholder.svg"} alt={team.name} />
                          <AvatarFallback className={team.color}>{team.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium">{team.name}</span>
                          <span className="text-xs text-muted-foreground">{team.memberCount} members</span>
                        </div>
                        <Badge variant="outline" className="ml-auto">
                          {team.type}
                        </Badge>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Team Content */}
        <Card className="md:col-span-3">
          <CardHeader className="px-6 py-4">
            <div className="flex items-center">
              <Avatar className="h-10 w-10 mr-4">
                <AvatarImage src={selectedTeam.avatar || "/placeholder.svg"} alt={selectedTeam.name} />
                <AvatarFallback className={selectedTeam.color}>{selectedTeam.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl">{selectedTeam.name}</CardTitle>
                <CardDescription>{selectedTeam.description}</CardDescription>
              </div>
              <Badge variant="outline" className="ml-auto">
                {selectedTeam.type}
              </Badge>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                <TabsTrigger
                  value="members"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Members
                </TabsTrigger>
                <TabsTrigger
                  value="tasks"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Tasks
                </TabsTrigger>
                <TabsTrigger
                  value="shifts"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Shifts
                </TabsTrigger>
                <TabsTrigger
                  value="communication"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Communication
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>
              <TabsContent value="members" className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Team Members</h3>
                    <Button onClick={() => handleNavigation(`/venue/dashboard/teams`)}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Member
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array(selectedTeam.memberCount > 6 ? 6 : selectedTeam.memberCount)
                      .fill(0)
                      .map((_, i) => (
                        <Card key={i} className="bg-gray-750 border-gray-700">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={`/placeholder-letter-M.png?height=40&width=40&text=M${i}`} />
                                <AvatarFallback>M{i}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">Team Member {i + 1}</p>
                                <p className="text-sm text-muted-foreground">
                                  {selectedTeam.type === "Technical"
                                    ? "Technician"
                                    : selectedTeam.type === "Event"
                                      ? "Coordinator"
                                      : selectedTeam.type === "Marketing"
                                        ? "Specialist"
                                        : "Staff"}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="ml-auto"
                                onClick={() => handleNavigation(`/venue/dashboard/teams`)}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-4 w-4"
                                >
                                  <circle cx="12" cy="12" r="1" />
                                  <circle cx="19" cy="12" r="1" />
                                  <circle cx="5" cy="12" r="1" />
                                </svg>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleNavigation(`/venue/dashboard/teams`)}
                  >
                    View All Members
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="tasks" className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Team Tasks</h3>
                    <Button onClick={() => handleNavigation(`/venue/dashboard/teams`)}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {Array(4)
                      .fill(0)
                      .map((_, i) => (
                        <Card key={i} className="bg-gray-750 border-gray-700">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <CheckSquare className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">
                                    {selectedTeam.type === "Technical"
                                      ? "Equipment setup"
                                      : selectedTeam.type === "Event"
                                        ? "Event coordination"
                                        : selectedTeam.type === "Marketing"
                                          ? "Social media update"
                                          : "Venue preparation"}{" "}
                                    {i + 1}
                                  </p>
                                  <p className="text-sm text-muted-foreground">Due in {i + 1} days</p>
                                </div>
                              </div>
                              <Badge variant="outline">{i === 0 ? "High" : i === 1 ? "Medium" : "Low"}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleNavigation(`/venue/dashboard/teams`)}
                  >
                    View All Tasks
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="shifts" className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Team Schedule</h3>
                    <Button onClick={() => handleNavigation(`/venue/dashboard/teams`)}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Manage Schedule
                    </Button>
                  </div>
                  <Card className="bg-gray-750 border-gray-700">
                    <CardContent className="p-4">
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">Schedule Manager</h3>
                        <p className="mt-2 text-sm text-muted-foreground">Manage your team's shifts and schedules</p>
                        <Button className="mt-4" onClick={() => handleNavigation(`/venue/dashboard/teams`)}>
                          Open Schedule Manager
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="communication" className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Team Communication</h3>
                    <Button onClick={() => handleNavigation(`/venue/dashboard/teams`)}>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      New Message
                    </Button>
                  </div>
                  <Card className="bg-gray-750 border-gray-700">
                    <CardContent className="p-4">
                      <div className="text-center py-8">
                        <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">Team Chat</h3>
                        <p className="mt-2 text-sm text-muted-foreground">Communicate with your team members</p>
                        <Button className="mt-4" onClick={() => handleNavigation(`/venue/dashboard/teams`)}>
                          Open Team Chat
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="settings" className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Team Settings</h3>
                    <Button onClick={() => handleNavigation(`/venue/dashboard/teams`)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Settings
                    </Button>
                  </div>
                  <Card className="bg-gray-750 border-gray-700">
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">Team Name</p>
                            <p className="text-sm text-muted-foreground">{selectedTeam.name}</p>
                          </div>
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">Team Type</p>
                            <p className="text-sm text-muted-foreground">{selectedTeam.type}</p>
                          </div>
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">Team Description</p>
                            <p className="text-sm text-muted-foreground">{selectedTeam.description}</p>
                          </div>
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
