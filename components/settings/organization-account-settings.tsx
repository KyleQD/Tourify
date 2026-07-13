"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { ExternalLink, Globe, Loader2, Save, Users } from 'lucide-react'
import { getOrganizationPublicProfilePath } from '@/lib/utils/public-profile-routes'
import {
  ORGANIZATION_SUBTYPES,
  ORGANIZATION_SUBTYPE_LABELS,
  normalizeOrganizationSubtype,
  organizationSubtypeLabel,
  type OrganizationSubtype,
} from '@/lib/organizations/org-subtypes'

interface OrganizationAccountSettingsProps {
  activeTab: string
}

interface OrgProfileForm {
  organization_name: string
  description: string
  url_slug: string
  subtype: OrganizationSubtype
  is_public: boolean
  website: string
}

export function OrganizationAccountSettings({ activeTab }: OrganizationAccountSettingsProps) {
  const { currentAccount, refreshAccounts } = useMultiAccount()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState<OrgProfileForm>({
    organization_name: '',
    description: '',
    url_slug: '',
    subtype: 'generic',
    is_public: true,
    website: '',
  })

  const profileId = currentAccount?.profile_id

  useEffect(() => {
    if (!profileId || activeTab !== 'profile') return

    let cancelled = false
    async function load() {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('organizer_accounts')
        .select('organization_name, description, url_slug, subtype, organization_type, is_public, social_links, contact_info')
        .eq('id', profileId)
        .maybeSingle()

      if (cancelled) return
      if (error || !data) {
        setIsLoading(false)
        return
      }

      const social = (data.social_links || {}) as Record<string, string>
      const contact = (data.contact_info || {}) as Record<string, string>
      setForm({
        organization_name: data.organization_name || '',
        description: data.description || '',
        url_slug: data.url_slug || '',
        subtype: normalizeOrganizationSubtype(data.subtype || data.organization_type),
        is_public: data.is_public !== false,
        website: social.website || contact.website || '',
      })
      setIsLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [profileId, activeTab])

  async function handleSave() {
    if (!profileId) return
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('organizer_accounts')
        .update({
          organization_name: form.organization_name,
          description: form.description || null,
          url_slug: form.url_slug || null,
          subtype: form.subtype,
          organization_type: form.subtype,
          is_public: form.is_public,
          social_links: { website: form.website || undefined },
        })
        .eq('id', profileId)

      if (error) throw error
      await refreshAccounts()
      toast({ title: 'Organization profile updated' })
    } catch (err) {
      toast({
        title: 'Failed to save',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (activeTab === 'team') {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team & grants
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-white/70">
          <p className="text-sm">
            Invite tour managers and manage artist roster from the organization team page.
          </p>
          <Button asChild>
            <Link href="/admin/dashboard/organization">Open team panel</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (activeTab === 'public') {
    const publicPath = getOrganizationPublicProfilePath(form.url_slug)
    return (
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Public visibility
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-white font-medium">Public profile</p>
              <p className="text-sm text-white/60">When enabled, your organization page is discoverable.</p>
            </div>
            <Switch
              checked={form.is_public}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_public: checked }))}
            />
          </div>
          {publicPath && (
            <Button asChild variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
              <Link href={publicPath} target="_blank" rel="noreferrer">
                View public page
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save visibility
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (activeTab !== 'profile') {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6 text-white/60 text-sm">
          Use the tabs above to manage organization settings.
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    )
  }

  const publicPath = getOrganizationPublicProfilePath(form.url_slug)

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-white">Organization profile</CardTitle>
          <p className="text-sm text-white/60 mt-1">
            {organizationSubtypeLabel(form.subtype)}
            {form.url_slug ? ` · @${form.url_slug}` : ''}
          </p>
        </div>
        {publicPath && (
          <Button asChild size="sm" variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
            <Link href={publicPath}>
              Public page
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-white">Organization name</Label>
          <Input
            value={form.organization_name}
            onChange={(e) => setForm((prev) => ({ ...prev, organization_name: e.target.value }))}
            className="bg-white/10 border-white/20 text-white"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-white">Subtype</Label>
          <select
            value={form.subtype}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, subtype: e.target.value as OrganizationSubtype }))
            }
            className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white"
          >
            {ORGANIZATION_SUBTYPES.map((subtype) => (
              <option key={subtype} value={subtype} className="bg-slate-900">
                {ORGANIZATION_SUBTYPE_LABELS[subtype]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label className="text-white">Public URL slug</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/50 shrink-0">/organization/</span>
            <Input
              value={form.url_slug}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  url_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40),
                }))
              }
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-white">Description</Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="bg-white/10 border-white/20 text-white min-h-[100px]"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-white">Website</Label>
          <Input
            value={form.website}
            onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
            className="bg-white/10 border-white/20 text-white"
            placeholder="https://"
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-200 border-amber-500/30">
            {organizationSubtypeLabel(form.subtype)}
          </Badge>
        </div>
        <Button onClick={() => void handleSave()} disabled={isSaving || !form.organization_name.trim()}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save changes
        </Button>
      </CardContent>
    </Card>
  )
}
