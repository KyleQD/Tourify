"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Check,
  Loader2,
  RotateCcw,
  Save,
  ShieldCheck,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import {
  compilePostAppearance,
  getSkinColorsForPreview,
} from "@/lib/appearance/compile";
import type {
  PostAppearanceInput,
  PostStyleConfigurationV3,
} from "@/lib/appearance/contracts";
import { sanitizePostStyleConfiguration } from "@/lib/appearance/sanitize";
import {
  getTemplateById,
  getDefaultPostStyleConfiguration,
} from "@/lib/appearance/template-registry";
import type { StyleProfileRow } from "@/lib/post-style-profiles/profiles.service";
import { TemplateGallery, PremiereStyleThumbnail } from "./template-gallery";
import { PremiereControlRenderer } from "./premiere-control-renderer";
import { PostStyleBoundary } from "./post-style-boundary";
import { PostTemplateFrame } from "./post-template-adapter";
import { useActingContext } from "@/hooks/use-acting-context";

export interface AppearancePreviewColors {
  skinId: string;
  bg: string;
  text: string;
  border: string;
  accent: string;
}

export interface PostStylePreviewData {
  authorName?: string;
  handle?: string;
  content?: string;
  mediaCount?: number;
  pollOptions?: string[];
}

interface AppearanceEditorProps {
  value: PostAppearanceInput | null;
  onChange: (input: PostAppearanceInput | null) => void;
  onClose: () => void;
  onPreviewChange?: (colors: AppearancePreviewColors | null) => void;
  preview?: PostStylePreviewData;
}

function customInput(
  templateId: string,
  configuration: PostStyleConfigurationV3,
): PostAppearanceInput {
  return {
    mode: "custom",
    templateId,
    templateVersion: 1,
    schemaVersion: 3,
    configuration,
  };
}

function configurationFromInput(
  value: PostAppearanceInput | null,
): { templateId: string; configuration: PostStyleConfigurationV3 } | null {
  if (!value || value.mode !== "custom" || value.schemaVersion !== 3)
    return null;
  const template = getTemplateById(value.templateId);
  if (!template?.premiere) return null;
  return {
    templateId: value.templateId,
    configuration: sanitizePostStyleConfiguration(
      value.configuration,
      value.templateId,
    ),
  };
}

