'use client'

import { X } from 'lucide-react'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { normalizeAccountType, ACCOUNT_TYPE_LABELS } from '@/lib/accounts/account-types'

/**
 * A sticky top banner that appears whenever the user is acting as a non-general entity.
 * Reminds them which account is active and offers a quick escape back to Personal.
 *
 * Mount this inside the root layout (or any layout that covers /artist, /venue, /admin).
 */
export function ActingContextBanner() {
  const { currentAccount, switchAccountAndNavigate, accounts, isLoading } = useMultiAccount()

  if (isLoading || !currentAccount) return null

  const norm = normalizeAccountType(currentAccount.account_type)

  // Never show the banner when on the general (personal) account
  if (norm === 'general') return null

  const label = ACCOUNT_TYPE_LABELS[norm] ?? norm
  const entityName = getEntityName(currentAccount)

  const generalAccount = accounts.find(acc => acc.account_type === 'general')

  const handleExitToPersonal = () => {
    if (generalAccount) {
      void switchAccountAndNavigate(generalAccount.profile_id, 'general')
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[9000] flex items-center justify-between gap-2 bg-purple-900/95 border-b border-purple-700 px-4 py-1.5 text-sm text-purple-100 backdrop-blur-sm"
    >
      <span className="truncate">
        Acting as{' '}
        <strong className="font-semibold text-white">
          {entityName}
        </strong>{' '}
        <span className="opacity-70">({label})</span>
      </span>

      {generalAccount && (
        <button
          type="button"
          onClick={handleExitToPersonal}
          className="ml-auto flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-xs font-medium hover:bg-purple-700/60 transition-colors"
          aria-label="Switch back to personal account"
        >
          <X className="h-3 w-3" />
          Exit to Personal
        </button>
      )}
    </div>
  )
}

function getEntityName(account: { account_type: string; profile_data?: any }): string {
  const pd = account.profile_data ?? {}
  const norm = normalizeAccountType(account.account_type)
  if (norm === 'artist' || norm === 'service') return pd.artist_name || 'Artist'
  if (norm === 'venue') return pd.venue_name || 'Venue'
  if (norm === 'organization') return pd.organization_name || pd.admin_name || 'Organization'
  return pd.full_name || 'Account'
}
