'use client'

import React, { useState } from 'react'
import { ChevronDown, Plus, User, Music, Building, Shield, Crown, Loader2, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useMultiAccount, useAccountSwitching } from '@/hooks/use-multi-account'
import { useRouter } from 'next/navigation'
import type { ProfileType } from '@/lib/accounts/account-types'
import { normalizeAccountType } from '@/lib/accounts/account-types'

const accountTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  general:      User,
  artist:       Music,
  service:      Briefcase,
  venue:        Building,
  organization: Shield,
  admin:        Shield,   // legacy alias
  staff:        Briefcase, // deprecated
}

const accountTypeColors: Record<string, string> = {
  general:      'bg-blue-500',
  artist:       'bg-purple-500',
  service:      'bg-pink-500',
  venue:        'bg-green-500',
  organization: 'bg-red-500',
  admin:        'bg-red-500',   // legacy alias
  staff:        'bg-indigo-500', // deprecated
}

const accountTypeLabels: Record<string, string> = {
  general:      'Personal',
  artist:       'Artist',
  service:      'Service Provider',
  venue:        'Venue',
  organization: 'Organization',
  admin:        'Organization', // legacy alias
  staff:        'Staff',        // deprecated
}

function getAccountTypeLabel(type: string): string {
  return accountTypeLabels[normalizeAccountType(type)] ?? type
}
function getAccountTypeIcon(type: string): React.ComponentType<{ className?: string }> {
  return accountTypeIcons[normalizeAccountType(type)] ?? User
}
function getAccountTypeColor(type: string): string {
  return accountTypeColors[normalizeAccountType(type)] ?? 'bg-slate-500'
}

function getAccountDisplayName(account: { account_type: string; profile_data?: any }): string {
  const pd = account.profile_data ?? {}
  const norm = normalizeAccountType(account.account_type)
  if (norm === 'artist' || norm === 'service') return pd.artist_name || 'Artist Account'
  if (norm === 'venue') return pd.venue_name || 'Venue Account'
  if (norm === 'organization') return pd.organization_name || pd.admin_name || 'Organization'
  return pd.full_name || 'Personal Account'
}

interface CompactAccountSwitcherProps {
  onAccountSwitch?: (profileId: string, accountType: ProfileType) => Promise<void>
  className?: string
}

