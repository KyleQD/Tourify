"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { detailSurfacePattern } from "@/components/dashboard/detail-surface-pattern"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  Heart, 
  Upload, 
  X,
  Save,
  Plus,
  Edit,
  Eye,
  Shield,
  Users,
  Building2,
  Wrench,
  Crown,
  BarChart3,
  Settings,
  Camera,
  Trash2,
  CheckCircle,
  AlertTriangle
} from "lucide-react"
import { 
  CreateStaffProfileData, 
  UpdateStaffProfileData, 
  StaffProfileData 
} from "@/lib/services/enhanced-staff-profiles.service"

interface StaffProfileFormProps {
  venueId: string
  staff?: StaffProfileData
  onSave: (data: CreateStaffProfileData | UpdateStaffProfileData) => Promise<void>
  onCancel: () => void
  isEditing?: boolean
}

const roleCategories = [
  { value: 'foh', label: 'Front of House', icon: Users },
  { value: 'tech', label: 'Technical', icon: Settings },
  { value: 'security', label: 'Security', icon: Shield },
  { value: 'bar', label: 'Bar', icon: Building2 },
  { value: 'kitchen', label: 'Kitchen', icon: Wrench },
  { value: 'management', label: 'Management', icon: Crown },
  { value: 'marketing', label: 'Marketing', icon: BarChart3 },
  { value: 'maintenance', label: 'Maintenance', icon: Wrench },
  { value: 'other', label: 'Other', icon: User }
]

const roleLevels = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'manager', label: 'Manager' },
  { value: 'director', label: 'Director' }
]

const employmentTypes = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'volunteer', label: 'Volunteer' }
]

const payFrequencies = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' }
]

