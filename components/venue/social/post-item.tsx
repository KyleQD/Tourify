"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/auth-context"
import { useSocial } from "@/context/social-context"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { LinkPreview, extractUrls, hasUrls } from "@/components/ui/link-preview"
import {
  Heart,
  MessageSquare,
  Share,
  MoreHorizontal,
  Bookmark,
  Calendar,
  MapPin,
  Globe,
  Users,
  Lock,
  Send,
  ImageIcon,
  Smile,
  LinkIcon,
  ExternalLink,
  Flag,
  Trash2,
  Edit,
  Copy,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface PostItemProps {
  post: any
  author: any
  showActions?: boolean
  showComments?: boolean
  isDetail?: boolean
  className?: string
}

// Dummy users data for comments (replace with actual data fetching)
const users = [
  {
    id: "user1",
    fullName: "John Doe",
    username: "johndoe",
    avatar: "/avatars/01.png",
  },
  {
    id: "user2",
    fullName: "Jane Smith",
    username: "janesmith",
    avatar: "/avatars/02.png",
  },
  {
    id: "user3",
    fullName: "Alice Johnson",
    username: "alicejohnson",
    avatar: "/avatars/03.png",
  },
]

export function PostItem({
  post,
  author,
  showActions = true,
  showComments = false,
  isDetail = false,
  className = "",
}: PostItemProps) {
  const { user: currentUser } = useAuth()
  const { } = useSocial()
  const { toast } = useToast()
  const router = useRouter()

  const [isLiked, setIsLiked] = useState(post.likes.includes(currentUser?.id))
  const [likeCount, setLikeCount] = useState(post.likes.length)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [showCommentForm, setShowCommentForm] = useState(showComments)
  const [commentText, setCommentText] = useState("")
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [showAllComments, setShowAllComments] = useState(isDetail)
  const [showAllContent, setShowAllContent] = useState(isDetail || post.content.length < 300)

  const handleLikeToggle = async () => {
    try {
      if (isLiked) {
        // Mock unlikePost for now
        console.log("Unliking post:", post.id)
        setLikeCount((prev: number) => prev - 1)
      } else {
        // Mock likePost for now
        console.log("Liking post:", post.id)
        setLikeCount((prev: number) => prev + 1)
      }
      setIsLiked(!isLiked)
    } catch (error) {
      console.error("Error toggling like:", error)
      toast({
        title: "Error",
        description: "Failed to update like status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleBookmarkToggle = () => {
    setIsBookmarked(!isBookmarked)
    toast({
      title: isBookmarked ? "Removed from bookmarks" : "Added to bookmarks",
      description: isBookmarked
        ? "The post has been removed from your bookmarks."
        : "The post has been added to your bookmarks.",
    })
  }

  const handleCommentSubmit = async () => {
    if (!commentText.trim()) return

    setIsSubmittingComment(true)

    try {
      // Mock addComment for now
      console.log("Adding comment to post:", post.id, commentText)
      setCommentText("")
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully.",
      })
    } catch (error) {
      console.error("Error adding comment:", error)
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleShare = () => {
    // In a real app, this would open a share dialog
    navigator.clipboard.writeText(`https://tourify.com/posts/${post.id}`)
    toast({
      title: "Link copied",
      description: "Post link has been copied to clipboard.",
    })
  }

  const handlePostClick = () => {
    if (!isDetail) {
      router.push(`/posts/${post.id}`)
    }
  }

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/profile/${author.username}`)
  }

  const handleReport = () => {
    toast({
      title: "Post reported",
      description: "Thank you for reporting this post. We'll review it shortly.",
    })
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch (error) {
      return "some time ago"
    }
  }

  const renderVisibilityIcon = () => {
    if (post.visibility === "private") {
      return <Lock className="h-3 w-3" />
    } else if (post.visibility === "connections") {
      return <Users className="h-3 w-3" />
    } else {
      return <Globe className="h-3 w-3" />
    }
  }

  const truncateContent = (content: string, maxLength = 300) => {
    if (content.length <= maxLength || showAllContent) return content
    return content.substring(0, maxLength) + "..."
  }

  const renderMediaContent = () => {
    if (!post.media || post.media.length === 0) return null

    return (
      <div
        className={`mt-3 grid gap-2 ${
          post.media.length === 1
            ? "grid-cols-1"
            : post.media.length === 2
              ? "grid-cols-2"
              : post.media.length === 3
                ? "grid-cols-2"
                : "grid-cols-2"
        }`}
      >
        {post.media.slice(0, 4).map((media: any, index: number) => (
          <div
            key={index}
            className={`relative rounded-md overflow-hidden ${
              post.media.length === 3 && index === 0 ? "col-span-2" : ""
            }`}
          >
            {media.type === "image" ? (
              <img
                src={media.url || "/placeholder.svg?height=300&width=500"}
                alt={media.alt || "Post image"}
                className="w-full h-auto object-cover rounded-md"
                style={{ maxHeight: "400px" }}
              />
            ) : (
              <video src={media.url} controls className="w-full h-auto rounded-md" style={{ maxHeight: "400px" }} />
            )}
            {post.media.length > 4 && index === 3 && (
              <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                <span className="text-white text-xl font-bold">+{post.media.length - 4} more</span>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderLinkPreview = () => {
    if (!post.linkPreview) return null

    return (
      <div className="mt-3 border border-gray-700 rounded-md overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          {post.linkPreview.image && (
            <div className="sm:w-1/3">
              <img
                src={post.linkPreview.image || "/placeholder.svg?height=200&width=300"}
                alt={post.linkPreview.title || "Link preview"}
                className="w-full h-32 sm:h-full object-cover"
              />
            </div>
          )}
          <div className={`p-3 ${post.linkPreview.image ? "sm:w-2/3" : "w-full"}`}>
            <p className="text-xs text-gray-400 mb-1 flex items-center">
              <LinkIcon className="h-3 w-3 mr-1" />
              {post.linkPreview.url}
            </p>
            <h4 className="font-medium mb-1">{post.linkPreview.title}</h4>
            <p className="text-sm text-gray-300">{post.linkPreview.description}</p>
            <Button
              variant="link"
              size="sm"
              className="mt-1 p-0 h-auto text-purple-400 hover:text-purple-300"
              onClick={(e) => {
                e.stopPropagation()
                window.open(post.linkPreview.url, "_blank")
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1" /> Visit
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const renderEventDetails = () => {
    if (!post.eventDetails) return null

    return (
      <div className="mt-3 bg-gray-800 rounded-md p-3 border border-gray-700">
        <h3 className="font-medium text-lg mb-2">{post.eventDetails.title}</h3>
        <div className="space-y-1 text-sm">
          <div className="flex items-center text-gray-300">
            <Calendar className="h-4 w-4 mr-2 text-purple-400" />
            {formatSafeDate(post.eventDetails.startDate)}
            {post.eventDetails.endDate &&
              post.eventDetails.startDate !== post.eventDetails.endDate &&
              ` - ${formatSafeDate(post.eventDetails.endDate)}`}
          </div>
          {post.eventDetails.location && (
            <div className="flex items-center text-gray-300">
              <MapPin className="h-4 w-4 mr-2 text-purple-400" />
              {post.eventDetails.location}
            </div>
          )}
          {post.eventDetails.description && <p className="mt-2 text-gray-300">{post.eventDetails.description}</p>}
        </div>
        <div className="mt-3">
          <Button
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/events/${post.id}`)
            }}
          >
            View Event
          </Button>
        </div>
      </div>
    )
  }

  const renderPollContent = () => {
    if (!post.pollOptions) return null

    return (
      <div className="mt-3 bg-gray-800 rounded-md p-3 border border-gray-700">
        <h3 className="font-medium mb-3">Poll: {post.content}</h3>
        <div className="space-y-2">
          {post.pollOptions.map((option: string, index: number) => {
            // Calculate a random percentage for demo purposes
            const percentage = Math.floor(Math.random() * 100)
            const isVoted = index === 0 // Simulate user voted for the first option

            return (
              <div key={index} className="relative">
                <div
                  className={`absolute left-0 top-0 h-full ${
                    isVoted ? "bg-purple-600/30" : "bg-gray-700/50"
                  } rounded-md z-0`}
                  style={{ width: `${percentage}%` }}
                ></div>
                <div className="relative z-10 flex items-center justify-between p-2">
                  <div className="flex items-center">
                    <div
                      className={`h-4 w-4 rounded-full mr-2 ${
                        isVoted ? "bg-purple-500 ring-2 ring-purple-300 ring-opacity-50" : "bg-gray-600"
                      }`}
                    ></div>
                    <span>{option}</span>
                  </div>
                  <span className="text-sm font-medium">{percentage}%</span>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
          <span>
            {Math.floor(Math.random() * 100) + 10} votes • {post.pollDuration || "1 day"} remaining
          </span>
          {post.pollOptions && (
            <Button variant="link" size="sm" className="p-0 h-auto text-purple-400 hover:text-purple-300">
              Vote
            </Button>
          )}
        </div>
      </div>
    )
  }

  const renderComments = () => {
    if (!showCommentForm && !showComments) return null

    const commentsToShow = showAllComments ? post.comments : post.comments.slice(0, 2)

    return (
      <div className="mt-4">
        {post.comments.length > 0 && (
          <>
            <Separator className="my-3 bg-gray-800" />
            <div className="space-y-3">
              {commentsToShow.map((comment: any, index: number) => {
                const commentAuthor = users.find((u: any) => u.id === comment.userId)
                if (!commentAuthor) return null

                return (
                  <div key={index} className="flex space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={commentAuthor.avatar} alt={commentAuthor.fullName} />
                      <AvatarFallback>
                        {commentAuthor.fullName
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-gray-800 rounded-lg p-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{commentAuthor.fullName}</span>
                          <span className="text-xs text-gray-400">{formatTimestamp(comment.timestamp)}</span>
                        </div>
                        <p className="text-sm mt-1">{comment.content}</p>
                      </div>
                      <div className="flex items-center mt-1 space-x-3 text-xs text-gray-400">
                        <button className="hover:text-white">Like</button>
                        <button className="hover:text-white">Reply</button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {post.comments.length > 2 && !showAllComments && (
                <Button
                  variant="link"
                  size="sm"
                  className="text-purple-400 hover:text-purple-300 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowAllComments(true)
                  }}
                >
                  View all {post.comments.length} comments
                </Button>
              )}
            </div>
          </>
        )}

        {showCommentForm && (
          <div className="mt-3 flex space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src="/placeholder.svg" alt="User" />
              <AvatarFallback>
                {currentUser?.email?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="min-h-[80px] bg-gray-800 border-gray-700 text-white resize-none"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex justify-between items-center">
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={!commentText.trim() || isSubmittingComment}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCommentSubmit()
                  }}
                >
                  {isSubmittingComment ? (
                    <>
                                              <LoadingSpinner />
                      <span className="ml-2">Posting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Comment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card
      className={`bg-gray-900 text-white border-gray-800 ${!isDetail ? "hover:border-gray-700 cursor-pointer" : ""} ${className}`}
      onClick={handlePostClick}
    >
      <CardContent className="p-4">
        <div className="flex space-x-3">
          <div onClick={handleAuthorClick}>
            <Avatar className="h-10 w-10 cursor-pointer">
              <AvatarImage src={author.avatar} alt={author.fullName} />
              <AvatarFallback>
                {author.fullName
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div onClick={handleAuthorClick} className="cursor-pointer">
                  <span className="font-medium hover:underline">{author.fullName}</span>
                  <div className="flex items-center text-gray-400 text-sm">
                    <span className="mr-1">@{author.username}</span>
                    <span className="mx-1">•</span>
                    <span className="flex items-center">
                      {renderVisibilityIcon()}
                      <span className="ml-1">{formatTimestamp(post.timestamp)}</span>
                    </span>
                  </div>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-gray-800 border-gray-700">
                  {currentUser?.id === author.id ? (
                    <>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/posts/${post.id}/edit`)
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Post
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer text-red-500"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Delete post logic
                          toast({
                            title: "Post deleted",
                            description: "Your post has been deleted successfully.",
                          })
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Post
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleBookmarkToggle()
                        }}
                      >
                        <Bookmark className="h-4 w-4 mr-2" />
                        {isBookmarked ? "Remove Bookmark" : "Bookmark Post"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleReport()
                        }}
                      >
                        <Flag className="h-4 w-4 mr-2" />
                        Report Post
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleShare()
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

                        <div className="mt-2">
              <p className="whitespace-pre-line">{truncateContent(post.content)}</p>
              {!showAllContent && post.content.length > 300 && (
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto text-purple-400 hover:text-purple-300 mt-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowAllContent(true)
                  }}
                >
                  Read more
                </Button>
              )}

              {/* Link Preview for URLs in content */}
              {hasUrls(post.content) && (
                <LinkPreview 
                  url={extractUrls(post.content)[0]} 
                  className="mt-2"
                />
              )}

              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {post.tags.map((tag: string, index: number) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="bg-purple-900/20 hover:bg-purple-900/30 text-purple-400 border-purple-500/20 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/social/hashtag/${tag.replace("#", "")}`)
                        }}
                      >
                        {tag.startsWith("#") ? tag : `#${tag}`}
                      </Badge>
                    ))}
                  </div>
                )}

              {renderMediaContent()}
              {renderLinkPreview()}
              {renderEventDetails()}
              {renderPollContent()}
              {renderComments()}
            </div>
          </div>
        </div>
      </CardContent>

      {showActions && (
        <CardFooter className="px-4 py-3 border-t border-gray-800 flex justify-between">
          <div className="flex space-x-6">
            <Button
              variant="ghost"
              size="sm"
              className={`flex items-center space-x-1 ${isLiked ? "text-purple-400" : "text-gray-400 hover:text-white"}`}
              onClick={(e) => {
                e.stopPropagation()
                handleLikeToggle()
              }}
            >
              <Heart className={`h-4 w-4 ${isLiked ? "fill-purple-400" : ""}`} />
              <span>{likeCount > 0 ? likeCount : ""}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-1 text-gray-400 hover:text-white"
              onClick={(e) => {
                e.stopPropagation()
                setShowCommentForm(!showCommentForm)
              }}
            >
              <MessageSquare className="h-4 w-4" />
              <span>{post.comments.length > 0 ? post.comments.length : ""}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-1 text-gray-400 hover:text-white"
              onClick={(e) => {
                e.stopPropagation()
                handleShare()
              }}
            >
              <Share className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className={`flex items-center space-x-1 ${isBookmarked ? "text-purple-400" : "text-gray-400 hover:text-white"}`}
            onClick={(e) => {
              e.stopPropagation()
              handleBookmarkToggle()
            }}
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-purple-400" : ""}`} />
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
