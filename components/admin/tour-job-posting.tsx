"use client"

import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Plus,
  Briefcase,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  Users,
  Star,
  Music,
  Mic,
  Guitar,
  Drum,
  Keyboard,
  Speaker,
  Lightbulb,
  Camera,
  Video,
  Truck,
  Shield,
  Utensils,
  Wifi,
  Zap,
  Route,
  Plane,
  Car,
  Hotel
} from "lucide-react"
import { toast } from "sonner"
import { useActingContext } from "@/hooks/use-acting-context"

interface TourJobPostingProps {
  tourId: string
  tourName: string
  tourStartDate: string
  tourEndDate: string
  onJobPosted?: (job: any) => void
}

interface JobFormData {
  title: string
  description: string
  category_id: string
  job_type: 'one_time' | 'recurring' | 'tour' | 'residency' | 'collaboration'
  payment_type: 'paid' | 'unpaid' | 'revenue_share' | 'exposure'
  payment_amount?: number
  payment_currency: string
  payment_description?: string
  location: string
  location_type: 'in_person' | 'remote' | 'hybrid'
  city?: string
  state?: string
  country?: string
  event_date: string
  event_time?: string
  duration_hours?: number
  deadline?: string
  required_skills: string[]
  required_equipment: string[]
  required_experience: 'beginner' | 'intermediate' | 'professional'
  required_genres: string[]
  age_requirement?: string
  benefits: string[]
  special_requirements?: string
  contact_email?: string
  contact_phone?: string
  external_link?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  featured: boolean
  status: 'draft' | 'open'
}

const jobCategories = [
  { id: '1', name: 'Musicians', icon: Music },
  { id: '2', name: 'Vocalists', icon: Mic },
  { id: '3', name: 'Sound Engineers', icon: Speaker },
  { id: '4', name: 'Lighting Technicians', icon: Lightbulb },
  { id: '5', name: 'Stage Crew', icon: Users },
  { id: '6', name: 'Photographers', icon: Camera },
  { id: '7', name: 'Videographers', icon: Video },
  { id: '8', name: 'Transportation', icon: Truck },
  { id: '9', name: 'Security', icon: Shield },
  { id: '10', name: 'Catering', icon: Utensils },
  { id: '11', name: 'Tour Management', icon: Route },
  { id: '12', name: 'Accommodation', icon: Hotel }
]

const skillOptions = [
  'Live Performance', 'Studio Recording', 'Mixing', 'Mastering', 'Sound Design',
  'Lighting Design', 'Stage Management', 'Event Planning', 'Tour Coordination',
  'Equipment Setup', 'Troubleshooting', 'Customer Service', 'Team Leadership',
  'Budget Management', 'Vendor Coordination', 'Safety Protocols', 'First Aid',
  'Driving', 'Equipment Maintenance', 'Inventory Management', 'Marketing',
  'Social Media', 'Photography', 'Videography', 'Graphic Design', 'Web Development'
]

const equipmentOptions = [
  'PA System', 'Microphones', 'Instruments', 'Lighting Equipment', 'Video Equipment',
  'Computers', 'Software', 'Vehicles', 'Tools', 'Safety Equipment', 'Medical Supplies',
  'Communication Devices', 'GPS', 'Maps', 'Emergency Kits', 'Storage Solutions'
]

const benefitOptions = [
  'Competitive Pay', 'Health Insurance', 'Travel Expenses', 'Accommodation',
  'Meals Provided', 'Equipment Provided', 'Professional Development', 'Networking',
  'Exposure', 'Flexible Schedule', 'Performance Bonuses', 'Career Growth',
  'Travel Opportunities', 'Industry Connections', 'Skill Development'
]

