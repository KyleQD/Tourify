"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSocial } from "@/contexts/social-context"
import { LoadingSpinner } from "../../../components/loading-spinner"
import { PostItem } from "../../../components/social/post-item"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/context/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle, Heart, Share2 } from "lucide-react"

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params?.id as string
  const { posts, users, loadingPosts } = useSocial()
  const { user } = useAuth()
  const [post, setPost] = useState<any | null>(null)
  const [author, setAuthor] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Find post by ID
  useEffect(() => {
    if (!loadingPosts && postId) {
      const foundPost = posts.find((p) => p.id === postId)
      setPost(foundPost || null)

      if (foundPost) {
        const postAuthor = users.find((u) => u.id === foundPost.userId)
        setAuthor(postAuthor || null)
      }

      setIsLoading(false)
    }
  }, [postId, posts, users, loadingPosts])

  if (isLoading || loadingPosts) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!post || !author) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Post Not Found</h2>
        <p className="text-gray-400 mb-6">The post you're looking for doesn't exist or has been removed.</p>
        <Link href="/venue/dashboard/network-feed">
          <Button className="bg-purple-600 hover:bg-purple-700">Return to Feed</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <h1 className="min-w-0 truncate text-2xl font-bold">Post Details</h1>
      </div>

      <Card className="bg-gray-900 text-white border-gray-800">
        <CardHeader>
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="shrink-0">
              <AvatarImage src={author.avatar} />
              <AvatarFallback>{author.fullName[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <CardTitle className="truncate">{author.fullName}</CardTitle>
              <p className="truncate text-sm text-muted-foreground">@{author.username}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <PostItem post={post} author={author} isDetail={true} />
        </CardContent>
      </Card>

      <div className="min-w-0 space-y-4">
        <h2 className="text-xl font-semibold break-words">More from {author.fullName}</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {posts
            .filter((p) => p.userId === author.id && p.id !== post.id)
            .slice(0, 4)
            .map((relatedPost) => {
              return (
                <Link key={relatedPost.id} href={`/venue/dashboard/posts/${relatedPost.id}`}>
                  <Card className="h-full cursor-pointer border-gray-800 bg-gray-900 text-white transition-colors hover:bg-gray-800">
                    <CardContent className="p-4">
                      <div className="mb-2 flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600">
                          {author.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{author.fullName}</p>
                          <p className="truncate text-xs text-gray-500">@{author.username}</p>
                        </div>
                      </div>
                      <p className="text-sm line-clamp-3">{relatedPost.content}</p>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
        </div>
      </div>
    </div>
  )
}
