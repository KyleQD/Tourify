"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/** Canonical org create lives at /create?type=organization (public brand + ops tenant). */
export default function CreateOrgPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/create?type=organization')
  }, [router])

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6 text-white/80">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      Redirecting to organization setup…
    </div>
  )
}