export function CompactAccountSwitcher({ onAccountSwitch, className = '' }: CompactAccountSwitcherProps) {
  const router = useRouter()
  const { currentAccount, userAccounts, refreshAccounts } = useMultiAccount()
  const { switchAccountAndNavigate, isLoading } = useAccountSwitching()
  const [isSwitching, setIsSwitching] = useState(false)

  const handleAccountSwitch = async (profileId: string, accountType: ProfileType) => {
    setIsSwitching(true)

    try {
      if (onAccountSwitch) {
        await onAccountSwitch(profileId, accountType)
      } else {
        await switchAccountAndNavigate(profileId, accountType)
      }
    } catch (error) {
      console.error('Failed to switch account:', error)
      const { navigateToAccountDashboard } = await import('@/lib/navigation/navigate-to-account-dashboard')
      navigateToAccountDashboard(accountType)
    } finally {
      setIsSwitching(false)
    }
  }

  const handleCreateAccount = (type: 'artist' | 'venue' | 'organization' | 'admin') => {
    const queryType = type === 'admin' ? 'organization' : type
    router.push(`/create?type=${queryType}`)
  }

  if (!currentAccount) {
    return null
  }

  const IconComponent = getAccountTypeIcon(currentAccount.account_type)
  const accountColor = getAccountTypeColor(currentAccount.account_type)
  const displayName = getAccountDisplayName(currentAccount)

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="relative h-10 px-3 bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 transition-all duration-300 rounded-full"
            disabled={isLoading || isSwitching}
          >
            <div className="flex items-center space-x-2 min-w-0 max-w-full">
              <div className="relative shrink-0">
                <Avatar className="h-6 w-6 border border-slate-600">
                  <AvatarImage src={currentAccount.profile_data?.avatar_url} />
                  <AvatarFallback className={`${accountColor} text-white text-xs`}>
                    {(isLoading || isSwitching) ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <IconComponent className="h-3 w-3" />
                    )}
                  </AvatarFallback>
                </Avatar>
                {(currentAccount.account_type === 'admin' || currentAccount.account_type === 'organization') && (
                  <Crown className="absolute -top-1 -right-1 h-2 w-2 text-yellow-400" />
                )}
              </div>
              
              <span
                className="text-sm font-medium text-white truncate min-w-0 max-w-[7rem] sm:max-w-[11rem] md:max-w-[14rem]"
                title={displayName}
              >
                {displayName}
              </span>
              
              <Badge 
                variant="secondary" 
                className={`${accountColor} text-white text-xs px-1.5 py-0.5`}
              >
                {getAccountTypeLabel(currentAccount.account_type)}
              </Badge>
              
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          className="w-72 p-2 bg-slate-900 border-slate-700" 
          align="end"
        >
          <DropdownMenuLabel className="text-slate-200 px-2 py-2">
            Switch Account
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-slate-700" />
          
          <DropdownMenuGroup>
            {userAccounts.filter(acc => acc.account_type !== 'staff').map((account) => {
              const Icon = getAccountTypeIcon(account.account_type)
              const isActive = account.profile_id === currentAccount.profile_id && 
                             account.account_type === currentAccount.account_type
              
              return (
                <DropdownMenuItem
                  key={`${account.profile_id}-${account.account_type}`}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
                    isActive 
                      ? 'bg-purple-500/20 border border-purple-500/30' 
                      : 'hover:bg-slate-800 border border-transparent'
                  }`}
                  onSelect={event => {
                    event.preventDefault()
                    if (!isActive && !isSwitching) {
                      void handleAccountSwitch(account.profile_id, account.account_type)
                    }
                  }}
                  disabled={isActive || isSwitching}
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8 border border-slate-600">
                      <AvatarImage src={account.profile_data?.avatar_url} />
                      <AvatarFallback className={`${getAccountTypeColor(account.account_type)} text-white`}>
                        {isSwitching && isActive ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {(account.account_type === 'admin' || account.account_type === 'organization') && (
                      <Crown className="absolute -top-1 -right-1 h-2 w-2 text-yellow-400" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">
                      {getAccountDisplayName(account)}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge 
                        variant="secondary" 
                        className={`${getAccountTypeColor(account.account_type)} text-white text-xs`}
                      >
                        {getAccountTypeLabel(account.account_type)}
                      </Badge>
                    </div>
                  </div>
                  
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                  )}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator className="bg-slate-700 my-2" />
          
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-slate-400 px-2 py-1 text-xs uppercase tracking-wide">
              Create New Account
            </DropdownMenuLabel>
            
            <DropdownMenuItem
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-800 cursor-pointer"
              onClick={() => handleCreateAccount('artist')}
              disabled={isSwitching}
            >
              <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Plus className="h-3 w-3 text-purple-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Create Artist Account</div>
                <div className="text-xs text-slate-400">Showcase your music</div>
              </div>
            </DropdownMenuItem>
            
            <DropdownMenuItem
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-800 cursor-pointer"
              onClick={() => handleCreateAccount('venue')}
              disabled={isSwitching}
            >
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                <Plus className="h-3 w-3 text-green-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Create Venue Account</div>
                <div className="text-xs text-slate-400">List your space</div>
              </div>
            </DropdownMenuItem>
            
            <DropdownMenuItem
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-800 cursor-pointer"
              onClick={() => handleCreateAccount('organization')}
              disabled={isSwitching}
            >
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Plus className="h-3 w-3 text-amber-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Create Band / Organization</div>
                <div className="text-xs text-slate-400">Manage roster or events</div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
