"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Users,
  Plus,
  Search,
  MessageSquare,
  UserPlus,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Briefcase,
  Headphones,
  Lightbulb,
  Shield,
  Coffee,
  Star,
  Wrench,
  Award,
  Trash2,
  Edit,
  Save,
  Download,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

// Mock crew profile data
const crewProfiles = [
  {
    id: "crew-1",
    name: "Alex Johnson",
    role: "Sound Engineer",
    avatar: "/focused-sound-engineer.png",
    email: "alex@echolounge.com",
    phone: "(323) 555-1234",
    location: "Los Angeles, CA",
    bio: "Professional sound engineer with 8+ years of experience in live sound mixing and studio recording. Specialized in rock and electronic music events.",
    status: "active",
    availability: "available",
    skills: [
      { name: "Live Mixing", level: 5 },
      { name: "Recording", level: 4 },
      { name: "Troubleshooting", level: 5 },
      { name: "Digital Audio Workstations", level: 4 },
    ],
    equipment: ["Midas M32", "Shure Wireless Systems", "Waves Plugins"],
    certifications: ["Dante Level 2 Certified", "AVIXA CTS"],
    references: ["Sarah Williams - Skyline Studios", "Mike Chen - Live Nation"],
    availabilitySchedule: {
      monday: true,
      tuesday: true,
      wednesday: false,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: false,
    },
    availabilityNotes: "Available for evening events on weekdays, full availability on weekends except Sundays.",
    lastActive: "2 hours ago",
    joinDate: "2023-03-15",
  },
  {
    id: "crew-2",
    name: "Sarah Williams",
    role: "Lighting Technician",
    avatar: "/focused-lighting-tech.png",
    email: "sarah@echolounge.com",
    phone: "(323) 555-5678",
    location: "Los Angeles, CA",
    bio: "Creative lighting designer with experience in concert venues and theatrical productions. Skilled in creating immersive lighting experiences for various music genres.",
    status: "active",
    availability: "busy",
    skills: [
      { name: "DMX Programming", level: 5 },
      { name: "Light Design", level: 5 },
      { name: "Visual Effects", level: 4 },
      { name: "Console Operation", level: 5 },
    ],
    equipment: ["GrandMA2", "Avolites Titan", "Martin Moving Heads"],
    certifications: ["ETCP Certified Entertainment Electrician"],
    references: ["John Davis - Hollywood Bowl", "Lisa Kim - LA Theater Company"],
    availabilitySchedule: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: false,
      friday: false,
      saturday: true,
      sunday: true,
    },
    availabilityNotes: "Currently booked for a production through the end of the month on Thursdays and Fridays.",
    lastActive: "1 day ago",
    joinDate: "2023-02-10",
  },
  {
    id: "crew-3",
    name: "Michael Chen",
    role: "Stage Manager",
    avatar: "/focused-stage-manager.png",
    email: "michael@echolounge.com",
    phone: "(323) 555-9012",
    location: "Los Angeles, CA",
    bio: "Detail-oriented stage manager with experience coordinating large-scale music festivals and intimate venue performances. Strong focus on artist relations and smooth show execution.",
    status: "active",
    availability: "available",
    skills: [
      { name: "Event Coordination", level: 5 },
      { name: "Artist Relations", level: 4 },
      { name: "Scheduling", level: 5 },
      { name: "Crisis Management", level: 4 },
    ],
    equipment: ["Clear-Com Systems", "Production Management Software"],
    certifications: ["Event Safety Alliance Certified", "First Aid & CPR"],
    references: ["Robert Johnson - Coachella", "Emma Davis - Live Nation"],
    availabilitySchedule: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: false,
    },
    availabilityNotes:
      "Available for most events with advance notice. Requires one day off per week (typically Sunday).",
    lastActive: "5 hours ago",
    joinDate: "2023-01-20",
  },
  {
    id: "crew-4",
    name: "Jessica Rodriguez",
    role: "Bar Manager",
    avatar: "/confident-bar-manager.png",
    email: "jessica@echolounge.com",
    phone: "(323) 555-3456",
    location: "Los Angeles, CA",
    bio: "Experienced bar manager with a background in craft cocktails and efficient service operations. Skilled at managing high-volume service during sold-out events.",
    status: "active",
    availability: "offline",
    skills: [
      { name: "Inventory Management", level: 5 },
      { name: "Staff Supervision", level: 4 },
      { name: "Customer Service", level: 5 },
      { name: "Craft Cocktails", level: 4 },
    ],
    equipment: ["POS Systems", "Inventory Management Software"],
    certifications: ["ServSafe Alcohol Certified", "Cicerone Certified Beer Server"],
    references: ["David Lee - Hospitality Group", "Maria Garcia - Nightlife Ventures"],
    availabilitySchedule: {
      monday: false,
      tuesday: false,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true,
    },
    availabilityNotes: "Available Wednesday through Sunday. Mondays and Tuesdays are reserved for family commitments.",
    lastActive: "3 days ago",
    joinDate: "2023-04-05",
  },
  {
    id: "crew-5",
    name: "David Kim",
    role: "Security Lead",
    avatar: "/confident-security-expert.png",
    email: "david@echolounge.com",
    phone: "(323) 555-7890",
    location: "Los Angeles, CA",
    bio: "Former military professional with extensive experience in event security and crowd management. Specialized in maintaining safe environments while ensuring positive guest experiences.",
    status: "inactive",
    availability: "offline",
    skills: [
      { name: "Crowd Management", level: 5 },
      { name: "Risk Assessment", level: 5 },
      { name: "Emergency Response", level: 5 },
      { name: "Team Leadership", level: 4 },
    ],
    equipment: ["Radio Communication Systems", "Security Monitoring Equipment"],
    certifications: ["Guard Card", "Advanced Security Training", "First Aid & CPR"],
    references: ["James Wilson - Security Solutions", "Thomas Brown - Festival Operations"],
    availabilitySchedule: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    },
    availabilityNotes: "Available Monday through Friday. Currently on leave until next month.",
    lastActive: "1 week ago",
    joinDate: "2023-02-15",
  },
]

