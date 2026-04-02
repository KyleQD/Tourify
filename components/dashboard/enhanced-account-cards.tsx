"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"


import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { useMultiAccount } from "@/hooks/use-multi-account"
import { DashboardService } from "@/lib/services/dashboard.service"
import { useRouter } from "next/navigation"
import { getDashboardPathForAccountType } from "@/lib/navigation/account-dashboard-routes"
import { 
  Music, 
  Building, 
  User, 
  Settings, 
  Users,
  ArrowRight,
  Bell
} from "lucide-react"

interface AccountMetrics {
  followers: number
  views: number
  revenue: number
  events: number
  engagement: number
  completion: number
}

interface AccountCard {
  accountId: string
  accountType: string
  name: string
  followers: number
  urgentCount: number
  isCurrent: boolean
  avatarUrl?: string
}

export function EnhancedAccountCards() {
  const { accounts, currentAccount, switchAccount } = useMultiAccount()
  const router = useRouter()
  const [accountCards, setAccountCards] = useState<AccountCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSwitching, setIsSwitching] = useState(false)

  useEffect(() => {
    const loadAccountCards = async () => {
      try {
        // Get real metrics for all accounts
        const accountMetrics = await DashboardService.getAccountMetrics(accounts)
        
                const cards: AccountCard[] = accounts.map(account => {
          const isCurrent = currentAccount?.profile_id === account.profile_id
          const metrics = accountMetrics.find(m => m.accountId === account.profile_id)
          const urgentCount = metrics?.urgentCount || 0

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
            followers: metrics?.stats.followers || 0,
            urgentCount,
            isCurrent,
            avatarUrl: account.profile_data?.avatar_url
          }
        })
      
      setAccountCards(cards)
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading account cards:', error)
      setIsLoading(false)
    }
  }

  loadAccountCards()
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

  const getAccountColor = (accountType: string) => {
    switch (accountType) {
      case 'artist':
        return 'from-purple-500 to-pink-500'
      case 'venue':
        return 'from-blue-500 to-cyan-500'
      case 'admin':
        return 'from-orange-500 to-red-500'
      default:
        return 'from-gray-500 to-slate-500'
    }
  }

  const handleCardClick = async (card: AccountCard) => {
    if (isSwitching || card.isCurrent) return
    
    setIsSwitching(true)
    
    try {
      // First switch the account
      const success = await switchAccount(card.accountId, card.accountType)
      
      if (success) {
        const targetRoute = getDashboardPathForAccountType(card.accountType)
        router.replace(targetRoute)
      } else {
        console.error('Failed to switch account')
      }
    } catch (error) {
      console.error('Error switching account:', error)
    } finally {
      setIsSwitching(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-white/10 rounded-2xl"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-white/10 rounded w-1/3"></div>
                  <div className="h-3 bg-white/10 rounded w-1/2"></div>
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="space-y-2">
                        <div className="h-3 bg-white/10 rounded"></div>
                        <div className="h-6 bg-white/10 rounded"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

           return (
           <div className="space-y-3">
             {accountCards.map((card) => {
               const AccountIcon = getAccountIcon(card.accountType)
               const accountColor = getAccountColor(card.accountType)
               
               return (
                 <Card 
                   key={card.accountId}
                   className={`bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl hover:bg-white/15 transition-all duration-300 cursor-pointer ${
                     card.isCurrent ? 'ring-2 ring-purple-500/50' : ''
                   } ${isSwitching ? 'opacity-50 pointer-events-none' : ''}`}
                   onClick={() => handleCardClick(card)}
                   role="button"
                   tabIndex={card.isCurrent || isSwitching ? -1 : 0}
                   onKeyDown={(event) => {
                     if (card.isCurrent || isSwitching) return
                     if (event.key === 'Enter' || event.key === ' ') {
                       event.preventDefault()
                       handleCardClick(card)
                     }
                   }}
                 >
                   <CardContent className="p-4">
                     <div className="flex items-center space-x-3">
                       {/* Account Avatar & Status */}
                       <div className="relative">
                         <Avatar className="h-12 w-12 border-2 border-white/20">
                          <AvatarImage src={card.avatarUrl} alt={`${card.name} account avatar`} />
                           <AvatarFallback className={`bg-gradient-to-br ${accountColor}`}>
                             <AccountIcon className="h-6 w-6 text-white" />
                           </AvatarFallback>
                         </Avatar>
                         {card.isCurrent && (
                           <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                         )}
                         {card.urgentCount > 0 && (
                           <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                             <span className="text-xs text-white font-bold">{card.urgentCount}</span>
                           </div>
                         )}
                       </div>

                       {/* Account Info */}
                       <div className="flex-1 min-w-0">
                         <h3 className="font-semibold text-white text-sm truncate">{card.name}</h3>
                         <p className="text-gray-400 text-xs capitalize">{card.accountType} Account</p>
                         <div className="flex items-center space-x-4 mt-1">
                           <div className="flex items-center space-x-1">
                             <Users className="h-3 w-3 text-blue-400" />
                             <span className="text-xs text-gray-300">{card.followers.toLocaleString()}</span>
                           </div>
                           {card.urgentCount > 0 && (
                             <div className="flex items-center space-x-1">
                               <Bell className="h-3 w-3 text-red-400" />
                               <span className="text-xs text-red-300">{card.urgentCount}</span>
                             </div>
                           )}
                         </div>
                       </div>

                       {/* Arrow indicator */}
                       <ArrowRight className="h-4 w-4 text-gray-400" />
                     </div>
                   </CardContent>
                 </Card>
               )
             })}
           </div>
         )
} 