"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2, CheckCircle, FileUp, Calendar, Mail, Phone, User } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface OnboardingField {
  id: string
  type: "text" | "textarea" | "email" | "phone" | "date" | "select" | "multiselect" | "file" | "checkbox"
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
  description?: string
}

interface OnboardingData {
  invitationId: string
  positionDetails: {
    title: string
    description: string
    startDate?: string
    endDate?: string
    location?: string
    compensation?: string
  }
  template: {
    id: string
    name: string
    description: string
    fields: OnboardingField[]
  }
}

export default function OnboardingPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [onboardingData, setOnboardingData] = React.useState<OnboardingData | null>(null)
  const [formData, setFormData] = React.useState<Record<string, any>>({})
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (params.token) {
      fetchOnboardingData()
    }
  }, [params.token])

  async function fetchOnboardingData() {
    try {
      const response = await fetch(`/api/onboarding/${params.token}`)
      if (response.ok) {
        const data = await response.json()
        setOnboardingData(data.data)
        // Initialize form data with empty values
        const initialFormData: Record<string, any> = {}
        data.data.template.fields.forEach((field: OnboardingField) => {
          if (field.type === "multiselect") {
            initialFormData[field.id] = []
          } else if (field.type === "checkbox") {
            initialFormData[field.id] = false
          } else {
            initialFormData[field.id] = ""
          }
        })
        setFormData(initialFormData)
      } else {
        toast({
          title: "Error",
          description: "Invalid or expired onboarding link",
          variant: "destructive"
        })
        router.push("/")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load onboarding information",
        variant: "destructive"
      })
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  function validateForm() {
    const newErrors: Record<string, string> = {}
    
    onboardingData?.template.fields.forEach(field => {
      if (field.required) {
        const value = formData[field.id]
        if (!value || (Array.isArray(value) && value.length === 0)) {
          newErrors[field.id] = `${field.label} is required`
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit() {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/onboarding/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses: formData })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Onboarding completed successfully! You'll be contacted by the admin soon."
        })
        router.push("/dashboard")
      } else {
        throw new Error("Failed to submit onboarding")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit onboarding information",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  function updateFormData(fieldId: string, value: any) {
    setFormData(prev => ({ ...prev, [fieldId]: value }))
    // Clear error when field is updated
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldId]
        return newErrors
      })
    }
  }

  function renderField(field: OnboardingField) {
    const value = formData[field.id]
    const hasError = errors[field.id]

    const baseProps = {
      id: field.id,
      placeholder: field.placeholder,
      className: hasError ? "border-destructive" : undefined
    }

    switch (field.type) {
      case "text":
      case "email":
      case "phone":
        return (
          <Input
            {...baseProps}
            type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
            value={value || ""}
            onChange={e => updateFormData(field.id, e.target.value)}
          />
        )

      case "textarea":
        return (
          <Textarea
            {...baseProps}
            value={value || ""}
            onChange={e => updateFormData(field.id, e.target.value)}
            className={`min-h-[100px] ${hasError ? "border-destructive" : ""}`}
          />
        )

      case "date":
        return (
          <Input
            {...baseProps}
            type="date"
            value={value || ""}
            onChange={e => updateFormData(field.id, e.target.value)}
          />
        )

      case "select":
        return (
          <Select value={value || ""} onValueChange={val => updateFormData(field.id, val)}>
            <SelectTrigger className={hasError ? "border-destructive" : ""}>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case "multiselect":
        return (
          <div className="space-y-2">
            {field.options?.map(option => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.id}-${option}`}
                  checked={value?.includes(option) || false}
                  onCheckedChange={checked => {
                    const currentValues = value || []
                    if (checked) {
                      updateFormData(field.id, [...currentValues, option])
                    } else {
                      updateFormData(field.id, currentValues.filter((v: string) => v !== option))
                    }
                  }}
                />
                <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </div>
        )

      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value || false}
              onCheckedChange={checked => updateFormData(field.id, checked)}
            />
            <Label htmlFor={field.id}>{field.placeholder || "Check if applicable"}</Label>
          </div>
        )

      case "file":
        return (
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            <FileUp className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <Input
              type="file"
              className="hidden"
              id={field.id}
              onChange={e => updateFormData(field.id, e.target.files?.[0])}
            />
            <Label htmlFor={field.id} className="cursor-pointer text-sm">
              Click to upload or drag and drop
            </Label>
            {value && (
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {value.name}
              </p>
            )}
          </div>
        )

      default:
        return null
    }
  }

  const completedFields = onboardingData?.template.fields.filter(field => {
    const value = formData[field.id]
    return value && (typeof value !== "object" || value.length > 0)
  }).length || 0

  const totalFields = onboardingData?.template.fields.length || 0
  const progress = totalFields > 0 ? (completedFields / totalFields) * 100 : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
          <p>Loading onboarding information...</p>
        </div>
      </div>
    )
  }

  if (!onboardingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>Onboarding information not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Tourify!</h1>
          <p className="text-lg text-gray-600">
            Complete your onboarding for the {onboardingData.positionDetails.title} position
          </p>
        </div>

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedFields} of {totalFields} completed
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {/* Position Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Position Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-lg mb-2">{onboardingData.positionDetails.title}</h3>
                <p className="text-muted-foreground mb-4">{onboardingData.positionDetails.description}</p>
              </div>
              <div className="space-y-2">
                {onboardingData.positionDetails.startDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>Start: {formatSafeDate(onboardingData.positionDetails.startDate)}</span>
                  </div>
                )}
                {onboardingData.positionDetails.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <span>📍 {onboardingData.positionDetails.location}</span>
                  </div>
                )}
                {onboardingData.positionDetails.compensation && (
                  <div className="flex items-center gap-2 text-sm">
                    <span>💰 {onboardingData.positionDetails.compensation}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Onboarding Form */}
        <Card>
          <CardHeader>
            <CardTitle>{onboardingData.template.name}</CardTitle>
            <p className="text-muted-foreground">{onboardingData.template.description}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {onboardingData.template.fields.map(field => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id} className="flex items-center gap-2">
                  {field.label}
                  {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                </Label>
                {field.description && (
                  <p className="text-sm text-muted-foreground">{field.description}</p>
                )}
                {renderField(field)}
                {errors[field.id] && (
                  <p className="text-sm text-destructive">{errors[field.id]}</p>
                )}
              </div>
            ))}

            <div className="flex gap-4 pt-6">
              <Button
                onClick={handleSubmit}
                disabled={submitting || progress < 100}
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete Onboarding
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 