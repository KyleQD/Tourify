'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useArtist } from '@/contexts/artist-context'
import { socialIntegrationsService } from '@/lib/services/social-integrations.service'
import {
  CANONICAL_SOCIAL_FIELDS,
  type CanonicalSocialField,
  type CanonicalSocialLinks,
  emptyCanonicalSocialLinks,
  mergeSocialLinksForStorage,
  validateSocialField,
} from '@/lib/artist/profile-social-validation'
import { ExternalLink, Globe, Link2, Save } from 'lucide-react'
import { toast } from 'sonner'

const FIELD_META: Record<CanonicalSocialField, { label: string; placeholder: string }> = {
  website: { label: 'Website', placeholder: 'https://yoursite.com' },
  instagram: { label: 'Instagram', placeholder: '@handle or URL' },
  twitter: { label: 'X / Twitter', placeholder: '@handle or URL' },
  youtube: { label: 'YouTube', placeholder: 'https://youtube.com/@channel' },
  tiktok: { label: 'TikTok', placeholder: '@handle or URL' },
  facebook: { label: 'Facebook', placeholder: '@page or URL' },
  spotify: { label: 'Spotify', placeholder: 'https://open.spotify.com/artist/...' },
  apple_music: { label: 'Apple Music', placeholder: 'https://music.apple.com/...' },
  soundcloud: { label: 'SoundCloud', placeholder: 'https://soundcloud.com/...' },
}

const OAUTH_MIRROR_PLATFORMS = new Set(['instagram', 'twitter', 'youtube', 'tiktok', 'facebook'])

export function ContentSocialLinksPanel() {
  const { profile, updateSocialLinks } = useArtist()
  const [form, setForm] = useState<CanonicalSocialLinks>(emptyCanonicalSocialLinks())
  const [isSaving, setIsSaving] = useState(false)
  const [mirrorHandles, setMirrorHandles] = useState(true)

  useEffect(() => {
    const links = (profile?.social_links || {}) as Record<string, string>
    setForm({
      ...emptyCanonicalSocialLinks(),
      website: links.website || '',
      instagram: links.instagram || '',
      twitter: links.twitter || '',
      youtube: links.youtube || '',
      tiktok: links.tiktok || '',
      facebook: links.facebook || '',
      spotify: links.spotify || '',
      apple_music: links.apple_music || '',
      soundcloud: links.soundcloud || '',
    })
  }, [profile?.id, profile?.social_links])

  const filledCount = useMemo(
    () => CANONICAL_SOCIAL_FIELDS.filter(field => Boolean(form[field]?.trim())).length,
    [form]
  )

  async function handleSave() {
    const errors: string[] = []
    for (const field of CANONICAL_SOCIAL_FIELDS) {
      const err = validateSocialField(field, form[field])
      if (err) errors.push(err)
    }
    if (errors.length > 0) {
      toast.error(errors[0])
      return
    }

    setIsSaving(true)
    try {
      const merged = mergeSocialLinksForStorage(
        (profile?.social_links || {}) as Record<string, string>,
        form
      )
      const result = await updateSocialLinks(merged)

      if (!result.success) {
        toast.error(result.errors?.[0] || 'Failed to save social links')
        return
      }

      if (mirrorHandles) {
        for (const field of CANONICAL_SOCIAL_FIELDS) {
          if (!OAUTH_MIRROR_PLATFORMS.has(field)) continue
          const handle = merged[field]?.trim()
          if (!handle) continue
          try {
            await socialIntegrationsService.connect({
              platform: field as 'instagram' | 'twitter' | 'youtube' | 'tiktok' | 'facebook',
              account_handle: handle.replace(/^@/, ''),
            })
          } catch {
            // Non-blocking: public links still saved
          }
        }
      }

      toast.success('Public social links saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save social links')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-slate-200 flex items-center gap-2">
              <Globe className="h-5 w-5 text-purple-400" />
              Public Social Links
            </CardTitle>
            <CardDescription className="text-slate-400">
              Shown on your public profile and press kit. Connect OAuth below for analytics sync.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="bg-slate-800 text-slate-300">
            {filledCount}/{CANONICAL_SOCIAL_FIELDS.length} filled
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            Public profile
          </Badge>
          <Badge className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
            EPK / Press Kit
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CANONICAL_SOCIAL_FIELDS.map(field => (
            <div key={field} className="space-y-2">
              <Label htmlFor={`social-${field}`}>{FIELD_META[field].label}</Label>
              <Input
                id={`social-${field}`}
                value={form[field]}
                placeholder={FIELD_META[field].placeholder}
                onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                className="rounded-xl bg-slate-900/60 border-slate-700/60 text-slate-200"
              />
            </div>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-400">
          <input
            type="checkbox"
            checked={mirrorHandles}
            onChange={e => setMirrorHandles(e.target.checked)}
            className="rounded border-slate-600"
          />
          Also update OAuth account handles when they already exist (does not start OAuth)
        </label>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void handleSave()} disabled={isSaving} className="rounded-xl">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save public links'}
          </Button>
          <Button variant="outline" className="border-slate-700 rounded-xl" asChild>
            <a href="/artist/epk">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Press Kit
            </a>
          </Button>
          <Button variant="outline" className="border-slate-700 rounded-xl" asChild>
            <a href="/artist/profile">
              <Link2 className="h-4 w-4 mr-2" />
              Profile editor
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
