"use client"

import React, { useState } from 'react'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { 
  User, 
  Music, 
  Building, 
  Shield, 
  Trash2, 
  AlertTriangle,
  Crown,
  Plus,
  RefreshCw,
  Loader2
} from 'lucide-react'
import { AccountManagementService, UserAccount } from '@/lib/services/account-management.service'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/contexts/auth-context'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'

interface AccountManagementSettingsProps {
  activeTab?: string
}

const accountTypeIcons = {
  general: User,
  artist: Music,
  venue: Building,
  admin: Shield
}

const accountTypeColors = {
  general: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  artist: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  venue: 'bg-green-500/20 text-green-300 border-green-500/30',
  admin: 'bg-red-500/20 text-red-300 border-red-500/30'
}

const accountTypeLabels = {
  general: 'Personal',
  artist: 'Artist',
  venue: 'Venue',
  admin: 'Organizer'
}

export function AccountManagementSettings({ activeTab }: AccountManagementSettingsProps) {
  const { currentAccount } = useMultiAccount()
  const { user } = useAuth()
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([])
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClientComponentClient()

  // Direct client-side database query to avoid API authentication issues
  const fetchRealAccountsOnly = async () => {
    if (!user?.id) {
      console.warn('❌ [Account Management] No authenticated user')
      setUserAccounts([])
      setIsLoading(false)
      return
    }

    try {
      setIsRefreshing(true)
      console.log('🔍 [Account Management] Fetching accounts directly from client...')
      console.log('🔍 [Account Management] User ID:', user.id)
      
      const accounts: UserAccount[] = []

      // STEP 1: Always add the general/personal account
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profile && !profileError) {
          accounts.push({
            account_type: 'general',
            profile_id: user.id,
            profile_data: {
              ...profile,
              display_name: profile.full_name || profile.name || 'Personal Account',
              account_display_type: 'Personal'
            },
            permissions: {
              can_post: true,
              can_manage_settings: true,
              can_view_analytics: false,
              can_manage_content: true
            },
            is_active: true
          })
          console.log('✅ [Account Management] Added general account')
        } else {
          console.warn('⚠️ [Account Management] No profile found:', profileError)
        }
      } catch (profileError) {
        console.error('❌ [Account Management] Profile query failed:', profileError)
      }

      // STEP 2: Query artist_profiles table directly
      try {
        const { data: artistProfiles, error: artistError } = await supabase
          .from('artist_profiles')
          .select('*')
          .eq('user_id', user.id)

        if (artistProfiles && !artistError && artistProfiles.length > 0) {
          console.log(`✅ [Account Management] Found ${artistProfiles.length} artist profiles`)
          artistProfiles.forEach((artist: any) => {
            accounts.push({
              account_type: 'artist',
              profile_id: artist.id,
              profile_data: {
                ...artist,
                display_name: artist.artist_name,
                account_display_type: 'Artist'
              },
              permissions: {
                can_post: true,
                can_manage_settings: true,
                can_view_analytics: true,
                can_manage_content: true
              },
              is_active: true
            })
          })
        } else {
          console.log('ℹ️ [Account Management] No artist profiles found')
        }
      } catch (artistError) {
        console.warn('⚠️ [Account Management] Artist profiles query failed:', artistError)
      }

      // STEP 3: Query venue_profiles table directly
      try {
        const { data: venueProfiles, error: venueError } = await supabase
          .from('venue_profiles')
          .select('*')
          .or(`user_id.eq.${user.id},main_profile_id.eq.${user.id}`)

        if (venueProfiles && !venueError && venueProfiles.length > 0) {
          console.log(`✅ [Account Management] Found ${venueProfiles.length} venue profiles:`, venueProfiles.map((v: any) => v.venue_name))
          venueProfiles.forEach((venue: any) => {
            accounts.push({
              account_type: 'venue',
              profile_id: venue.id,
              profile_data: {
                ...venue,
                display_name: venue.venue_name,
                account_display_type: 'Venue'
              },
              permissions: {
                can_post: true,
                can_manage_settings: true,
                can_view_analytics: true,
                can_manage_content: true
              },
              is_active: true
            })
          })
        } else {
          console.log('ℹ️ [Account Management] No venue profiles found')
        }
      } catch (venueError) {
        console.warn('⚠️ [Account Management] Venue profiles query failed:', venueError)
      }

      // STEP 4: Check for organizer accounts in profile settings
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('account_settings')
          .eq('id', user.id)
          .single()

        if (profile?.account_settings?.organizer_data?.organization_name) {
          const organizerData = profile.account_settings.organizer_data
          accounts.push({
            account_type: 'admin',
            profile_id: `${user.id}-organizer`,
            profile_data: {
              id: `${user.id}-organizer`,
              organization_name: organizerData.organization_name,
              organization_type: organizerData.organization_type || 'event_management',
              display_name: organizerData.organization_name,
              account_display_type: 'Organizer',
              admin_level: 'super',
              created_at: new Date().toISOString()
            },
            permissions: {
              can_post: true,
              can_manage_settings: true,
              can_view_analytics: true,
              can_manage_content: true,
              can_manage_events: true,
              can_manage_tours: true,
              can_moderate: true
            },
            is_active: true
          })
          console.log('✅ [Account Management] Found organizer account in profile settings')
        }
      } catch (organizerError) {
        console.warn('⚠️ [Account Management] Organizer settings query failed:', organizerError)
      }

      // STEP 5: Check organizer_accounts table if it exists
      try {
        const { data: organizerAccounts, error: organizerError } = await supabase
          .from('organizer_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)

        if (organizerAccounts && !organizerError && organizerAccounts.length > 0) {
          console.log(`✅ [Account Management] Found ${organizerAccounts.length} organizer accounts in table`)
          organizerAccounts.forEach((organizer: any) => {
            accounts.push({
              account_type: 'admin',
              profile_id: organizer.id,
              profile_data: {
                ...organizer,
                display_name: organizer.organization_name,
                account_display_type: 'Organizer'
              },
              permissions: {
                can_post: true,
                can_manage_settings: true,
                can_view_analytics: true,
                can_manage_content: true,
                can_manage_events: true,
                can_manage_tours: true,
                can_moderate: true
              },
              is_active: organizer.is_active
            })
          })
        }
      } catch (organizerTableError) {
        console.log('ℹ️ [Account Management] Organizer accounts table not available')
      }

      console.log(`🎉 [Account Management] Found ${accounts.length} total accounts`)
      console.log('📋 [Account Management] Accounts:', accounts.map(acc => `${acc.account_type}: ${acc.profile_data.display_name}`))
      setUserAccounts(accounts)
      
    } catch (error) {
      console.error('❌ [Account Management] Error fetching accounts:', error)
      setUserAccounts([])
    } finally {
      setIsRefreshing(false)
      setIsLoading(false)
    }
  }

  // Load accounts on component mount
  React.useEffect(() => {
    // Add a small delay to ensure authentication is ready
    const timer = setTimeout(() => {
      fetchRealAccountsOnly()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [user?.id]) // Re-run when user changes

  const handleDeleteAccount = async (account: UserAccount) => {
    if (!account.profile_id || !user?.id) return

    try {
      setDeletingAccountId(account.profile_id)
      console.log('🗑️ [Account Management] Deleting account:', account.account_type, account.profile_data.display_name)

      // For venue accounts, delete the venue profile directly
      if (account.account_type === 'venue') {
        const { error } = await supabase
          .from('venue_profiles')
          .delete()
          .eq('id', account.profile_id)
          .eq('user_id', user.id) // Security check
        
        if (error) {
          console.error('❌ [Account Management] Failed to delete venue:', error)
          throw new Error('Failed to delete venue profile')
        }
        console.log('✅ [Account Management] Venue deleted successfully')
      }
      
      // For artist accounts, delete the artist profile directly
      if (account.account_type === 'artist') {
        const { error } = await supabase
          .from('artist_profiles')
          .delete()
          .eq('id', account.profile_id)
          .eq('user_id', user.id) // Security check
        
        if (error) {
          console.error('❌ [Account Management] Failed to delete artist:', error)
          throw new Error('Failed to delete artist profile')
        }
        console.log('✅ [Account Management] Artist deleted successfully')
      }

      // For organizer accounts in dedicated table
      if (account.account_type === 'admin' && account.profile_id !== `${user.id}-organizer`) {
        const { error } = await supabase
          .from('organizer_accounts')
          .delete()
          .eq('id', account.profile_id)
          .eq('user_id', user.id) // Security check
        
        if (error) {
          console.error('❌ [Account Management] Failed to delete organizer:', error)
          throw new Error('Failed to delete organizer account')
        }
        console.log('✅ [Account Management] Organizer deleted successfully')
      }

      // Refresh accounts to update the UI
      await fetchRealAccountsOnly()
      
      // If we deleted the current account, switch to general
      if (currentAccount?.profile_id === account.profile_id) {
        const generalAccount = userAccounts.find(acc => acc.account_type === 'general')
        if (generalAccount) {
          console.log('🔄 [Account Management] Switching to general account after deletion')
          router.push('/settings')
        }
      }

    } catch (error) {
      console.error('❌ [Account Management] Error deleting account:', error)
      // You could add a toast notification here
    } finally {
      setDeletingAccountId(null)
    }
  }

  const handleRefreshAccounts = async () => {
    console.log('🔄 [Account Management] Manual refresh triggered')
    await fetchRealAccountsOnly()
  }

  const canDeleteAccount = (account: UserAccount) => {
    // Can't delete general account
    if (account.account_type === 'general') return false
    
    // Can't delete admin accounts (too dangerous)
    if (account.account_type === 'admin') return false
    
    return true
  }

  const getAccountDisplayName = (account: UserAccount) => {
    switch (account.account_type) {
      case 'artist':
        return account.profile_data?.artist_name || 'Artist Account'
      case 'venue':
        return account.profile_data?.venue_name || 'Venue Account'
      case 'admin':
        return account.profile_data?.organization_name || account.profile_data?.admin_name || 'Event & Tour Admin'
      default:
        return account.profile_data?.full_name || account.profile_data?.name || 'Personal Account'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Account Management</h3>
          <p className="text-gray-400 text-sm">Manage all your accounts and delete unwanted ones</p>
        </div>
        <Button
          onClick={handleRefreshAccounts}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
          className="bg-white/5 border-white/10 hover:bg-white/10"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Separator className="bg-white/10" />

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-purple-400 mr-3" />
          <span className="text-gray-300">Loading accounts from database...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && userAccounts.length === 0 && (
        <div className="text-center py-8">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No accounts found</p>
          <p className="text-gray-500 text-sm">Try refreshing to reload your accounts</p>
        </div>
      )}

      {/* Accounts List */}
      {!isLoading && userAccounts.length > 0 && (
        <div className="space-y-4">
          {userAccounts.map((account) => {
          const IconComponent = accountTypeIcons[account.account_type]
          const isCurrentAccount = currentAccount?.profile_id === account.profile_id && 
                                 currentAccount?.account_type === account.account_type
          const canDelete = canDeleteAccount(account)
          const isDeleting = deletingAccountId === account.profile_id

          return (
            <Card 
              key={`${account.profile_id}-${account.account_type}`}
              className={`bg-white/5 border-white/10 transition-all ${
                isCurrentAccount ? 'ring-2 ring-purple-500/50 bg-purple-500/10' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-12 w-12 border-2 border-white/10">
                        <AvatarImage src={account.profile_data?.avatar_url} />
                        <AvatarFallback className={accountTypeColors[account.account_type]}>
                          <IconComponent className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      {account.account_type === 'admin' && (
                        <Crown className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-white font-medium">
                          {getAccountDisplayName(account)}
                        </h4>
                        {isCurrentAccount && (
                          <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={accountTypeColors[account.account_type]}>
                          {accountTypeLabels[account.account_type]}
                        </Badge>
                        {account.account_type === 'admin' && (
                          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                            <Crown className="h-3 w-3 mr-1" />
                            Super
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-gray-400 text-sm mt-1">
                        Created: {formatSafeDate(account.profile_data?.created_at || new Date().toISOString())}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {canDelete ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isDeleting}
                            className="bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
                          >
                            {isDeleting ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-900 border-slate-700">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-red-400" />
                              Delete Account
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-300">
                              <div>
                                Are you sure you want to delete this{' '}
                                <span className="font-semibold text-white">
                                  {accountTypeLabels[account.account_type]}
                                </span>{' '}
                                account? This action cannot be undone and will permanently remove:
                              </div>
                              <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>All account data and settings</li>
                                <li>Profile information and content</li>
                                {account.account_type === 'venue' && (
                                  <>
                                    <li>Venue details and booking history</li>
                                    <li>Associated events and bookings</li>
                                  </>
                                )}
                                {account.account_type === 'artist' && (
                                  <>
                                    <li>Music catalog and discography</li>
                                    <li>Fan connections and followers</li>
                                  </>
                                )}
                              </ul>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteAccount(account)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Delete Account
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                        {account.account_type === 'general' ? 'Primary' : 'Protected'}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
        </div>
      )}

      {/* Create New Account Section */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Plus className="h-5 w-5 text-purple-400" />
            Create New Account
          </CardTitle>
          <p className="text-gray-400 text-sm">
            Expand your presence by creating specialized accounts for different purposes
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {!userAccounts.find(acc => acc.account_type === 'artist') && (
              <Button
                onClick={() => router.push('/create?type=artist')}
                variant="outline"
                className="bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 h-auto p-4 flex flex-col items-start gap-2"
              >
                <Music className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Artist Account</div>
                  <div className="text-xs opacity-70">Showcase your music</div>
                </div>
              </Button>
            )}
            
            <Button
              onClick={() => router.push('/create?type=venue')}
              variant="outline"
              className="bg-green-500/10 border-green-500/30 text-green-300 hover:bg-green-500/20 h-auto p-4 flex flex-col items-start gap-2"
            >
              <Building className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Venue Account</div>
                <div className="text-xs opacity-70">List your space</div>
              </div>
            </Button>
            
            <Button
              onClick={() => router.push('/create?type=admin')}
              variant="outline"
              className="bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 h-auto p-4 flex flex-col items-start gap-2"
            >
              <Shield className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Organizer Account</div>
                <div className="text-xs opacity-70">Manage events & tours</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Help Section */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-blue-300 font-medium mb-1">Important Notes</h4>
              <ul className="text-blue-200 text-sm space-y-1">
                <li>• Your Personal Account cannot be deleted as it's your primary account</li>
                <li>• Organizer Accounts are protected and cannot be deleted for security reasons</li>
                <li>• Deleting an account will permanently remove all associated data</li>
                <li>• If you're experiencing issues with an account, try refreshing the list first</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 