export function AppearanceEditor({
  value,
  onChange,
  onClose,
  onPreviewChange,
  preview,
}: AppearanceEditorProps) {
  const { actingContextKey, actingHeaders } = useActingContext();
  const initialSelection = useMemo(
    () => configurationFromInput(value),
    [value],
  );
  const [profiles, setProfiles] = useState<StyleProfileRow[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [templateId, setTemplateId] = useState<string | null>(
    initialSelection?.templateId ?? null,
  );
  const [configuration, setConfiguration] =
    useState<PostStyleConfigurationV3 | null>(
      initialSelection?.configuration ?? null,
    );
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    value?.mode === "profile" ? value.profileId : null,
  );
  const [saveName, setSaveName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const initialValueRef = useRef(value);

  const notifyPreview = useCallback(
    (
      nextTemplateId: string | null,
      nextConfiguration: PostStyleConfigurationV3 | null,
    ) => {
      if (!nextTemplateId || !nextConfiguration) {
        onPreviewChange?.(null);
        return;
      }
      const colors = getSkinColorsForPreview(
        nextTemplateId,
        nextConfiguration.appearance,
      );
      onPreviewChange?.({ skinId: nextTemplateId, ...colors });
    },
    [onPreviewChange],
  );

  const loadProfiles = useCallback(async () => {
    setIsLoadingProfiles(true);
    try {
      const response = await fetch("/api/post-styles/bootstrap", {
        credentials: "include",
        headers: actingHeaders,
      });
      if (!response.ok) return;
      const data = (await response.json()) as {
        profiles?: StyleProfileRow[];
        defaultProfile?: StyleProfileRow | null;
      };
      const nextProfiles = data.profiles ?? [];
      setProfiles(nextProfiles);

      const initialValue = initialValueRef.current;
      if (initialValue?.mode === "profile") {
        const selected = nextProfiles.find(
          (profile) => profile.id === initialValue.profileId,
        );
        const selectedTemplate = selected
          ? getTemplateById(selected.template_id)
          : null;
        if (
          selected &&
          selectedTemplate?.lifecycle === "active" &&
          selectedTemplate.premiere
        ) {
          setTemplateId(selected.template_id);
          setConfiguration(
            sanitizePostStyleConfiguration(
              selected.configuration,
              selected.template_id,
            ),
          );
          setSelectedProfileId(selected.id);
          setSaveName(selected.name);
        }
      } else if (!initialValue && data.defaultProfile) {
        const defaultTemplate = getTemplateById(
          data.defaultProfile.template_id,
        );
        if (
          defaultTemplate?.lifecycle === "active" &&
          defaultTemplate.premiere
        ) {
          const next = sanitizePostStyleConfiguration(
            data.defaultProfile.configuration,
            data.defaultProfile.template_id,
          );
          setTemplateId(data.defaultProfile.template_id);
          setConfiguration(next);
          setSelectedProfileId(data.defaultProfile.id);
        }
      }
    } finally {
      setIsLoadingProfiles(false);
    }
  }, [actingHeaders]);

  useEffect(() => {
    setProfiles([]);
    setSelectedProfileId(null);
    void loadProfiles();
  }, [actingContextKey, loadProfiles]);

  function chooseTemplate(id: string) {
    const defaults = getDefaultPostStyleConfiguration(id);
    if (!defaults) return;
    setTemplateId(id);
    setConfiguration(defaults);
    setSelectedProfileId(null);
    setSaveName(`My ${getTemplateById(id)?.label ?? "post"} style`);
  }

  function chooseProfile(profile: StyleProfileRow) {
    const template = getTemplateById(profile.template_id);
    if (template?.lifecycle !== "active" || !template.premiere) return;
    const next = sanitizePostStyleConfiguration(
      profile.configuration,
      profile.template_id,
    );
    setTemplateId(profile.template_id);
    setConfiguration(next);
    setSelectedProfileId(profile.id);
    setSaveName(profile.name);
  }

  function chooseStandard() {
    setTemplateId(null);
    setConfiguration(null);
    setSelectedProfileId(null);
  }

  function handleReset() {
    if (!templateId) return;
    const defaults = getDefaultPostStyleConfiguration(templateId);
    if (!defaults) return;
    setConfiguration(defaults);
    setSelectedProfileId(null);
  }

  function handleCancel() {
    onClose();
  }

  function handleApply() {
    if (!templateId || !configuration) {
      onChange(null);
      onPreviewChange?.(null);
    } else if (selectedProfileId) {
      const profile = profiles.find((item) => item.id === selectedProfileId);
      onChange({
        mode: "profile",
        profileId: selectedProfileId,
        expectedProfileVersion: profile?.updated_at,
      });
      notifyPreview(templateId, configuration);
    } else {
      onChange(customInput(templateId, configuration));
      notifyPreview(templateId, configuration);
    }
    onClose();
  }

  async function saveAsProfile() {
    if (!templateId || !configuration || !saveName.trim()) return;
    setIsSavingProfile(true);
    try {
      const response = await fetch("/api/post-style-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...actingHeaders },
        credentials: "include",
        body: JSON.stringify({
          name: saveName.trim(),
          templateId,
          schemaVersion: 3,
          configuration,
          setAsDefault: false,
        }),
      });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { profile: StyleProfileRow };
      setSelectedProfileId(data.profile.id);
      toast.success("Saved as a reusable style");
      await loadProfiles();
    } catch {
      toast.error("Failed to save style");
    } finally {
      setIsSavingProfile(false);
    }
  }

  const activeProfiles = profiles.filter(
    (profile) => getTemplateById(profile.template_id)?.lifecycle === "active",
  );

  return (
    <div className="space-y-5">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="min-w-0 space-y-5">
          <div className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)]">
            <button
              type="button"
              onClick={chooseStandard}
              className={`rounded-xl border p-3 text-left ${!templateId ? "border-purple-400 bg-purple-500/10" : "border-white/10 bg-white/5 hover:border-white/25"}`}
            >
              <span className="mb-2 block h-12 rounded-lg border border-white/10 bg-slate-900" />
              <span className="text-xs font-semibold text-white">Standard</span>
              <span className="mt-0.5 block text-[10px] text-slate-500">
                Clean Tourify card
              </span>
            </button>
            <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-200">
                  Saved styles
                </p>
                {isLoadingProfiles ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
                ) : null}
              </div>
              {activeProfiles.length ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {activeProfiles.map((profile) => {
                    const template = getTemplateById(profile.template_id);
                    if (!template) return null;
                    return (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => chooseProfile(profile)}
                        className={`min-w-36 rounded-lg border p-2 text-left ${selectedProfileId === profile.id ? "border-purple-400 bg-purple-500/10" : "border-white/10 bg-black/20"}`}
                      >
                        <PremiereStyleThumbnail
                          template={template}
                          className="h-12"
                        />
                        <span className="mt-1.5 block truncate text-[11px] font-medium text-slate-200">
                          {profile.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="py-4 text-center text-xs text-slate-500">
                  Your reusable styles will appear here.
                </p>
              )}
            </div>
          </div>

          <TemplateGallery selectedId={templateId} onSelect={chooseTemplate} />

          {templateId && configuration ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Design lab</p>
                  <p className="text-xs text-slate-400">
                    Every control is bounded and safe for feed cards.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="gap-1.5 text-slate-400"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset preset
                </Button>
              </div>
              <PremiereControlRenderer
                templateId={templateId}
                configuration={configuration}
                onChange={(next) => {
                  setConfiguration(next);
                  setSelectedProfileId(null);
                }}
              />
              <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="mb-2 text-xs font-semibold text-slate-300">
                  Save for later
                </p>
                <div className="flex gap-2">
                  <Input
                    value={saveName}
                    onChange={(event) => setSaveName(event.target.value)}
                    maxLength={100}
                    placeholder="Style name"
                    className="border-white/15 bg-white/5 text-white"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void saveAsProfile()}
                    disabled={!saveName.trim() || isSavingProfile}
                    className="shrink-0 gap-1.5 border-white/15"
                  >
                    {isSavingProfile ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}{" "}
                    Save
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <StudioPostPreview
          templateId={templateId}
          configuration={configuration}
          preview={preview}
        />
      </div>

      <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 border-t border-white/10 bg-slate-950/95 px-1 py-4 backdrop-blur-xl">
        <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
          <ShieldCheck className="h-4 w-4 text-emerald-400" /> Media stays
          untouched and text contrast is protected.
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            className="text-slate-300"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            className="gap-2 bg-purple-600 text-white hover:bg-purple-500"
          >
            <Check className="h-4 w-4" /> Apply style
          </Button>
        </div>
      </div>
    </div>
  );
}

function StudioPostPreview({
  templateId,
  configuration,
  preview,
}: {
  templateId: string | null;
  configuration: PostStyleConfigurationV3 | null;
  preview?: PostStylePreviewData;
}) {
  const template = templateId ? getTemplateById(templateId) : null;
  const compiled =
    templateId && configuration
      ? compilePostAppearance(
          templateId,
          configuration.appearance,
          configuration,
        )
      : null;

  return (
    <aside className="sticky top-0 rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Draft card preview
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Exact card treatment; media remains neutral.
          </p>
        </div>
        <Badge className="border-white/10 bg-white/5 text-slate-300">
          Feed
        </Badge>
      </div>
      {compiled && templateId ? (
        <PostStyleBoundary
          postId="style-studio-preview"
          templateId={templateId}
          templateVersion={1}
          compiled={compiled}
        >
          <PostTemplateFrame templateId={templateId}>
            <div data-slot="card" className="space-y-4 p-5">
              <div
                data-post-region="header"
                className="flex items-center gap-3"
              >
                <div
                  data-slot="avatar"
                  className="grid h-11 w-11 place-items-center rounded-full border border-current font-bold opacity-90"
                >
                  {(preview?.authorName || "Your account").charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {preview?.authorName || "Your account"}
                  </p>
                  <p
                    data-post-region="metadata"
                    className="text-sm text-slate-400"
                  >
                    @{preview?.handle || "tourify"} · Just now · Public
                  </p>
                </div>
                <button
                  data-slot="button"
                  type="button"
                  aria-label="Post menu"
                  className="grid h-9 w-9 place-items-center text-lg"
                >
                  •••
                </button>
              </div>
              <p
                data-post-region="body"
                className="whitespace-pre-wrap leading-relaxed"
              >
                {preview?.content?.trim() ||
                  "Your post appears here with the same typography, spacing, and card treatment used in the live feed."}
              </p>
              {(preview?.mediaCount ?? 0) > 0 ? (
                <div
                  data-post-media
                  className="grid aspect-video place-items-center rounded-xl border border-current/20 bg-slate-800 text-xs text-slate-300"
                >
                  {preview?.mediaCount} media item
                  {preview?.mediaCount === 1 ? "" : "s"} · unchanged
                </div>
              ) : null}
              {(preview?.pollOptions?.filter(Boolean).length ?? 0) >= 2 ? (
                <div data-post-region="poll" className="space-y-2">
                  {(preview?.pollOptions ?? [])
                    .filter(Boolean)
                    .map((option) => (
                      <div
                        data-post-poll-option
                        key={option}
                        className="rounded-md border border-current/25 px-3 py-2 text-sm"
                      >
                        {option}
                      </div>
                    ))}
                </div>
              ) : null}
              <div
                data-post-region="actions"
                className="flex items-center justify-between border-t border-current/15 pt-3 text-sm"
              >
                <button data-slot="button" type="button">
                  ♡ Like
                </button>
                <button data-slot="button" type="button">
                  ◯ Comment
                </button>
                <button data-slot="button" type="button">
                  ↗ Share
                </button>
              </div>
            </div>
          </PostTemplateFrame>
        </PostStyleBoundary>
      ) : (
        <div className="rounded-xl border border-white/10 bg-slate-900 p-5 text-slate-200">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-700" />
            <div className="h-2 w-28 rounded bg-slate-600" />
          </div>
          <p className="text-sm leading-6 text-slate-300">
            {preview?.content?.trim() ||
              "The standard Tourify post design is selected."}
          </p>
        </div>
      )}
      {template ? (
        <p className="mt-3 text-center text-xs font-medium text-slate-400">
          <Star className="mr-1 inline h-3 w-3 text-purple-300" />
          {template.label}
        </p>
      ) : null}
    </aside>
  );
}
