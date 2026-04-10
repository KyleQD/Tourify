"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Edit2, Trash2, Copy, Save, FileText, Users } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface OnboardingField {
  id: string
  type: "text" | "textarea" | "email" | "phone" | "date" | "select" | "multiselect" | "file" | "checkbox"
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
  description?: string
}

interface OnboardingTemplate {
  id: string
  name: string
  description: string
  fields: OnboardingField[]
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export default function OnboardingPage() {
  const [templates, setTemplates] = React.useState<OnboardingTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = React.useState<OnboardingTemplate | null>(null)
  const [isEditing, setIsEditing] = React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)
  const { toast } = useToast()

  function buildNoStoreInit(input?: RequestInit): RequestInit {
    return {
      credentials: 'include',
      cache: 'no-store',
      ...input,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        ...(input?.headers || {}),
      },
    }
  }

  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
    fields: [] as OnboardingField[],
    isDefault: false
  })

  const fieldTypes = [
    { value: "text", label: "Text Input" },
    { value: "textarea", label: "Long Text" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone Number" },
    { value: "date", label: "Date" },
    { value: "select", label: "Dropdown" },
    { value: "multiselect", label: "Multiple Choice" },
    { value: "file", label: "File Upload" },
    { value: "checkbox", label: "Checkbox" }
  ]

  React.useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    try {
      const response = await fetch("/api/onboarding-templates", buildNoStoreInit())
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error("Error fetching templates:", error)
    }
  }

  async function saveTemplate() {
    try {
      const url = isCreating ? "/api/onboarding-templates" : `/api/onboarding-templates/${selectedTemplate?.id}`
      const method = isCreating ? "POST" : "PUT"

      const response = await fetch(url, buildNoStoreInit({
        method,
        body: JSON.stringify(formData),
      }))

      if (response.ok) {
        toast({
          title: "Success",
          description: `Template ${isCreating ? "created" : "updated"} successfully`
        })
        fetchTemplates()
        resetForm()
        setIsEditing(false)
        setIsCreating(false)
      } else {
        throw new Error("Failed to save template")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive"
      })
    }
  }

  async function deleteTemplate(templateId: string) {
    try {
      const response = await fetch(`/api/onboarding-templates/${templateId}`, buildNoStoreInit({
        method: "DELETE"
      }))

      if (response.ok) {
        toast({
          title: "Success",
          description: "Template deleted successfully"
        })
        fetchTemplates()
        if (selectedTemplate?.id === templateId) {
          setSelectedTemplate(null)
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive"
      })
    }
  }

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      fields: [],
      isDefault: false
    })
  }

  function addField() {
    const newField: OnboardingField = {
      id: crypto.randomUUID(),
      type: "text",
      label: "",
      required: false
    }
    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }))
  }

  function updateField(fieldId: string, updates: Partial<OnboardingField>) {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    }))
  }

  function removeField(fieldId: string) {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId)
    }))
  }

  function startEditing(template: OnboardingTemplate) {
    setSelectedTemplate(template)
    setFormData({
      name: template.name,
      description: template.description,
      fields: template.fields,
      isDefault: template.isDefault
    })
    setIsEditing(true)
    setIsCreating(false)
  }

  function startCreating() {
    resetForm()
    setIsCreating(true)
    setIsEditing(false)
    setSelectedTemplate(null)
  }

  function duplicateTemplate(template: OnboardingTemplate) {
    setFormData({
      name: `${template.name} (Copy)`,
      description: template.description,
      fields: template.fields.map(field => ({ ...field, id: crypto.randomUUID() })),
      isDefault: false
    })
    setIsCreating(true)
    setIsEditing(false)
    setSelectedTemplate(null)
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Onboarding Templates</h1>
          <p className="text-muted-foreground">
            Create and manage onboarding templates for new team members
          </p>
        </div>
        <Button onClick={startCreating}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium">{template.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {template.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              <Users className="mr-1 h-3 w-3" />
                              {template.fields.length} fields
                            </Badge>
                            {template.isDefault && (
                              <Badge variant="default" className="text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              startEditing(template)
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              duplicateTemplate(template)
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteTemplate(template.id)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {templates.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No templates created yet
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Template Editor */}
        <div className="lg:col-span-2">
          {(isEditing || isCreating) ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {isCreating ? "Create New Template" : "Edit Template"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Template Info */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Sound Engineer Onboarding"
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what this template is for..."
                      value={formData.description}
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="default"
                      checked={formData.isDefault}
                      onCheckedChange={checked => setFormData(prev => ({ ...prev, isDefault: checked }))}
                    />
                    <Label htmlFor="default">Set as default template</Label>
                  </div>
                </div>

                {/* Fields */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Form Fields</h3>
                    <Button size="sm" onClick={addField}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Field
                    </Button>
                  </div>

                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {formData.fields.map((field, index) => (
                        <Card key={field.id}>
                          <CardContent className="pt-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Field {index + 1}</Label>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeField(field.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <Label>Field Type</Label>
                                  <Select
                                    value={field.type}
                                    onValueChange={value => updateField(field.id, { type: value as any })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {fieldTypes.map(type => (
                                        <SelectItem key={type.value} value={type.value}>
                                          {type.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-center space-x-2 pt-6">
                                  <Switch
                                    checked={field.required}
                                    onCheckedChange={checked => updateField(field.id, { required: checked })}
                                  />
                                  <Label>Required</Label>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Label</Label>
                                <Input
                                  placeholder="Field label"
                                  value={field.label}
                                  onChange={e => updateField(field.id, { label: e.target.value })}
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Placeholder</Label>
                                <Input
                                  placeholder="Placeholder text"
                                  value={field.placeholder || ""}
                                  onChange={e => updateField(field.id, { placeholder: e.target.value })}
                                />
                              </div>
                              
                              {(field.type === "select" || field.type === "multiselect") && (
                                <div className="space-y-2">
                                  <Label>Options (one per line)</Label>
                                  <Textarea
                                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                                    value={field.options?.join("\n") || ""}
                                    onChange={e => updateField(field.id, { 
                                      options: e.target.value.split("\n").filter(Boolean) 
                                    })}
                                  />
                                </div>
                              )}
                              
                              <div className="space-y-2">
                                <Label>Description (optional)</Label>
                                <Input
                                  placeholder="Help text for this field"
                                  value={field.description || ""}
                                  onChange={e => updateField(field.id, { description: e.target.value })}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {formData.fields.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No fields added yet. Click "Add Field" to get started.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                <div className="flex gap-2">
                  <Button onClick={saveTemplate} disabled={!formData.name || formData.fields.length === 0}>
                    <Save className="mr-2 h-4 w-4" />
                    {isCreating ? "Create Template" : "Save Changes"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsEditing(false)
                      setIsCreating(false)
                      resetForm()
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : selectedTemplate ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedTemplate.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">{selectedTemplate.description}</p>
                  
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      {selectedTemplate.fields.length} fields
                    </Badge>
                    {selectedTemplate.isDefault && (
                      <Badge variant="default">Default</Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Fields Preview:</h4>
                    <div className="space-y-2">
                      {selectedTemplate.fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2 text-sm">
                          <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                            {index + 1}
                          </span>
                          <span>{field.label}</span>
                          <Badge variant="outline" className="text-xs">
                            {fieldTypes.find(t => t.value === field.type)?.label}
                          </Badge>
                          {field.required && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Button onClick={() => startEditing(selectedTemplate)}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-[400px]">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Template Selected</h3>
                  <p className="text-muted-foreground">
                    Select a template from the list or create a new one
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
} 