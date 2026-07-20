'use client'

import { ChevronDown } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { ACCOUNT_TYPE_LABELS, normalizeAccountType } from '@/lib/accounts/account-types'
import type { UserAccount } from '@/lib/services/account-management.service'
import { cn } from '@/lib/utils'

interface InboxAccountSelectorProps {
  className?: string
  onInboxChange?: () => void
}

function getAccountDisplayName(account: UserAccount): string {
  const pd = account.profile_data ?? {}
  return (
    pd.display_name
    || pd.organization_name
    || pd.artist_name
    || pd.venue_name
    || pd.full_name
    || pd.username
    || 'Account'
  )
}

export function InboxAccountSelector({ className, onInboxChange }: InboxAccountSelectorProps) {
  const { accounts, currentAccount, switchAccount, isAccountsReady } = useMultiAccount()

  if (!isAccountsReady || !currentAccount)
    return null

  const label = ACCOUNT_TYPE_LABELS[normalizeAccountType(currentAccount.account_type)] || 'Account'
  const currentName = getAccountDisplayName(currentAccount)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-between border-slate-600 bg-slate-800/60 text-left text-white hover:bg-slate-800',
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={currentAccount.profile_data?.avatar_url || undefined} alt="" />
              <AvatarFallback className="bg-slate-700 text-[10px]">
                {currentName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 truncate">
              <span className="block truncate text-sm font-medium">{currentName}</span>
              <span className="block truncate text-[11px] text-slate-400">{label} inbox</span>
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[240px]">
        <DropdownMenuLabel>View inbox as</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {accounts.map((account) => {
          const isActive =
            account.profile_id === currentAccount.profile_id
            && normalizeAccountType(account.account_type) === normalizeAccountType(currentAccount.account_type)
          const accountLabel = ACCOUNT_TYPE_LABELS[normalizeAccountType(account.account_type)] || account.account_type
          const name = getAccountDisplayName(account)
          return (
            <DropdownMenuItem
              key={`${account.account_type}-${account.profile_id}`}
              disabled={isActive}
              onClick={async () => {
                if (isActive) return
                await switchAccount(account.profile_id, account.account_type)
                onInboxChange?.()
              }}
              className="gap-2"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={account.profile_data?.avatar_url || undefined} alt="" />
                <AvatarFallback className="text-[10px]">{name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{accountLabel}</span>
              </span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
