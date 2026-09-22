"use client"

import { useState } from "react"
import {
  Calendar,
  Edit,
  ExternalLink,
  Key,
  Mail,
  MessageSquare,
  Phone,
  Shield,
  Ticket,
  Trash2,
  User,
} from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { detailSurfacePattern } from "@/components/dashboard/detail-surface-pattern"
import { cn } from "@/lib/utils"

interface TeamMember {
  id: string
  name: string
  role: string
  department: string
  email: string
  phone: string
  avatar: string
  bio: string
  startDate: string
  status: string
  permissions: string[]
  recentEvents: string[]
  notes: string
}

interface TeamMemberDetailsProps {
  member: TeamMember
}

export function TeamMemberDetails({ member }: TeamMemberDetailsProps) {
  const [activeTab, setActiveTab] = useState("profile")

  const getDepartmentColor = (department: string) => {
    const colors: Record<string, string> = {
      Management: "bg-purple-500/20 text-purple-400",
      Production: "bg-blue-500/20 text-blue-400",
      Events: "bg-green-500/20 text-green-400",
      Marketing: "bg-yellow-500/20 text-yellow-500",
      "Food & Beverage": "bg-orange-500/20 text-orange-400",
      Administration: "bg-red-500/20 text-red-400",
      Security: "bg-gray-500/20 text-gray-400",
      Facilities: "bg-teal-500/20 text-teal-400",
      "Customer Service": "bg-pink-500/20 text-pink-400",
    }

    return colors[department] || "bg-white/10 text-white"
  }

  const getPermissionBadge = (permission: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      admin: { label: "Admin", color: "bg-red-500/20 text-red-400" },
      booking: { label: "Booking", color: "bg-blue-500/20 text-blue-400" },
      events: { label: "Events", color: "bg-green-500/20 text-green-400" },
      finance: { label: "Finance", color: "bg-yellow-500/20 text-yellow-500" },
      staff: { label: "Staff", color: "bg-purple-500/20 text-purple-400" },
      production: { label: "Production", color: "bg-teal-500/20 text-teal-400" },
      equipment: { label: "Equipment", color: "bg-orange-500/20 text-orange-400" },
      marketing: { label: "Marketing", color: "bg-pink-500/20 text-pink-400" },
      social: { label: "Social Media", color: "bg-indigo-500/20 text-indigo-400" },
      website: { label: "Website", color: "bg-cyan-500/20 text-cyan-400" },
      artists: { label: "Artists", color: "bg-violet-500/20 text-violet-400" },
      maintenance: { label: "Maintenance", color: "bg-gray-500/20 text-gray-400" },
      bar: { label: "Bar", color: "bg-amber-500/20 text-amber-400" },
      inventory: { label: "Inventory", color: "bg-lime-500/20 text-lime-400" },
      reports: { label: "Reports", color: "bg-emerald-500/20 text-emerald-400" },
      security: { label: "Security", color: "bg-rose-500/20 text-rose-400" },
      emergency: { label: "Emergency", color: "bg-red-500/20 text-red-400" },
      facilities: { label: "Facilities", color: "bg-slate-500/20 text-slate-400" },
      customer: { label: "Customer", color: "bg-fuchsia-500/20 text-fuchsia-400" },
      vip: { label: "VIP", color: "bg-amber-500/20 text-amber-400" },
      feedback: { label: "Feedback", color: "bg-sky-500/20 text-sky-400" },
      vendors: { label: "Vendors", color: "bg-emerald-500/20 text-emerald-400" },
    }

    const badge = badges[permission] || { label: permission, color: "bg-white/10 text-white" }
    return <Badge className={cn(detailSurfacePattern.badgeSoft, badge.color, "border-0")}>{badge.label}</Badge>
  }

  return (
    <Card className={cn(detailSurfacePattern.panel, "relative text-white")}>
      <div className={detailSurfacePattern.topAccent} />
      <div className="p-6 flex flex-col md:flex-row gap-6 items-center md:items-start">
        <Avatar className={cn("h-24 w-24", detailSurfacePattern.avatarRing)}>
          <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
          <AvatarFallback className={cn("text-2xl", detailSurfacePattern.avatarFallback)}>{member.name.charAt(0)}</AvatarFallback>
        </Avatar>

        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h2 className={cn("text-2xl font-bold", detailSurfacePattern.title)}>{member.name}</h2>
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-1">
                <p className={detailSurfacePattern.subtleText}>{member.role}</p>
                <Badge className={cn(getDepartmentColor(member.department), "border-0 md:ml-2")}>
                  {member.department}
                </Badge>
              </div>
            </div>
            <Badge variant="outline" className={cn(detailSurfacePattern.badgeSuccess, "capitalize")}>
              {member.status}
            </Badge>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-cyan-300/80" />
              <span className={detailSurfacePattern.subtleText}>{member.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-cyan-300/80" />
              <span className={detailSurfacePattern.subtleText}>{member.phone}</span>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="px-6 pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className={detailSurfacePattern.tabsList}>
            <TabsTrigger value="profile" className={detailSurfacePattern.tabsTrigger}>
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="permissions"
              className={detailSurfacePattern.tabsTrigger}
            >
              Permissions
            </TabsTrigger>
            <TabsTrigger value="events" className={detailSurfacePattern.tabsTrigger}>
              Events
            </TabsTrigger>
            <TabsTrigger value="notes" className={detailSurfacePattern.tabsTrigger}>
              Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <div className={cn(detailSurfacePattern.panel, "p-4")}>
              <h3 className={cn("font-medium mb-2", detailSurfacePattern.title)}>Bio</h3>
              <p className={detailSurfacePattern.subtleText}>{member.bio}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={cn(detailSurfacePattern.listRow, "flex items-center gap-3")}>
                <Calendar className="h-5 w-5 text-cyan-300/80" />
                <div>
                  <div className={cn("text-sm", detailSurfacePattern.description)}>Start Date</div>
                  <div className={cn("font-medium", detailSurfacePattern.title)}>{member.startDate}</div>
                </div>
              </div>
              <div className={cn(detailSurfacePattern.listRow, "flex items-center gap-3")}>
                <User className="h-5 w-5 text-cyan-300/80" />
                <div>
                  <div className={cn("text-sm", detailSurfacePattern.description)}>Department</div>
                  <div className={cn("font-medium", detailSurfacePattern.title)}>{member.department}</div>
                </div>
              </div>
            </div>

            <div className={cn(detailSurfacePattern.panel, "p-4")}>
              <h3 className={cn("font-medium mb-3", detailSurfacePattern.title)}>Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-cyan-300/80" />
                  <div>
                    <div className={cn("text-sm", detailSurfacePattern.description)}>Email</div>
                    <div className={cn("font-medium", detailSurfacePattern.title)}>{member.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-cyan-300/80" />
                  <div>
                    <div className={cn("text-sm", detailSurfacePattern.description)}>Phone</div>
                    <div className={cn("font-medium", detailSurfacePattern.title)}>{member.phone}</div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <div className={cn(detailSurfacePattern.panel, "p-4")}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={cn("font-medium", detailSurfacePattern.title)}>Access Permissions</h3>
                <Button variant="outline" size="sm" className={cn("h-8", detailSurfacePattern.btnOutline)}>
                  <Shield className="mr-2 h-4 w-4" />
                  Edit Permissions
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {member.permissions.map((permission, index) => (
                  <div key={index}>{getPermissionBadge(permission)}</div>
                ))}
              </div>
            </div>

            <div className={cn(detailSurfacePattern.panel, "p-4")}>
              <h3 className={cn("font-medium mb-3", detailSurfacePattern.title)}>System Access</h3>
              <div className="space-y-3">
                <div className={cn(detailSurfacePattern.listRow, "flex items-center justify-between")}>
                  <div className="flex items-center gap-3">
                    <div className={cn(detailSurfacePattern.headerIcon, "h-8 w-8 rounded-full")}>
                      <Key className="h-4 w-4" />
                    </div>
                    <div>
                      <div className={cn("font-medium", detailSurfacePattern.title)}>Venue Management System</div>
                      <div className={cn("text-sm", detailSurfacePattern.description)}>Full access to venue dashboard</div>
                    </div>
                  </div>
                  <Badge className={detailSurfacePattern.badgeSuccess}>Active</Badge>
                </div>

                <div className={cn(detailSurfacePattern.listRow, "flex items-center justify-between")}>
                  <div className="flex items-center gap-3">
                    <div className={cn(detailSurfacePattern.headerIcon, "h-8 w-8 rounded-full")}>
                      <Ticket className="h-4 w-4" />
                    </div>
                    <div>
                      <div className={cn("font-medium", detailSurfacePattern.title)}>Ticketing System</div>
                      <div className={cn("text-sm", detailSurfacePattern.description)}>Access to ticket sales and management</div>
                    </div>
                  </div>
                  <Badge
                    className={
                      member.permissions.includes("booking")
                        ? detailSurfacePattern.badgeSuccess
                        : detailSurfacePattern.badgeOutline
                    }
                  >
                    {member.permissions.includes("booking") ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className={cn(detailSurfacePattern.listRow, "flex items-center justify-between")}>
                  <div className="flex items-center gap-3">
                    <div className={cn(detailSurfacePattern.headerIcon, "h-8 w-8 rounded-full")}>
                      <Shield className="h-4 w-4" />
                    </div>
                    <div>
                      <div className={cn("font-medium", detailSurfacePattern.title)}>Admin Portal</div>
                      <div className={cn("text-sm", detailSurfacePattern.description)}>Administrative access</div>
                    </div>
                  </div>
                  <Badge
                    className={
                      member.permissions.includes("admin")
                        ? detailSurfacePattern.badgeSuccess
                        : detailSurfacePattern.badgeOutline
                    }
                  >
                    {member.permissions.includes("admin") ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <div className={cn(detailSurfacePattern.panel, "p-4")}>
              <h3 className={cn("font-medium mb-3", detailSurfacePattern.title)}>Recent Events</h3>
              {member.recentEvents.length > 0 ? (
                <div className="space-y-3">
                  {member.recentEvents.map((event, index) => (
                    <div key={index} className={cn(detailSurfacePattern.listRow, "flex items-center justify-between")}>
                      <div className="flex items-center gap-3">
                        <div className={cn(detailSurfacePattern.headerIcon, "h-8 w-8 rounded-full")}>
                          <Ticket className="h-4 w-4" />
                        </div>
                        <div>
                          <div className={cn("font-medium", detailSurfacePattern.title)}>{event}</div>
                          <div className={cn("text-sm", detailSurfacePattern.description)}>Worked as {member.role}</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 text-slate-400 hover:text-white">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={cn("text-center p-4", detailSurfacePattern.description)}>No recent events</div>
              )}
            </div>

            <div className={cn(detailSurfacePattern.panel, "p-4")}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={cn("font-medium", detailSurfacePattern.title)}>Event Availability</h3>
                <Button variant="outline" size="sm" className={cn("h-8", detailSurfacePattern.btnOutline)}>
                  <Calendar className="mr-2 h-4 w-4" />
                  View Schedule
                </Button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={detailSurfacePattern.title}>Upcoming Assigned Events</span>
                  <span className={detailSurfacePattern.description}>3 events</span>
                </div>
                <Separator className="bg-white/10" />
                <div className="flex items-center justify-between">
                  <span className={detailSurfacePattern.title}>Available for Booking</span>
                  <Badge className={detailSurfacePattern.badgeSuccess}>Yes</Badge>
                </div>
                <Separator className="bg-white/10" />
                <div className="flex items-center justify-between">
                  <span className={detailSurfacePattern.title}>Preferred Working Days</span>
                  <span className={detailSurfacePattern.description}>Mon, Tue, Wed, Thu, Fri</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <div className={cn(detailSurfacePattern.panel, "p-4")}>
              <div className="flex justify-between items-center mb-3">
                <h3 className={cn("font-medium", detailSurfacePattern.title)}>Notes</h3>
                <Button variant="outline" size="sm" className={cn("h-8", detailSurfacePattern.btnOutline)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Notes
                </Button>
              </div>
              <p className={detailSurfacePattern.subtleText}>{member.notes}</p>
            </div>

            <div className={cn(detailSurfacePattern.panel, "p-4")}>
              <div className="flex justify-between items-center mb-3">
                <h3 className={cn("font-medium", detailSurfacePattern.title)}>Communication History</h3>
                <Button variant="outline" size="sm" className={cn("h-8", detailSurfacePattern.btnOutline)}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
              </div>
              <div className="space-y-3">
                <div className={cn(detailSurfacePattern.listRow)}>
                  <div className="flex justify-between items-center mb-2">
                    <div className={cn("font-medium", detailSurfacePattern.title)}>Schedule Update</div>
                    <div className={cn("text-xs", detailSurfacePattern.description)}>2 days ago</div>
                  </div>
                  <p className={cn("text-sm", detailSurfacePattern.subtleText)}>Confirmed availability for the upcoming Summer Jam Festival.</p>
                </div>
                <div className={cn(detailSurfacePattern.listRow)}>
                  <div className="flex justify-between items-center mb-2">
                    <div className={cn("font-medium", detailSurfacePattern.title)}>Performance Review</div>
                    <div className={cn("text-xs", detailSurfacePattern.description)}>2 weeks ago</div>
                  </div>
                  <p className={cn("text-sm", detailSurfacePattern.subtleText)}>
                    Completed quarterly performance review with positive feedback.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className={cn(detailSurfacePattern.footer, "justify-between sm:justify-between border-t-0")}>
        <div className="flex gap-2">
          <Button variant="outline" className={detailSurfacePattern.btnDestructive}>
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </Button>
          <Button variant="outline" className={detailSurfacePattern.btnOutline}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Message
          </Button>
        </div>
        <Button className={detailSurfacePattern.btnPrimary}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Profile
        </Button>
      </CardFooter>
    </Card>
  )
}
