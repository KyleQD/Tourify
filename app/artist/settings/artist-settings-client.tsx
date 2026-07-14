'use client'

import { AccountScopedSettings } from '@/components/settings/account-scoped-settings'
import { ArtistOrgInvitesPanel } from '@/components/artist/artist-org-invites-panel'

export function ArtistSettingsClient() {
  return (
    <div className="space-y-6">
      <ArtistOrgInvitesPanel />
      <AccountScopedSettings />
    </div>
  )
}
