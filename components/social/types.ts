import { User } from "@/types/user"

export interface Post {
  id: string
  userId: string
  content: string
  timestamp: string
  likes: string[]
  comments: number
  shares: number
  media?: {
    type: "image" | "video"
    url: string
    aspectRatio?: number
    alt?: string
  }[]
  visibility: "public" | "private" | "followers"
  location?: string
  linkPreview?: {
    url: string
    title: string
    description: string
    image: string
  }
  eventDetails?: {
    id?: string
    title: string
    date: string
    location: string
    time?: string
    description?: string
    ticketUrl?: string
    image?: string
  }
  pollOptions?: {
    id: string
    text: string
    votes: number
  }[]
  pollDuration?: string
  tags?: string[]
  media_urls?: string[]
  post_media?: {
    type: "image" | "video"
    url: string
    alt_text?: string
    thumbnail_url?: string
  }[]
  media_items?: {
    type: "image" | "video"
    url: string
    alt_text?: string
    thumbnail_url?: string
  }[]
  poll?: {
    question: string
    options: {
      id: string
      text: string
      votes: number
      position?: number
    }[]
    endsAt: string | null
    totalVotes?: number
    isClosed?: boolean
    viewerVotedOptionId?: string | null
    viewerHasVoted?: boolean
  }
}

export interface PostCreatorProps {
  onPostCreated: () => void
  defaultVisibility?: Post["visibility"]
  defaultContent?: string
  defaultMedia?: Post["media"]
  defaultLocation?: string
}

export interface PostFeedProps {
  userId?: string
  filter?: "all" | "following" | "trending" | "latest"
  showPostCreator?: boolean
  limit?: number
}

export interface PostItemProps {
  post: Post
  user: User
  onLike: (postId: string) => Promise<void>
  onUnlike: (postId: string) => Promise<void>
  onComment: (postId: string, content: string) => Promise<void>
  onShare: (postId: string) => Promise<void>
  isLiked: boolean
  className?: string
}

export interface ActivityFeedProps {
  userId?: string
  limit?: number
}

export interface SuggestedConnectionsProps {
  limit?: number
  excludeUserIds?: string[]
  onConnect?: (userId: string) => void
} 