// Role options for dropdown
const roleOptions = [
  "Sound Engineer",
  "Lighting Technician",
  "Stage Manager",
  "Bar Manager",
  "Security Lead",
  "Production Manager",
  "Backline Technician",
  "Video Technician",
  "Front of House Manager",
  "Merchandise Manager",
  "Box Office Manager",
  "Promoter",
  "Tour Manager",
  "Artist Liaison",
  "Rigger",
]

// Role icons mapping
const roleIcons: Record<string, React.ReactNode> = {
  "Sound Engineer": <Headphones className="h-4 w-4" />,
  "Lighting Technician": <Lightbulb className="h-4 w-4" />,
  "Stage Manager": <Briefcase className="h-4 w-4" />,
  "Bar Manager": <Coffee className="h-4 w-4" />,
  "Security Lead": <Shield className="h-4 w-4" />,
}

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  if (status === "available") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        <CheckCircle className="h-3 w-3 mr-1" /> Available
      </Badge>
    )
  } else if (status === "limited") {
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
        <Clock className="h-3 w-3 mr-1" /> Limited
      </Badge>
    )
  } else {
    return (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
        <XCircle className="h-3 w-3 mr-1" /> Unavailable
      </Badge>
    )
  }
}

// Skill level component
const SkillLevel = ({ level }: { level: number }) => {
  let color = "bg-red-500"
  if (level >= 90) color = "bg-green-500"
  else if (level >= 70) color = "bg-emerald-500"
  else if (level >= 50) color = "bg-amber-500"
  else if (level >= 30) color = "bg-orange-500"

  return (
    <div className="flex items-center gap-2 w-full">
      <Progress value={level} className="h-2" />
      <span className="text-xs font-medium w-8">{level}%</span>
    </div>
  )
}

// Weekly availability component
const WeeklyAvailability = ({ schedule }: { schedule: Record<string, boolean> }) => {
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
  const shortDays = ["M", "T", "W", "T", "F", "S", "S"]

  return (
    <div className="flex justify-between mt-2">
      {days.map((day, index) => (
        <div
          key={day}
          className={`flex flex-col items-center justify-center w-8 h-8 rounded-full text-xs
            ${
              schedule[day]
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-gray-100 text-gray-400 border border-gray-200"
            }`}
        >
          <span>{shortDays[index]}</span>
        </div>
      ))}
    </div>
  )
}

