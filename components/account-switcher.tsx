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

interface AccountSwitcherProps {
  onAccountSwitch?: (profileId: string, accountType: ProfileType) => Promise<void>
  className?: string
}

export function AccountSwitcher({ onAccountSwitch, className = '' }: AccountSwitcherProps) {
  const router = useRouter()
  const { currentAccount, userAccounts, refreshAccounts } = useMultiAccount()
  const { switchAccount, isLoading } = useAccountSwitching()
  const [isSwitching, setIsSwitching] = useState(false)

  const handleAccountSwitch = async (profileId: string, accountType: ProfileType) => {
    setIsSwitching(true)
    
    try {
      // Use custom handler if provided, otherwise use default behavior
      if (onAccountSwitch) {
        await onAccountSwitch(profileId, accountType)
      } else {
        await switchAccount(profileId, accountType)
        
        // Set the active venue ID for venue accounts
        if (accountType === 'venue') {
          const { venueService } = await import('@/lib/services/venue.service')
          venueService.setCurrentVenueId(profileId)
        }
        
        const targetRoute = getDashboardPathForAccountType(accountType)

        await router.prefetch(targetRoute)
        await new Promise(resolve => setTimeout(resolve, 100))
        router.replace(targetRoute)
      }
    } catch (error) {
      console.error('Failed to switch account:', error)
      // Fallback to hard navigation on error
      const fallbackRoute = getDashboardPathForAccountType(accountType)
      window.location.href = fallbackRoute
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

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="relative h-12 w-full justify-start px-3 bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 transition-all duration-300"
            disabled={isLoading || isSwitching}
          >
            <div className="flex items-center space-x-3 w-full">
              <div className="relative">
                <Avatar className="h-8 w-8 border-2 border-slate-600">
                  <AvatarImage src={currentAccount.profile_data?.avatar_url} />
                  <AvatarFallback className={`${accountColor} text-white text-xs`}>
                    {(isLoading || isSwitching) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <IconComponent className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
                {currentAccount.account_type === 'admin' && (
                  <Crown className="absolute -top-1 -right-1 h-3 w-3 text-yellow-400" />
                )}
              </div>
              
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-white truncate">
                  {currentAccount.account_type === 'artist' 
                    ? (currentAccount.profile_data?.artist_name || 'Artist Account')
                    : currentAccount.account_type === 'venue'
                    ? (currentAccount.profile_data?.venue_name || 'Venue Account')
                    : currentAccount.account_type === 'admin'
                    ? (currentAccount.profile_data?.organization_name || currentAccount.profile_data?.admin_name || 'Event & Tour Admin')
                    : currentAccount.account_type === 'staff'
                    ? (currentAccount.profile_data?.venue_profiles?.venue_name || currentAccount.profile_data?.role || 'Staff Account')
                    : (currentAccount.profile_data?.full_name || 'Personal Account')
                  }
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="secondary" 
                    className={`${accountColor} text-white text-xs px-2 py-0.5`}
                  >
                    {accountTypeLabels[currentAccount.account_type]}
                  </Badge>
                  {(isLoading || isSwitching) && (
                    <span className="text-xs text-slate-400">Switching...</span>
                  )}
                </div>
              </div>
              
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          className="w-80 p-2 bg-slate-900 border-slate-700" 
          align="start"
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
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    isActive 
                      ? 'bg-purple-500/20 border border-purple-500/30' 
                      : 'hover:bg-slate-800 border border-transparent'
                  }`}
                  onClick={() => !isActive && !isSwitching && handleAccountSwitch(account.profile_id, account.account_type)}
                  disabled={isActive || isSwitching}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10 border-2 border-slate-600">
                      <AvatarImage src={account.profile_data?.avatar_url} />
                      <AvatarFallback className={`${accountTypeColors[account.account_type]} text-white`}>
                        {isSwitching && isActive ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {account.account_type === 'admin' && (
                      <Crown className="absolute -top-1 -right-1 h-3 w-3 text-yellow-400" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">
                      {account.account_type === 'artist' 
                        ? (account.profile_data?.artist_name || 'Artist Account')
                        : account.account_type === 'venue'
                        ? (account.profile_data?.venue_name || 'Venue Account')
                        : account.account_type === 'admin'
                        ? (account.profile_data?.organization_name || account.profile_data?.admin_name || 'Event & Tour Admin')
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
                      {account.account_type === 'admin' && (
                        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          Super
                        </Badge>
                      )}
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
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Plus className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Create Artist Account</div>
                <div className="text-xs text-slate-400">Showcase your music and connect with fans</div>
              </div>
            </DropdownMenuItem>
            
            <DropdownMenuItem
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-800 cursor-pointer"
              onClick={() => handleCreateAccount('venue')}
              disabled={isSwitching}
            >
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <Plus className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Create Venue Account</div>
                <div className="text-xs text-slate-400">List your space and book artists</div>
              </div>
            </DropdownMenuItem>
            
            <DropdownMenuItem
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-800 cursor-pointer"
              onClick={() => handleCreateAccount('admin')}
              disabled={isSwitching}
            >
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Plus className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Create Organizer Account</div>
                <div className="text-xs text-slate-400">Manage events and tours professionally</div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator className="bg-slate-700 my-2" />
          
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-800 cursor-pointer"
              onClick={() => {
                // Navigate to account-specific settings page
                switch (currentAccount.account_type) {
                  case 'artist':
                    router.push('/artist/settings')
                    break
                  case 'venue':
                    router.push('/venue/settings')
                    break
                  case 'admin':
                    router.push('/admin/settings')
                    break
                  case 'staff':
                    router.push('/venue/staff')
                    break
                  default:
                    router.push('/settings')
                }
              }}
              disabled={isSwitching}
            >
              <Settings className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-200">Account Settings</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 