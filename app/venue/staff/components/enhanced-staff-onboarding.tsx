"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { detailSurfacePattern } from "@/components/dashboard/detail-surface-pattern"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { 
  Users,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  UserPlus,
  FileText,
  GraduationCap,
  Send,
  Search,
  Globe,
  Building2
} from "lucide-react"

interface OnboardingCandidate {
  id: string
  name: string
  email: string
  position: string
  department: string
  status: 'pending' | 'in_progress' | 'completed' | 'rejected'
  stage: 'application' | 'documentation' | 'training' | 'completed'
  progress: number
}

export default function EnhancedStaffOnboarding() {
  const { toast } = useToast()
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showBulkInviteDialog, setShowBulkInviteDialog] = useState(false)
  const [showManageInvitationsDialog, setShowManageInvitationsDialog] = useState(false)

  const [candidates, setCandidates] = useState<OnboardingCandidate[]>([
    {
      id: "1",
      name: "Sarah Johnson",
      email: "sarah@example.com",
      position: "Sound Engineer",
      department: "Technical",
      status: "in_progress",
      stage: "training",
      progress: 75
    },
    {
      id: "2", 
      name: "Mike Rodriguez",
      email: "mike@example.com",
      position: "Security Guard",
      department: "Security",
      status: "pending",
      stage: "application",
      progress: 25
    }
  ])

  const [newInvitation, setNewInvitation] = useState({
    email: "",
    name: "",
    role: "",
    department: "",
    message: "",
    accountType: ""
  })

  const [externalInvitations] = useState([
    {
      id: "ext-1",
      email: "artist@example.com",
      name: "Alex Artist",
      accountType: "artist",
      currentAccount: "Indie Music Co",
      role: "Sound Consultant",
      status: "pending",
      sentDate: "2024-02-10"
    },
    {
      id: "ext-2",
      email: "venue@example.com", 
      name: "Maria Venue",
      accountType: "venue",
      currentAccount: "City Concert Hall",
      role: "Security Advisor",
      status: "accepted",
      sentDate: "2024-02-08"
    }
  ])

  const stats = {
    totalCandidates: candidates.length,
    inProgress: candidates.filter(c => c.status === 'in_progress').length,
    completed: candidates.filter(c => c.status === 'completed').length,
    pending: candidates.filter(c => c.status === 'pending').length
  }

  const handleSendInvitation = () => {
    toast({
      title: "Cross-Account Invitation Sent",
      description: `Invitation sent to ${newInvitation.email}`,
    })
    setShowInviteDialog(false)
    setNewInvitation({
      email: "",
      name: "",
      role: "",
      department: "",
      message: "",
      accountType: ""
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Staff Onboarding System
          </h1>
          <p className="text-slate-400 mt-1">Comprehensive staff recruitment and onboarding management</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-500 to-purple-600">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Candidate
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: "Total Candidates", 
            value: stats.totalCandidates, 
            icon: Users, 
            color: "from-blue-500 to-cyan-500" 
          },
          { 
            label: "In Progress", 
            value: stats.inProgress, 
            icon: Clock, 
            color: "from-yellow-500 to-orange-500" 
          },
          { 
            label: "Completed", 
            value: stats.completed, 
            icon: CheckCircle, 
            color: "from-green-500 to-emerald-500" 
          },
          { 
            label: "Pending Review", 
            value: stats.pending, 
            icon: AlertCircle, 
            color: "from-purple-500 to-pink-500" 
          }
        ].map((stat, i) => (
          <Card key={i} className={detailSurfacePattern.panel}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cross-Account Team Building Section */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-purple-400 flex items-center">
            <UserPlus className="h-5 w-5 mr-2" />
            Cross-Account Team Building
          </CardTitle>
          <CardDescription className="text-slate-300">
            Invite and onboard team members from other accounts across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-slate-700/30 rounded-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="text-white font-semibold">15</div>
              <div className="text-slate-400 text-sm">External Invites</div>
            </div>
            <div className="text-center p-4 bg-slate-700/30 rounded-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div className="text-white font-semibold">9</div>
              <div className="text-slate-400 text-sm">Accepted</div>
            </div>
            <div className="text-center p-4 bg-slate-700/30 rounded-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="text-white font-semibold">6</div>
              <div className="text-slate-400 text-sm">Pending</div>
            </div>
            <div className="text-center p-4 bg-slate-700/30 rounded-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div className="text-white font-semibold">4</div>
              <div className="text-slate-400 text-sm">Onboarding</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              className={detailSurfacePattern.btnPrimary}
              onClick={() => setShowInviteDialog(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite External Team Member
            </Button>
            <Button 
              variant="outline" 
              className={detailSurfacePattern.btnOutline}
              onClick={() => setShowBulkInviteDialog(true)}
            >
              <Users className="h-4 w-4 mr-2" />
              Bulk Team Invitations
            </Button>
            <Button 
              variant="outline" 
              className={detailSurfacePattern.btnOutline}
              onClick={() => setShowManageInvitationsDialog(true)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Manage Invitations
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {candidates.map((candidate) => (
          <Card key={candidate.id} className={detailSurfacePattern.panel}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold">{candidate.name}</h3>
                  <p className="text-slate-400 text-sm">{candidate.position}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {candidate.department}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-400">
                    {candidate.progress}%
                  </div>
                  <div className="text-xs text-slate-400">Progress</div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <GraduationCap className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-white capitalize">{candidate.stage}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${candidate.progress}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button size="sm" variant="outline" className={detailSurfacePattern.btnOutline}>
                  View Details
                </Button>
                <Button size="sm" className={detailSurfacePattern.btnPrimary}>
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cross-Account Invitation Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className={cn("max-w-2xl", detailSurfacePattern.dialogContent)}>
          <div className={detailSurfacePattern.topAccent} />
          <DialogHeader>
            <DialogTitle className={detailSurfacePattern.title}>Invite External Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email" className={detailSurfacePattern.label}>Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={newInvitation.email}
                  onChange={(e) => setNewInvitation({ ...newInvitation, email: e.target.value })}
                  className={detailSurfacePattern.input}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <Label htmlFor="name" className={detailSurfacePattern.label}>Full Name (Optional)</Label>
                <Input
                  id="name"
                  value={newInvitation.name}
                  onChange={(e) => setNewInvitation({ ...newInvitation, name: e.target.value })}
                  className={detailSurfacePattern.input}
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="role" className={detailSurfacePattern.label}>Role</Label>
                <Select value={newInvitation.role} onValueChange={(value) => setNewInvitation({ ...newInvitation, role: value })}>
                  <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="consultant">Consultant</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="collaborator">Collaborator</SelectItem>
                    <SelectItem value="advisor">Advisor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="department" className={detailSurfacePattern.label}>Department</Label>
                <Select value={newInvitation.department} onValueChange={(value) => setNewInvitation({ ...newInvitation, department: value })}>
                  <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="creative">Creative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="account-type" className={detailSurfacePattern.label}>Expected Account Type</Label>
                <Select value={newInvitation.accountType} onValueChange={(value) => setNewInvitation({ ...newInvitation, accountType: value })}>
                  <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                    <SelectValue placeholder="Account type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="artist">Artist</SelectItem>
                    <SelectItem value="venue">Venue</SelectItem>
                    <SelectItem value="general">General User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="message" className={detailSurfacePattern.label}>Personal Message</Label>
              <Textarea
                id="message"
                value={newInvitation.message}
                onChange={(e) => setNewInvitation({ ...newInvitation, message: e.target.value })}
                className={detailSurfacePattern.textarea}
                placeholder="Add a personal message to your invitation..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowInviteDialog(false)} className={detailSurfacePattern.btnOutline}>
                Cancel
              </Button>
              <Button onClick={handleSendInvitation} className={detailSurfacePattern.btnPrimary}>
                <Send className="h-4 w-4 mr-2" />
                Send Invitation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Invitations Dialog */}
      <Dialog open={showManageInvitationsDialog} onOpenChange={setShowManageInvitationsDialog}>
        <DialogContent className={cn("max-w-4xl max-h-[80vh] overflow-y-auto", detailSurfacePattern.dialogContent)}>
          <div className={detailSurfacePattern.topAccent} />
          <DialogHeader>
            <DialogTitle className={detailSurfacePattern.title}>Manage Cross-Account Invitations</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {externalInvitations.map((invitation) => (
                <Card key={invitation.id} className={detailSurfacePattern.panel}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-600 text-white">
                            {invitation.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="text-white font-medium">{invitation.name}</h4>
                          <p className="text-slate-400 text-sm">{invitation.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {invitation.accountType}
                            </Badge>
                            {invitation.currentAccount && (
                              <span className="text-slate-500 text-xs">@ {invitation.currentAccount}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge variant="outline" className={`${
                          invitation.status === 'pending' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
                          invitation.status === 'accepted' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                          'text-red-400 bg-red-500/10 border-red-500/20'
                        }`}>
                          {invitation.status}
                        </Badge>
                        <p className="text-slate-400 text-sm mt-1">Sent {invitation.sentDate}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 text-sm">
                      <span className="text-slate-400">Invited as: </span>
                      <span className="text-slate-300">{invitation.role}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 