export function CrewProfileManager() {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null)
  const [isAddingProfile, setIsAddingProfile] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)

  // Filter crew profiles based on active tab and search query
  const filteredProfiles = crewProfiles.filter((profile) => {
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "active" && profile.status === "active") ||
      (activeTab === "inactive" && profile.status === "inactive") ||
      (activeTab === "available" && profile.availability === "available")

    const matchesSearch =
      profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.email.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesTab && matchesSearch
  })

  const handleAddProfile = () => {
    setIsAddingProfile(true)
    toast({
      title: "Add Crew Profile",
      description: "Creating a new crew member profile",
    })
  }

  const handleEditProfile = (id: string) => {
    setSelectedProfile(id)
    setIsEditingProfile(true)
    toast({
      title: "Edit Profile",
      description: "Editing crew member profile",
    })
  }

  const handleViewProfile = (id: string) => {
    setSelectedProfile(id)
    toast({
      title: "View Profile",
      description: "Viewing crew member profile",
    })
  }

  const handleSaveProfile = () => {
    setIsAddingProfile(false)
    setIsEditingProfile(false)
    setSelectedProfile(null)
    toast({
      title: "Profile Saved",
      description: "Crew member profile has been saved successfully",
    })
  }

  const handleDeleteProfile = (id: string) => {
    toast({
      title: "Profile Deleted",
      description: "Crew member profile has been deleted",
      variant: "destructive",
    })
  }

  const handleActivateProfile = (id: string, currentStatus: string) => {
    toast({
      title: currentStatus === "active" ? "Profile Deactivated" : "Profile Activated",
      description: `Crew member profile has been ${currentStatus === "active" ? "deactivated" : "activated"}`,
    })
  }

  // Get the selected profile data
  const selectedProfileData = selectedProfile ? crewProfiles.find((profile) => profile.id === selectedProfile) : null

  // Render skill level stars
  const renderSkillLevel = (level: number) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      if (i <= level) {
        stars.push(<Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />)
      } else {
        stars.push(<Star key={i} className="h-4 w-4 text-gray-300" />)
      }
    }
    return <div className="flex">{stars}</div>
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Crew Profiles</h1>
          <p className="text-muted-foreground">Manage detailed profiles for your venue crew members</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/team")}>
            <Users className="h-4 w-4 mr-2" />
            Team Overview
          </Button>
          <Button onClick={handleAddProfile}>
            <Plus className="h-4 w-4 mr-2" />
            Add Crew Profile
          </Button>
        </div>
      </div>

      {/* Crew profiles tabs and search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="available">Available</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search crew profiles..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Crew profiles grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProfiles.map((profile) => (
          <Card key={profile.id} className="overflow-hidden">
            <CardHeader className="p-4 pb-0">
              <div className="flex justify-between items-start">
                <Badge
                  variant={profile.status === "active" ? "default" : "secondary"}
                  className={profile.status === "active" ? "bg-green-500" : "bg-gray-500"}
                >
                  {profile.status === "active" ? "Active" : "Inactive"}
                </Badge>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleActivateProfile(profile.id, profile.status)}
                    title={profile.status === "active" ? "Deactivate Profile" : "Activate Profile"}
                  >
                    {profile.status === "active" ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditProfile(profile.id)}
                    title="Edit Profile"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-20 w-20 mb-2">
                  <AvatarImage src={profile.avatar || "/placeholder.svg"} alt={profile.name} />
                  <AvatarFallback>
                    {profile.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-lg">{profile.name}</h3>
                <div className="flex items-center gap-1 text-muted-foreground">
                  {roleIcons[profile.role] || <Briefcase className="h-4 w-4" />}
                  <span>{profile.role}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{profile.email}</p>

                <div className="flex items-center gap-1 mt-3">
                  {profile.availability === "available" && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Available
                    </Badge>
                  )}
                  {profile.availability === "busy" && (
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                      <Clock className="h-3 w-3 mr-1" />
                      Busy
                    </Badge>
                  )}
                  {profile.availability === "offline" && (
                    <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">
                      <XCircle className="h-3 w-3 mr-1" />
                      Offline
                    </Badge>
                  )}
                </div>

                <div className="w-full mt-4">
                  <div className="text-xs text-muted-foreground mb-1">Top Skills</div>
                  <div className="space-y-2">
                    {profile.skills.slice(0, 3).map((skill, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-xs">{skill.name}</span>
                        <div className="flex">{renderSkillLevel(skill.level)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-0 flex flex-col gap-2">
              <div className="text-xs text-muted-foreground w-full text-center">Last active: {profile.lastActive}</div>
              <div className="flex gap-2 w-full">
                <Button variant="outline" size="sm" className="flex-1">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </Button>
                <Button size="sm" className="flex-1" onClick={() => handleViewProfile(profile.id)}>
                  View Profile
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}

        {/* Add crew profile card */}
        <Card className="flex flex-col items-center justify-center p-6 border-dashed">
          <div className="rounded-full bg-primary/10 p-3 mb-4">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-medium mb-1">Add Crew Profile</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Create detailed profiles for your venue crew members
          </p>
          <Button onClick={handleAddProfile}>
            <Plus className="h-4 w-4 mr-2" />
            Add Profile
          </Button>
        </Card>
      </div>

      {/* Profile detail dialog */}
      {selectedProfileData && (
        <Dialog open={selectedProfile !== null} onOpenChange={(open) => !open && setSelectedProfile(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{isEditingProfile ? "Edit Crew Profile" : "Crew Profile Details"}</DialogTitle>
              <DialogDescription>
                {isEditingProfile
                  ? "Update information for this crew member"
                  : "Detailed information about this crew member"}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6 pb-4">
                {/* Profile header */}
                <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                  <Avatar className="h-24 w-24">
                    <AvatarImage
                      src={selectedProfileData.avatar || "/placeholder.svg"}
                      alt={selectedProfileData.name}
                    />
                    <AvatarFallback>
                      {selectedProfileData.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-2 text-center md:text-left">
                    {isEditingProfile ? (
                      <>
                        <div className="space-y-1">
                          <Label htmlFor="name">Full Name</Label>
                          <Input id="name" defaultValue={selectedProfileData.name} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label htmlFor="role">Role</Label>
                            <Select defaultValue={selectedProfileData.role}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                {roleOptions.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {role}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="status">Status</Label>
                            <Select defaultValue={selectedProfileData.status}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <h2 className="text-2xl font-bold">{selectedProfileData.name}</h2>
                        <div className="flex items-center justify-center md:justify-start gap-2">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            {roleIcons[selectedProfileData.role] || <Briefcase className="h-4 w-4" />}
                            <span>{selectedProfileData.role}</span>
                          </div>
                          <Badge
                            variant={selectedProfileData.status === "active" ? "default" : "secondary"}
                            className={selectedProfileData.status === "active" ? "bg-green-500" : "bg-gray-500"}
                          >
                            {selectedProfileData.status === "active" ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </>
                    )}

                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                      {selectedProfileData.availability === "available" && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Available
                        </Badge>
                      )}
                      {selectedProfileData.availability === "busy" && (
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                          <Clock className="h-3 w-3 mr-1" />
                          Busy
                        </Badge>
                      )}
                      {selectedProfileData.availability === "offline" && (
                        <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">
                          <XCircle className="h-3 w-3 mr-1" />
                          Offline
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Contact information */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Contact Information</h3>
                  {isEditingProfile ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" defaultValue={selectedProfileData.email} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" defaultValue={selectedProfileData.phone} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="location">Location</Label>
                        <Input id="location" defaultValue={selectedProfileData.location} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p>{selectedProfileData.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p>{selectedProfileData.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p>{selectedProfileData.location}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Member Since</p>
                        <p>{formatSafeDate(selectedProfileData.joinDate)}</p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Bio */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Professional Bio</h3>
                  {isEditingProfile ? (
                    <div className="space-y-1">
                      <Textarea rows={4} defaultValue={selectedProfileData.bio} />
                    </div>
                  ) : (
                    <p>{selectedProfileData.bio}</p>
                  )}
                </div>

                <Separator />

                {/* Skills */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Skills & Expertise</h3>
                  {isEditingProfile ? (
                    <div className="space-y-4">
                      {selectedProfileData.skills.map((skill, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <div className="flex-1">
                            <Input defaultValue={skill.name} />
                          </div>
                          <div className="flex-1">
                            <Select defaultValue={skill.level.toString()}>
                              <SelectTrigger>
                                <SelectValue placeholder="Skill level" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Beginner</SelectItem>
                                <SelectItem value="2">Basic</SelectItem>
                                <SelectItem value="3">Intermediate</SelectItem>
                                <SelectItem value="4">Advanced</SelectItem>
                                <SelectItem value="5">Expert</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Skill
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedProfileData.skills.map((skill, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span>{skill.name}</span>
                          <div className="flex">{renderSkillLevel(skill.level)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Equipment expertise */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Equipment Expertise</h3>
                  {isEditingProfile ? (
                    <div className="space-y-4">
                      {selectedProfileData.equipment.map((item, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <div className="flex-1">
                            <Input defaultValue={item} />
                          </div>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Equipment
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedProfileData.equipment.map((item, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-blue-500/10 text-blue-500 border-blue-500/20"
                        >
                          <Wrench className="h-3 w-3 mr-1" />
                          {item}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Certifications */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Certifications & Qualifications</h3>
                  {isEditingProfile ? (
                    <div className="space-y-4">
                      {selectedProfileData.certifications.map((cert, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <div className="flex-1">
                            <Input defaultValue={cert} />
                          </div>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Certification
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedProfileData.certifications.map((cert, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-yellow-500" />
                          <span>{cert}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* References */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Professional References</h3>
                  {isEditingProfile ? (
                    <div className="space-y-4">
                      {selectedProfileData.references.map((ref, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <div className="flex-1">
                            <Input defaultValue={ref} />
                          </div>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Reference
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedProfileData.references.map((ref, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-500" />
                          <span>{ref}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Availability */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Availability</h3>
                  {isEditingProfile ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-7 gap-2">
                        {Object.entries(selectedProfileData.availabilitySchedule).map(([day, isAvailable]) => (
                          <div key={day} className="flex flex-col items-center">
                            <span className="text-sm mb-1">{day.charAt(0).toUpperCase() + day.slice(1, 3)}</span>
                            <div className="h-10 w-10 rounded-full flex items-center justify-center border">
                              <Switch checked={isAvailable} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="availabilityNotes">Availability Notes</Label>
                        <Textarea
                          id="availabilityNotes"
                          rows={3}
                          defaultValue={selectedProfileData.availabilityNotes}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="availabilityStatus">Current Status</Label>
                        <Select defaultValue={selectedProfileData.availability}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select availability" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="busy">Busy</SelectItem>
                            <SelectItem value="offline">Offline</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-7 gap-2">
                        {Object.entries(selectedProfileData.availabilitySchedule).map(([day, isAvailable]) => (
                          <div key={day} className="flex flex-col items-center">
                            <span className="text-sm mb-1">{day.charAt(0).toUpperCase() + day.slice(1, 3)}</span>
                            <div
                              className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                isAvailable
                                  ? "bg-green-500/20 text-green-500 border border-green-500/30"
                                  : "bg-gray-500/10 text-gray-500 border border-gray-500/30"
                              }`}
                            >
                              {isAvailable ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Availability Notes</p>
                        <p>{selectedProfileData.availabilityNotes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="pt-4 border-t">
              {isEditingProfile ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditingProfile(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={() => handleDeleteProfile(selectedProfileData.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Profile
                  </Button>
                  <Button onClick={handleSaveProfile}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setSelectedProfile(null)}>
                    Close
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Profile
                  </Button>
                  <Button onClick={() => setIsEditingProfile(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add profile dialog */}
      <Dialog open={isAddingProfile} onOpenChange={setIsAddingProfile}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add New Crew Profile</DialogTitle>
            <DialogDescription>Create a detailed profile for a new crew member</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 pb-4">
              {/* Basic information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="newName">Full Name</Label>
                    <Input id="newName" placeholder="Enter full name" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="newRole">Role</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="newEmail">Email</Label>
                    <Input id="newEmail" type="email" placeholder="Enter email address" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="newPhone">Phone</Label>
                    <Input id="newPhone" placeholder="Enter phone number" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="newLocation">Location</Label>
                    <Input id="newLocation" placeholder="Enter location" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="newStatus">Status</Label>
                    <Select defaultValue="active">
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Professional bio */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Professional Bio</h3>
                <div className="space-y-1">
                  <Label htmlFor="newBio">Bio</Label>
                  <Textarea id="newBio" placeholder="Enter professional background and experience" rows={4} />
                </div>
              </div>

              <Separator />

              {/* Skills */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Skills & Expertise</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Input placeholder="Enter skill name" />
                    </div>
                    <div className="flex-1">
                      <Select defaultValue="3">
                        <SelectTrigger>
                          <SelectValue placeholder="Skill level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Beginner</SelectItem>
                          <SelectItem value="2">Basic</SelectItem>
                          <SelectItem value="3">Intermediate</SelectItem>
                          <SelectItem value="4">Advanced</SelectItem>
                          <SelectItem value="5">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Skill
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Availability */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Availability</h3>
                <div className="grid grid-cols-7 gap-2">
                  {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => (
                    <div key={day} className="flex flex-col items-center">
                      <span className="text-sm mb-1">{day.charAt(0).toUpperCase() + day.slice(1, 3)}</span>
                      <div className="h-10 w-10 rounded-full flex items-center justify-center border">
                        <Switch
                          defaultChecked={["monday", "tuesday", "wednesday", "thursday", "friday"].includes(day)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="newAvailabilityNotes">Availability Notes</Label>
                  <Textarea id="newAvailabilityNotes" placeholder="Enter any notes about availability" rows={3} />
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setIsAddingProfile(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile}>
              <Save className="h-4 w-4 mr-2" />
              Create Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
