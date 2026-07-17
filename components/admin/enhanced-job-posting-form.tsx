"use client"

// Deprecated: do not use for new job-posting flows. Extend the canonical
// shared job-posting shell/adapters and full workforce builder instead.

import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Settings, 
  FileText, 
  X,
  Calendar,
  MapPin,
  Users,
  Shield,
  Award,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { EventSelect } from '@/components/events/event-select'
import { VenueSelect } from '@/components/venues/venue-select'
import type { 
  CreateJobPostingData, 
  ApplicationFormField,
  JobPostingTemplate 
} from '@/types/admin-onboarding'

// Enhanced Zod schema for job posting form
const enhancedJobPostingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  department: z.string().min(1, 'Department is required'),
  position: z.string().min(1, 'Position is required'),
  employment_type: z.enum(['full_time', 'part_time', 'contractor', 'volunteer']),
  location: z.string().min(1, 'Location is required'),
  event_id: z.string().optional(),
  event_date: z.string().optional(),
  number_of_positions: z.number().min(1, 'At least 1 position is required').max(100, 'Maximum 100 positions'),
  salary_range: z.object({
    min: z.number().min(0, 'Minimum salary must be positive'),
    max: z.number().min(0, 'Maximum salary must be positive'),
    type: z.enum(['hourly', 'salary', 'daily'])
  }).optional(),
  requirements: z.array(z.string()).min(1, 'At least one requirement is required'),
  responsibilities: z.array(z.string()).min(1, 'At least one responsibility is required'),
  benefits: z.array(z.string()),
  skills: z.array(z.string()),
  experience_level: z.enum(['entry', 'mid', 'senior', 'executive']),
  remote: z.boolean(),
  urgent: z.boolean(),
  required_certifications: z.array(z.string()),
  role_type: z.enum(['security', 'bartender', 'street_team', 'production', 'management', 'other']),
  shift_duration: z.number().optional(),
  age_requirement: z.number().min(18, 'Minimum age is 18').optional(),
  background_check_required: z.boolean(),
  drug_test_required: z.boolean(),
  uniform_provided: z.boolean(),
  training_provided: z.boolean(),
  application_form_template: z.object({
    fields: z.array(z.object({
      id: z.string(),
      name: z.string(),
      label: z.string(),
      type: z.enum(['text', 'textarea', 'email', 'phone', 'date', 'select', 'multiselect', 'file', 'checkbox', 'number']),
      required: z.boolean(),
      placeholder: z.string().optional(),
      description: z.string().optional(),
      options: z.array(z.string()).optional(),
      validation: z.object({
        min: z.number().optional(),
        max: z.number().optional(),
        pattern: z.string().optional(),
        custom: z.string().optional()
      }).optional(),
      order: z.number()
    }))
  })
})

type EnhancedJobPostingFormData = z.infer<typeof enhancedJobPostingSchema>

interface EnhancedJobPostingFormProps {
  onSubmit: (data: EnhancedJobPostingFormData) => Promise<void>
  onCancel: () => void
  initialData?: Partial<JobPostingTemplate>
  isLoading?: boolean
  venueId: string
}

// Role-based templates
const roleTemplates = {
  security: {
    title: 'Security Guard',
    description: 'Maintain safety and security at events',
    requirements: ['Valid security license', 'Previous security experience', 'Physical fitness'],
    responsibilities: ['Monitor event areas', 'Handle crowd control', 'Report incidents', 'Check credentials'],
    skills: ['Crowd management', 'Emergency response', 'Communication'],
    required_certifications: ['Security License', 'First Aid/CPR'],
    role_type: 'security' as const,
    background_check_required: true,
    drug_test_required: true,
    uniform_provided: true,
    training_provided: true
  },
  bartender: {
    title: 'Bartender',
    description: 'Serve beverages and maintain bar operations',
    requirements: ['Valid alcohol serving license', 'Previous bartending experience', 'Age 21+'],
    responsibilities: ['Serve beverages', 'Maintain bar cleanliness', 'Check IDs', 'Handle cash transactions'],
    skills: ['Mixology', 'Customer service', 'Cash handling'],
    required_certifications: ['Alcohol Serving License', 'Food Handler Certificate'],
    role_type: 'bartender' as const,
    background_check_required: true,
    drug_test_required: false,
    uniform_provided: true,
    training_provided: true
  },
  street_team: {
    title: 'Street Team Member',
    description: 'Promote events and engage with the community',
    requirements: ['Outgoing personality', 'Reliable transportation', 'Flexible schedule'],
    responsibilities: ['Distribute promotional materials', 'Engage with potential attendees', 'Report feedback'],
    skills: ['Communication', 'Social media', 'Event promotion'],
    required_certifications: [],
    role_type: 'street_team' as const,
    background_check_required: false,
    drug_test_required: false,
    uniform_provided: true,
    training_provided: true
  }
}

