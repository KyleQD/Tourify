"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { detailSurfacePattern } from "@/components/dashboard/detail-surface-pattern"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  User,
  Edit,
  Save,
  X,
  Star,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  Award,
  Target,
  TrendingUp,
  Users,
  FileText,
  Shield,
  MessageSquare,
  Camera,
  Upload
} from "lucide-react"

interface StaffProfile {
  id: string
  name: string
  email: string
  phone: string
  role: string
  department: string
  avatar?: string
  status: 'active' | 'inactive' | 'on_leave'
  hireDate: string
  employmentType: 'full-time' | 'part-time' | 'contract'
  
  // Performance Metrics
  performance: number
  reliability: number
  eventsCompleted: number
  hoursWorked: number
  
  // Skills & Certifications
  skills: string[]
  certifications: {
    name: string
    issuer: string
    date: string
    expiry?: string
  }[]
  
  // Goals & Reviews
  currentGoals: {
    id: string
    title: string
    progress: number
    deadline: string
  }[]
  
  lastReview: {
    date: string
    rating: number
    feedback: string
  }
  
  // Personal Info
  address: string
  emergencyContact: {
    name: string
    phone: string
    relationship: string
  }
  
  // Team & Role Info
  teamIds: string[]
  permissions: string[]
  directReports: string[]
  reportsTo?: string
  
  // Notes & History
  notes: string
  disciplinaryActions: {
    date: string
    type: string
    description: string
  }[]
  
  promotions: {
    date: string
    fromRole: string
    toRole: string
    reason: string
  }[]
}

