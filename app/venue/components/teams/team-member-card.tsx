"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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
import { Textarea } from "@/components/ui/textarea"
import { PlusCircle, Search, Mail, Phone, MoreHorizontal, Edit, Trash2, UserPlus } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button as ButtonLink } from "@/components/ui/button"

// Mock data for team members
const mockMembers = {
  "team-1": [
    {
      id: 1,
      name: "Alex Johnson",
      role: "Venue Manager",
      avatar: "/placeholder.svg?height=40&width=40&text=AJ",
      email: "alex@example.com",
      phone: "555-123-4567",
      skills: ["Management", "Customer Service", "Scheduling"],
    },
    {
      id: 2,
      name: "Sam Rivera",
      role: "Assistant Manager",
      avatar: "/placeholder.svg?height=40&width=40&text=SR",
      email: "sam@example.com",
      phone: "555-234-5678",
      skills: ["Staff Training", "Inventory", "Event Planning"],
    },
    {
      id: 3,
      name: "Jamie Lee",
      role: "Bar Manager",
      avatar: "/placeholder.svg?height=40&width=40&text=JL",
      email: "jamie@example.com",
      phone: "555-345-6789",
      skills: ["Mixology", "Inventory Management", "Staff Supervision"],
    },
    {
      id: 4,
      name: "Taylor Kim",
      role: "Security Lead",
      avatar: "/placeholder.svg?height=40&width=40&text=TK",
      email: "taylor@example.com",
      phone: "555-456-7890",
      skills: ["Security Protocols", "Conflict Resolution", "First Aid"],
    },
    {
      id: 5,
      name: "Morgan Smith",
      role: "Front of House",
      avatar: "/placeholder.svg?height=40&width=40&text=MS",
      email: "morgan@example.com",
      phone: "555-567-8901",
      skills: ["Customer Service", "Ticketing", "Problem Solving"],
    },
  ],
  "team-2": [
    {
      id: 6,
      name: "Jordan Patel",
      role: "Sound Engineer",
      avatar: "/placeholder.svg?height=40&width=40&text=JP",
      email: "jordan@example.com",
      phone: "555-678-9012",
      skills: ["Audio Mixing", "Equipment Setup", "Troubleshooting"],
    },
    {
      id: 7,
      name: "Casey Wong",
      role: "Lighting Designer",
      avatar: "/placeholder.svg?height=40&width=40&text=CW",
      email: "casey@example.com",
      phone: "555-789-0123",
      skills: ["Lighting Design", "Programming", "Visual Effects"],
    },
    {
      id: 8,
      name: "Riley Garcia",
      role: "Video Technician",
      avatar: "/placeholder.svg?height=40&width=40&text=RG",
      email: "riley@example.com",
      phone: "555-890-1234",
      skills: ["Video Systems", "Camera Operation", "Live Streaming"],
    },
  ],
  "team-3": [
    {
      id: 9,
      name: "Quinn Murphy",
      role: "Event Coordinator",
      avatar: "/placeholder.svg?height=40&width=40&text=QM",
      email: "quinn@example.com",
      phone: "555-901-2345",
      skills: ["Event Planning", "Vendor Management", "Logistics"],
    },
    {
      id: 10,
      name: "Avery Wilson",
      role: "Guest Relations",
      avatar: "/placeholder.svg?height=40&width=40&text=AW",
      email: "avery@example.com",
      phone: "555-012-3456",
      skills: ["Customer Service", "Problem Solving", "Communication"],
    },
  ],
  "team-4": [
    {
      id: 11,
      name: "Dakota Lee",
      role: "Social Media Manager",
      avatar: "/placeholder.svg?height=40&width=40&text=DL",
      email: "dakota@example.com",
      phone: "555-123-4567",
      skills: ["Content Creation", "Social Media Strategy", "Analytics"],
    },
    {
      id: 12,
      name: "Skyler Chen",
      role: "Graphic Designer",
      avatar: "/placeholder.svg?height=40&width=40&text=SC",
      email: "skyler@example.com",
      phone: "555-234-5678",
      skills: ["Graphic Design", "Branding", "Typography"],
    },
  ],
  "team-5": [
    {
      id: 13,
      name: "Reese Johnson",
      role: "Tour Manager",
      avatar: "/placeholder.svg?height=40&width=40&text=RJ",
      email: "reese@example.com",
      phone: "555-345-6789",
      skills: ["Logistics", "Budgeting", "Scheduling"],
    },
    {
      id: 14,
      name: "Parker Davis",
      role: "Merchandise Manager",
      avatar: "/placeholder.svg?height=40&width=40&text=PD",
      email: "parker@example.com",
      phone: "555-456-7890",
      skills: ["Inventory Management", "Sales", "Design"],
    },
  ],
}

interface TeamMemberCardProps {
  teamId: string
}

export function TeamMemberCard({ teamId }: TeamMemberCardProps) {
  const [members, setMembers] = useState(mockMembers[teamId as keyof typeof mockMembers] || [])
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [newMember, setNewMember] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    skills: "",
  })

  // Filter members based on search query
  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.skills.some((skill) => skill.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const handleAddMember = () => {
    const skillsArray = newMember.skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean)

    const newMemberObj = {
      id: members.length + 1,
      name: newMember.name,
      role: newMember.role,
      avatar: `/placeholder.svg?height=40&width=40&text=${newMember.name
        .split(" ")
        .map((n) => n[0])
        .join("")}`,
      email: newMember.email,
      phone: newMember.phone,
      skills: skillsArray,
    }

    setMembers([...members, newMemberObj])
    setIsAddMemberOpen(false)
    setNewMember({
      name: "",
      role: "",
      email: "",
      phone: "",
      skills: "",
    })
  }

  const handleDeleteMember = (id: number) => {
    setMembers(members.filter((member) => member.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Team Members</h3>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              className="pl-8 w-[200px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Add a new member to your team. They will receive an email invitation.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newMember.name}
                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Role
                  </Label>
                  <Input
                    id="role"
                    value={newMember.role}
                    onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={newMember.email}
                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={newMember.phone}
                    onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="skills" className="text-right">
                    Skills
                  </Label>
                  <Textarea
                    id="skills"
                    placeholder="Enter skills separated by commas"
                    value={newMember.skills}
                    onChange={(e) => setNewMember({ ...newMember, skills: e.target.value })}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddMember}>Add Member</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filteredMembers.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No team members found</p>
          <Button variant="outline" className="mt-4" onClick={() => setIsAddMemberOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Your First Team Member
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-4">
                        <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
                        <AvatarFallback>
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{member.name}</h4>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
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
                          Edit Member
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteMember(member.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{member.email}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{member.phone}</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex flex-wrap gap-1">
                      {member.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="flex justify-end mt-6">
        <ButtonLink variant="outline" asChild>
          <a href="/venue/dashboard/teams/crew-profiles">
            <UserPlus className="h-4 w-4 mr-2" />
            Manage Crew Profiles
          </a>
        </ButtonLink>
      </div>
    </div>
  )
}
