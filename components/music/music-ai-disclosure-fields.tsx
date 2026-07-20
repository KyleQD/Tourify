"use client"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import type { MusicAiUseCategory } from "@/lib/music/music-trust"

const OPTIONS: Array<{ value: MusicAiUseCategory; label: string; description: string }> = [
  { value: "human_created", label: "Human-created", description: "No generative AI created the composition or performance." },
  { value: "assistive_ai", label: "Assistive AI only", description: "AI helped with tasks such as restoration, denoising, stem separation, or mastering." },
  { value: "materially_generated", label: "Materially AI-generated", description: "Generative AI created material parts. This can be saved privately but is not eligible for the human-only public catalog." },
  { value: "unknown", label: "Unsure", description: "Keep the track private until this disclosure is resolved." },
]

export function MusicAiDisclosureFields({ value, details, onValueChange, onDetailsChange, disabled = false }: {
  value: MusicAiUseCategory
  details: string
  onValueChange: (value: MusicAiUseCategory) => void
  onDetailsChange: (value: string) => void
  disabled?: boolean
}) {
  return <div className="space-y-4">
    <div><Label>How was AI used?</Label><p className="text-sm text-slate-400">Required for public publication and saved as a versioned declaration.</p></div>
    <RadioGroup value={value} onValueChange={(next) => onValueChange(next as MusicAiUseCategory)} disabled={disabled}>
      {OPTIONS.map((option) => <div key={option.value} className="flex items-start gap-3 rounded-lg border border-slate-700 p-3">
        <RadioGroupItem value={option.value} id={`ai-use-${option.value}`} className="mt-1" />
        <div><Label htmlFor={`ai-use-${option.value}`}>{option.label}</Label><p className="text-sm text-slate-400">{option.description}</p></div>
      </div>)}
    </RadioGroup>
    {(value === "assistive_ai" || value === "materially_generated") && <div className="space-y-2">
      <Label htmlFor="ai-disclosure-details">Tools and their role</Label>
      <Textarea id="ai-disclosure-details" value={details} onChange={(event) => onDetailsChange(event.target.value)} disabled={disabled} maxLength={4000} className="bg-slate-800 border-slate-700" />
    </div>}
  </div>
}
