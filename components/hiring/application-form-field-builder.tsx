"use client"

import { GripVertical, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { normalizeFieldName } from "@/lib/hiring/job-posting-builder-schema"
import type { ApplicationFormFieldDefinition, ApplicationFormFieldType } from "@/types/job-posting-builder"
import { JobPostingArrayField } from "@/components/hiring/job-posting-array-field"

const FIELD_TYPES: Array<{ value: ApplicationFormFieldType; label: string }> = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Long text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "multiselect", label: "Multi-select" },
  { value: "file", label: "File upload" },
  { value: "checkbox", label: "Checkbox" },
  { value: "number", label: "Number" },
]

interface ApplicationFormFieldBuilderProps {
  fields: ApplicationFormFieldDefinition[]
  onChange: (fields: ApplicationFormFieldDefinition[]) => void
}

function createField(order: number): ApplicationFormFieldDefinition {
  const name = `field_${order + 1}`

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${name}_${Date.now()}`,
    name,
    label: `Field ${order + 1}`,
    type: "text",
    required: false,
    placeholder: "",
    helpText: "",
    options: [],
    order,
  }
}

function sortFields(fields: ApplicationFormFieldDefinition[]): ApplicationFormFieldDefinition[] {
  return fields.map((field, index) => ({ ...field, order: index }))
}

export function ApplicationFormFieldBuilder({ fields, onChange }: ApplicationFormFieldBuilderProps) {
  function updateField(index: number, updates: Partial<ApplicationFormFieldDefinition>): void {
    const nextFields = [...fields]
    nextFields[index] = { ...nextFields[index], ...updates }
    onChange(sortFields(nextFields))
  }

  function removeField(index: number): void {
    onChange(sortFields(fields.filter((_, currentIndex) => currentIndex !== index)))
  }

  function addField(): void {
    onChange([...fields, createField(fields.length)])
  }

  function moveField(index: number, direction: "up" | "down"): void {
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= fields.length) return

    const nextFields = [...fields]
    const [field] = nextFields.splice(index, 1)
    nextFields.splice(targetIndex, 0, field)
    onChange(sortFields(nextFields))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Application form</h3>
          <p className="text-sm text-muted-foreground">
            Applicants use Quick Apply: their profile is shared automatically, and they only answer the screening
            questions below. Mark a field as &quot;Auto-fill from profile&quot; to source it from their profile instead.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={addField}>
          <Plus className="mr-2 h-4 w-4" />
          Add field
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No application fields are configured. Add at least the information needed to screen this role.
        </div>
      ) : null}

      <div className="space-y-3">
        {fields.map((field, index) => {
          const usesOptions = field.type === "select" || field.type === "multiselect"

          return (
            <Card key={field.id ?? `${field.name}_${index}`}>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                    Field {index + 1}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => moveField(index, "up")} disabled={index === 0}>
                      Up
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => moveField(index, "down")}
                      disabled={index === fields.length - 1}
                    >
                      Down
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => removeField(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input
                      value={field.label}
                      onChange={(event) => {
                        const label = event.target.value
                        updateField(index, {
                          label,
                          name: field.name.startsWith("field_") ? normalizeFieldName(label) : field.name,
                        })
                      }}
                      placeholder="Example: Guard card number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Field key</Label>
                    <Input
                      value={field.name}
                      onChange={(event) => updateField(index, { name: normalizeFieldName(event.target.value) })}
                      placeholder="guard_card_number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Field type</Label>
                    <Select value={field.type} onValueChange={(value) => updateField(index, { type: value as ApplicationFormFieldType })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Placeholder</Label>
                    <Input
                      value={field.placeholder ?? ""}
                      onChange={(event) => updateField(index, { placeholder: event.target.value })}
                      placeholder="Optional placeholder text"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Help text</Label>
                  <Textarea
                    value={field.helpText ?? ""}
                    onChange={(event) => updateField(index, { helpText: event.target.value })}
                    placeholder="Optional instructions applicants should see."
                    rows={2}
                  />
                </div>

                {usesOptions ? (
                  <JobPostingArrayField
                    label="Options"
                    value={field.options ?? []}
                    onChange={(options) => updateField(index, { options })}
                    placeholder="Add option"
                  />
                ) : null}

                {field.type === "file" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <JobPostingArrayField
                      label="Allowed file types"
                      value={field.validation?.fileTypes ?? []}
                      onChange={(fileTypes) =>
                        updateField(index, {
                          validation: { ...(field.validation ?? {}), fileTypes },
                        })
                      }
                      placeholder="application/pdf or image/jpeg"
                    />
                    <div className="space-y-2">
                      <Label>Max file size MB</Label>
                      <Input
                        type="number"
                        min={1}
                        value={field.validation?.maxFileSizeMb ?? ""}
                        onChange={(event) =>
                          updateField(index, {
                            validation: {
                              ...(field.validation ?? {}),
                              maxFileSizeMb: Number(event.target.value || 0),
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label>Required field</Label>
                    <p className="text-xs text-muted-foreground">Applicants cannot submit without answering this field.</p>
                  </div>
                  <Switch checked={field.required} onCheckedChange={(required) => updateField(index, { required })} />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label>Auto-fill from profile</Label>
                    <p className="text-xs text-muted-foreground">
                      Sourced from the applicant&apos;s shared profile and hidden from Quick Apply screening questions.
                    </p>
                  </div>
                  <Switch
                    checked={field.profileField ?? false}
                    onCheckedChange={(profileField) => updateField(index, { profileField })}
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