export function StaffProfileForm({ 
  venueId, 
  staff, 
  onSave, 
  onCancel, 
  isEditing = false 
}: StaffProfileFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("personal")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(staff?.avatar_url || null)

  // Form state
  const [formData, setFormData] = useState<CreateStaffProfileData>({
    venue_id: venueId,
    first_name: staff?.first_name || "",
    last_name: staff?.last_name || "",
    email: staff?.email || "",
    phone: staff?.phone || "",
    role: staff?.role || "",
    department: staff?.department || "",
    role_category: staff?.role_category || undefined,
    role_level: staff?.role_level || "entry",
    employment_type: staff?.employment_type || "full_time",
    hourly_rate: staff?.hourly_rate || undefined,
    hire_date: staff?.hire_date || "",
    pronouns: staff?.pronouns || "",
    bio: staff?.bio || "",
    date_of_birth: staff?.date_of_birth || "",
    address: staff?.address || "",
    city: staff?.city || "",
    state: staff?.state || "",
    postal_code: staff?.postal_code || "",
    country: staff?.country || "US",
    emergency_contact: staff?.emergency_contact || {}
  })

  // Emergency contact state
  const [emergencyContact, setEmergencyContact] = useState({
    name: staff?.emergency_contact?.name || "",
    phone: staff?.emergency_contact?.phone || "",
    relationship: staff?.emergency_contact?.relationship || "",
    email: staff?.emergency_contact?.email || ""
  })

  const handleInputChange = (field: keyof CreateStaffProfileData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleEmergencyContactChange = (field: string, value: string) => {
    setEmergencyContact(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // TODO: Upload avatar file if selected
      // const avatarUrl = avatarFile ? await uploadAvatar(avatarFile) : staff?.avatar_url

      const submitData = {
        ...formData,
        emergency_contact: emergencyContact
      }

      await onSave(submitData)
      
      toast({
        title: isEditing ? "Profile Updated" : "Profile Created",
        description: isEditing 
          ? "Staff profile has been updated successfully."
          : "New staff profile has been created successfully.",
      })
    } catch (error) {
      console.error('Error saving staff profile:', error)
      toast({
        title: "Error",
        description: "Failed to save staff profile. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const validateForm = () => {
    return formData.first_name && 
           formData.last_name && 
           formData.email && 
           formData.role
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className={detailSurfacePattern.panel}>
        <CardHeader>
          <CardTitle className={cn(detailSurfacePattern.title, "text-xl font-bold flex items-center space-x-2")}>
            {isEditing ? <Edit className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
            <span>{isEditing ? "Edit Staff Profile" : "Create New Staff Profile"}</span>
          </CardTitle>
          <CardDescription className={detailSurfacePattern.description}>
            {isEditing 
              ? "Update staff member information and details"
              : "Add a new staff member to your venue team"
            }
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={cn(detailSurfacePattern.tabsList, "grid grid-cols-5")}>
                <TabsTrigger value="personal" className={detailSurfacePattern.tabsTrigger}>Personal</TabsTrigger>
                <TabsTrigger value="employment" className={detailSurfacePattern.tabsTrigger}>Employment</TabsTrigger>
                <TabsTrigger value="contact" className={detailSurfacePattern.tabsTrigger}>Contact</TabsTrigger>
                <TabsTrigger value="emergency" className={detailSurfacePattern.tabsTrigger}>Emergency</TabsTrigger>
                <TabsTrigger value="avatar" className={detailSurfacePattern.tabsTrigger}>Avatar</TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[60vh] mt-6">
                {/* Personal Information Tab */}
                <TabsContent value="personal" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="first_name" className={detailSurfacePattern.label}>First Name *</Label>
                        <Input
                          id="first_name"
                          value={formData.first_name}
                          onChange={(e) => handleInputChange('first_name', e.target.value)}
                          className={detailSurfacePattern.input}
                          placeholder="Enter first name"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="last_name" className={detailSurfacePattern.label}>Last Name *</Label>
                        <Input
                          id="last_name"
                          value={formData.last_name}
                          onChange={(e) => handleInputChange('last_name', e.target.value)}
                          className={detailSurfacePattern.input}
                          placeholder="Enter last name"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="pronouns" className={detailSurfacePattern.label}>Pronouns</Label>
                        <Input
                          id="pronouns"
                          value={formData.pronouns}
                          onChange={(e) => handleInputChange('pronouns', e.target.value)}
                          className={detailSurfacePattern.input}
                          placeholder="e.g., they/them, she/her, he/him"
                        />
                      </div>

                      <div>
                        <Label htmlFor="date_of_birth" className={detailSurfacePattern.label}>Date of Birth</Label>
                        <Input
                          id="date_of_birth"
                          type="date"
                          value={formData.date_of_birth}
                          onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                          className={detailSurfacePattern.input}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="bio" className={detailSurfacePattern.label}>Bio</Label>
                        <Textarea
                          id="bio"
                          value={formData.bio}
                          onChange={(e) => handleInputChange('bio', e.target.value)}
                          className={cn(detailSurfacePattern.textarea, "min-h-[120px]")}
                          placeholder="Tell us about this staff member..."
                        />
                      </div>

                      <div>
                        <Label htmlFor="address" className={detailSurfacePattern.label}>Address</Label>
                        <Textarea
                          id="address"
                          value={formData.address}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          className={detailSurfacePattern.input}
                          placeholder="Enter full address"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city" className={detailSurfacePattern.label}>City</Label>
                          <Input
                            id="city"
                            value={formData.city}
                            onChange={(e) => handleInputChange('city', e.target.value)}
                            className={detailSurfacePattern.input}
                            placeholder="City"
                          />
                        </div>
                        <div>
                          <Label htmlFor="state" className={detailSurfacePattern.label}>State</Label>
                          <Input
                            id="state"
                            value={formData.state}
                            onChange={(e) => handleInputChange('state', e.target.value)}
                            className={detailSurfacePattern.input}
                            placeholder="State"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="postal_code" className={detailSurfacePattern.label}>Postal Code</Label>
                          <Input
                            id="postal_code"
                            value={formData.postal_code}
                            onChange={(e) => handleInputChange('postal_code', e.target.value)}
                            className={detailSurfacePattern.input}
                            placeholder="Postal code"
                          />
                        </div>
                        <div>
                          <Label htmlFor="country" className={detailSurfacePattern.label}>Country</Label>
                          <Input
                            id="country"
                            value={formData.country}
                            onChange={(e) => handleInputChange('country', e.target.value)}
                            className={detailSurfacePattern.input}
                            placeholder="Country"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Employment Information Tab */}
                <TabsContent value="employment" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="role" className={detailSurfacePattern.label}>Role/Position *</Label>
                        <Input
                          id="role"
                          value={formData.role}
                          onChange={(e) => handleInputChange('role', e.target.value)}
                          className={detailSurfacePattern.input}
                          placeholder="e.g., Sound Engineer, Bar Manager"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="department" className={detailSurfacePattern.label}>Department</Label>
                        <Input
                          id="department"
                          value={formData.department}
                          onChange={(e) => handleInputChange('department', e.target.value)}
                          className={detailSurfacePattern.input}
                          placeholder="e.g., Technical, Operations"
                        />
                      </div>

                      <div>
                        <Label htmlFor="role_category" className={detailSurfacePattern.label}>Role Category</Label>
                        <Select 
                          value={formData.role_category} 
                          onValueChange={(value) => handleInputChange('role_category', value)}
                        >
                          <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                            <SelectValue placeholder="Select role category" />
                          </SelectTrigger>
                          <SelectContent className={detailSurfacePattern.input}>
                            {roleCategories.map((category) => {
                              const Icon = category.icon
                              return (
                                <SelectItem key={category.value} value={category.value}>
                                  <div className="flex items-center space-x-2">
                                    <Icon className="h-4 w-4" />
                                    <span>{category.label}</span>
                                  </div>
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="role_level" className={detailSurfacePattern.label}>Role Level</Label>
                        <Select 
                          value={formData.role_level} 
                          onValueChange={(value) => handleInputChange('role_level', value)}
                        >
                          <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className={detailSurfacePattern.input}>
                            {roleLevels.map((level) => (
                              <SelectItem key={level.value} value={level.value}>
                                {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="employment_type" className={detailSurfacePattern.label}>Employment Type</Label>
                        <Select 
                          value={formData.employment_type} 
                          onValueChange={(value) => handleInputChange('employment_type', value)}
                        >
                          <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className={detailSurfacePattern.input}>
                            {employmentTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="hourly_rate" className={detailSurfacePattern.label}>Hourly Rate ($)</Label>
                        <Input
                          id="hourly_rate"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.hourly_rate || ""}
                          onChange={(e) => handleInputChange('hourly_rate', e.target.value ? parseFloat(e.target.value) : undefined)}
                          className={detailSurfacePattern.input}
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <Label htmlFor="hire_date" className={detailSurfacePattern.label}>Hire Date</Label>
                        <Input
                          id="hire_date"
                          type="date"
                          value={formData.hire_date}
                          onChange={(e) => handleInputChange('hire_date', e.target.value)}
                          className={detailSurfacePattern.input}
                        />
                      </div>

                      <div>
                        <Label htmlFor="pay_frequency" className={detailSurfacePattern.label}>Pay Frequency</Label>
                        <Select 
                          value={formData.pay_frequency} 
                          onValueChange={(value) => handleInputChange('pay_frequency', value)}
                        >
                          <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                            <SelectValue placeholder="Select pay frequency" />
                          </SelectTrigger>
                          <SelectContent className={detailSurfacePattern.input}>
                            {payFrequencies.map((frequency) => (
                              <SelectItem key={frequency.value} value={frequency.value}>
                                {frequency.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Contact Information Tab */}
                <TabsContent value="contact" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="email" className={detailSurfacePattern.label}>Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className={detailSurfacePattern.input}
                          placeholder="staff@venue.com"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone" className={detailSurfacePattern.label}>Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className={detailSurfacePattern.input}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className={cn("p-4", detailSurfacePattern.panel)}>
                        <h4 className="text-white font-medium mb-3 flex items-center space-x-2">
                          <Mail className="h-4 w-4" />
                          <span>Contact Information</span>
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className={detailSurfacePattern.description}>Email:</span>
                            <span className="text-white">{formData.email || "Not provided"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={detailSurfacePattern.description}>Phone:</span>
                            <span className="text-white">{formData.phone || "Not provided"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Emergency Contact Tab */}
                <TabsContent value="emergency" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="emergency_name" className={detailSurfacePattern.label}>Emergency Contact Name</Label>
                        <Input
                          id="emergency_name"
                          value={emergencyContact.name}
                          onChange={(e) => handleEmergencyContactChange('name', e.target.value)}
                          className={detailSurfacePattern.input}
                          placeholder="Full name"
                        />
                      </div>

                      <div>
                        <Label htmlFor="emergency_phone" className={detailSurfacePattern.label}>Emergency Contact Phone</Label>
                        <Input
                          id="emergency_phone"
                          type="tel"
                          value={emergencyContact.phone}
                          onChange={(e) => handleEmergencyContactChange('phone', e.target.value)}
                          className={detailSurfacePattern.input}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="emergency_relationship" className={detailSurfacePattern.label}>Relationship</Label>
                        <Input
                          id="emergency_relationship"
                          value={emergencyContact.relationship}
                          onChange={(e) => handleEmergencyContactChange('relationship', e.target.value)}
                          className={detailSurfacePattern.input}
                          placeholder="e.g., Spouse, Parent, Friend"
                        />
                      </div>

                      <div>
                        <Label htmlFor="emergency_email" className={detailSurfacePattern.label}>Emergency Contact Email</Label>
                        <Input
                          id="emergency_email"
                          type="email"
                          value={emergencyContact.email}
                          onChange={(e) => handleEmergencyContactChange('email', e.target.value)}
                          className={detailSurfacePattern.input}
                          placeholder="emergency@email.com"
                        />
                      </div>
                    </div>
                  </div>

                  <div className={cn("p-4", detailSurfacePattern.panel)}>
                    <h4 className="text-white font-medium mb-3 flex items-center space-x-2">
                      <Heart className="h-4 w-4" />
                      <span>Emergency Contact Summary</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className={detailSurfacePattern.description}>Name:</span>
                        <span className="text-white ml-2">{emergencyContact.name || "Not provided"}</span>
                      </div>
                      <div>
                        <span className={detailSurfacePattern.description}>Phone:</span>
                        <span className="text-white ml-2">{emergencyContact.phone || "Not provided"}</span>
                      </div>
                      <div>
                        <span className={detailSurfacePattern.description}>Relationship:</span>
                        <span className="text-white ml-2">{emergencyContact.relationship || "Not provided"}</span>
                      </div>
                      <div>
                        <span className={detailSurfacePattern.description}>Email:</span>
                        <span className="text-white ml-2">{emergencyContact.email || "Not provided"}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Avatar Tab */}
                <TabsContent value="avatar" className="space-y-6">
                  <div className="flex flex-col items-center space-y-6">
                    <div className="relative">
                      <Avatar className="h-32 w-32 border-4 border-gray-700">
                        <AvatarImage src={avatarPreview || undefined} />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-2xl font-bold">
                          {formData.first_name?.[0]}{formData.last_name?.[0] || formData.first_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      {avatarPreview && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="absolute -top-2 -right-2 h-8 w-8 p-0 border-red-500 text-red-400 hover:bg-red-500/20"
                          onClick={() => {
                            setAvatarFile(null)
                            setAvatarPreview(null)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="text-center space-y-4">
                      <div>
                        <Label htmlFor="avatar_upload" className={cn(detailSurfacePattern.label, "cursor-pointer")}>
                          <div className="flex items-center space-x-2">
                            <Upload className="h-5 w-5" />
                            <span>Upload Profile Picture</span>
                          </div>
                        </Label>
                        <Input
                          id="avatar_upload"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </div>
                      <p className={detailSurfacePattern.subtleText}>
                        Recommended: Square image, 400x400 pixels or larger
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <Separator className="my-6 bg-gray-700" />

            {/* Form Actions */}
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className={detailSurfacePattern.btnOutline}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!validateForm() || isLoading}
                className={detailSurfacePattern.btnPrimary}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Save className="h-4 w-4" />
                    <span>{isEditing ? "Update Profile" : "Create Profile"}</span>
                  </div>
                )}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
} 