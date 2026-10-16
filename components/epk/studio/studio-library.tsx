"use client"

import React, { useState } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { EPK_SECTION_LABELS } from "@/lib/epk/epk-preview-utils"
import { getDefaultEpkAppearanceForTemplate } from "@/lib/epk/epk-appearance"
import type { EpkSkinId } from "@/lib/epk/epk-skin-tokens"
import {
  renderEpkSectionInSkin,
  type EpkSectionRenderCtx,
} from "@/components/epk/epk-template-variants"
import { STUDIO_SKINS, ScaledPreview, skinName } from "@/components/epk/studio/studio-ui"

export function TemplateLibrary({
  ctx,
  activeSkin,
  onApply,
}: {
  ctx: EpkSectionRenderCtx
  activeSkin: EpkSkinId
  onApply: (skin: EpkSkinId) => void
}) {
  return (
    <div className="flex flex-col gap-3 p-3">
      <p className="px-1 text-xs leading-relaxed text-slate-400">
        Templates restyle the whole page. Your content and per-section choices stay put.
      </p>
      {STUDIO_SKINS.map((skin) => (
        <button
          key={skin}
          type="button"
          onClick={() => onApply(skin)}
          className={cn(
            "group overflow-hidden rounded-xl border text-left transition-all",
            activeSkin === skin
              ? "border-purple-400 ring-2 ring-purple-400/30"
              : "border-white/[0.08] hover:border-white/30",
          )}
        >
          <ScaledPreview scale={0.22} height={132}>
            {renderEpkSectionInSkin("hero", ctx, skin, {
              appearance: getDefaultEpkAppearanceForTemplate(skin),
              chrome: true,
            })}
          </ScaledPreview>
          <span className="flex items-center justify-between border-t border-white/[0.06] bg-[#0d0f16] px-3 py-2">
            <span className="text-sm font-medium text-white">{skinName(skin)}</span>
            {activeSkin === skin ? <Check className="h-4 w-4 text-purple-300" aria-label="Active" /> : null}
          </span>
        </button>
      ))}
    </div>
  )
}

export function ElementLibrary({
  ctx,
  pageSkin,
  selectedSection,
  currentSkinFor,
  onUse,
}: {
  ctx: EpkSectionRenderCtx
  pageSkin: EpkSkinId
  selectedSection: string | null
  currentSkinFor: (sectionId: string) => EpkSkinId
  onUse: (sectionId: string, skin: EpkSkinId) => void
}) {
  const [picked, setPicked] = useState<string>(selectedSection ?? "hero")
  const sectionId = selectedSection ?? picked
  const current = currentSkinFor(sectionId)

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(EPK_SECTION_LABELS).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPicked(id)}
            disabled={Boolean(selectedSection)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
              sectionId === id
                ? "border-purple-400 bg-purple-500/15 text-white"
                : "border-white/[0.08] text-slate-400 hover:text-white disabled:opacity-40",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="px-1 text-xs leading-relaxed text-slate-400">
        {selectedSection
          ? `Pick a design for the selected ${EPK_SECTION_LABELS[sectionId] ?? sectionId}.`
          : "Every element from every template. Click one to use it on your page."}
      </p>
      {STUDIO_SKINS.map((skin) => (
        <button
          key={skin}
          type="button"
          onClick={() => onUse(sectionId, skin)}
          className={cn(
            "overflow-hidden rounded-xl border text-left transition-all",
            current === skin
              ? "border-purple-400 ring-2 ring-purple-400/30"
              : "border-white/[0.08] hover:border-white/30",
          )}
        >
          <ScaledPreview scale={0.22} height={120}>
            {renderEpkSectionInSkin(sectionId, ctx, skin, {
              appearance: getDefaultEpkAppearanceForTemplate(skin),
            })}
          </ScaledPreview>
          <span className="flex items-center justify-between border-t border-white/[0.06] bg-[#0d0f16] px-3 py-2">
            <span className="text-xs font-medium text-white">
              {skinName(skin)}
              {skin === pageSkin ? <span className="ml-1.5 text-slate-500">· page</span> : null}
            </span>
            {current === skin ? <Check className="h-4 w-4 text-purple-300" aria-label="In use" /> : null}
          </span>
        </button>
      ))}
    </div>
  )
}
