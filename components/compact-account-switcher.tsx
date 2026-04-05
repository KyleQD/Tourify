'use client'

import React, { useState } from 'react'
import { ChevronDown, Plus, Settings, User, Music, Building, Shield, Crown, Loader2, Briefcase } from 'lucide-react'
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
import { ProfileType } from '@/lib/services/account-management.service'
import { getDashboardPathForAccountType } from '@/lib/navigation/account-dashboard-routes'

const accountTypeIcons = {
  general: User,
  artist: Music,
  venue: Building,
  admin: Shield,
  staff: Briefcase
}

const accountTypeColors = {
  general: 'bg-blue-500',
  artist: 'bg-purple-500',
  venue: 'bg-green-500',
  admin: 'bg-red-500',
  staff: 'bg-indigo-500'
}

const accountTypeLabels = {
  general: 'Personal',
  artist: 'Artist',
  venue: 'Venue',
  admin: 'Organizer',
  staff: 'Staff'
}

interface CompactAccountSwitcherProps {
  onAccountSwitch?: (profileId: string, accountType: ProfileType) => Promise<void>
  className?: string
}

export function CompactAccountSwitcher({ onAccountSwitch, className = '' }: CompactAccountSwitcherProps) {
  const router = useRouter()
  const { currentAccount, userAccounts, refreshAccounts } = useMultiAccount()
  const { switchAccount, isLoading } = useAccountSwitching()
  const [isSwitching, setIsSwitching] = useState(false)

  const handleAccountSwitch = async (profileId: string, accountType: ProfileType) => {
    setIsSwitching(true)
    
    try {
      if (onAccountSwitch) {
        await onAccountSwitch(profileId, accountType)
      } else {
        await switchAccount(profileId, accountType)

        const targetRoute = getDashboardPathForAccountType(accountType)

        await router.prefetch(targetRoute)
        await new Promise(resolve => setTimeout(resolve, 100))
        router.replace(targetRoute)
      }
    } catch (error) {
      console.error('Failed to switch account:', error)
    } finally {
      setIsSwitching(false)
    }
  }

  const handleCreateAccount = (type: 'artist' | 'venue' | 'admin') => {
    router.push(`/create?type=${type}`)
  }

  if (!currentAccount) {
    return null
  }

  const IconComponent = accountTypeIcons[currentAccount.account_type]
  const accountColor = accountTypeColors[currentAccount.account_type]

  // Get display name for current account
  const getDisplayName = () => {
    switch (currentAccount.account_type) {
      case 'artist':
        return currentAccount.profile_data?.artist_name || 'Artist'
      case 'venue':
        return currentAccount.profile_data?.venue_name || 'Venue'
      case 'admin':
        return currentAccount.profile_data?.organization_name || 'Organizer'
      case 'staff':
        return currentAccount.profile_data?.venue_profiles?.venue_name || currentAccount.profile_data?.role || 'Staff'
      default:
        return currentAccount.profile_data?.full_name || 'Personal'
    }
  }

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="relative h-10 px-3 bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 transition-all duration-300 rounded-full"
            disabled={isLoading || isSwitching}
          >
            <div className="flex items-center space-x-2">
              <div className="relative">
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
                {currentAccount.account_type === 'admin' && (
                  <Crown className="absolute -top-1 -right-1 h-2 w-2 text-yellow-400" />
                )}
              </div>
              
              <span className="text-sm font-medium text-white truncate max-w-20">
                {getDisplayName()}
              </span>
              
              <Badge 
                variant="secondary" 
                className={`${accountColor} text-white text-xs px-1.5 py-0.5`}
              >
                {accountTypeLabels[currentAccount.account_type]}
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
            {userAccounts.map((account) => {
              const Icon = accountTypeIcons[account.account_type]
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
                  onClick={() => !isActive && !isSwitching && handleAccountSwitch(account.profile_id, account.account_type)}
                  disabled={isActive || isSwitching}
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8 border border-slate-600">
                      <AvatarImage src={account.profile_data?.avatar_url} />
                      <AvatarFallback className={`${accountTypeColors[account.account_type]} text-white`}>
                        {isSwitching && isActive ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {account.account_type === 'admin' && (
                      <Crown className="absolute -top-1 -right-1 h-2 w-2 text-yellow-400" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">
                      {account.account_type === 'artist' 
                        ? (account.profile_data?.artist_name || 'Artist Account')
                        : account.account_type === 'venue'
                        ? (account.profile_data?.venue_name || 'Venue Account')
                        : account.account_type === 'admin'
                        ? (account.profile_data?.organization_name || 'Organizer Account')
                        : account.account_type === 'staff'
                        ? (account.profile_data?.venue_profiles?.venue_name || account.profile_data?.role || 'Staff Account')
                        : (account.profile_data?.full_name || 'Personal Account')
                      }
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge 
                        variant="secondary" 
                        className={`${accountTypeColors[account.account_type]} text-white text-xs`}
                      >
                        {accountTypeLabels[account.account_type]}
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
              onClick={() => handleCreateAccount('admin')}
              disabled={isSwitching}
            >
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Plus className="h-3 w-3 text-amber-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Create Organizer Account</div>
                <div className="text-xs text-slate-400">Manage events</div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
