"use client"

import { useState } from "react"
import { Calendar, Mail, Phone, Shield, Upload, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { detailSurfacePattern } from "@/components/dashboard/detail-surface-pattern"
import { cn } from "@/lib/utils"

interface Department {
  id: string
  name: string
  description: string
  memberCount: number
  color: string
}

interface AddTeamMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  departments: Department[]
}

export function AddTeamMemberDialog({ open, onOpenChange, departments }: AddTeamMemberDialogProps) {
  const [activeTab, setActiveTab] = useState("basic")
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  const permissions = [
    "admin",
    "booking",
    "events",
    "finance",
    "staff",
    "production",
    "equipment",
    "marketing",
    "social",
    "website",
    "artists",
    "maintenance",
    "bar",
    "inventory",
    "security",
    "emergency",
    "facilities",
    "customer",
    "vip",
    "feedback",
    "vendors",
  ]

  const togglePermission = (permission: string) => {
    if (selectedPermissions.includes(permission)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== permission))
    } else {
      setSelectedPermissions([...selectedPermissions, permission])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-3xl max-h-[90vh] overflow-auto", detailSurfacePattern.dialogContent)}>
        <div className={detailSurfacePattern.topAccent} />
        <DialogHeader>
          <DialogTitle className={cn("text-xl", detailSurfacePattern.title)}>Add Team Member</DialogTitle>
          <DialogDescription className={detailSurfacePattern.description}>
            Fill in the details to add a new team member to your venue.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className={detailSurfacePattern.tabsList}>
            <TabsTrigger value="basic" className={detailSurfacePattern.tabsTrigger}>
              Basic Info
            </TabsTrigger>
            <TabsTrigger value="contact" className={detailSurfacePattern.tabsTrigger}>
              Contact
            </TabsTrigger>
            <TabsTrigger
              value="permissions"
              className={detailSurfacePattern.tabsTrigger}
            >
              Permissions
            </TabsTrigger>
            <TabsTrigger value="notes" className={detailSurfacePattern.tabsTrigger}>
              Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name" className={detailSurfacePattern.label}>Full Name</Label>
              <Input
                id="name"
                placeholder="Enter full name"
                className={detailSurfacePattern.input}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className={detailSurfacePattern.label}>Role / Position</Label>
              <Input
                id="role"
                placeholder="Enter role or position"
                className={detailSurfacePattern.input}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department" className={detailSurfacePattern.label}>Department</Label>
              <Select>
                <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-slate-950 text-white">
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.name}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate" className={detailSurfacePattern.label}>Start Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="startDate"
                  type="date"
                  className={cn(detailSurfacePattern.input, "pl-10")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className={detailSurfacePattern.label}>Profile Photo</Label>
              <div className={cn(detailSurfacePattern.panel, "border-dashed p-6 flex flex-col items-center justify-center")}>
                <Upload className="h-8 w-8 text-slate-400 mb-2" />
                <p className={cn(detailSurfacePattern.subtleText, "text-center mb-2")}>Drag and drop an image, or click to browse</p>
                <Button variant="outline" className={detailSurfacePattern.btnOutline}>
                  Upload Photo
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email" className={detailSurfacePattern.label}>Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  className={cn(detailSurfacePattern.input, "pl-10")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className={detailSurfacePattern.label}>Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter phone number"
                  className={cn(detailSurfacePattern.input, "pl-10")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency-contact" className={detailSurfacePattern.label}>Emergency Contact</Label>
              <Input
                id="emergency-contact"
                placeholder="Name and phone number"
                className={detailSurfacePattern.input}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className={detailSurfacePattern.label}>Address</Label>
              <Textarea
                id="address"
                placeholder="Enter address"
                className={cn(detailSurfacePattern.textarea, "min-h-[100px]")}
              />
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className={detailSurfacePattern.label}>Access Permissions</Label>
              <div className={cn(detailSurfacePattern.panel, "flex flex-wrap gap-2 p-3")}>
                {permissions.map((permission) => (
                  <Badge
                    key={permission}
                    variant={selectedPermissions.includes(permission) ? "default" : "outline"}
                    className={
                      selectedPermissions.includes(permission)
                        ? cn(detailSurfacePattern.badge, "cursor-pointer")
                        : cn(detailSurfacePattern.badgeOutline, "cursor-pointer")
                    }
                    onClick={() => togglePermission(permission)}
                  >
                    {permission.charAt(0).toUpperCase() + permission.slice(1)}
                    {selectedPermissions.includes(permission) && <X className="ml-1 h-3 w-3" />}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="access-level" className={detailSurfacePattern.label}>Access Level</Label>
              <Select>
                <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                  <SelectValue placeholder="Select access level" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-slate-950 text-white">
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={cn(detailSurfacePattern.panel, "p-4")}>
              <div className="flex justify-between items-center mb-3">
                <h3 className={cn("font-medium", detailSurfacePattern.title)}>System Access</h3>
                <Shield className="h-5 w-5 text-cyan-300/80" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="access-venue"
                    className="mr-3 h-4 w-4 rounded border-white/20 bg-slate-900/80 text-purple-600 focus:ring-purple-600"
                  />
                  <Label htmlFor="access-venue" className={cn("cursor-pointer", detailSurfacePattern.label)}>
                    Venue Management System
                  </Label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="access-ticketing"
                    className="mr-3 h-4 w-4 rounded border-white/20 bg-slate-900/80 text-purple-600 focus:ring-purple-600"
                  />
                  <Label htmlFor="access-ticketing" className={cn("cursor-pointer", detailSurfacePattern.label)}>
                    Ticketing System
                  </Label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="access-admin"
                    className="mr-3 h-4 w-4 rounded border-white/20 bg-slate-900/80 text-purple-600 focus:ring-purple-600"
                  />
                  <Label htmlFor="access-admin" className={cn("cursor-pointer", detailSurfacePattern.label)}>
                    Admin Portal
                  </Label>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="bio" className={detailSurfacePattern.label}>Bio</Label>
              <Textarea
                id="bio"
                placeholder="Enter team member bio"
                className={cn(detailSurfacePattern.textarea, "min-h-[120px]")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills" className={detailSurfacePattern.label}>Skills & Expertise</Label>
              <Textarea
                id="skills"
                placeholder="List skills and expertise"
                className={cn(detailSurfacePattern.textarea, "min-h-[100px]")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className={detailSurfacePattern.label}>Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information about the team member"
                className={cn(detailSurfacePattern.textarea, "min-h-[100px]")}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className={cn(detailSurfacePattern.footer, "mt-6 justify-between sm:justify-between")}>
          <Button
            variant="outline"
            className={detailSurfacePattern.btnOutline}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button className={detailSurfacePattern.btnPrimary}>Add Team Member</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
