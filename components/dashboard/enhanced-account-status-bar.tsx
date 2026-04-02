"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useMultiAccount } from "@/hooks/use-multi-account"
import { 
  Music, 
  Building, 
  User, 
  Settings, 
  Bell, 
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from "lucide-react"
import { useRouter } from "next/navigation"
import { getDashboardPathForAccountType } from "@/lib/navigation/account-dashboard-routes"

interface AccountStatus {
  accountId: string
  accountType: string
  name: string
  status: 'active' | 'pending' | 'error'
  urgentCount: number
  totalUpdates: number
  lastActivity: string
  isCurrent: boolean
}

export function EnhancedAccountStatusBar() {
  const { accounts, currentAccount, switchAccount } = useMultiAccount()
  const [accountStatuses, setAccountStatuses] = useState<AccountStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadAccountStatuses = () => {
      const statuses: AccountStatus[] = accounts.map(account => {
        const isCurrent = currentAccount?.profile_id === account.profile_id
        const urgentCount = Math.floor(Math.random() * 3) // Mock data
        const totalUpdates = Math.floor(Math.random() * 10) + urgentCount
        
                       // Extract proper account name based on account type
               let accountName = 'Unknown Account'
               
               if (account.account_type === 'general') {
                 accountName = account.profile_data?.full_name || 
                              account.profile_data?.username || 
                              account.profile_data?.metadata?.full_name ||
                              'Personal Account'
               } else if (account.account_type === 'artist') {
                 accountName = account.profile_data?.artist_name || 
                              account.profile_data?.name ||
                              'Artist Account'
               } else if (account.account_type === 'venue') {
                 accountName = account.profile_data?.venue_name || 
                              account.profile_data?.name ||
                              'Venue Account'
               } else if (account.account_type === 'admin') {
                 accountName = account.profile_data?.organization_name || 
                              account.profile_data?.display_name ||
                              account.profile_data?.name ||
                              'Admin Account'
               }

               return {
                 accountId: account.profile_id,
                 accountType: account.account_type,
                 name: accountName,
                 status: 'active' as const,
                 urgentCount,
                 totalUpdates,
                 lastActivity: '2 hours ago',
                 isCurrent
               }
      })
      
      setAccountStatuses(statuses)
      setIsLoading(false)
    }

    loadAccountStatuses()
  }, [accounts, currentAccount])

  const getAccountIcon = (accountType: string) => {
    switch (accountType) {
      case 'artist':
        return Music
      case 'venue':
        return Building
      case 'admin':
        return Settings
      default:
        return User
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-300 border-green-500/50'
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
      case 'error':
        return 'bg-red-500/20 text-red-300 border-red-500/50'
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/50'
    }
  }

  const handleAccountSwitch = async (account: AccountStatus) => {
    if (!account.isCurrent) {
      try {
        const success = await switchAccount(account.accountId, account.accountType)
        
        if (success) {
          const targetRoute = getDashboardPathForAccountType(account.accountType)
          router.replace(targetRoute)
        }
      } catch (error) {
        console.error('Error switching account:', error)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-white/10 rounded w-20 animate-pulse"></div>
                  <div className="h-2 bg-white/10 rounded w-16 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Account Status Cards */}
          <div className="flex items-center space-x-4 flex-1 overflow-x-auto">
            {accountStatuses.map((account) => {
              const AccountIcon = getAccountIcon(account.accountType)
              
              return (
                <Button
                  key={account.accountId}
                  variant="ghost"
                  className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 ${
                    account.isCurrent 
                      ? 'bg-purple-500/20 border border-purple-500/50 text-white' 
                      : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
                  }`}
                  onClick={() => handleAccountSwitch(account)}
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500">
                        <AccountIcon className="h-4 w-4 text-white" />
                      </AvatarFallback>
                    </Avatar>
                    {account.isCurrent && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white"></div>
                    )}
                  </div>
                  
                  <div className="text-left">
                    <div className="font-medium text-sm">{account.name}</div>
                    <div className="text-xs text-gray-400 capitalize">{account.accountType}</div>
                  </div>
                  
                  {/* Status Indicators */}
                  <div className="flex items-center space-x-2">
                    {account.urgentCount > 0 && (
                      <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">
                        <AlertTriangle className="h-2 w-2 mr-1" />
                        {account.urgentCount}
                      </Badge>
                    )}
                    
                    <Badge className={getStatusColor(account.status)}>
                      {account.status === 'active' && <CheckCircle className="h-2 w-2 mr-1" />}
                      {account.status === 'pending' && <Clock className="h-2 w-2 mr-1" />}
                      {account.totalUpdates}
                    </Badge>
                  </div>
                  
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </Button>
              )
            })}
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center space-x-2 ml-4">
            <Button
              size="sm"
              variant="outline"
              className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
            >
              <Bell className="h-4 w-4 mr-1" />
              All Updates
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              className="border-red-500/50 text-red-300 hover:bg-red-500/20"
            >
              <Zap className="h-4 w-4 mr-1" />
              Urgent ({accountStatuses.reduce((sum, acc) => sum + acc.urgentCount, 0)})
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 