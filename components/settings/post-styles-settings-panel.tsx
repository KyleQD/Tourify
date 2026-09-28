"use client"

import { useEffect, useState } from "react"
import { Archive, Check, Copy, Edit3, Loader2, MoreHorizontal, Palette, Plus, Star } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PremiereControlRenderer } from "@/components/posts/appearance/premiere-control-renderer"
import { PremiereStyleThumbnail, TemplateGallery } from "@/components/posts/appearance/template-gallery"
import type { PostStyleConfigurationV3 } from "@/lib/appearance/contracts"
import { sanitizePostStyleConfiguration } from "@/lib/appearance/sanitize"
import { getDefaultPostStyleConfiguration, getTemplateById } from "@/lib/appearance/template-registry"
import type { StyleProfileRow } from "@/lib/post-style-profiles/profiles.service"
import { useActingContext } from "@/hooks/use-acting-context"

interface EditorState {
  mode: "create" | "edit"
  profileId?: string
  templateId: string | null
  configuration: PostStyleConfigurationV3 | null
  name: string
  isSaving: boolean
}

export function PostStylesSettingsPanel() {
  const { actingContextKey, actingHeaders } = useActingContext()
  const [profiles, setProfiles] = useState<StyleProfileRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [flagEnabled, setFlagEnabled] = useState(false)
  const [editor, setEditor] = useState<EditorState | null>(null)

  async function loadData() {
    setIsLoading(true)
    try {
      const response = await fetch("/api/post-styles/bootstrap", {
        credentials: "include",
        headers: actingHeaders,
      })
      if (!response.ok) return
      const data = await response.json() as {
        profiles?: StyleProfileRow[]
        flags?: { post_styles_editor?: boolean }
      }
      setProfiles(data.profiles ?? [])
      setFlagEnabled(Boolean(data.flags?.post_styles_editor))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [actingContextKey])

  function openCreate() {
    setEditor({ mode: "create", templateId: null, configuration: null, name: "", isSaving: false })
  }

  function openEdit(profile: StyleProfileRow) {
    const template = getTemplateById(profile.template_id)
    if (template?.lifecycle !== "active" || !template.premiere) return
    setEditor({
      mode: "edit",
      profileId: profile.id,
      templateId: profile.template_id,
      configuration: sanitizePostStyleConfiguration(profile.configuration, profile.template_id),
      name: profile.name,
      isSaving: false,
    })
  }

  async function handleSave() {
    if (!editor?.templateId || !editor.configuration || !editor.name.trim()) return
    setEditor((current) => current ? { ...current, isSaving: true } : null)
    try {
      const endpoint = editor.mode === "edit" && editor.profileId
        ? `/api/post-style-profiles/${editor.profileId}`
        : "/api/post-style-profiles"
      const response = await fetch(endpoint, {
        method: editor.mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...actingHeaders },
        credentials: "include",
        body: JSON.stringify({
          name: editor.name.trim(),
          templateId: editor.templateId,
          templateVersion: 1,
          schemaVersion: 3,
          configuration: editor.configuration,
          setAsDefault: editor.mode === "create" && profiles.length === 0,
        }),
      })
      if (!response.ok) throw new Error()
      toast.success(editor.mode === "create" ? "Style created" : "Style updated")
      setEditor(null)
      await loadData()
    } catch {
      toast.error("Failed to save style")
      setEditor((current) => current ? { ...current, isSaving: false } : null)
    }
  }

  async function handleSetDefault(profile: StyleProfileRow) {
    if (getTemplateById(profile.template_id)?.lifecycle !== "active") return
    try {
      const response = await fetch(`/api/post-style-profiles/${profile.id}/default`, { method: "POST", credentials: "include", headers: actingHeaders })
      if (!response.ok) throw new Error()
      toast.success("Default style updated")
      await loadData()
    } catch {
      toast.error("Failed to set default")
    }
  }

  async function handleArchive(profileId: string) {
    try {
      const response = await fetch(`/api/post-style-profiles/${profileId}`, { method: "DELETE", credentials: "include", headers: actingHeaders })
      if (!response.ok) throw new Error()
      toast.success("Style archived")
      await loadData()
    } catch {
      toast.error("Failed to archive style")
    }
  }

  async function handleDuplicate(profile: StyleProfileRow) {
    if (getTemplateById(profile.template_id)?.lifecycle !== "active") return
    try {
      const response = await fetch("/api/post-style-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...actingHeaders },
        credentials: "include",
        body: JSON.stringify({
          name: `${profile.name} (copy)`,
          templateId: profile.template_id,
          schemaVersion: 3,
          configuration: profile.configuration,
          setAsDefault: false,
        }),
      })
      if (!response.ok) throw new Error()
      toast.success("Style duplicated")
      await loadData()
    } catch {
      toast.error("Failed to duplicate style")
    }
  }

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-purple-400" /></div>
  if (!flagEnabled) return <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center"><Palette className="mx-auto mb-3 h-10 w-10 text-gray-500" /><p className="text-sm text-gray-400">Post styles are coming soon.</p></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Post Styles</h3>
          <p className="mt-0.5 text-sm text-gray-400">Build reusable looks from eight post-native premiere styles.</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-purple-600 text-white hover:bg-purple-700"><Plus className="h-4 w-4" />New Style</Button>
      </div>

      {editor ? (
        <Card className="border-white/10 bg-white/5">
          <CardHeader className="pb-3"><CardTitle className="text-base text-white">{editor.mode === "create" ? "New post style" : `Edit ${editor.name}`}</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <TemplateGallery
              selectedId={editor.templateId}
              onSelect={(templateId) => {
                const configuration = getDefaultPostStyleConfiguration(templateId)
                setEditor((current) => current ? {
                  ...current,
                  templateId,
                  configuration,
                  name: current.name || `My ${getTemplateById(templateId)?.label ?? "post"} style`,
                } : null)
              }}
            />
            {editor.templateId && editor.configuration ? (
              <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <PremiereControlRenderer
                    templateId={editor.templateId}
                    configuration={editor.configuration}
                    onChange={(configuration) => setEditor((current) => current ? { ...current, configuration } : null)}
                  />
                </div>
                <div className="sticky top-4 space-y-4 rounded-xl border border-white/10 bg-black/25 p-3">
                  {getTemplateById(editor.templateId) ? <PremiereStyleThumbnail template={getTemplateById(editor.templateId)!} configuration={editor.configuration} className="h-36" /> : null}
                  <div className="space-y-2"><Label className="text-gray-300">Style name</Label><Input value={editor.name} onChange={(event) => setEditor((current) => current ? { ...current, name: event.target.value } : null)} maxLength={100} className="border-white/20 bg-white/10 text-white" /></div>
                </div>
              </div>
            ) : null}
            <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
              <Button variant="ghost" onClick={() => setEditor(null)} className="text-gray-400">Cancel</Button>
              <Button onClick={() => void handleSave()} disabled={!editor.templateId || !editor.configuration || !editor.name.trim() || editor.isSaving} className="bg-purple-600 text-white hover:bg-purple-700">
                {editor.isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}{editor.mode === "create" ? "Save Style" : "Update Style"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {profiles.length === 0 && !editor ? (
        <div className="rounded-lg border border-dashed border-white/20 p-8 text-center"><Palette className="mx-auto mb-3 h-8 w-8 text-gray-500" /><p className="text-sm text-gray-400">No saved styles yet. Pick a premiere style and make it unmistakably yours.</p></div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {profiles.map((profile) => {
            const template = getTemplateById(profile.template_id)
            const isLegacy = template?.lifecycle !== "active" || !template.premiere
            return (
              <div key={profile.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                {template?.premiere ? <PremiereStyleThumbnail template={template} className="h-16 w-24 shrink-0" /> : <div className="h-16 w-24 shrink-0 rounded-lg border border-white/10 bg-slate-800" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="truncate text-sm font-medium text-white">{profile.name}</span>{profile.is_default && !isLegacy ? <Badge className="border-purple-500/30 bg-purple-500/20 text-xs text-purple-300">Default</Badge> : null}{isLegacy ? <Badge className="border-amber-500/30 bg-amber-500/15 text-xs text-amber-200">Legacy</Badge> : null}</div>
                  <p className="mt-0.5 truncate text-xs text-gray-400">{isLegacy ? "Archived catalog style · existing posts remain unchanged" : template?.label}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" aria-label={`Actions for ${profile.name}`} className="text-gray-400"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!isLegacy ? <><DropdownMenuItem onClick={() => openEdit(profile)}><Edit3 className="mr-2 h-4 w-4" />Edit</DropdownMenuItem><DropdownMenuItem onClick={() => void handleSetDefault(profile)} disabled={profile.is_default}><Star className="mr-2 h-4 w-4" />Set as default</DropdownMenuItem><DropdownMenuItem onClick={() => void handleDuplicate(profile)}><Copy className="mr-2 h-4 w-4" />Duplicate</DropdownMenuItem></> : null}
                    <DropdownMenuItem onClick={() => void handleArchive(profile.id)} className="text-amber-600"><Archive className="mr-2 h-4 w-4" />Archive</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
