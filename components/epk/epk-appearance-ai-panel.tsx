"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  Check,
  ClipboardCopy,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react"
import { toast } from "sonner"
import {
  buildEpkAppearanceFixPrompt,
  parseEpkAppearanceAiPayload,
  type EpkAppearanceAiPayload,
  type EpkAppearanceValidationError,
} from "@/lib/epk/epk-appearance-ai-prompt"
import { cn } from "@/lib/utils"

interface EpkAppearanceAiPanelProps {
  prompt: string
  onApply: (payload: EpkAppearanceAiPayload) => void | Promise<void>
  className?: string
  title?: string
  description?: string
}

export function EpkAppearanceAiPanel({
  prompt,
  onApply,
  className,
  title = "Generate style with AI",
  description = "Copy the prompt into your AI tool, paste the JSON it returns, then apply.",
}: EpkAppearanceAiPanelProps) {
  const [pasteValue, setPasteValue] = useState("")
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [copiedFix, setCopiedFix] = useState(false)
  const [errors, setErrors] = useState<EpkAppearanceValidationError[]>([])
  const [fixPrompt, setFixPrompt] = useState("")
  const [applying, setApplying] = useState(false)

  async function handleCopyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopiedPrompt(true)
      toast.success("AI prompt copied")
      window.setTimeout(() => setCopiedPrompt(false), 2000)
    } catch {
      toast.error("Could not copy prompt")
    }
  }

  async function handleCopyFix() {
    if (!fixPrompt) return
    try {
      await navigator.clipboard.writeText(fixPrompt)
      setCopiedFix(true)
      toast.success("Fix prompt copied")
      window.setTimeout(() => setCopiedFix(false), 2000)
    } catch {
      toast.error("Could not copy fix prompt")
    }
  }

  async function handleValidateAndApply() {
    const parsed = parseEpkAppearanceAiPayload(pasteValue)
    if (!parsed.success) {
      setErrors(parsed.errors)
      setFixPrompt(buildEpkAppearanceFixPrompt(parsed.errors))
      toast.error("Appearance JSON failed validation")
      return
    }

    setErrors([])
    setFixPrompt("")
    setApplying(true)
    try {
      await onApply(parsed.data)
      toast.success("Style applied")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply style")
    } finally {
      setApplying(false)
    }
  }

  return (
    <div
      className={cn(
        "space-y-4 rounded-xl border border-violet-500/25 bg-violet-500/5 p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-violet-500/20 p-2">
          <Sparkles className="h-4 w-4 text-violet-300" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <Badge className="border-violet-400/30 bg-violet-500/15 text-violet-200">
              Style only
            </Badge>
          </div>
          <p className="mt-1 text-xs text-white/60">{description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleCopyPrompt}
          disabled={!prompt}
          className="bg-violet-500/20 text-violet-100 hover:bg-violet-500/30"
        >
          {copiedPrompt ? (
            <Check className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" />
          )}
          Copy AI Prompt
        </Button>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wide text-white/50">
          Paste AI JSON
        </label>
        <Textarea
          value={pasteValue}
          onChange={(event) => setPasteValue(event.target.value)}
          rows={8}
          placeholder='{"template":"cinema","epkFont":"display","epkAppearance":{...}}'
          className="border-white/15 bg-black/40 font-mono text-xs text-white placeholder:text-white/30"
        />
      </div>

      {errors.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-amber-400/30 bg-amber-500/10 p-3">
          <div className="flex items-center gap-2 text-sm text-amber-100">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Validation errors
          </div>
          <ul className="space-y-1 text-xs text-amber-100/80">
            {errors.map((error) => (
              <li key={`${error.path}-${error.message}`}>
                <span className="font-mono text-amber-200">{error.path}</span>: {error.message}
              </li>
            ))}
          </ul>
          {fixPrompt ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCopyFix}
              className="border-amber-400/30 text-amber-100 hover:bg-amber-500/10"
            >
              {copiedFix ? (
                <Check className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" />
              )}
              Copy fix prompt
            </Button>
          ) : null}
        </div>
      ) : null}

      <Button
        type="button"
        size="sm"
        onClick={handleValidateAndApply}
        disabled={!pasteValue.trim() || applying}
        className="bg-violet-600 text-white hover:bg-violet-500"
      >
        {applying ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="mr-1.5 h-3.5 w-3.5" />
        )}
        Validate & Apply
      </Button>
    </div>
  )
}
