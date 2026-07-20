'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Eye,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { CustomPublicProfileView } from '@/components/profile/custom-public-profile-view'
import type {
  CustomProfileDesignState,
  CustomProfileLayout,
  LayoutValidationError,
} from '@/lib/profile/custom-profile-layout'

interface CustomProfileDesignPanelProps {
  className?: string
}

export function CustomProfileDesignPanel({ className }: CustomProfileDesignPanelProps) {
  const [loading, setLoading] = useState(true)
  const [prompt, setPrompt] = useState('')
  const [design, setDesign] = useState<CustomProfileDesignState | null>(null)
  const [pasteValue, setPasteValue] = useState('')
  const [validating, setValidating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [copiedFix, setCopiedFix] = useState(false)
  const [errors, setErrors] = useState<LayoutValidationError[]>([])
  const [fixPrompt, setFixPrompt] = useState('')
  const [validatedLayout, setValidatedLayout] = useState<CustomProfileLayout | null>(null)
  const [previewProfile, setPreviewProfile] = useState<any>(null)
  const [portfolio, setPortfolio] = useState<any[]>([])
  const [experiences, setExperiences] = useState<any[]>([])
  const [certifications, setCertifications] = useState<any[]>([])

  useEffect(() => {
    loadDesign()

    function handleProfileImagesUpdated(event: Event) {
      const detail = (event as CustomEvent<{ avatarUrl?: string | null; coverUrl?: string | null }>).detail
      if (detail) {
        setPreviewProfile((prev: any) => {
          if (!prev) return prev
          return {
            ...prev,
            ...(detail.avatarUrl !== undefined ? { avatar_url: detail.avatarUrl } : {}),
            ...(detail.coverUrl !== undefined ? { cover_image: detail.coverUrl } : {}),
          }
        })
      }
      void loadDesign()
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === 'profile-updated') void loadDesign()
    }

    window.addEventListener('profile-images-updated', handleProfileImagesUpdated)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('profile-images-updated', handleProfileImagesUpdated)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  async function loadDesign() {
    try {
      setLoading(true)
      const response = await fetch('/api/profile/custom-design', {
        credentials: 'include',
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `Failed to load custom design (${response.status})`)
      }
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to load custom design')
      }

      setPrompt(data.prompt || '')
      setDesign(data.design)
      setPortfolio(data.portfolio || [])
      setExperiences(data.experiences || [])
      setCertifications(data.certifications || [])

      if (data.design?.draft) {
        setPasteValue(JSON.stringify(data.design.draft, null, 2))
        setValidatedLayout(data.design.draft)
      }

      if (data.profilePreview) {
        setPreviewProfile({
          id: data.profilePreview.id,
          username: data.profilePreview.username,
          account_type: 'general',
          profile_data: {
            name: data.profilePreview.full_name,
            title: data.profilePreview.title,
            company: data.profilePreview.company,
            bio: data.profilePreview.bio,
            skills: data.profilePreview.skills,
            email: data.profilePreview.email,
            phone: data.profilePreview.phone,
          },
          avatar_url: data.profilePreview.avatar_url,
          cover_image: data.profilePreview.cover_image,
          verified: false,
          bio: data.profilePreview.bio,
          location: data.profilePreview.location,
          social_links: data.profilePreview.social_links,
          stats: { followers: 0, following: 0, posts: 0, likes: 0, views: 0 },
          created_at: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error(error)
      const message =
        error instanceof TypeError
          ? 'Could not reach the server — restart the dev server and try again'
          : error instanceof Error
            ? error.message
            : 'Failed to load custom profile tools'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  async function copyText(text: string, kind: 'prompt' | 'fix') {
    try {
      await navigator.clipboard.writeText(text)
      if (kind === 'prompt') {
        setCopiedPrompt(true)
        setTimeout(() => setCopiedPrompt(false), 2000)
        toast.success('AI prompt copied — paste it into your builder')
      } else {
        setCopiedFix(true)
        setTimeout(() => setCopiedFix(false), 2000)
        toast.success('Fix prompt copied — paste it back into your AI builder')
      }
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }

  async function validateLayout() {
    try {
      setValidating(true)
      setErrors([])
      setFixPrompt('')

      const response = await fetch('/api/profile/custom-design', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate',
          layout: pasteValue,
        }),
      })
      const data = await response.json().catch(() => ({
        valid: false,
        error: 'Invalid server response',
        errors: [{ path: '(root)', message: 'Invalid server response' }],
      }))

      if (!data.valid) {
        setValidatedLayout(null)
        setErrors(data.errors || [])
        setFixPrompt(data.fixPrompt || '')
        toast.error('Layout failed validation — see fixes below')
        return
      }

      setValidatedLayout(data.layout)
      setErrors([])
      setFixPrompt('')
      if (data.profilePreview) setPreviewProfile(data.profilePreview)
      if (data.portfolio) setPortfolio(data.portfolio)
      if (data.experiences) setExperiences(data.experiences)
      if (data.certifications) setCertifications(data.certifications)
      toast.success('Layout passed validation — preview ready')
    } catch (error) {
      console.error(error)
      toast.error('Validation failed')
    } finally {
      setValidating(false)
    }
  }

  async function saveDraft() {
    try {
      setSaving(true)
      const response = await fetch('/api/profile/custom-design', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_draft',
          layout: pasteValue,
        }),
      })
      const data = await response.json().catch(() => ({
        success: false,
        valid: false,
        error: 'Invalid server response',
      }))

      if (!data.valid || !data.success) {
        setErrors(data.errors || [])
        setFixPrompt(data.fixPrompt || '')
        setValidatedLayout(null)
        toast.error(data.error || 'Could not save draft')
        return
      }

      setDesign(data.design)
      setValidatedLayout(data.layout)
      setErrors([])
      setFixPrompt('')
      toast.success('Draft saved')
    } catch (error) {
      console.error(error)
      toast.error('Failed to save draft')
    } finally {
      setSaving(false)
    }
  }

  async function publishLayout() {
    try {
      setPublishing(true)
      const response = await fetch('/api/profile/custom-design', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish',
          layout: pasteValue || validatedLayout,
        }),
      })
      const data = await response.json().catch(() => ({
        success: false,
        valid: false,
        error: 'Invalid server response',
      }))

      if (!data.valid || !data.success) {
        setErrors(data.errors || [])
        setFixPrompt(data.fixPrompt || '')
        toast.error(data.error || 'Could not publish layout')
        return
      }

      setDesign(data.design)
      setValidatedLayout(data.layout)
      setErrors([])
      setFixPrompt('')
      toast.success('Custom public profile published')
    } catch (error) {
      console.error(error)
      toast.error('Failed to publish')
    } finally {
      setPublishing(false)
    }
  }

  async function revertLayout() {
    try {
      setSaving(true)
      const response = await fetch('/api/profile/custom-design', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revert' }),
      })
      const data = await response.json().catch(() => ({
        success: false,
        error: 'Invalid server response',
      }))
      if (!data.success) throw new Error(data.error || 'Revert failed')
      setDesign(data.design)
      toast.success('Using default public profile again')
    } catch (error) {
      console.error(error)
      toast.error('Failed to revert')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-white/70">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading custom profile tools…
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h3 className="text-white font-semibold text-xl flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Custom Public Profile
            </h3>
            <p className="text-white/70 text-sm mt-1">
              Copy an AI prompt with your profile data, paste the JSON layout back, validate, preview, then approve.
            </p>
          </div>
          {design ? (
            <Badge
              className={
                design.status === 'published'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : design.status === 'draft'
                    ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                    : 'bg-white/10 text-white/70 border-white/20'
              }
            >
              {design.status === 'published'
                ? 'Published'
                : design.status === 'draft'
                  ? 'Draft saved'
                  : 'Default profile'}
            </Badge>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-white font-medium">1. Copy AI prompt</div>
              <p className="text-xs text-white/60">
                Paste into Cursor, ChatGPT, Claude, or v0, then add vibe notes (e.g. “early 2000s MySpace maximalist”).
                The prompt now steers a finished themed page — moods, patterns, frames, and section variants.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => copyText(prompt, 'prompt')}
              className="bg-white text-black hover:bg-white/90 rounded-xl"
            >
              {copiedPrompt ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <ClipboardCopy className="h-4 w-4 mr-2" />
                  Copy AI Prompt
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div>
            <div className="text-white font-medium">2. Paste layout JSON</div>
            <p className="text-xs text-white/60">
              Paste the JSON object your AI returned (not HTML or JSX).
            </p>
          </div>
          <Textarea
            value={pasteValue}
            onChange={(event) => {
              setPasteValue(event.target.value)
              setValidatedLayout(null)
              setErrors([])
              setFixPrompt('')
            }}
            placeholder='{ "version": 1, "theme": { ... }, "sections": [ ... ] }'
            className="min-h-[220px] font-mono text-xs bg-black/30 border-white/15 text-white placeholder:text-white/30"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={validateLayout}
              disabled={validating || !pasteValue.trim()}
              className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl"
            >
              {validating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Validate
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={saveDraft}
              disabled={saving || !pasteValue.trim()}
              className="border-white/20 text-white hover:bg-white/10 rounded-xl"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save draft
            </Button>
            <Button
              type="button"
              onClick={publishLayout}
              disabled={publishing || (!pasteValue.trim() && !validatedLayout)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl"
            >
              {publishing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Approve & publish
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={revertLayout}
              disabled={saving || design?.status === 'none'}
              className="border-white/20 text-white hover:bg-white/10 rounded-xl"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Use default profile
            </Button>
          </div>
        </div>

        {errors.length > 0 ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 space-y-3">
            <div className="flex items-start gap-2 text-rose-200">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <div className="font-medium">Layout failed validation</div>
                <p className="text-sm text-rose-100/80">
                  Copy the fix prompt below and paste it back into the model that created this layout.
                </p>
              </div>
            </div>
            <ul className="space-y-1.5 text-sm text-rose-100/90">
              {errors.map((error) => (
                <li key={`${error.path}-${error.message}`}>
                  <span className="font-mono text-rose-200/80">[{error.path}]</span> {error.message}
                </li>
              ))}
            </ul>
            {fixPrompt ? (
              <Button
                type="button"
                onClick={() => copyText(fixPrompt, 'fix')}
                className="bg-rose-500 hover:bg-rose-400 text-white rounded-xl"
              >
                {copiedFix ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Fix prompt copied
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="h-4 w-4 mr-2" />
                    Copy fix prompt
                  </>
                )}
              </Button>
            ) : null}
          </div>
        ) : null}

        {validatedLayout && previewProfile && errors.length === 0 ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-200">
              <CheckCircle2 className="h-5 w-5" />
              <div className="font-medium">Preview — layout passed</div>
            </div>
            <CustomPublicProfileView
              layout={validatedLayout}
              profile={previewProfile}
              portfolio={portfolio}
              experiences={experiences}
              certifications={certifications}
              isOwnProfile
              isPreview
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
