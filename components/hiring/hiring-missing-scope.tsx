"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface HiringMissingScopeProps {
  title?: string
  description?: string
}

interface AccountOption {
  profile_id: string
  account_type: string
  display_name?: string
}

function isHiringAccount(accountType: string) {
  return ["organization", "admin", "organizer", "venue", "artist"].includes(accountType)
}

function toEntityType(accountType: string): "organization" | "venue" | "artist" | null {
  if (["organization", "admin", "organizer"].includes(accountType)) return "organization"
  if (accountType === "venue") return "venue"
  if (accountType === "artist") return "artist"
  return null
}

export function HiringMissingScope({
  title = "Select a hiring account",
  description = "This dashboard needs a Venue, Organization, or Artist hiring scope before it can load real onboarding data.",
}: HiringMissingScopeProps) {
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/accounts", { credentials: "include" })
        if (!res.ok) return
        const body = await res.json()
        const list = (body.accounts || []) as AccountOption[]
        if (!cancelled) setAccounts(list.filter((a) => isHiringAccount(a.account_type)))
      } catch {
        // ignore — empty state still useful
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Card className="border-amber-500/30 bg-amber-950/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-400" />
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          Switch to an Organization, Venue, or Artist persona in the account switcher, or open hiring
          with an explicit scope:
        </p>

        {isLoading ? (
          <p>Looking for hiring accounts…</p>
        ) : accounts.length > 0 ? (
          <ul className="space-y-2">
            {accounts.map((account) => {
              const entityType = toEntityType(account.account_type)
              if (!entityType) return null
              const href = `/admin/dashboard/hiring?entity_type=${entityType}&entity_id=${encodeURIComponent(account.profile_id)}&display_name=${encodeURIComponent(account.display_name || entityType)}`
              return (
                <li key={`${account.account_type}-${account.profile_id}`}>
                  <Button asChild variant="secondary" size="sm">
                    <Link href={href}>
                      Use {account.display_name || entityType} ({entityType})
                    </Link>
                  </Button>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="space-y-2">
            <p>No hiring-capable personas found on this login.</p>
            <Button asChild variant="secondary" size="sm">
              <Link href="/create">Create organization or venue</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
