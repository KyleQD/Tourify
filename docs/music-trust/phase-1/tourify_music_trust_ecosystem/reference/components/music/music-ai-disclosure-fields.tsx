"use client"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import type { MusicAiUseCategory } from "@/lib/music/music-trust"

export interface MusicAiDisclosureFieldsProps {
  value: MusicAiUseCategory
  details: string
  onValueChange: (value: MusicAiUseCategory) => void
  onDetailsChange: (value: string) => void
  disabled?: boolean
}

const OPTIONS: Array<{ value: MusicAiUseCategory; label: string; description: string }> = [
  {
    value: "human_created",
    label: "No generative AI created the music",
    description: "Human-created composition and performance; ordinary production tools are allowed.",
  },
  {
    value: "assistive_ai",
    label: "AI was used only as an assistive tool",
    description: "Examples include restoration, denoising, stem separation, or mastering assistance.",
  },
  {
    value: "materially_generated",
    label: "Generative AI created material parts",
    description: "This track is not eligible for Tourify's human-created public catalog.",
  },
  {
    value: "unknown",
    label: "I am unsure",
    description: "Keep the upload private until the disclosure is resolved.",
  },
]

export function MusicAiDisclosureFields({
  value,
  details,
  onValueChange,
  onDetailsChange,
  disabled = false,
}: MusicAiDisclosureFieldsProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>How was AI used?</Label>
        <p className="text-sm text-muted-foreground">
          This disclosure is required for public publication and can be updated only through a versioned declaration.
        </p>
      </div>
      <RadioGroup
        value={value}
        onValueChange={(nextValue) => onValueChange(nextValue as MusicAiUseCategory)}
        disabled={disabled}
      >
        {OPTIONS.map(function renderOption(option) {
          return (
            <div key={option.value} className="flex items-start gap-3 rounded-lg border p-3">
              <RadioGroupItem value={option.value} id={`ai-use-${option.value}`} className="mt-1" />
              <div className="space-y-1">
                <Label htmlFor={`ai-use-${option.value}`}>{option.label}</Label>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </div>
          )
        })}
      </RadioGroup>
      {(value === "assistive_ai" || value === "materially_generated") ? (
        <div className="space-y-2">
          <Label htmlFor="ai-disclosure-details">Describe the tools and their role</Label>
          <Textarea
            id="ai-disclosure-details"
            value={details}
            onChange={(event) => onDetailsChange(event.target.value)}
            disabled={disabled}
            maxLength={2000}
          />
        </div>
      ) : null}
    </div>
  )
}
