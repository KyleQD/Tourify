import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface SocialInteraction {
  type: 'follow' | 'unfollow' | 'like' | 'unlike' | 'comment' | 'share'
  targetId: string
  targetType: 'profile' | 'post' | 'event' | 'music'
  content?: string
  userId?: string
}

export interface InteractionResponse {
  success: boolean
  message: string
  data?: any
}

class SocialInteractionsService {
  // Profile Interactions
  async followProfile(profileId: string, userId?: string): Promise<InteractionResponse> {
    try {
      if (!userId) {
        return { success: false, message: 'Please log in to follow profiles' }
      }

      if (userId === profileId) {
        return { success: false, message: 'You cannot follow yourself' }
      }

      // Use the proper social follow API
      const response = await fetch('/api/social/follow', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          followingId: profileId,
          action: 'follow'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to follow profile')
      }

      return { 
        success: true, 
        message: 'Profile followed successfully! 🎵',
        data: { action: 'follow', profileId, userId }
      }
    } catch (error) {
      console.error('Error following profile:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { 
        success: false, 
        message: `Failed to follow profile: ${errorMessage}` 
      }
    }
  }

  async unfollowProfile(profileId: string, userId?: string): Promise<InteractionResponse> {
    try {
      if (!userId) {
        return { success: false, message: 'Please log in to unfollow profiles' }
      }

      // Use the proper social follow API
      const response = await fetch('/api/social/follow', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          followingId: profileId,
          action: 'unfollow'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to unfollow profile')
      }

      return { 
        success: true, 
        message: 'Profile unfollowed! 👋',
        data: { action: 'unfollow', profileId, userId }
      }
    } catch (error) {
      console.error('Error unfollowing profile:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, message: `Failed to unfollow profile: ${errorMessage}` }
    }
  }

  async checkFollowStatus(profileId: string, userId?: string): Promise<boolean> {
    try {
      if (!userId) return false

      const response = await fetch(
        `/api/social/follow?action=check&followingId=${encodeURIComponent(profileId)}`,
        { credentials: 'include' },
      )

      if (!response.ok) return false

      const data = await response.json()
      return Boolean(data.isFollowing)
    } catch (error) {
      console.error('Error checking follow status:', error)
      return false
    }
  }

  // Post Interactions
  async likePost(postId: string, userId?: string): Promise<InteractionResponse> {
    try {
      if (!userId) {
        return { success: false, message: 'Please log in to like posts' }
      }

      const response = await fetch(`/api/posts/${postId}/likes`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'like' }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to like post')
      }

      return { 
        success: true, 
        message: 'Post liked! ❤️',
        data: { action: 'like', postId, userId }
      }
    } catch (error) {
      console.error('Error liking post - Full error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error liking post - Message:', errorMessage)
      return { 
        success: false, 
        message: `Failed to like post: ${errorMessage}` 
      }
    }
  }

