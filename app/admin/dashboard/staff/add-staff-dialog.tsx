"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Search, UserPlus, Mail, Phone, MapPin, DollarSign, Calendar } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AddStaffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (staff: any) => void
  existingProfiles: { id: string; name: string; email: string }[]
}

interface PositionDetails {
  title: string
  description: string
  startDate?: string
  endDate?: string
  location?: string
  compensation?: string
}

interface OnboardingTemplate {
  id: string
  name: string
  description: string
  isDefault: boolean
}

export function AddStaffDialog({ open, onOpenChange, onAdd, existingProfiles }: AddStaffDialogProps) {
  const [tab, setTab] = React.useState("existing")
  const [search, setSearch] = React.useState("")
  const [selectedProfile, setSelectedProfile] = React.useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [invitePhone, setInvitePhone] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [onboardingTemplates, setOnboardingTemplates] = React.useState<OnboardingTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = React.useState<string | null>(null)
  const [positionDetails, setPositionDetails] = React.useState<PositionDetails>({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    location: "",
    compensation: ""
  })
  const { toast } = useToast()

  // Fetch onboarding templates when dialog opens
  React.useEffect(() => {
    if (open) {
      fetchOnboardingTemplates()
    }
  }, [open])

  async function fetchOnboardingTemplates() {
    try {
      const response = await fetch("/api/onboarding-templates")
      if (response.ok) {
        const data = await response.json()
        setOnboardingTemplates(data.templates || [])
        // Auto-select default template
        const defaultTemplate = data.templates?.find((t: OnboardingTemplate) => t.isDefault)
        if (defaultTemplate) {
          setSelectedTemplate(defaultTemplate.id)
        }
      }
    } catch (error) {
      console.error("Error fetching onboarding templates:", error)
    }
  }

  const filteredProfiles = React.useMemo(() => {
    return existingProfiles.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
    )
  }, [existingProfiles, search])

  async function handleAddExisting() {
    const profile = existingProfiles.find(p => p.id === selectedProfile)
    if (profile) {
      setIsLoading(true)
      try {
        // Send notification to the selected user
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "staff_invite",
            data: {
              userId: profile.id,
              positionDetails,
              status: "pending",
              onboardingTemplateId: selectedTemplate
            }
          })
        })
        
        onAdd({ 
          ...profile, 
          positionDetails, 
          status: "pending",
          onboardingTemplateId: selectedTemplate
        })
        toast({ 
          title: "Invitation sent", 
          description: `Position invitation sent to ${profile.name}. They will be notified to accept or decline, and complete onboarding when accepted.` 
        })
        onOpenChange(false)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to send invitation. Please try again.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  async function handleInvite() {
    if (inviteEmail || invitePhone) {
      setIsLoading(true)
      try {
        // Generate a unique invitation link
        const inviteToken = crypto.randomUUID()
        
        // Store the invitation in the database with onboarding template
        await fetch("/api/invitations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: inviteEmail,
            phone: invitePhone,
            positionDetails,
            token: inviteToken,
            status: "pending",
            onboardingTemplateId: selectedTemplate
          })
        })

        // Send email with signup link
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "staff_signup_invite",
            data: {
              email: inviteEmail,
              phone: invitePhone,
              positionDetails,
              signupLink: `${window.location.origin}/login?token=${inviteToken}`
            }
          })
        })

        onAdd({ 
          email: inviteEmail, 
          phone: invitePhone, 
          positionDetails, 
          status: "pending",
          token: inviteToken,
          onboardingTemplateId: selectedTemplate
        })
        
        toast({ 
          title: "Invitation sent", 
          description: `Signup invitation sent to ${inviteEmail || invitePhone}. They will complete onboarding after account creation.` 
        })
        onOpenChange(false)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to send invitation. Please try again.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Staff Member</DialogTitle>
          <DialogDescription>
            Invite existing users or send signup invitations to new team members with onboarding
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="mb-4 bg-slate-800/60 backdrop-blur-sm p-1 rounded-sm border border-slate-700/30">
            <TabsTrigger value="existing" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">
              <UserPlus className="h-4 w-4" />
              Add from Existing
            </TabsTrigger>
            <TabsTrigger value="invite" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">
              <Mail className="h-4 w-4" />
              Invite New
            </TabsTrigger>
          </TabsList>
          
          {/* Position Details Section - Common for both tabs */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h3 className="font-medium mb-4">Position Details</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Position Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Sound Engineer, Event Manager"
                    value={positionDetails.title}
                    onChange={e => setPositionDetails(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the role and responsibilities..."
                    value={positionDetails.description}
                    onChange={e => setPositionDetails(prev => ({ ...prev, description: e.target.value }))}
                    className="min-h-[100px]"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="startDate"
                        type="date"
                        value={positionDetails.startDate || ""}
                        onChange={e => setPositionDetails(prev => ({ ...prev, startDate: e.target.value }))}
                        className="pl-8"
                        placeholder="Select start date"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="endDate"
                        type="date"
                        value={positionDetails.endDate || ""}
                        onChange={e => setPositionDetails(prev => ({ ...prev, endDate: e.target.value }))}
                        className="pl-8"
                        placeholder="Select end date"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      placeholder="e.g., Main Stage, Backstage"
                      value={positionDetails.location}
                      onChange={e => setPositionDetails(prev => ({ ...prev, location: e.target.value }))}
                      className="pl-8"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="compensation">Compensation</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="compensation"
                      placeholder="e.g., $25/hour, $500 per event"
                      value={positionDetails.compensation}
                      onChange={e => setPositionDetails(prev => ({ ...prev, compensation: e.target.value }))}
                      className="pl-8"
                    />
                  </div>
                </div>

                {/* Onboarding Template Selection */}
                <div className="space-y-2">
                  <Label htmlFor="onboardingTemplate">Onboarding Template</Label>
                  <Select value={selectedTemplate || ""} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an onboarding template" />
                    </SelectTrigger>
                    <SelectContent>
                      {onboardingTemplates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            {template.name}
                            {template.isDefault && (
                              <Badge variant="secondary" className="text-xs">Default</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    New team members will complete this onboarding process after accepting the position
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <TabsContent value="existing">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              
              <ScrollArea className="h-[200px] rounded-md border p-4">
                {filteredProfiles.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No matching profiles found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredProfiles.map(profile => (
                      <div
                        key={profile.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedProfile === profile.id 
                            ? "border-primary bg-primary/5" 
                            : "hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedProfile(profile.id)}
                      >
                        <div className="font-medium">{profile.name}</div>
                        <div className="text-sm text-muted-foreground">{profile.email}</div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              
              <Button 
                className="w-full" 
                disabled={!selectedProfile || !positionDetails.title || !selectedTemplate || isLoading} 
                onClick={handleAddExisting}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Invitation...
                  </>
                ) : (
                  "Send Position Invitation"
                )}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="invite">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    type="email"
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <div className="relative">
                  <Phone className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="+1 (555) 000-0000"
                    value={invitePhone}
                    onChange={e => setInvitePhone(e.target.value)}
                    type="tel"
                    className="pl-8"
                  />
                </div>
              </div>
              
              <Button 
                className="w-full" 
                disabled={(!inviteEmail && !invitePhone) || !positionDetails.title || !selectedTemplate || isLoading} 
                onClick={handleInvite}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Invitation...
                  </>
                ) : (
                  "Send Signup Invitation"
                )}
              </Button>
            </div>
          </TabsContent>

          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            {tab === "existing" ? (
              <Button onClick={handleAddExisting} disabled={!selectedProfile || isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                Add Existing User
              </Button>
            ) : (
              <Button onClick={handleInvite} disabled={(!inviteEmail && !invitePhone) || isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                Send Invitation
              </Button>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
} 