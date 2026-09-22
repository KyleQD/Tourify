import React from "react";
import type { EpkSkinTokens } from "@/lib/epk/epk-skin-tokens";
import { cn } from "@/lib/utils";
import { getAdapterConfig } from "./adapters";
import { getTemplateById } from "@/lib/post-appearance/template-registry";

export interface PostSemanticRegions {
  author: React.ReactNode;
  content: React.ReactNode;
  media?: React.ReactNode;
  actions: React.ReactNode;
  metadata?: React.ReactNode;
}

export interface PostTemplateAdapterProps {
  templateId: string;
  tokens: EpkSkinTokens;
  regions: PostSemanticRegions;
}

export function PostTemplateFrame({
  templateId,
  children,
}: {
  templateId: string;
  children: React.ReactNode;
}) {
  const layout = getAdapterConfig(templateId)?.layout ?? "standard";
  const template = getTemplateById(templateId);
  const eyebrow = template?.premiere?.eyebrow;
  return (
    <div
      data-post-template-frame
      data-post-layout={layout}
      className="relative"
    >
      {eyebrow ? (
        <>
          <div data-post-premiere-bar aria-hidden>
            <span data-post-premiere-signal>{eyebrow}</span>
            <span data-post-premiere-label>{template?.label}</span>
          </div>
          <div data-post-premiere-rail aria-hidden>
            <span>Tourify transmission</span>
            <span data-post-premiere-rule />
            <span>Post / live</span>
          </div>
          <span data-post-premiere-corner="top-left" aria-hidden />
          <span data-post-premiere-corner="top-right" aria-hidden />
          <span data-post-premiere-corner="bottom-left" aria-hidden />
          <span data-post-premiere-corner="bottom-right" aria-hidden />
        </>
      ) : null}
      {!eyebrow && layout === "editorial" ? (
        <div
          aria-hidden
          className="flex items-center gap-2 border-b border-[var(--post-card-border)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--post-link)]"
        >
          <span>Tourify edition</span>
          <span className="h-px flex-1 bg-current opacity-35" />
        </div>
      ) : null}
      {!eyebrow && layout === "bold" ? (
        <div aria-hidden className="h-2 bg-[var(--post-link)]" />
      ) : null}
      <div data-post-region="content">{children}</div>
    </div>
  );
}

/**
 * Routes to the correct per-template adapter based on templateId.
 * Falls back to the universal adapter for any unknown template.
 */
export function PostTemplateAdapter({
  templateId,
  tokens,
  regions,
}: PostTemplateAdapterProps) {
  const config = getAdapterConfig(templateId);
  const layout = config?.layout ?? "standard";
  return (
    <UniversalPostAdapter tokens={tokens} regions={regions} layout={layout} />
  );
}

function UniversalPostAdapter({
  tokens,
  regions,
  layout = "standard",
}: {
  tokens: EpkSkinTokens;
  regions: PostSemanticRegions;
  layout?: "standard" | "editorial" | "minimal" | "bold";
}) {
  const cardClass = cn(
    "rounded-lg overflow-hidden",
    tokens.card,
    layout === "minimal" && "shadow-none",
    layout === "bold" && "ring-1 ring-white/20",
  );

  const authorClass = cn(
    "px-4 pt-4 pb-2",
    tokens.card,
    layout === "editorial" && "border-l-2 border-[var(--epk-accent)] pl-3",
    layout === "minimal" && "px-3 pt-3",
  );

  const contentClass = cn(
    "px-4 pb-3",
    tokens.bodyStrong,
    layout === "minimal" && "px-3",
    layout === "editorial" && "px-5",
  );

  return (
    <div className={cardClass}>
      {/* Author row — required metadata; cannot be hidden */}
      <div className={authorClass}>{regions.author}</div>

      {/* Post text */}
      <div className={contentClass}>{regions.content}</div>

      {/* Attached media */}
      {regions.media && <div className="px-4 pb-3">{regions.media}</div>}

      {/* Timestamp / visibility metadata */}
      {regions.metadata && (
        <div className={cn("px-4 pb-2 text-xs", tokens.muted)}>
          {regions.metadata}
        </div>
      )}

      {/* Reaction/action bar — safety controls must always be accessible */}
      <div className={cn("px-4 pb-4 border-t", tokens.dashed)}>
        {regions.actions}
      </div>
    </div>
  );
}