  async unlikePost(postId: string, userId?: string): Promise<InteractionResponse> {
    try {
      if (!userId) {
        return { success: false, message: 'Please log in to unlike posts' }
      }

      const response = await fetch(`/api/posts/${postId}/likes`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'unlike' }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to unlike post')
      }

      return { 
        success: true, 
        message: 'Post unliked',
        data: { action: 'unlike', postId, userId }
      }
    } catch (error) {
      console.error('Error unliking post - Full error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error unliking post - Message:', errorMessage)
      return { 
        success: false, 
        message: `Failed to unlike post: ${errorMessage}` 
      }
    }
  }

  async commentOnPost(postId: string, content: string, userId?: string): Promise<InteractionResponse> {
    try {
      if (!userId) {
        return { success: false, message: 'Please log in to comment on posts' }
      }

      if (!content.trim()) {
        return { success: false, message: 'Comment cannot be empty' }
      }

      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to add comment')
      }

      const data = await response.json()

      return { 
        success: true, 
        message: 'Comment added! 💬',
        data: { action: 'comment', postId, userId, comment: data }
      }
    } catch (error) {
      console.error('Error commenting on post:', error)
      return { success: false, message: 'Failed to add comment' }
    }
  }

  async checkLikeStatus(postId: string, userId?: string): Promise<boolean> {
    try {
      if (!userId) return false

      const response = await fetch(`/api/posts/${postId}/likes`, {
        credentials: 'include',
      })

      if (!response.ok) return false

      const data = await response.json()
      return Boolean(data.is_liked)
    } catch (error) {
      console.error('Error checking like status:', error)
      return false
    }
  }

  async getPostLikes(postId: string): Promise<{ count: number; isLiked: boolean; userId?: string }> {
    try {
      const response = await fetch(`/api/posts/${postId}/likes`, {
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to fetch likes')

      const data = await response.json()
      const userId = this.getCurrentUserId()

      return {
        count: data.likes_count || 0,
        isLiked: Boolean(data.is_liked),
        userId: userId || undefined,
      }
    } catch (error) {
      console.error('Error getting post likes:', error)
      return { count: 0, isLiked: false }
    }
  }

  async getPostComments(postId: string): Promise<any[]> {
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        credentials: 'include',
      })

      if (!response.ok) return []

      const data = await response.json()
      return Array.isArray(data.comments) ? data.comments : []
    } catch (error) {
      console.error('Error getting post comments:', error)
      return []
    }
  }

  // Messaging
  async sendMessage(recipientId: string, content: string, senderId?: string): Promise<InteractionResponse> {
    try {
      if (!senderId) {
        return { success: false, message: 'Please log in to send messages' }
      }

      if (!content.trim()) {
        return { success: false, message: 'Message cannot be empty' }
      }

      const response = await fetch('/api/messages', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId,
          content: content.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to send message')
      }

      const data = await response.json()

      return {
        success: true,
        message: 'Message sent! 📩',
        data: { action: 'message', recipientId, senderId, message: data },
      }
    } catch (error) {
      console.error('Error sending message:', error)
      return { success: false, message: 'Failed to send message' }
    }
  }

  // Sharing
  async shareProfile(profileId: string, platform?: string): Promise<InteractionResponse> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, full_name, bio')
        .eq('id', profileId)
        .maybeSingle()

      if (error || !profile) {
        throw new Error('Profile not found')
      }

      const displayName = profile.full_name || profile.username || 'this profile'
      const shareData = {
        title: `Check out ${displayName} on Tourify`,
        text: profile.bio || `Discover ${displayName} on Tourify`,
        url: `${window.location.origin}/profile/${profile.username || profileId}`,
      }

      if (navigator.share && !platform) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareData.url)
      }

      return {
        success: true,
        message: 'Profile shared! 🔗',
        data: { action: 'share', profileId, shareData },
      }
    } catch (error) {
      console.error('Error sharing profile:', error)
      return { success: false, message: 'Failed to share profile' }
    }
  }

  async sharePost(postId: string, platform?: string): Promise<InteractionResponse> {
    try {
      const shareData = {
        title: 'Check out this post on Tourify',
        text: 'Check out this post on Tourify',
        url: `${window.location.origin}/posts/${postId}`,
      }

      if (navigator.share && !platform) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareData.url)
      }

      return {
        success: true,
        message: 'Post shared! 🔗',
        data: { action: 'share', postId, shareData },
      }
    } catch (error) {
      console.error('Error sharing post:', error)
      return { success: false, message: 'Failed to share post' }
    }
  }

  // Analytics and Stats
  async trackInteraction(interaction: SocialInteraction): Promise<void> {
    try {
      console.log('Interaction tracked:', interaction)
    } catch (error) {
      console.error('Error tracking interaction:', error)
    }
  }

  async getProfileStats(profileId: string): Promise<any> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('followers_count, following_count, posts_count')
        .eq('id', profileId)
        .maybeSingle()

      if (error) throw error

      return {
        followers: profile?.followers_count || 0,
        following: profile?.following_count || 0,
        posts: profile?.posts_count || 0,
      }
    } catch (error) {
      console.error('Error getting profile stats:', error)
      return {}
    }
  }

  // Utility functions
  getCurrentUserId(): string | null {
    // This should be called from components that have access to auth context
    // Return null here so components can handle authentication properly
    return null
  }

  isAuthenticated(): boolean {
    // This should be called from components that have access to auth context
    // Return false here so components can handle authentication properly
    return false
  }
}

export const socialInteractionsService = new SocialInteractionsService()
export default socialInteractionsService