export default function StaffProfileDetail({ 
  staffId, 
  onClose 
}: { 
  staffId: string
  onClose: () => void 
}) {
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  // Mock staff profile data
  const [staffProfile, setStaffProfile] = useState<StaffProfile>({
    id: staffId,
    name: "Maya Rodriguez",
    email: "maya.rodriguez@venue.com",
    phone: "(555) 234-5678",
    role: "Senior Sound Engineer",
    department: "Technical",
    avatar: "/placeholder.svg",
    status: "active",
    hireDate: "2022-03-15",
    employmentType: "full-time",
    
    performance: 95,
    reliability: 97,
    eventsCompleted: 89,
    hoursWorked: 1680,
    
    skills: ["Pro Tools", "Live Sound", "System Design", "Team Leadership", "Audio Engineering"],
    certifications: [
      {
        name: "Pro Tools Certification",
        issuer: "Avid",
        date: "2023-01-15",
        expiry: "2026-01-15"
      },
      {
        name: "Live Sound Engineering",
        issuer: "Audio Engineering Society",
        date: "2022-06-10"
      }
    ],
    
    currentGoals: [
      {
        id: "goal-1",
        title: "Complete Advanced Mixing Course",
        progress: 75,
        deadline: "2024-03-01"
      },
      {
        id: "goal-2", 
        title: "Train 2 Junior Engineers",
        progress: 50,
        deadline: "2024-04-15"
      }
    ],
    
    lastReview: {
      date: "2024-01-10",
      rating: 4.6,
      feedback: "Excellent technical skills and great mentorship of junior staff"
    },
    
    address: "123 Main St, Los Angeles, CA 90210",
    emergencyContact: {
      name: "Carlos Rodriguez",
      phone: "(555) 123-9876",
      relationship: "Spouse"
    },
    
    teamIds: ["team-technical"],
    permissions: ["manage_equipment", "view_events", "technical_access"],
    directReports: ["staff-junior-1", "staff-junior-2"],
    reportsTo: "staff-manager-1",
    
    notes: "Outstanding performer with strong leadership potential. Consider for promotion to Technical Lead.",
    disciplinaryActions: [],
    promotions: [
      {
        date: "2023-03-15",
        fromRole: "Sound Engineer",
        toRole: "Senior Sound Engineer", 
        reason: "Exceptional performance and leadership qualities"
      }
    ]
  })

  const [editForm, setEditForm] = useState<Partial<StaffProfile>>(staffProfile)

  const handleSave = () => {
    setStaffProfile({ ...staffProfile, ...editForm })
    setIsEditing(false)
    toast({
      title: "Profile Updated",
      description: "Staff profile has been updated successfully",
    })
  }

  const handleCancel = () => {
    setEditForm(staffProfile)
    setIsEditing(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'inactive': return 'bg-red-500'
      case 'on_leave': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-400'
    if (score >= 80) return 'text-blue-400'
    if (score >= 70) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-6xl max-h-[90vh] overflow-y-auto", detailSurfacePattern.dialogContent)}>
        <div className={detailSurfacePattern.topAccent} />
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className={detailSurfacePattern.title}>Staff Profile</DialogTitle>
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave} className={detailSurfacePattern.btnPrimary}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel} className={detailSurfacePattern.btnOutline}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setIsEditing(true)} className={detailSurfacePattern.btnPrimary}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Header */}
          <Card className={detailSurfacePattern.panel}>
            <CardContent className="p-6">
              <div className="flex items-start space-x-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={staffProfile.avatar} />
                    <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-2xl">
                      {staffProfile.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <Button size="sm" className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 p-0">
                      <Camera className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      {isEditing ? (
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className={cn("mb-2 text-2xl font-bold", detailSurfacePattern.input)}
                        />
                      ) : (
                        <h1 className="text-2xl font-bold text-white">{staffProfile.name}</h1>
                      )}
                      
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={detailSurfacePattern.label}>{staffProfile.role}</span>
                        <Badge variant="outline" className={detailSurfacePattern.badgeOutline}>
                          {staffProfile.department}
                        </Badge>
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(staffProfile.status)}`}></div>
                        <span className={cn(detailSurfacePattern.subtleText, "capitalize")}>{staffProfile.status}</span>
                      </div>
                      
                      <div className={cn("flex items-center space-x-4", detailSurfacePattern.subtleText)}>
                        <div className="flex items-center space-x-1">
                          <Mail className="h-4 w-4" />
                          <span>{staffProfile.email}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Phone className="h-4 w-4" />
                          <span>{staffProfile.phone}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>Hired {staffProfile.hireDate}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${getPerformanceColor(staffProfile.performance)}`}>
                        {staffProfile.performance}%
                      </div>
                      <div className={detailSurfacePattern.subtleText}>Performance</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: "Performance", value: `${staffProfile.performance}%`, color: "from-green-500 to-emerald-500" },
              { label: "Reliability", value: `${staffProfile.reliability}%`, color: "from-blue-500 to-cyan-500" },
              { label: "Events", value: staffProfile.eventsCompleted, color: "from-purple-500 to-pink-500" },
              { label: "Hours", value: staffProfile.hoursWorked.toLocaleString(), color: "from-orange-500 to-red-500" }
            ].map((metric, i) => (
              <Card key={i} className={detailSurfacePattern.panel}>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold bg-gradient-to-r ${metric.color} bg-clip-text text-transparent`}>
                      {metric.value}
                    </div>
                    <div className={detailSurfacePattern.subtleText}>{metric.label}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Information Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={cn(detailSurfacePattern.tabsList, "grid grid-cols-5")}>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="goals">Goals</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="personal">Personal</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className={detailSurfacePattern.panel}>
                  <CardHeader>
                    <CardTitle className="text-green-400">Current Goals</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {staffProfile.currentGoals.map((goal) => (
                      <div key={goal.id} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-white font-medium">{goal.title}</span>
                          <span className="text-slate-400 text-sm">Due: {goal.deadline}</span>
                        </div>
                        <Progress value={goal.progress} className="h-2" />
                        <div className="text-right text-sm text-slate-400">{goal.progress}% complete</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className={detailSurfacePattern.panel}>
                  <CardHeader>
                    <CardTitle className="text-blue-400">Last Performance Review</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Review Date:</span>
                        <span className="text-white">{staffProfile.lastReview.date}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Rating:</span>
                        <div className="flex items-center space-x-1">
                          <span className="text-yellow-400 font-bold">{staffProfile.lastReview.rating}</span>
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 mb-2">Feedback:</div>
                        <p className="text-slate-300 text-sm bg-slate-700/30 p-3 rounded">
                          {staffProfile.lastReview.feedback}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Goals Tab */}
            <TabsContent value="goals" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {staffProfile.currentGoals.map((goal) => (
                  <Card key={goal.id} className={detailSurfacePattern.panel}>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <h3 className="text-white font-semibold">{goal.title}</h3>
                          <Badge variant="outline" className={detailSurfacePattern.badge}>
                            Active
                          </Badge>
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-slate-400">Progress</span>
                            <span className="text-white font-medium">{goal.progress}%</span>
                          </div>
                          <Progress value={goal.progress} className="h-3" />
                        </div>
                        
                        <div className="flex items-center space-x-2 text-sm">
                          <Target className="h-4 w-4 text-purple-400" />
                          <span className="text-slate-400">Deadline: {goal.deadline}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Skills Tab */}
            <TabsContent value="skills" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className={detailSurfacePattern.panel}>
                  <CardHeader>
                    <CardTitle className="text-purple-400">Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {staffProfile.skills.map((skill, i) => (
                        <Badge key={i} variant="outline" className={detailSurfacePattern.badge}>
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className={detailSurfacePattern.panel}>
                  <CardHeader>
                    <CardTitle className="text-orange-400">Certifications</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {staffProfile.certifications.map((cert, i) => (
                      <div key={i} className="p-3 bg-slate-700/30 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-white font-medium">{cert.name}</h4>
                            <p className="text-slate-400 text-sm">{cert.issuer}</p>
                            <p className="text-slate-500 text-xs">Issued: {cert.date}</p>
                          </div>
                          {cert.expiry && (
                            <Badge variant="outline" className={cn("text-xs", detailSurfacePattern.badgeSoft)}>
                              Expires: {cert.expiry}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              <Card className={detailSurfacePattern.panel}>
                <CardHeader>
                  <CardTitle className="text-green-400">Career History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {staffProfile.promotions.map((promotion, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-white font-medium">Promotion</h4>
                        <span className="text-slate-400 text-sm">{promotion.date}</span>
                      </div>
                      <div className="text-sm">
                        <p className="text-slate-300">
                          <span className="text-red-400">{promotion.fromRole}</span> → 
                          <span className="text-green-400 ml-1">{promotion.toRole}</span>
                        </p>
                        <p className="text-slate-400 mt-1">{promotion.reason}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Personal Tab */}
            <TabsContent value="personal" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className={detailSurfacePattern.panel}>
                  <CardHeader>
                    <CardTitle className="text-cyan-400">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isEditing ? (
                      <>
                        <div>
                          <Label className={detailSurfacePattern.label}>Address</Label>
                          <Textarea
                            value={editForm.address}
                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                            className={detailSurfacePattern.textarea}
                          />
                        </div>
                        <div>
                          <Label className={detailSurfacePattern.label}>Emergency Contact Name</Label>
                          <Input
                            value={editForm.emergencyContact?.name}
                            onChange={(e) => setEditForm({ 
                              ...editForm, 
                              emergencyContact: { ...editForm.emergencyContact!, name: e.target.value }
                            })}
                            className={detailSurfacePattern.input}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="text-slate-400">Address:</span>
                          <p className="text-white">{staffProfile.address}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Emergency Contact:</span>
                          <p className="text-white">{staffProfile.emergencyContact.name}</p>
                          <p className="text-slate-400 text-sm">{staffProfile.emergencyContact.phone} ({staffProfile.emergencyContact.relationship})</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className={detailSurfacePattern.panel}>
                  <CardHeader>
                    <CardTitle className="text-yellow-400">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <Textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        className={cn("min-h-32", detailSurfacePattern.textarea)}
                        placeholder="Add notes about this staff member..."
                      />
                    ) : (
                      <p className="text-slate-300">{staffProfile.notes}</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
} 