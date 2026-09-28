"use client";

import { Ban, Play, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ANIMATED_POST_TEXTURES,
  STATIC_POST_TEXTURES,
  type PostTextureId,
} from "@/lib/post-appearance/texture-skins";
import styles from "./post-style-boundary.module.css";

interface TextureSkinPickerProps {
  value: PostTextureId;
  onChange: (textureId: PostTextureId) => void;
}

export function TextureSkinPicker({ value, onChange }: TextureSkinPickerProps) {
  return (
    <div className="space-y-5">
      <section
        aria-labelledby="static-textures-heading"
        className="space-y-2.5"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h5
              id="static-textures-heading"
              className="text-xs font-semibold text-slate-200"
            >
              Texture skins
            </h5>
            <p className="mt-0.5 text-[11px] text-slate-500">
              12 layered surfaces that combine with any premiere style.
            </p>
          </div>
          <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-semibold text-slate-500">
            12 static
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <TextureTile
            id="none"
            label="No texture"
            description="Use only the base style."
            selected={value === "none"}
            onSelect={onChange}
          />
          {STATIC_POST_TEXTURES.map((texture) => (
            <TextureTile
              key={texture.id}
              id={texture.id}
              label={texture.label}
              description={texture.description}
              selected={value === texture.id}
              onSelect={onChange}
            />
          ))}
        </div>
      </section>

      <section
        aria-labelledby="animated-textures-heading"
        className="space-y-2.5"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h5
              id="animated-textures-heading"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-200"
            >
              <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" /> Early-web
              motion
            </h5>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Four tasteful loops inspired by tiled GIFs, marquees, BLINK, and
              under-construction pages.
            </p>
          </div>
          <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/5 px-2 py-1 text-[10px] font-semibold text-fuchsia-200">
            4 animated
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ANIMATED_POST_TEXTURES.map((texture) => (
            <TextureTile
              key={texture.id}
              id={texture.id}
              label={texture.label}
              description={texture.description}
              animated
              selected={value === texture.id}
              onSelect={onChange}
            />
          ))}
        </div>
        <p className="text-[10px] leading-4 text-slate-500">
          Motion automatically pauses when reduced-motion is enabled.
        </p>
      </section>
    </div>
  );
}

function TextureTile({
  id,
  label,
  description,
  animated = false,
  selected,
  onSelect,
}: {
  id: PostTextureId;
  label: string;
  description: string;
  animated?: boolean;
  selected: boolean;
  onSelect: (textureId: PostTextureId) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Use ${label} texture`}
      onClick={() => onSelect(id)}
      className={cn(
        "group min-w-0 rounded-xl border p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400",
        selected
          ? "border-purple-400 bg-purple-500/10"
          : "border-white/10 bg-white/[0.035] hover:border-white/25 hover:bg-white/[0.06]",
      )}
    >
      <span
        data-post-texture={id}
        className={cn(
          styles.texturePreview,
          "relative mb-2 block h-14 overflow-hidden rounded-lg border border-white/10 bg-slate-950",
        )}
        aria-hidden
      >
        {id === "none" ? (
          <Ban className="absolute inset-0 m-auto h-5 w-5 text-slate-600" />
        ) : null}
        {animated ? (
          <span className="absolute right-1.5 top-1.5 z-10 rounded bg-black/55 p-1 text-fuchsia-200">
            <Play className="h-2.5 w-2.5 fill-current" />
          </span>
        ) : null}
      </span>
      <span className="block truncate text-[11px] font-semibold text-slate-200">
        {label}
      </span>
      <span className="mt-0.5 line-clamp-2 block text-[9px] leading-3 text-slate-500">
        {description}
      </span>
    </button>
  );
}
