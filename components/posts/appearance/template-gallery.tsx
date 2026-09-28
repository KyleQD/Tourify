"use client";

import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { compilePostAppearance } from "@/lib/appearance/compile";
import { getTemplatesForFlag } from "@/lib/appearance/template-registry";
import type { AppearanceTemplateDefinition } from "@/lib/appearance/contracts";
import type { PostStyleConfigurationV3 } from "@/lib/appearance/contracts";
import { PostStyleBoundary } from "./post-style-boundary";
import { PostTemplateFrame } from "./post-template-adapter";

interface TemplateGalleryProps {
  selectedId: string | null;
  onSelect: (templateId: string) => void;
  /** Retained for API compatibility; premiere styles are no longer gated by this flag. */
  allTemplatesEnabled?: boolean;
  className?: string;
}

const PREMIERE_TEMPLATES = getTemplatesForFlag(true);

export function TemplateGallery({
  selectedId,
  onSelect,
  className,
}: TemplateGalleryProps) {
  const templates = PREMIERE_TEMPLATES;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Premiere styles</p>
          <p className="text-xs text-slate-400">
            Eight post-native designs. Pick one, then make it yours.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          {templates.length} styles
        </span>
      </div>
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        role="listbox"
        aria-label="Premiere post styles"
      >
        {templates.map((template) => (
          <TemplateGalleryTile
            key={template.id}
            template={template}
            isSelected={selectedId === template.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function TemplateGalleryTile({
  template,
  isSelected,
  onSelect,
}: {
  template: AppearanceTemplateDefinition;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      role="option"
      aria-selected={isSelected}
      aria-label={`Choose ${template.label} style`}
      tabIndex={0}
      onClick={() => onSelect(template.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(template.id);
        }
      }}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-xl border-2 bg-black/20 p-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-inset",
        isSelected
          ? "border-purple-400 bg-purple-500/10 shadow-[0_0_24px_-12px_rgba(192,132,252,0.9)]"
          : "border-white/10 hover:border-white/30",
      )}
    >
      <PremiereStyleThumbnail template={template} />
      <div className="mt-2 min-w-0 pr-5">
        <p className="truncate text-left text-xs font-semibold text-slate-100">
          {template.label}
        </p>
        <p className="mt-0.5 line-clamp-2 text-left text-[10px] leading-4 text-slate-500">
          {template.description}
        </p>
      </div>
      {isSelected ? (
        <CheckCircle2 className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 text-purple-300" />
      ) : null}
    </div>
  );
}

export function PremiereStyleThumbnail({
  template,
  className,
  configuration: configurationOverride,
}: {
  template: AppearanceTemplateDefinition;
  className?: string;
  configuration?: PostStyleConfigurationV3;
}) {
  const configuration =
    configurationOverride ?? template.premiere?.defaultConfiguration;
  if (!configuration)
    return (
      <div className={cn("aspect-[4/3] rounded-md bg-slate-800", className)} />
    );
  const compiled = compilePostAppearance(
    template.id,
    configuration.appearance,
    configuration,
  );

  return (
    <div
      className={cn(
        "pointer-events-none h-24 overflow-hidden rounded-md",
        className,
      )}
      aria-hidden
    >
      <div className="origin-top-left w-[200%] scale-50">
        <PostStyleBoundary
          postId={`thumbnail-${template.id}`}
          templateId={template.id}
          templateVersion={template.version}
          compiled={compiled}
        >
          <PostTemplateFrame templateId={template.id}>
            <div data-slot="card" className="space-y-3 p-4">
              <div
                data-post-region="header"
                className="flex items-center gap-2"
              >
                <span
                  data-slot="avatar"
                  className="h-7 w-7 rounded-full border-2 border-current"
                />
                <span className="h-2 w-28 bg-current opacity-80" />
              </div>
              <div
                data-post-region="body"
                className="h-3 w-4/5 bg-current opacity-90"
              />
              <div
                data-post-region="metadata"
                className="h-2 w-full bg-current opacity-35"
              />
              <div
                data-post-region="metadata"
                className="h-2 w-2/3 bg-current opacity-25"
              />
              <div
                data-post-region="actions"
                className="flex gap-5 border-t border-current/30 pt-3 text-xs"
              >
                <span>LIKE</span>
                <span>REPLY</span>
                <span>SHARE</span>
              </div>
            </div>
          </PostTemplateFrame>
        </PostStyleBoundary>
      </div>
    </div>
  );
}
