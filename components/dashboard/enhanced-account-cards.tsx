"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useMultiAccount } from "@/hooks/use-multi-account"
import { normalizeAccountType } from "@/lib/accounts/account-types"
import { readJsonResponse } from "@/lib/http/read-json-response"
import { toast } from "sonner"
import {
  Music,
  Building,
  User,
  Settings,
  Users,
  ArrowRight,
  Bell,
} from "lucide-react"

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
  const { accounts, currentAccount, switchAccountAndNavigate } = useMultiAccount()
  const [accountCards, setAccountCards] = useState<AccountCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSwitching, setIsSwitching] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    async function loadAccountCards() {
      if (accounts.length === 0) {
        setAccountCards([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const response = await fetch("/api/dashboard/metrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ accounts }),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error("Failed to load account metrics")
        }

        type AccountMetricEntry = { accountId: string; urgentCount?: number; stats?: { followers?: number } }
        const payload = await readJsonResponse<{ metrics?: AccountMetricEntry[] }>(response)
        if (!payload) {
          throw new Error("Failed to load account metrics")
        }
        const accountMetrics: AccountMetricEntry[] = payload.metrics || []

        const cards: AccountCard[] = accounts.map(account => {
          const isCurrent =
            currentAccount?.profile_id === account.profile_id &&
            normalizeAccountType(currentAccount?.account_type) ===
              normalizeAccountType(account.account_type)
          const metrics = accountMetrics.find(
            (m: AccountMetricEntry) => m.accountId === account.profile_id
          )
          const urgentCount = metrics?.urgentCount || 0

          let accountName = "Unknown Account"

          if (account.account_type === "general") {
            accountName =
              account.profile_data?.full_name ||
              account.profile_data?.username ||
              account.profile_data?.metadata?.full_name ||
              "Personal Account"
          } else if (account.account_type === "artist") {
            accountName =
              account.profile_data?.artist_name ||
              account.profile_data?.name ||
              "Artist Account"
          } else if (account.account_type === "venue") {
            accountName =
              account.profile_data?.venue_name ||
              account.profile_data?.name ||
              "Venue Account"
          } else if (
            account.account_type === "admin" ||
            account.account_type === "organization"
          ) {
            accountName =
              account.profile_data?.organization_name ||
              account.profile_data?.display_name ||
              account.profile_data?.name ||
              "Organization Account"
          }

          return {
            accountId: account.profile_id,
            accountType: account.account_type,
            name: accountName,
            followers: metrics?.stats?.followers || 0,
            urgentCount,
            isCurrent,
            avatarUrl: account.profile_data?.avatar_url,
          }
        })

        setAccountCards(cards)
      } catch (error) {
        if (controller.signal.aborted) return
        console.error("Error loading account cards:", error)
        toast.error("Could not load account metrics. Showing accounts without stats.")
        setAccountCards(
          accounts.map(account => ({
            accountId: account.profile_id,
            accountType: account.account_type,
            name: account.profile_data?.full_name || account.profile_data?.name || "Account",
            followers: 0,
            urgentCount: 0,
            isCurrent:
              currentAccount?.profile_id === account.profile_id &&
              normalizeAccountType(currentAccount?.account_type) ===
                normalizeAccountType(account.account_type),
            avatarUrl: account.profile_data?.avatar_url,
          }))
        )
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadAccountCards()

    return () => controller.abort()
  }, [accounts, currentAccount])

  const getAccountIcon = (accountType: string) => {
    switch (accountType) {
      case "artist":
        return Music
      case "venue":
        return Building
      case "admin":
      case "organization":
        return Settings
      default:
        return User
    }
  }

  const getAccountColor = (accountType: string) => {
    switch (accountType) {
      case "artist":
        return "from-purple-500 to-pink-500"
      case "venue":
        return "from-blue-500 to-cyan-500"
      case "admin":
      case "organization":
        return "from-orange-500 to-red-500"
      default:
        return "from-gray-500 to-slate-500"
    }
  }

  const handleCardClick = async (card: AccountCard) => {
    if (isSwitching || card.isCurrent) return

    setIsSwitching(true)

    try {
      await switchAccountAndNavigate(card.accountId, card.accountType)
    } catch (error) {
      console.error("Error switching account:", error)
    } finally {
      setIsSwitching(false)
    }
  }

  if (isLoading) {
    const skeletonCount = Math.max(accounts.length, 1) || 3
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading accounts">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Card key={`skeleton-${i}`} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-white/10 rounded-2xl" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-white/10 rounded w-1/3" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (accountCards.length === 0) {
    return (
      <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
        <CardContent className="p-6 text-center text-slate-300">
          <p className="font-medium text-white">No accounts available</p>
          <p className="mt-1 text-sm text-slate-400">Create an artist or venue account to get started.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3" role="list" aria-label="Account switcher">
      {accountCards.map(card => {
        const AccountIcon = getAccountIcon(card.accountType)
        const accountColor = getAccountColor(card.accountType)

        return (
          <Card
            key={`${card.accountType}-${card.accountId}`}
            className={`bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl hover:bg-white/15 transition-all duration-300 cursor-pointer ${
              card.isCurrent ? "ring-2 ring-purple-500/50" : ""
            } ${isSwitching ? "opacity-50 pointer-events-none" : ""}`}
            onClick={() => handleCardClick(card)}
            role="button"
            tabIndex={card.isCurrent || isSwitching ? -1 : 0}
            aria-pressed={card.isCurrent}
            aria-label={`Switch to ${card.name} ${card.accountType} account`}
            aria-current={card.isCurrent ? "true" : undefined}
            onKeyDown={event => {
              if (card.isCurrent || isSwitching) return
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                handleCardClick(card)
              }
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar className="h-12 w-12 border-2 border-white/20">
                    <AvatarImage src={card.avatarUrl} alt={`${card.name} account avatar`} />
                    <AvatarFallback className={`bg-gradient-to-br ${accountColor}`}>
                      <AccountIcon className="h-6 w-6 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  {card.isCurrent && (
                    <Badge className="absolute -top-2 -right-2 bg-green-500 text-white border-white text-[10px] px-1.5 py-0">
                      Active
                    </Badge>
                  )}
                  {card.urgentCount > 0 && (
                    <div
                      className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-white flex items-center justify-center"
                      aria-label={`${card.urgentCount} urgent notifications`}
                    >
                      <span className="text-[9px] text-white font-bold">
                        {card.urgentCount > 9 ? '9+' : card.urgentCount}
                      </span>
                    </div>
                  )}
                </div>

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

                <ArrowRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
