"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ColorPicker } from "@/components/ui/color-picker"
import { POST_FEED_CAPABILITY_MAP } from "@/lib/appearance/capabilities"
import type { EpkAppearance } from "@/lib/epk/epk-appearance"
import { cn } from "@/lib/utils"

interface ControlRendererProps {
  appearance: EpkAppearance
  onChange: (patch: Partial<EpkAppearance>) => void
  className?: string
}

/**
 * Renders approved post appearance controls filtered through POST_FEED_CAPABILITY_MAP.
 * Page-only controls are omitted so the studio only presents options that affect posts.
 */
export function ControlRenderer({ appearance, onChange, className }: ControlRendererProps) {
  return (
    <div className={cn("space-y-5", className)}>
      {/* === Colors section === */}
      <section aria-labelledby="colors-heading">
        <h4 id="colors-heading" className="text-sm font-medium text-gray-300 mb-3">Colors</h4>
        <div className="grid grid-cols-2 gap-4">
          <ColorField
            label="Accent color"
            fieldKey="accentHex"
            value={appearance.accentHex}
            onChange={(v) => onChange({ accentHex: v })}
          />
          <ColorField
            label="Card background"
            fieldKey="cardBackgroundHex"
            value={appearance.cardBackgroundHex}
            onChange={(v) => onChange({ cardBackgroundHex: v })}
          />
          <ColorField
            label="Text color"
            fieldKey="textColorCustomHex"
            value={appearance.textColorCustomHex}
            onChange={(v) => onChange({ textColorCustomHex: v })}
          />
          <ColorField
            label="Border color"
            fieldKey="borderColorHex"
            value={appearance.borderColorHex}
            onChange={(v) => onChange({ borderColorHex: v })}
          />
        </div>
        {/* Page background — unsupported for posts */}
        <UnsupportedControl
          fieldKey="pageBackgroundHex"
          label="Page background"
        />
      </section>

      {/* === Typography === */}
      <section aria-labelledby="typography-heading">
        <h4 id="typography-heading" className="text-sm font-medium text-gray-300 mb-3">Typography</h4>
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Font size"
            fieldKey="fontSizeScale"
            value={appearance.fontSizeScale}
            options={[
              { value: "xs", label: "XS" },
              { value: "sm", label: "Small" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
              { value: "xl", label: "XL" },
            ]}
            onChange={(v) => onChange({ fontSizeScale: v as EpkAppearance["fontSizeScale"] })}
          />
          <SelectField
            label="Heading size"
            fieldKey="headingScale"
            value={appearance.headingScale}
            options={[
              { value: "sm", label: "Small" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
              { value: "xl", label: "XL" },
            ]}
            onChange={(v) => onChange({ headingScale: v as EpkAppearance["headingScale"] })}
          />
        </div>
        {/* contentWidth — unsupported for post cards */}
        <UnsupportedControl fieldKey="contentWidth" label="Content width" />
      </section>

      {/* === Card shape === */}
      <section aria-labelledby="shape-heading">
        <h4 id="shape-heading" className="text-sm font-medium text-gray-300 mb-3">Card Shape</h4>
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Card radius"
            fieldKey="cardRadius"
            value={appearance.cardRadius}
            options={[
              { value: "sharp", label: "Sharp" },
              { value: "rounded", label: "Rounded" },
              { value: "pill", label: "Pill" },
            ]}
            onChange={(v) => onChange({ cardRadius: v as EpkAppearance["cardRadius"] })}
          />
          <SelectField
            label="Card surface"
            fieldKey="cardSurface"
            value={appearance.cardSurface}
            options={[
              { value: "default", label: "Default" },
              { value: "elevated", label: "Elevated" },
              { value: "minimal", label: "Minimal" },
            ]}
            onChange={(v) => onChange({ cardSurface: v as EpkAppearance["cardSurface"] })}
          />
          <SelectField
            label="Border strength"
            fieldKey="borderStrength"
            value={appearance.borderStrength}
            options={[
              { value: "subtle", label: "Subtle" },
              { value: "default", label: "Default" },
              { value: "strong", label: "Strong" },
            ]}
            onChange={(v) => onChange({ borderStrength: v as EpkAppearance["borderStrength"] })}
          />
          <SelectField
            label="Surface style"
            fieldKey="surfaceStyle"
            value={appearance.surfaceStyle}
            options={[
              { value: "default", label: "Default" },
              { value: "glass", label: "Glass" },
              { value: "solid", label: "Solid" },
              { value: "editorial", label: "Editorial" },
              { value: "outlined", label: "Outlined" },
            ]}
            onChange={(v) => onChange({ surfaceStyle: v as EpkAppearance["surfaceStyle"] })}
          />
        </div>
      </section>

      {/* === Effects === */}
      <section aria-labelledby="effects-heading">
        <h4 id="effects-heading" className="text-sm font-medium text-gray-300 mb-3">Effects</h4>
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Effect style"
            fieldKey="effectStyle"
            value={appearance.effectStyle}
            options={[
              { value: "none", label: "None" },
              { value: "glow", label: "Glow" },
              { value: "glass", label: "Glass" },
              { value: "shadow", label: "Shadow" },
              { value: "grain", label: "Grain" },
            ]}
            onChange={(v) => onChange({ effectStyle: v as EpkAppearance["effectStyle"] })}
          />
          <SelectField
            label="Effect intensity"
            fieldKey="effectIntensity"
            value={appearance.effectIntensity}
            options={[
              { value: "subtle", label: "Subtle" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
            ]}
            onChange={(v) => onChange({ effectIntensity: v as EpkAppearance["effectIntensity"] })}
          />
        </div>
        {/* coverHeight/coverOverlay — unsupported for post cards */}
        <div className="mt-3 space-y-2">
          <UnsupportedControl fieldKey="coverHeight" label="Cover height" />
          <UnsupportedControl fieldKey="coverOverlay" label="Cover overlay" />
        </div>
      </section>
    </div>
  )
}

// ---- Helper sub-components ----

function ColorField({
  label,
  fieldKey,
  value,
  onChange,
}: {
  label: string
  fieldKey: keyof EpkAppearance
  value: string | null
  onChange: (v: string | null) => void
}) {
  const cap = POST_FEED_CAPABILITY_MAP[fieldKey]
  if (cap.status === "unsupported") {
    return <UnsupportedControl fieldKey={fieldKey} label={label} />
  }
  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-400">{label}</Label>
      <ColorPicker
        value={value ?? ""}
        onChange={(v) => onChange(v || null)}
        showLabel={false}
      />
    </div>
  )
}

function SelectField({
  label,
  fieldKey,
  value,
  options,
  onChange,
}: {
  label: string
  fieldKey: keyof EpkAppearance
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  const cap = POST_FEED_CAPABILITY_MAP[fieldKey]
  if (cap.status === "unsupported") {
    return <UnsupportedControl fieldKey={fieldKey} label={label} />
  }
  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-400">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-white/10 border-white/20 text-white text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function UnsupportedControl({
  fieldKey,
  label,
}: {
  fieldKey: keyof EpkAppearance
  label: string
}) {
  void fieldKey
  void label
  return null
}
