'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Search, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EnhancedFriendSearch } from '@/components/social/enhanced-friend-search'
import { SuggestedForYouSection } from '@/components/social/suggested-for-you-section'
import { FollowRequestsModal } from '@/components/profile/follow-requests-modal'
import { resolvePublicProfilePath } from '@/lib/utils/public-profile-routes'

export default function FriendSearchPage() {
  const router = useRouter()
  const [isRequestsOpen, setIsRequestsOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  const loadPendingCount = useCallback(async () => {
    try {
      const response = await fetch('/api/social/follow-request?action=pending', {
        credentials: 'same-origin',
      })
      if (!response.ok) {
        setPendingCount(0)
        return
      }
      const data = await response.json()
      setPendingCount(Array.isArray(data.requests) ? data.requests.length : 0)
    } catch {
      setPendingCount(0)
    }
  }, [])

  useEffect(() => {
    void loadPendingCount()
  }, [loadPendingCount])

  function handleFriendSelect(friend: {
    id: string
    username: string
    account_type?: string | null
  }) {
    const path = resolvePublicProfilePath({
      id: friend.id,
      username: friend.username,
      account_type: friend.account_type,
    })

    if (!path) {
      toast.error('This profile does not have a public URL yet.')
      return
    }

    router.push(path)
  }

  function handleRequestsClose() {
    setIsRequestsOpen(false)
    void loadPendingCount()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsRequestsOpen(true)}
              className="border-slate-600 bg-slate-800/60 text-white hover:bg-slate-700"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Friend requests
              {pendingCount > 0 && (
                <Badge className="ml-2 border-0 bg-purple-500 text-white">
                  {pendingCount}
                </Badge>
              )}
            </Button>
          </div>

          <h1 className="mb-2 text-3xl font-bold text-white">Find Friends</h1>
          <p className="text-slate-300">
            Connect with people you know and discover new friends
          </p>
        </motion.div>

        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Search className="h-5 w-5 text-purple-400" />
                  Search for Friends
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <EnhancedFriendSearch
                  onFriendSelect={handleFriendSelect}
                  onSendRequest={() => {
                    toast.success('Friend request sent!')
                  }}
                  placeholder="Search by name, username, or location..."
                  className="w-full"
                  showInlineResults
                />
                <p className="text-xs text-slate-400">
                  Tip: search by full name, @username, or city. Use filters for mutual friends and location.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <SuggestedForYouSection limit={12} />
          </motion.div>
        </div>
      </div>

      <FollowRequestsModal
        isOpen={isRequestsOpen}
        onClose={handleRequestsClose}
        onRequestsChanged={loadPendingCount}
      />
    </div>
  )
}
