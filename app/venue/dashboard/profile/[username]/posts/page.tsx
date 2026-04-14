"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSocial } from "@/context/social-context"
import { useAuth } from "../../../../context/auth-context"
import { LoadingSpinner } from "../../../../components/loading-spinner"
import { PostFeed } from "../../../../components/social/post-feed"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function UserPostsPage() {
  const params = useParams()
  const username = params?.username as string
  const { user: currentUser } = useAuth()
  const [profileUser, setProfileUser] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Mock user data for now
  useEffect(() => {
    if (username) {
      // Mock user data - in a real app, this would fetch from an API
      const mockUser = {
        id: 'mock-user-id',
        username: username,
        fullName: username.charAt(0).toUpperCase() + username.slice(1),
        avatar: '',
        title: 'User',
        location: 'Unknown'
      }
      setProfileUser(mockUser)
      setIsLoading(false)
    }
  }, [username])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!profileUser) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">User Not Found</h2>
        <p className="text-gray-400 mb-6">The user you're looking for doesn't exist or has been removed.</p>
        <Link href="/venue/dashboard">
          <Button className="bg-purple-600 hover:bg-purple-700">Return to Home</Button>
        </Link>
      </div>
    )
  }

  const isOwnProfile = currentUser?.id === profileUser.id

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <Link href={`/venue/dashboard/profile/${username}`} className="shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>

        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold" title={`${profileUser.fullName}'s Posts`}>
            {`${profileUser.fullName}'s Posts`}
          </h1>
          <p className="truncate text-gray-400">@{profileUser.username}</p>
        </div>
      </div>

      <Card className="bg-gray-900 text-white border-gray-800">
        <CardContent className="p-4">
          <PostFeed userId={profileUser.id} showPostCreator={isOwnProfile} />
        </CardContent>
      </Card>
    </div>
  )
}
