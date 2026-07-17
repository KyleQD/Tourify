"use client"

// Deprecated: new job-posting creation surfaces must use the shared
// components/job-posting wizard shell or components/hiring/job-posting-builder.
// Kept temporarily for the legacy /admin/job-postings/new route.

import { useState } from 'react'
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
import { useToast } from '@/components/ui/use-toast'
import { Plus, Trash2, GripVertical, Settings, FileText, X } from 'lucide-react'
import type { CreateJobPostingData, ApplicationFormField } from '@/types/admin-onboarding'

// Zod schema for job posting form
const jobPostingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  department: z.string().min(1, 'Department is required'),
  position: z.string().min(1, 'Position is required'),
  employment_type: z.enum(['full_time', 'part_time', 'contractor', 'volunteer']),
  location: z.string().min(1, 'Location is required'),
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
  application_form_template: z.object({
    fields: z.array(z.any()).optional()
  }).optional()
})

type JobPostingFormData = z.infer<typeof jobPostingSchema>

interface JobPostingFormProps {
  onSubmit: (data: CreateJobPostingData) => Promise<void>
  onCancel: () => void
  initialData?: Partial<JobPostingFormData>
  isLoading?: boolean
}

const fieldTypes = [
  { value: 'text', label: 'Text Input' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multiselect', label: 'Multiple Choice' },
  { value: 'file', label: 'File Upload' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'number', label: 'Number' }
]

const employmentTypes = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'volunteer', label: 'Volunteer' }
]

const experienceLevels = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior Level' },
  { value: 'executive', label: 'Executive Level' }
]

const commonDepartments = [
  'Production',
  'Security',
  'Bar Staff',
  'Street Team',
  'Marketing',
  'Technical',
  'Administrative',
  'Management'
]

const commonSkills = [
  'Customer Service',
  'Communication',
  'Teamwork',
  'Problem Solving',
  'Leadership',
  'Technical Skills',
  'Event Management',
  'Sales',
  'Marketing',
  'Social Media'
]

const commonBenefits = [
  'Flexible Schedule',
  'Health Insurance',
  'Paid Time Off',
  'Professional Development',
  'Performance Bonuses',
  'Employee Discounts',
  'Remote Work Options',
  'Career Growth',
  'Team Building Events',
  'Portfolio Building',
  'Industry Connections'
]