// Common form fields for different roles
const commonFormFields = {
  personal_info: [
    { id: 'full_name', name: 'full_name', label: 'Full Name', type: 'text' as const, required: true, order: 1 },
    { id: 'email', name: 'email', label: 'Email Address', type: 'email' as const, required: true, order: 2 },
    { id: 'phone', name: 'phone', label: 'Phone Number', type: 'phone' as const, required: true, order: 3 },
    { id: 'date_of_birth', name: 'date_of_birth', label: 'Date of Birth', type: 'date' as const, required: true, order: 4 }
  ],
  experience: [
    { id: 'experience_years', name: 'experience_years', label: 'Years of Experience', type: 'number' as const, required: true, order: 5 },
    { id: 'previous_employers', name: 'previous_employers', label: 'Previous Employers', type: 'textarea' as const, required: false, order: 6 },
    { id: 'references', name: 'references', label: 'Professional References', type: 'textarea' as const, required: true, order: 7 }
  ],
  documents: [
    { id: 'resume', name: 'resume', label: 'Resume/CV', type: 'file' as const, required: true, order: 8 },
    { id: 'cover_letter', name: 'cover_letter', label: 'Cover Letter', type: 'textarea' as const, required: false, order: 9 }
  ]
}

export default function EnhancedJobPostingForm({ 
  onSubmit, 
  onCancel, 
  initialData, 
  isLoading,
  venueId 
}: EnhancedJobPostingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedRoleType, setSelectedRoleType] = useState<string>('')
  const [skillInput, setSkillInput] = useState('')
  const [requirementInput, setRequirementInput] = useState('')
  const [responsibilityInput, setResponsibilityInput] = useState('')
  const [benefitInput, setBenefitInput] = useState('')
  const [certificationInput, setCertificationInput] = useState('')
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    formState: { errors, isValid, isDirty }
  } = useForm<EnhancedJobPostingFormData>({
    resolver: zodResolver(enhancedJobPostingSchema),
    mode: 'onChange',
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      department: initialData?.department || '',
      position: initialData?.position || initialData?.title || '',
      employment_type: initialData?.employment_type || 'part_time',
      location: initialData?.location || '',
      number_of_positions: initialData?.number_of_positions || 1,
      salary_range: initialData?.salary_range,
      requirements: initialData?.requirements || ['Strong communication skills'],
      responsibilities: initialData?.responsibilities || ['Assist with event operations'],
      benefits: initialData?.benefits || ['Flexible schedule'],
      skills: initialData?.skills || [],
      experience_level: initialData?.experience_level || 'entry',
      remote: initialData?.remote || false,
      urgent: initialData?.urgent || false,
      required_certifications: [],
      role_type: 'other',
      background_check_required: false,
      drug_test_required: false,
      uniform_provided: false,
      training_provided: false,
      application_form_template: {
        fields: [
          ...commonFormFields.personal_info,
          ...commonFormFields.experience,
          ...commonFormFields.documents
        ]
      }
    }
  })

  const {
    fields: formFields,
    append: appendFormField,
    remove: removeFormField,
    update: updateFormField
  } = useFieldArray({
    control,
    name: 'application_form_template.fields'
  })

  const watchedFields = watch()

  // Keep position in sync with title unless the user changed it explicitly (we infer position from title for now)
  useEffect(() => {
    if (watchedFields.title && (!watchedFields.position || watchedFields.position.trim().length === 0)) {
      setValue('position', watchedFields.title)
    }
  }, [watchedFields.title])

  // Map fields per step for step-wise validation
  const stepFieldMap: Record<number, (keyof EnhancedJobPostingFormData)[]> = {
    1: [
      'title',
      'description',
      'department',
      'position',
      'employment_type',
      'location',
      'number_of_positions'
    ],
    2: ['requirements', 'responsibilities'],
    3: [],
    4: []
  }

  async function handleNextStep() {
    const fields = stepFieldMap[currentStep]
    if (fields.length === 0) {
      setCurrentStep(Math.min(4, currentStep + 1))
      return
    }
    const valid = await trigger(fields as any, { shouldFocus: true })
    if (valid) setCurrentStep(Math.min(4, currentStep + 1))
    else toast({ title: 'Missing required fields', description: 'Please complete the highlighted fields before continuing.', variant: 'destructive' })
  }

  // Apply role template
  const applyRoleTemplate = (roleType: string) => {
    const template = roleTemplates[roleType as keyof typeof roleTemplates]
    if (template) {
      setValue('title', template.title)
      setValue('position', template.title)
      setValue('description', template.description)
      setValue('requirements', template.requirements)
      setValue('responsibilities', template.responsibilities)
      setValue('skills', template.skills)
      setValue('required_certifications', template.required_certifications)
      setValue('role_type', template.role_type)
      setValue('background_check_required', template.background_check_required)
      setValue('drug_test_required', template.drug_test_required)
      setValue('uniform_provided', template.uniform_provided)
      setValue('training_provided', template.training_provided)
      
      // Add role-specific form fields
      const roleSpecificFields = getRoleSpecificFields(roleType)
      setValue('application_form_template.fields', [
        ...commonFormFields.personal_info,
        ...commonFormFields.experience,
        ...roleSpecificFields,
        ...commonFormFields.documents
      ])
    }
  }

  const getRoleSpecificFields = (roleType: string) => {
    switch (roleType) {
      case 'security':
        return [
          { id: 'security_license', name: 'security_license', label: 'Security License Number', type: 'text' as const, required: true, order: 10 },
          { id: 'first_aid_cert', name: 'first_aid_cert', label: 'First Aid/CPR Certification', type: 'file' as const, required: true, order: 11 },
          { id: 'emergency_contact', name: 'emergency_contact', label: 'Emergency Contact', type: 'text' as const, required: true, order: 12 }
        ]
      case 'bartender':
        return [
          { id: 'alcohol_license', name: 'alcohol_license', label: 'Alcohol Serving License', type: 'text' as const, required: true, order: 10 },
          { id: 'food_handler_cert', name: 'food_handler_cert', label: 'Food Handler Certificate', type: 'file' as const, required: true, order: 11 },
          { id: 'availability_schedule', name: 'availability_schedule', label: 'Availability Schedule', type: 'textarea' as const, required: true, order: 12 }
        ]
      case 'street_team':
        return [
          { id: 'social_media_handles', name: 'social_media_handles', label: 'Social Media Handles', type: 'textarea' as const, required: false, order: 10 },
          { id: 'transportation', name: 'transportation', label: 'Transportation Method', type: 'select' as const, required: true, options: ['Car', 'Public Transit', 'Bike', 'Other'], order: 11 },
          { id: 'availability', name: 'availability', label: 'Weekly Availability', type: 'textarea' as const, required: true, order: 12 }
        ]
      default:
        return []
    }
  }

  async function handleFormSubmit(data: EnhancedJobPostingFormData) {
    function getReadableError(err: any): string {
      if (!err) return 'Unknown error'
      if (Array.isArray(err?.issues)) return err.issues.map((i: any) => i?.message).join('\n')
      if (err?.message) return err.message
      try { return JSON.stringify(err) } catch { return 'Unexpected error' }
    }

    try {
      setIsSubmitting(true)
      await onSubmit(data)
      toast({
        title: 'Job Posting Created',
        description: 'Your job posting has been successfully created and published.',
      })
    } catch (error) {
      const msg = getReadableError(error)
      toast({
        title: 'Failed to create job posting',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleInvalidSubmit() {
    // Find which step contains the first error and navigate there
    const errorKeys = Object.keys(errors || {}) as (keyof EnhancedJobPostingFormData)[]
    const first = errorKeys[0]
    if (first) {
      const stepEntry = Object.entries(stepFieldMap).find(([, fields]) => fields.includes(first))
      if (stepEntry) setCurrentStep(Number(stepEntry[0]))
    }
    toast({ title: 'Please fix form errors', description: 'Some required fields are incomplete.', variant: 'destructive' })
  }

  const addSkill = () => {
    if (skillInput.trim() && !watchedFields.skills.includes(skillInput.trim())) {
      setValue('skills', [...watchedFields.skills, skillInput.trim()])
      setSkillInput('')
    }
  }

  const removeSkill = (skill: string) => {
    setValue('skills', watchedFields.skills.filter(s => s !== skill))
  }

  const addRequirement = () => {
    if (requirementInput.trim() && !watchedFields.requirements.includes(requirementInput.trim())) {
      setValue('requirements', [...watchedFields.requirements, requirementInput.trim()])
      setRequirementInput('')
    }
  }

  const removeRequirement = (requirement: string) => {
    setValue('requirements', watchedFields.requirements.filter(r => r !== requirement))
  }

  const addResponsibility = () => {
    if (responsibilityInput.trim() && !watchedFields.responsibilities.includes(responsibilityInput.trim())) {
      setValue('responsibilities', [...watchedFields.responsibilities, responsibilityInput.trim()])
      setResponsibilityInput('')
    }
  }

  const removeResponsibility = (responsibility: string) => {
    setValue('responsibilities', watchedFields.responsibilities.filter(r => r !== responsibility))
  }

  const addBenefit = () => {
    if (benefitInput.trim() && !watchedFields.benefits.includes(benefitInput.trim())) {
      setValue('benefits', [...watchedFields.benefits, benefitInput.trim()])
      setBenefitInput('')
    }
  }

  const removeBenefit = (benefit: string) => {
    setValue('benefits', watchedFields.benefits.filter(b => b !== benefit))
  }

  const addCertification = () => {
    if (certificationInput.trim() && !watchedFields.required_certifications.includes(certificationInput.trim())) {
      setValue('required_certifications', [...watchedFields.required_certifications, certificationInput.trim()])
      setCertificationInput('')
    }
  }

  const removeCertification = (certification: string) => {
    setValue('required_certifications', watchedFields.required_certifications.filter(c => c !== certification))
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Create Job Posting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit, handleInvalidSubmit)} className="space-y-8">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">1</div>
                  <h3 className="text-xl font-semibold text-white">Basic Information</h3>
                </div>

                {/* Role Template Selection */}
                <div className="space-y-4">
                  <Label className="text-white">Quick Start Templates</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(roleTemplates).map(([key, template]) => (
                      <Card 
                        key={key}
                        className={`cursor-pointer transition-all hover:border-purple-500 ${
                          selectedRoleType === key ? 'border-purple-500 bg-purple-900/20' : 'bg-slate-700 border-slate-600'
                        }`}
                        onClick={() => {
                          setSelectedRoleType(key)
                          applyRoleTemplate(key)
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            {key === 'security' && <Shield className="h-5 w-5 text-red-500" />}
                            {key === 'bartender' && <DollarSign className="h-5 w-5 text-green-500" />}
                            {key === 'street_team' && <Users className="h-5 w-5 text-blue-500" />}
                            <h4 className="font-semibold text-white">{template.title}</h4>
                          </div>
                          <p className="text-sm text-slate-400">{template.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-white">Job Title *</Label>
                    <Input
                      id="title"
                      {...register('title')}
                      placeholder="e.g., Security Guard"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-white">Department *</Label>
                    <Select onValueChange={(value) => setValue('department', value)} value={watchedFields.department}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="security">Security</SelectItem>
                        <SelectItem value="operations">Operations</SelectItem>
                        <SelectItem value="food_beverage">Food & Beverage</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                        <SelectItem value="management">Management</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.department && <p className="text-red-500 text-sm">{errors.department.message}</p>}
                  </div>
                </div>

                {/* Optional: Link to Event (internal only) */}
                <div className="space-y-2">
                  <Label className="text-white">Venue and Event (optional)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Venue selector */}
                    <VenueSelect onSelect={(venue) => {
                      setValue('event_id', undefined)
                      setValue('event_date', undefined)
                      // store venue as location hint when available
                      if (venue?.name && !watchedFields.location) setValue('location', venue.name)
                    }} />
                    {/* Event selector */}
                    <EventSelect onSelect={(evt) => {
                      setValue('event_id', evt?.id || undefined)
                      setValue('event_date', evt?.event_date || undefined)
                    }} />
                  </div>
                  <p className="text-slate-500 text-xs">This link is internal only and not shown publicly.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-white">Job Description *</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="Describe the role, responsibilities, and what makes this position unique..."
                    className="bg-slate-700 border-slate-600 text-white min-h-[120px]"
                  />
                  {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="employment_type" className="text-white">Employment Type *</Label>
                    <Select onValueChange={(value) => setValue('employment_type', value as any)} value={watchedFields.employment_type}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_time">Full Time</SelectItem>
                        <SelectItem value="part_time">Part Time</SelectItem>
                        <SelectItem value="contractor">Contractor</SelectItem>
                        <SelectItem value="volunteer">Volunteer</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.employment_type && <p className="text-red-500 text-sm">{errors.employment_type.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-white">Location *</Label>
                    <Input
                      id="location"
                      {...register('location')}
                      placeholder="e.g., Los Angeles, CA"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    {errors.location && <p className="text-red-500 text-sm">{errors.location.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="number_of_positions" className="text-white">Number of Positions *</Label>
                    <Input
                      id="number_of_positions"
                      type="number"
                      {...register('number_of_positions', { valueAsNumber: true })}
                      min="1"
                      max="100"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    {errors.number_of_positions && <p className="text-red-500 text-sm">{errors.number_of_positions.message}</p>}
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="urgent"
                      checked={watchedFields.urgent}
                      onCheckedChange={(checked) => setValue('urgent', checked)}
                    />
                    <Label htmlFor="urgent" className="text-white">Urgent Hiring</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="remote"
                      checked={watchedFields.remote}
                      onCheckedChange={(checked) => setValue('remote', checked)}
                    />
                    <Label htmlFor="remote" className="text-white">Remote Work Available</Label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Requirements & Responsibilities */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">2</div>
                  <h3 className="text-xl font-semibold text-white">Requirements & Responsibilities</h3>
                </div>

                {/* Requirements */}
                <div className="space-y-4">
                  <Label className="text-white">Requirements *</Label>
                  <div className="space-y-2">
                    {watchedFields.requirements.map((requirement, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={requirement}
                          onChange={(e) => {
                            const newRequirements = [...watchedFields.requirements]
                            newRequirements[index] = e.target.value
                            setValue('requirements', newRequirements)
                          }}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeRequirement(requirement)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={requirementInput}
                        onChange={(e) => setRequirementInput(e.target.value)}
                        placeholder="Add a requirement..."
                        className="bg-slate-700 border-slate-600 text-white"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                      />
                      <Button type="button" onClick={addRequirement} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {errors.requirements && <p className="text-red-500 text-sm">{errors.requirements.message}</p>}
                </div>

                {/* Responsibilities */}
                <div className="space-y-4">
                  <Label className="text-white">Responsibilities *</Label>
                  <div className="space-y-2">
                    {watchedFields.responsibilities.map((responsibility, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={responsibility}
                          onChange={(e) => {
                            const newResponsibilities = [...watchedFields.responsibilities]
                            newResponsibilities[index] = e.target.value
                            setValue('responsibilities', newResponsibilities)
                          }}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeResponsibility(responsibility)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={responsibilityInput}
                        onChange={(e) => setResponsibilityInput(e.target.value)}
                        placeholder="Add a responsibility..."
                        className="bg-slate-700 border-slate-600 text-white"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addResponsibility())}
                      />
                      <Button type="button" onClick={addResponsibility} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {errors.responsibilities && <p className="text-red-500 text-sm">{errors.responsibilities.message}</p>}
                </div>

                {/* Skills */}
                <div className="space-y-4">
                  <Label className="text-white">Required Skills</Label>
                  <div className="flex flex-wrap gap-2">
                    {watchedFields.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="bg-purple-600 text-white">
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="ml-2 hover:text-red-300"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      placeholder="Add a skill..."
                      className="bg-slate-700 border-slate-600 text-white"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    />
                    <Button type="button" onClick={addSkill} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Compensation & Benefits */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">3</div>
                  <h3 className="text-xl font-semibold text-white">Compensation & Benefits</h3>
                </div>

                {/* Salary Range */}
                <div className="space-y-4">
                  <Label className="text-white">Salary Range</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white text-sm">Minimum</Label>
                      <Input
                        type="number"
                        {...register('salary_range.min', { valueAsNumber: true })}
                        placeholder="0"
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white text-sm">Maximum</Label>
                      <Input
                        type="number"
                        {...register('salary_range.max', { valueAsNumber: true })}
                        placeholder="0"
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white text-sm">Type</Label>
                      <Select onValueChange={(value) => setValue('salary_range.type', value as any)} value={watchedFields.salary_range?.type}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="salary">Salary</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Benefits */}
                <div className="space-y-4">
                  <Label className="text-white">Benefits</Label>
                  <div className="space-y-2">
                    {watchedFields.benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={benefit}
                          onChange={(e) => {
                            const newBenefits = [...watchedFields.benefits]
                            newBenefits[index] = e.target.value
                            setValue('benefits', newBenefits)
                          }}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeBenefit(benefit)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={benefitInput}
                        onChange={(e) => setBenefitInput(e.target.value)}
                        placeholder="Add a benefit..."
                        className="bg-slate-700 border-slate-600 text-white"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                      />
                      <Button type="button" onClick={addBenefit} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Requirements & Compliance */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">4</div>
                  <h3 className="text-xl font-semibold text-white">Requirements & Compliance</h3>
                </div>

                {/* Required Certifications */}
                <div className="space-y-4">
                  <Label className="text-white">Required Certifications</Label>
                  <div className="space-y-2">
                    {watchedFields.required_certifications.map((certification, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={certification}
                          onChange={(e) => {
                            const newCertifications = [...watchedFields.required_certifications]
                            newCertifications[index] = e.target.value
                            setValue('required_certifications', newCertifications)
                          }}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeCertification(certification)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={certificationInput}
                        onChange={(e) => setCertificationInput(e.target.value)}
                        placeholder="Add a certification..."
                        className="bg-slate-700 border-slate-600 text-white"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                      />
                      <Button type="button" onClick={addCertification} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Compliance Requirements */}
                <div className="space-y-4">
                  <Label className="text-white">Compliance Requirements</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="background_check_required"
                        checked={watchedFields.background_check_required}
                        onCheckedChange={(checked) => setValue('background_check_required', checked)}
                      />
                      <Label htmlFor="background_check_required" className="text-white">Background Check Required</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="drug_test_required"
                        checked={watchedFields.drug_test_required}
                        onCheckedChange={(checked) => setValue('drug_test_required', checked)}
                      />
                      <Label htmlFor="drug_test_required" className="text-white">Drug Test Required</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="uniform_provided"
                        checked={watchedFields.uniform_provided}
                        onCheckedChange={(checked) => setValue('uniform_provided', checked)}
                      />
                      <Label htmlFor="uniform_provided" className="text-white">Uniform Provided</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="training_provided"
                        checked={watchedFields.training_provided}
                        onCheckedChange={(checked) => setValue('training_provided', checked)}
                      />
                      <Label htmlFor="training_provided" className="text-white">Training Provided</Label>
                    </div>
                  </div>
                </div>

                {/* Age Requirement */}
                <div className="space-y-2">
                  <Label htmlFor="age_requirement" className="text-white">Minimum Age Requirement</Label>
                  <Input
                    id="age_requirement"
                    type="number"
                    {...register('age_requirement', { valueAsNumber: true })}
                    min="18"
                    placeholder="18"
                    className="bg-slate-700 border-slate-600 text-white w-32"
                  />
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
              >
                Previous
              </Button>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
                
                {currentStep < 4 ? (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={!isValid || isSubmitting}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Job Posting'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 
