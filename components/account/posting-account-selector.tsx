'use client'

import { Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMultiAccount } from '@/hooks/use-multi-account'
import {
  getAccountAvatarUrl,
  getAccountDisplayName,
  getAccountInitials,
  getAccountTypeLabel,
} from '@/lib/accounts/account-presentation'
import { normalizeAccountType } from '@/lib/accounts/account-types'
import { cn } from '@/lib/utils'

interface PostingAccountSelectorProps {
  className?: string
  label?: string
}

export function PostingAccountSelector({
  className,
  label = 'Posting as',
}: PostingAccountSelectorProps) {
  const { currentAccount, userAccounts, switchAccount, isLoading } = useMultiAccount()
  const [isSwitching, setIsSwitching] = useState(false)

  const activeValue = useMemo(() => {
    if (!currentAccount) return ''
    return `${currentAccount.profile_id}:${normalizeAccountType(currentAccount.account_type)}`
  }, [currentAccount])

  async function handleValueChange(value: string) {
    const [profileId, accountType] = value.split(':')
    if (!profileId || !accountType || !currentAccount) return
    if (value === activeValue) return

    setIsSwitching(true)
    try {
      const switched = await switchAccount(profileId, accountType)
      if (!switched) {
        throw new Error('Unable to switch posting account')
      }

      const selectedAccount = userAccounts.find(
        account =>
          account.profile_id === profileId &&
          normalizeAccountType(account.account_type) === normalizeAccountType(accountType)
      )

      toast.success(`Now posting as ${getAccountDisplayName(selectedAccount || currentAccount)}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to switch posting account')
    } finally {
      setIsSwitching(false)
    }
  }

  if (!currentAccount) return null

  return (
    <div className={cn('rounded-2xl border border-white/10 bg-white/[0.04] p-3', className)}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</span>
        {(isLoading || isSwitching) && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />}
      </div>

      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border border-white/10">
          <AvatarImage src={getAccountAvatarUrl(currentAccount) || undefined} />
          <AvatarFallback className="bg-white/10 text-sm text-white">
            {getAccountInitials(currentAccount)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">
            {getAccountDisplayName(currentAccount)}
          </div>
          <Badge variant="secondary" className="mt-1 bg-white/10 text-[10px] text-slate-300">
            {getAccountTypeLabel(currentAccount.account_type)}
          </Badge>
        </div>

        <Select value={activeValue} onValueChange={handleValueChange} disabled={isLoading || isSwitching}>
          <SelectTrigger className="w-[180px] border-white/10 bg-white/5 text-slate-200">
            <SelectValue placeholder="Choose account" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-[#0b0b13] text-white">
            {userAccounts
              .filter(account => normalizeAccountType(account.account_type) !== 'staff')
              .map(account => {
                const value = `${account.profile_id}:${normalizeAccountType(account.account_type)}`
                return (
                  <SelectItem key={value} value={value} className="focus:bg-white/10 focus:text-white">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate">{getAccountDisplayName(account)}</span>
                      <span className="text-xs text-slate-500">
                        {getAccountTypeLabel(account.account_type)}
                      </span>
                    </div>
                  </SelectItem>
                )
              })}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