export function TourJobPosting({ tourId, tourName, tourStartDate, tourEndDate, onJobPosted }: TourJobPostingProps) {
  const { actingHeaders, isActingReady } = useActingContext()
  const adminRequest = useCallback((input?: RequestInit): RequestInit => ({
    ...input,
    headers: { ...actingHeaders, ...(input?.headers || {}) },
  }), [actingHeaders])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    description: '',
    category_id: '',
    job_type: 'tour',
    payment_type: 'paid',
    payment_amount: 0,
    payment_currency: 'USD',
    payment_description: '',
    location: 'Multiple Locations',
    location_type: 'in_person',
    city: '',
    state: '',
    country: '',
    event_date: tourStartDate,
    event_time: '',
    duration_hours: 0,
    deadline: '',
    required_skills: [],
    required_equipment: [],
    required_experience: 'intermediate',
    required_genres: [],
    age_requirement: '',
    benefits: [],
    special_requirements: '',
    contact_email: '',
    contact_phone: '',
    external_link: '',
    priority: 'normal',
    featured: false,
    status: 'open'
  })

  const handleInputChange = (field: keyof JobFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleArrayChange = (field: keyof JobFormData, value: string, action: 'add' | 'remove') => {
    setFormData(prev => ({
      ...prev,
      [field]: action === 'add' 
        ? [...(prev[field] as string[]), value]
        : (prev[field] as string[]).filter(item => item !== value)
    }))
  }

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !formData.category_id) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    try {
      if (!isActingReady) throw new Error('Select an organization account first')
      const response = await fetch(`/api/tours/${tourId}/jobs`, adminRequest({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tour_id: tourId,
          tour_name: tourName,
          tour_start_date: tourStartDate,
          tour_end_date: tourEndDate
        })
      }))

      if (!response.ok) {
        throw new Error('Failed to post job')
      }

      const result = await response.json()
      toast.success('Job posted successfully!')
      onJobPosted?.(result.job)
      setIsDialogOpen(false)
      setCurrentStep(1)
      setFormData({
        title: '',
        description: '',
        category_id: '',
        job_type: 'tour',
        payment_type: 'paid',
        payment_amount: 0,
        payment_currency: 'USD',
        payment_description: '',
        location: 'Multiple Locations',
        location_type: 'in_person',
        city: '',
        state: '',
        country: '',
        event_date: tourStartDate,
        event_time: '',
        duration_hours: 0,
        deadline: '',
        required_skills: [],
        required_equipment: [],
        required_experience: 'intermediate',
        required_genres: [],
        age_requirement: '',
        benefits: [],
        special_requirements: '',
        contact_email: '',
        contact_phone: '',
        external_link: '',
        priority: 'normal',
        featured: false,
        status: 'open'
      })
    } catch (error) {
      console.error('Error posting job:', error)
      toast.error('Failed to post job')
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const getCategoryIcon = (categoryId: string) => {
    const category = jobCategories.find(cat => cat.id === categoryId)
    return category ? category.icon : Briefcase
  }

  return (
    <>
      <Button 
        onClick={() => setIsDialogOpen(true)} 
        className="bg-purple-600 hover:bg-purple-700"
      >
        <Plus className="mr-2 h-4 w-4" />
        Post Tour Job
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Post Job for Tour: {tourName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= step 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {step}
                  </div>
                  {step < 4 && (
                    <div className={`w-16 h-1 mx-2 ${
                      currentStep > step ? 'bg-purple-600' : 'bg-slate-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Basic Information</h3>
                
                <div>
                  <Label className="text-slate-300">Job Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="e.g., Tour Sound Engineer, Stage Manager"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-slate-300">Job Description *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe the role, responsibilities, and what you're looking for..."
                    rows={4}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-slate-300">Category *</Label>
                  <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobCategories.map((category) => {
                        const IconComponent = category.icon
                        return (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center space-x-2">
                              <IconComponent className="h-4 w-4" />
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Payment Type</Label>
                    <Select value={formData.payment_type} onValueChange={(value: any) => handleInputChange('payment_type', value)}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="revenue_share">Revenue Share</SelectItem>
                        <SelectItem value="exposure">Exposure</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-300">Payment Amount</Label>
                    <Input
                      type="number"
                      value={formData.payment_amount}
                      onChange={(e) => handleInputChange('payment_amount', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Requirements */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Requirements & Skills</h3>
                
                <div>
                  <Label className="text-slate-300">Required Experience</Label>
                  <Select value={formData.required_experience} onValueChange={(value: any) => handleInputChange('required_experience', value)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-slate-300">Required Skills</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {skillOptions.map((skill) => (
                      <div key={skill} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={skill}
                          checked={formData.required_skills.includes(skill)}
                          onChange={(e) => handleArrayChange('required_skills', skill, e.target.checked ? 'add' : 'remove')}
                          className="rounded border-slate-600 bg-slate-700"
                        />
                        <Label htmlFor={skill} className="text-sm text-slate-300">{skill}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300">Required Equipment</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {equipmentOptions.map((equipment) => (
                      <div key={equipment} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={equipment}
                          checked={formData.required_equipment.includes(equipment)}
                          onChange={(e) => handleArrayChange('required_equipment', equipment, e.target.checked ? 'add' : 'remove')}
                          className="rounded border-slate-600 bg-slate-700"
                        />
                        <Label htmlFor={equipment} className="text-sm text-slate-300">{equipment}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300">Special Requirements</Label>
                  <Textarea
                    value={formData.special_requirements}
                    onChange={(e) => handleInputChange('special_requirements', e.target.value)}
                    placeholder="Any special requirements or qualifications..."
                    rows={3}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Tour Details */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Tour Details</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Tour Start Date</Label>
                    <Input
                      type="date"
                      value={formData.event_date}
                      onChange={(e) => handleInputChange('event_date', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Application Deadline</Label>
                    <Input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => handleInputChange('deadline', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300">Location Type</Label>
                  <Select value={formData.location_type} onValueChange={(value: any) => handleInputChange('location_type', value)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_person">In Person</SelectItem>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-slate-300">City</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="Multiple cities"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">State</Label>
                    <Input
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="Multiple states"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Country</Label>
                    <Input
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      placeholder="Multiple countries"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300">Benefits</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {benefitOptions.map((benefit) => (
                      <div key={benefit} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={benefit}
                          checked={formData.benefits.includes(benefit)}
                          onChange={(e) => handleArrayChange('benefits', benefit, e.target.checked ? 'add' : 'remove')}
                          className="rounded border-slate-600 bg-slate-700"
                        />
                        <Label htmlFor={benefit} className="text-sm text-slate-300">{benefit}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Contact & Settings */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Contact & Settings</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Contact Email</Label>
                    <Input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => handleInputChange('contact_email', e.target.value)}
                      placeholder="your@email.com"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Contact Phone</Label>
                    <Input
                      value={formData.contact_phone}
                      onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                      placeholder="(555) 123-4567"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300">External Link (Optional)</Label>
                  <Input
                    value={formData.external_link}
                    onChange={(e) => handleInputChange('external_link', e.target.value)}
                    placeholder="https://..."
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Priority</Label>
                    <Select value={formData.priority} onValueChange={(value: any) => handleInputChange('priority', value)}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-300">Status</Label>
                    <Select value={formData.status} onValueChange={(value: any) => handleInputChange('status', value)}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.featured}
                    onCheckedChange={(checked) => handleInputChange('featured', checked)}
                  />
                  <Label className="text-slate-300">Featured Job</Label>
                </div>

                {/* Job Preview */}
                <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                  <h4 className="text-white font-semibold mb-2">Job Preview</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      {formData.category_id && (
                        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                          {(() => {
                            const IconComponent = getCategoryIcon(formData.category_id)
                            return <IconComponent className="h-4 w-4 text-white" />
                          })()}
                        </div>
                      )}
                      <div>
                        <h5 className="text-white font-medium">{formData.title || 'Job Title'}</h5>
                        <p className="text-slate-400 text-sm">{formData.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-slate-400">
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-3 w-3" />
                        <span>{formData.payment_type === 'paid' ? `$${formData.payment_amount}` : formData.payment_type}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{formData.required_experience}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formData.event_date}</span>
                      </div>
                    </div>
                    {formData.required_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {formData.required_skills.slice(0, 3).map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs bg-slate-800/50 border-slate-600 text-slate-300">
                            {skill}
                          </Badge>
                        ))}
                        {formData.required_skills.length > 3 && (
                          <Badge variant="outline" className="text-xs bg-slate-800/50 border-slate-600 text-slate-300">
                            +{formData.required_skills.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="border-slate-600 text-slate-300"
              >
                Previous
              </Button>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="border-slate-600 text-slate-300"
                >
                  Cancel
                </Button>
                
                {currentStep < 4 ? (
                  <Button
                    onClick={nextStep}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isSubmitting ? 'Posting...' : 'Post Job'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