export default function JobPostingForm({ onSubmit, onCancel, initialData, isLoading }: JobPostingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [skillInput, setSkillInput] = useState('')
  const [requirementInput, setRequirementInput] = useState('')
  const [responsibilityInput, setResponsibilityInput] = useState('')
  const [benefitInput, setBenefitInput] = useState('')
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<JobPostingFormData>({
    resolver: zodResolver(jobPostingSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      department: initialData?.department || '',
      position: initialData?.position || '',
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
      urgent: initialData?.urgent || false
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

  async function handleFormSubmit(data: JobPostingFormData) {
    if (isSubmitting) return

    function getReadableError(err: any): string {
      if (!err) return 'Unknown error'
      if (Array.isArray(err?.issues)) return err.issues.map((i: any) => i?.message).join('\n')
      if (err?.message) return err.message
      try { return JSON.stringify(err) } catch { return 'Unexpected error' }
    }

    try {
      setIsSubmitting(true)
      await onSubmit(data as any)
      toast({
        title: 'Success',
        description: 'Job posting created successfully',
      })
    } catch (error) {
      console.error('❌ [Job Posting Form] Error submitting form:', error)
      toast({
        title: 'Failed to create job posting',
        description: getReadableError(error),
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function addFormField() {
    const newField: Omit<ApplicationFormField, 'id'> = {
      name: `field_${formFields.length + 1}`,
      label: `Field ${formFields.length + 1}`,
      type: 'text',
      required: false,
      placeholder: '',
      order: formFields.length + 1
    }
    appendFormField(newField)
  }

  function updateFormFieldData(index: number, updates: Partial<ApplicationFormField>) {
    updateFormField(index, { ...formFields[index], ...updates })
  }

  function addSkill() {
    if (skillInput.trim() && !watchedFields.skills?.includes(skillInput.trim())) {
      setValue('skills', [...(watchedFields.skills || []), skillInput.trim()])
      setSkillInput('')
    }
  }

  function removeSkill(skill: string) {
    setValue('skills', watchedFields.skills?.filter(s => s !== skill) || [])
  }

  function addRequirement() {
    if (requirementInput.trim() && !watchedFields.requirements?.includes(requirementInput.trim())) {
      setValue('requirements', [...(watchedFields.requirements || []), requirementInput.trim()])
      setRequirementInput('')
    }
  }

  function removeRequirement(requirement: string) {
    setValue('requirements', watchedFields.requirements?.filter(r => r !== requirement) || [])
  }

  function addResponsibility() {
    if (responsibilityInput.trim() && !watchedFields.responsibilities?.includes(responsibilityInput.trim())) {
      setValue('responsibilities', [...(watchedFields.responsibilities || []), responsibilityInput.trim()])
      setResponsibilityInput('')
    }
  }

  function removeResponsibility(responsibility: string) {
    setValue('responsibilities', watchedFields.responsibilities?.filter(r => r !== responsibility) || [])
  }

  function addBenefit() {
    if (benefitInput.trim() && !watchedFields.benefits?.includes(benefitInput.trim())) {
      setValue('benefits', [...(watchedFields.benefits || []), benefitInput.trim()])
      setBenefitInput('')
    }
  }

  function removeBenefit(benefit: string) {
    setValue('benefits', watchedFields.benefits?.filter(b => b !== benefit) || [])
  }

  const totalSteps = 2

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          {[1, 2].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-slate-700 text-slate-400'
              }`}>
                {step}
              </div>
              {step < totalSteps && (
                <div className={`w-12 h-0.5 mx-2 ${
                  step < currentStep ? 'bg-purple-600' : 'bg-slate-700'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="text-sm text-slate-400">
          Step {currentStep} of {totalSteps}
        </div>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-white">Job Title *</Label>
                    <Input
                      id="title"
                      {...register('title')}
                      placeholder="e.g., Event Security Staff"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    {errors.title && (
                      <p className="text-red-400 text-sm">{errors.title.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-white">Department *</Label>
                    <Select onValueChange={(value) => setValue('department', value)} defaultValue={watchedFields.department}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        {commonDepartments.map((dept) => (
                          <SelectItem key={dept} value={dept} className="text-white">
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.department && (
                      <p className="text-red-400 text-sm">{errors.department.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position" className="text-white">Position *</Label>
                    <Input
                      id="position"
                      {...register('position')}
                      placeholder="e.g., Security Guard"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    {errors.position && (
                      <p className="text-red-400 text-sm">{errors.position.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="number_of_positions" className="text-white">Number of Positions *</Label>
                    <Input
                      id="number_of_positions"
                      type="number"
                      {...register('number_of_positions', { valueAsNumber: true })}
                      placeholder="e.g., 5"
                      min="1"
                      max="100"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    <p className="text-slate-400 text-xs">This number is private and not shown to applicants</p>
                    {errors.number_of_positions && (
                      <p className="text-red-400 text-sm">{errors.number_of_positions.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employment_type" className="text-white">Employment Type *</Label>
                    <Select onValueChange={(value) => setValue('employment_type', value as any)} defaultValue={watchedFields.employment_type}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Select employment type" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        {employmentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value} className="text-white">
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.employment_type && (
                      <p className="text-red-400 text-sm">{errors.employment_type.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-white">Location *</Label>
                    <Input
                      id="location"
                      {...register('location')}
                      placeholder="e.g., Downtown Event Center"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    {errors.location && (
                      <p className="text-red-400 text-sm">{errors.location.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience_level" className="text-white">Experience Level *</Label>
                    <Select onValueChange={(value) => setValue('experience_level', value as any)} defaultValue={watchedFields.experience_level}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        {experienceLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value} className="text-white">
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.experience_level && (
                      <p className="text-red-400 text-sm">{errors.experience_level.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-white">Job Description *</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="Provide a detailed description of the role, responsibilities, and what makes this position unique..."
                    className="bg-slate-700 border-slate-600 text-white min-h-[120px]"
                  />
                  {errors.description && (
                    <p className="text-red-400 text-sm">{errors.description.message}</p>
                  )}
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="remote"
                      checked={watchedFields.remote}
                      onCheckedChange={(checked) => setValue('remote', checked)}
                    />
                    <Label htmlFor="remote" className="text-white">Remote Work Available</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="urgent"
                      checked={watchedFields.urgent}
                      onCheckedChange={(checked) => setValue('urgent', checked)}
                    />
                    <Label htmlFor="urgent" className="text-white">Urgent Hiring</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="button" onClick={() => setCurrentStep(2)}>
                Next: Requirements & Benefits
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Requirements & Benefits */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Requirements & Benefits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Requirements */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-white text-lg font-medium">Requirements</Label>
                    <div className="flex space-x-2">
                      <Input
                        value={requirementInput}
                        onChange={(e) => setRequirementInput(e.target.value)}
                        placeholder="Add a requirement..."
                        className="bg-slate-700 border-slate-600 text-white w-64"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                      />
                      <Button type="button" size="sm" onClick={addRequirement}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {watchedFields.requirements?.map((req, index) => (
                      <Badge key={index} variant="secondary" className="bg-slate-700 text-white">
                        {req}
                        <button
                          type="button"
                          onClick={() => removeRequirement(req)}
                          className="ml-2 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Responsibilities */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-white text-lg font-medium">Responsibilities</Label>
                    <div className="flex space-x-2">
                      <Input
                        value={responsibilityInput}
                        onChange={(e) => setResponsibilityInput(e.target.value)}
                        placeholder="Add a responsibility..."
                        className="bg-slate-700 border-slate-600 text-white w-64"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addResponsibility())}
                      />
                      <Button type="button" size="sm" onClick={addResponsibility}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {watchedFields.responsibilities?.map((resp, index) => (
                      <Badge key={index} variant="secondary" className="bg-slate-700 text-white">
                        {resp}
                        <button
                          type="button"
                          onClick={() => removeResponsibility(resp)}
                          className="ml-2 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Skills */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-white text-lg font-medium">Required Skills</Label>
                    <div className="flex space-x-2">
                      <Input
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        placeholder="Add a skill..."
                        className="bg-slate-700 border-slate-600 text-white w-64"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      />
                      <Button type="button" size="sm" onClick={addSkill}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {watchedFields.skills?.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="bg-slate-700 text-white">
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="ml-2 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="text-sm text-slate-400">
                    Quick add: {commonSkills.slice(0, 5).map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => {
                          addSkill()
                          setSkillInput(skill)
                        }}
                        className="text-purple-400 hover:text-purple-300 mr-2"
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Benefits */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-white text-lg font-medium">Benefits</Label>
                    <div className="flex space-x-2">
                      <Input
                        value={benefitInput}
                        onChange={(e) => setBenefitInput(e.target.value)}
                        placeholder="Add a benefit..."
                        className="bg-slate-700 border-slate-600 text-white w-64"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                      />
                      <Button type="button" size="sm" onClick={addBenefit}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {watchedFields.benefits?.map((benefit, index) => (
                      <Badge key={index} variant="secondary" className="bg-slate-700 text-white">
                        {benefit}
                        <button
                          type="button"
                          onClick={() => removeBenefit(benefit)}
                          className="ml-2 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="text-sm text-slate-400">
                    Quick add: {commonBenefits.slice(0, 5).map((benefit) => (
                      <button
                        key={benefit}
                        type="button"
                        onClick={() => {
                          addBenefit()
                          setBenefitInput(benefit)
                        }}
                        className="text-purple-400 hover:text-purple-300 mr-2"
                      >
                        {benefit}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                Previous
              </Button>
              <Button type="submit" disabled={isSubmitting || !isValid}>
                {isSubmitting ? 'Creating...' : 'Create Job Posting'}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
} 
