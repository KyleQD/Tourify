"use client"

import React, { useId } from "react"
import { cn } from "@/lib/utils"
import { EPK_SKIN_TOKENS, type EpkSkinId } from "@/lib/epk/epk-skin-tokens"

const SKIN_NAME_OVERRIDES: Partial<Record<EpkSkinId, string>> = {
  bandcard: "Band Card",
  pressgrid: "Press Grid",
  redcolumn: "Red Column",
  colorblock: "Color Block",
  whitespace: "White Space",
}

export const STUDIO_SKINS = Object.keys(EPK_SKIN_TOKENS) as EpkSkinId[]

export function skinName(skin: EpkSkinId): string {
  return SKIN_NAME_OVERRIDES[skin] ?? skin.charAt(0).toUpperCase() + skin.slice(1)
}

export function PanelSection({
  title,
  action,
  children,
  className,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("flex flex-col gap-3 border-b border-white/[0.06] px-4 py-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-purple-400/70 focus:bg-white/[0.06]"

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string
  value: string | number | undefined
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-slate-300">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  )
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 5,
}: {
  label: string
  value: string | undefined
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-slate-300">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass, "resize-y leading-relaxed")}
      />
    </div>
  )
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string
  value: T
  options: readonly { value: T; label: string }[] | readonly T[]
  onChange: (value: T) => void
}) {
  const items = options.map((o) =>
    typeof o === "string" ? { value: o, label: o.charAt(0).toUpperCase() + o.slice(1) } : o,
  ) as { value: T; label: string }[]
  return (
    <div className="flex flex-col gap-1.5">
      {label ? <span className="text-xs font-medium text-slate-300">{label}</span> : null}
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-lg bg-white/[0.04] p-1">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={item.value === value}
            onClick={() => onChange(item.value)}
            className={cn(
              "min-w-0 flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              item.value === value
                ? "bg-purple-500 text-white shadow-sm"
                : "text-slate-400 hover:bg-white/[0.06] hover:text-white",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ColorField({
  label,
  value,
  onChange,
  allowClear = true,
}: {
  label: string
  value: string | null | undefined
  onChange: (value: string | null) => void
  allowClear?: boolean
}) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-xs font-medium text-slate-300">
        {label}
      </label>
      <div className="flex items-center gap-2">
        {allowClear && value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[11px] text-slate-500 hover:text-white"
          >
            Auto
          </button>
        ) : null}
        <span className="font-mono text-[11px] uppercase text-slate-400">{value ?? "Auto"}</span>
        <span
          className="relative h-7 w-7 overflow-hidden rounded-md border border-white/15"
          style={{
            background:
              value ??
              "repeating-conic-gradient(rgba(255,255,255,.15) 0 25%, transparent 0 50%) 50% / 8px 8px",
          }}
        >
          <input
            id={id}
            type="color"
            value={value ?? "#888888"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </span>
      </div>
    </div>
  )
}

/** Renders a full-size design scaled down into a thumbnail. */
export function ScaledPreview({
  children,
  scale = 0.24,
  height = 150,
  sourceWidth = 1120,
}: {
  children: React.ReactNode
  scale?: number
  height?: number
  sourceWidth?: number
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none relative w-full select-none overflow-hidden"
      style={{ height }}
    >
      <div style={{ width: sourceWidth, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        {children}
      </div>
    </div>
  )
}
