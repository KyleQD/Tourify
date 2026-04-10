"use client"

import { useMemo, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ClaimResponse {
  connectSessionId: string
  profilePreview: {
    userId: string
    username: string | null
    fullName: string | null
    avatarUrl: string | null
    bio: string | null
    location: string | null
    email: string | null
    phone: string | null
  }
  relationshipStatus: string
  requiresConfirm: boolean
}

export default function ConnectClaimPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [claimResult, setClaimResult] = useState<ClaimResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isClaimPending, startClaimTransition] = useTransition()
  const [isConfirmPending, startConfirmTransition] = useTransition()
  const [confirmStatus, setConfirmStatus] = useState<'idle' | 'success'>('idle')

  const hasToken = useMemo(() => token.length > 10, [token])

  function claimSession() {
    if (!hasToken) {
      setErrorMessage('Missing or invalid connect token.')
      return
    }

    startClaimTransition(async () => {
      setErrorMessage('')
      setConfirmStatus('idle')

      const response = await fetch('/api/connect/sessions/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ephemeralToken: token,
          deviceContext: { platform: 'web' },
        }),
      })

      const json = await response.json()
      if (!response.ok) {
        setClaimResult(null)
        setErrorMessage(json?.error?.message || 'Failed to claim connect session.')
        return
      }

      setClaimResult(json)
    })
  }

  function confirmConnection() {
    if (!claimResult?.connectSessionId) return

    startConfirmTransition(async () => {
      setErrorMessage('')
      const response = await fetch('/api/connect/sessions/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectSessionId: claimResult.connectSessionId,
          intent: 'send_follow_request',
        }),
      })
      const json = await response.json()

      if (!response.ok) {
        setErrorMessage(json?.error?.message || 'Failed to confirm connection.')
        return
      }

      setConfirmStatus('success')
    })
  }

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-xl items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Connect with User</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasToken && (
            <p className="text-sm text-red-500">
              Missing connect token. Ask the other user to share their connect link again.
            </p>
          )}

          {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

          {confirmStatus === 'success' && (
            <div className="rounded-md border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-300">
              Connection request sent successfully.
            </div>
          )}

          {!claimResult && (
            <Button disabled={!hasToken || isClaimPending} onClick={claimSession}>
              {isClaimPending ? 'Claiming session...' : 'Claim Connect Session'}
            </Button>
          )}

          {claimResult && (
            <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-medium">Preview</p>
              <p className="text-sm">Name: {claimResult.profilePreview.fullName || 'Not provided'}</p>
              <p className="text-sm">Username: {claimResult.profilePreview.username || 'Not provided'}</p>
              <p className="text-sm">Bio: {claimResult.profilePreview.bio || 'Not provided'}</p>
              <p className="text-sm">Location: {claimResult.profilePreview.location || 'Not shared'}</p>
              <p className="text-sm">Email: {claimResult.profilePreview.email || 'Not shared'}</p>
              <p className="text-sm">Phone: {claimResult.profilePreview.phone || 'Not shared'}</p>
              <p className="text-xs text-muted-foreground">
                Current relationship: {claimResult.relationshipStatus}
              </p>

              <div className="flex gap-2 pt-2">
                <Button disabled={isConfirmPending || confirmStatus === 'success'} onClick={confirmConnection}>
                  {isConfirmPending ? 'Confirming...' : 'Confirm and Connect'}
                </Button>
                {claimResult.profilePreview.username ? (
                  <Link href={`/profile/${claimResult.profilePreview.username}`}>
                    <Button variant="outline">View Profile</Button>
                  </Link>
                ) : (
                  <Button variant="outline" disabled>View Profile</Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
