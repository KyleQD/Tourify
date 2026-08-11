"use client";

import { useState } from "react";
import { Layers3, SwatchBook, Type, Frame } from "lucide-react";
import { ColorPicker } from "@/components/ui/color-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  EPK_FONT_IDS,
  EPK_FONT_LABELS,
  type EpkFontId,
} from "@/lib/epk/epk-preview-utils";
import { getTemplateById } from "@/lib/post-appearance/template-registry";
import type { PostStyleConfigurationV3 } from "@/lib/post-appearance/contracts";
import type { PostTextureId } from "@/lib/post-appearance/texture-skins";
import { TextureSkinPicker } from "./texture-skin-picker";

type LabSection = "palette" | "texture" | "type" | "frame";

interface PremiereControlRendererProps {
  templateId: string;
  configuration: PostStyleConfigurationV3;
  onChange: (next: PostStyleConfigurationV3) => void;
}

const sections: Array<{
  id: LabSection;
  label: string;
  icon: typeof SwatchBook;
}> = [
  { id: "palette", label: "Palette", icon: SwatchBook },
  { id: "texture", label: "Texture", icon: Layers3 },
  { id: "type", label: "Type", icon: Type },
  { id: "frame", label: "Frame", icon: Frame },
];

export function PremiereControlRenderer({
  templateId,
  configuration,
  onChange,
}: PremiereControlRendererProps) {
  const [section, setSection] = useState<LabSection>("palette");
  const template = getTemplateById(templateId);
  const metadata = template?.premiere;
  if (!metadata) return null;

  function updateAppearance(
    patch: Partial<PostStyleConfigurationV3["appearance"]>,
  ) {
    onChange({
      ...configuration,
      appearance: { ...configuration.appearance, ...patch },
    });
  }

  function updateTreatment(
    patch: Partial<PostStyleConfigurationV3["treatment"]>,
  ) {
    onChange({
      ...configuration,
      treatment: { ...configuration.treatment, ...patch },
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-black/25 p-1">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className={cn(
              "flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs transition-colors",
              section === item.id
                ? "bg-purple-500/20 text-purple-100"
                : "text-slate-400 hover:bg-white/5 hover:text-white",
            )}
          >
            <item.icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
      </div>

      {section === "palette" ? (
        <section
          aria-labelledby="premiere-palette-heading"
          className="space-y-4"
        >
          <div>
            <h4
              id="premiere-palette-heading"
              className="text-sm font-semibold text-white"
            >
              Ink palette
            </h4>
            <p className="mt-1 text-xs text-slate-400">
              Start with a press-ready palette, then tune every ink.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {metadata.palettes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  onChange({
                    ...configuration,
                    paletteId: item.id,
                    appearance: {
                      ...configuration.appearance,
                      cardBackgroundHex: item.colors.surface,
                      textColorCustomHex: item.colors.foreground,
                      accentHex: item.colors.primary,
                      secondaryAccentHex: item.colors.secondary,
                      borderColorHex: item.colors.border,
                    },
                  })
                }
                className={cn(
                  "rounded-xl border p-2 text-left transition-colors",
                  configuration.paletteId === item.id
                    ? "border-purple-400 bg-purple-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/25",
                )}
              >
                <span className="mb-2 flex overflow-hidden rounded-md border border-black/10">
                  {[
                    item.colors.surface,
                    item.colors.foreground,
                    item.colors.primary,
                    item.colors.secondary,
                  ].map((color, index) => (
                    <span
                      key={`${color}-${index}`}
                      className="h-7 flex-1"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
                <span className="text-xs font-medium text-slate-200">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <ColorField
              label="Paper"
              value={configuration.appearance.cardBackgroundHex}
              onChange={(value) =>
                updateAppearance({ cardBackgroundHex: value })
              }
            />
            <ColorField
              label="Type"
              value={configuration.appearance.textColorCustomHex}
              onChange={(value) =>
                updateAppearance({ textColorCustomHex: value })
              }
            />
            <ColorField
              label="Ink one"
              value={configuration.appearance.accentHex}
              onChange={(value) => updateAppearance({ accentHex: value })}
            />
            <ColorField
              label="Ink two"
              value={configuration.appearance.secondaryAccentHex}
              onChange={(value) =>
                updateAppearance({ secondaryAccentHex: value })
              }
            />
            <ColorField
              label="Rule"
              value={configuration.appearance.borderColorHex}
              onChange={(value) => updateAppearance({ borderColorHex: value })}
            />
          </div>
        </section>
      ) : null}

      {section === "texture" ? (
        <section
          aria-labelledby="premiere-texture-heading"
          className="space-y-4"
        >
          <div>
            <h4
              id="premiere-texture-heading"
              className="text-sm font-semibold text-white"
            >
              Texture layer
            </h4>
            <p className="mt-1 text-xs text-slate-400">
              Combine a texture skin with {template.label}, then tune how
              strongly it prints.
            </p>
          </div>
          <TextureSkinPicker
            value={configuration.textureId ?? "none"}
            onChange={(textureId: PostTextureId) =>
              onChange({ ...configuration, textureId })
            }
          />
          <div className="space-y-3 border-t border-white/10 pt-4">
            <p className="mb-3 text-xs font-semibold text-slate-300">
              Texture tuning
            </p>
            <RangeField
              label={metadata.controls.intensityLabel}
              value={configuration.treatment.intensity}
              min={0}
              max={100}
              suffix="%"
              onChange={(value) => updateTreatment({ intensity: value })}
            />
            <RangeField
              label={metadata.controls.scaleLabel}
              value={configuration.treatment.patternScale}
              min={4}
              max={32}
              suffix="px"
              onChange={(value) => updateTreatment({ patternScale: value })}
            />
            <RangeField
              label={metadata.controls.offsetLabel}
              value={configuration.treatment.registrationOffset}
              min={0}
              max={8}
              suffix="px"
              onChange={(value) =>
                updateTreatment({ registrationOffset: value })
              }
            />
            {metadata.controls.supportsAngle ? (
              <RangeField
                label="Pattern angle"
                value={configuration.treatment.angle}
                min={-45}
                max={45}
                suffix="°"
                onChange={(value) => updateTreatment({ angle: value })}
              />
            ) : null}
            {metadata.controls.supportsDistress ? (
              <RangeField
                label="Distress"
                value={configuration.treatment.distress}
                min={0}
                max={100}
                suffix="%"
                onChange={(value) => updateTreatment({ distress: value })}
              />
            ) : null}
            {metadata.controls.supportsInvert ? (
              <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                Invert the signal
                <input
                  type="checkbox"
                  checked={configuration.treatment.invert}
                  onChange={(event) =>
                    updateTreatment({ invert: event.target.checked })
                  }
                  className="h-4 w-4 rounded border-white/20 bg-black/40 text-purple-500"
                />
              </label>
            ) : null}
          </div>
        </section>
      ) : null}

      {section === "type" ? (
        <section aria-labelledby="premiere-type-heading" className="space-y-4">
          <h4
            id="premiere-type-heading"
            className="text-sm font-semibold text-white"
          >
            Typography
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Headline"
              value={configuration.typography.headingFont}
              options={EPK_FONT_IDS.map((id) => ({
                value: id,
                label: EPK_FONT_LABELS[id],
              }))}
              onChange={(value) =>
                onChange({
                  ...configuration,
                  typography: {
                    ...configuration.typography,
                    headingFont: value as EpkFontId,
                  },
                })
              }
            />
            <SelectField
              label="Body"
              value={configuration.typography.bodyFont}
              options={EPK_FONT_IDS.map((id) => ({
                value: id,
                label: EPK_FONT_LABELS[id],
              }))}
              onChange={(value) =>
                onChange({
                  ...configuration,
                  typography: {
                    ...configuration.typography,
                    bodyFont: value as EpkFontId,
                  },
                })
              }
            />
            <SelectField
              label="Case"
              value={configuration.typography.case}
              options={[
                { value: "normal", label: "Natural" },
                { value: "uppercase", label: "Uppercase" },
              ]}
              onChange={(value) =>
                onChange({
                  ...configuration,
                  typography: {
                    ...configuration.typography,
                    case: value as "normal" | "uppercase",
                  },
                })
              }
            />
            <SelectField
              label="Tracking"
              value={configuration.typography.tracking}
              options={[
                { value: "tight", label: "Tight" },
                { value: "normal", label: "Normal" },
                { value: "wide", label: "Wide" },
              ]}
              onChange={(value) =>
                onChange({
                  ...configuration,
                  typography: {
                    ...configuration.typography,
                    tracking: value as "tight" | "normal" | "wide",
                  },
                })
              }
            />
            <SelectField
              label="Body scale"
              value={configuration.appearance.fontSizeScale}
              options={["xs", "sm", "md", "lg"].map((value) => ({
                value,
                label: value.toUpperCase(),
              }))}
              onChange={(value) =>
                updateAppearance({
                  fontSizeScale:
                    value as PostStyleConfigurationV3["appearance"]["fontSizeScale"],
                })
              }
            />
            <SelectField
              label="Heading scale"
              value={configuration.appearance.headingScale}
              options={["sm", "md", "lg"].map((value) => ({
                value,
                label: value.toUpperCase(),
              }))}
              onChange={(value) =>
                updateAppearance({
                  headingScale:
                    value as PostStyleConfigurationV3["appearance"]["headingScale"],
                })
              }
            />
          </div>
        </section>
      ) : null}

      {section === "frame" ? (
        <section aria-labelledby="premiere-frame-heading" className="space-y-4">
          <h4
            id="premiere-frame-heading"
            className="text-sm font-semibold text-white"
          >
            Frame and spacing
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Corners"
              value={configuration.appearance.cardRadius}
              options={[
                { value: "sharp", label: "Sharp" },
                { value: "rounded", label: "Rounded" },
                { value: "pill", label: "Extra round" },
              ]}
              onChange={(value) =>
                updateAppearance({
                  cardRadius:
                    value as PostStyleConfigurationV3["appearance"]["cardRadius"],
                })
              }
            />
            <SelectField
              label="Border"
              value={configuration.appearance.borderStrength}
              options={[
                { value: "subtle", label: "Subtle" },
                { value: "default", label: "Regular" },
                { value: "strong", label: "Heavy" },
              ]}
              onChange={(value) =>
                updateAppearance({
                  borderStrength:
                    value as PostStyleConfigurationV3["appearance"]["borderStrength"],
                })
              }
            />
            <SelectField
              label="Density"
              value={configuration.appearance.sectionSpacing}
              options={[
                { value: "compact", label: "Compact" },
                { value: "default", label: "Comfortable" },
              ]}
              onChange={(value) =>
                updateAppearance({
                  sectionSpacing:
                    value as PostStyleConfigurationV3["appearance"]["sectionSpacing"],
                })
              }
            />
            <SelectField
              label="Surface"
              value={configuration.appearance.cardSurface}
              options={[
                { value: "default", label: "Flat" },
                { value: "elevated", label: "Raised" },
                { value: "minimal", label: "Minimal" },
              ]}
              onChange={(value) =>
                updateAppearance({
                  cardSurface:
                    value as PostStyleConfigurationV3["appearance"]["cardSurface"],
                })
              }
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] text-slate-400">{label}</Label>
      <ColorPicker
        value={value ?? ""}
        onChange={(next) => onChange(next || null)}
        showLabel={false}
      />
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block rounded-xl border border-white/10 bg-white/5 p-3">
      <span className="mb-2 flex items-center justify-between text-xs text-slate-300">
        <span>{label}</span>
        <span className="font-mono text-purple-200">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-purple-500"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-400">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="border-white/15 bg-white/5 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
