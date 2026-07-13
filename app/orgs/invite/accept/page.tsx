"use client"

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'

export default function AcceptInvitePage() {
  const params = useSearchParams()
  const token = params.get('token') || ''
  const [msg, setMsg] = useState<string>('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => { if (!token) setMsg('Missing token') }, [token])

  function accept() {
    startTransition(async () => {
      const res = await fetch('/api/orgs/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await res.json()
      if (json.ok) {
        const redirectTo =
          typeof json.redirectTo === 'string' && json.redirectTo.startsWith('/')
            ? json.redirectTo
            : '/admin/dashboard'
        window.location.href = redirectTo
      } else setMsg(json.error || 'Failed to accept invite')
    })
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-white">Accept Invite</h1>
      <div className="text-slate-300 text-sm break-all">Token: {token || '(none)'}</div>
      <Button disabled={isPending || !token} onClick={accept}>Accept</Button>
      {msg && <div className="text-red-400 text-sm">{msg}</div>}
    </div>
  )
}


