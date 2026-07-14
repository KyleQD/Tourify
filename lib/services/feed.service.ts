import { supabase as supabaseClient } from '@/lib/supabase'
import { Database } from '@/lib/database.types'

type Tables = Database['public']['Tables']
type Post = Tables['posts']['Row']
type Comment = Tables['post_comments']['Row']
type PostInsert = Tables['posts']['Insert']
type CommentInsert = Tables['post_comments']['Insert']

export interface ExtendedPost extends Post {
  profiles: {
    username: string | null
    full_name: string | null
    avatar_url: string | null
    is_verified: boolean
  } | null
  post_media: {
    id: string
    type: string
    url: string
    thumbnail_url: string | null
    alt_text: string | null
  }[]
  is_liked: boolean
  is_following: boolean
  hashtags_data: {
    id: string
    name: string
  }[]
}

export interface ExtendedComment extends Comment {
  profiles: {
    username: string | null
    full_name: string | null
    avatar_url: string | null
    is_verified: boolean
  } | null
  is_liked: boolean
  replies_count: number
}

export class FeedService {
  private supabase = supabaseClient

  private async attachOwnerProfiles<T extends { user_id?: string | null }>(posts: T[]): Promise<Array<T & { profiles: ExtendedPost['profiles'] }>> {
    const userIds = Array.from(new Set(posts.map(post => post.user_id).filter(Boolean) as string[]))
    if (userIds.length === 0) return posts.map(post => ({ ...post, profiles: null }))

    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, is_verified')
      .in('id', userIds)

    if (error) {
      console.warn('Error enriching feed profiles:', error)
      return posts.map(post => ({ ...post, profiles: null }))
    }

    const profilesById = new Map((data || []).map(profile => [profile.id, profile]))
    return posts.map(post => ({
      ...post,
      profiles: post.user_id ? profilesById.get(post.user_id) ?? null : null,
    }))
  }

  // Posts Management
  async createPost(data: {
    content: string
    type?: string
    visibility?: string
    location?: string
    media?: {
      type: string
      url: string
      thumbnail_url?: string
      alt_text?: string
    }[]
    hashtags?: string[]
  }) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Extract hashtags from content
      const hashtagMatches = data.content.match(/#[a-zA-Z0-9_]+/g)
      const hashtags = hashtagMatches?.map(tag => tag.substring(1).toLowerCase()) || []
      const allHashtags = [...hashtags, ...(data.hashtags || [])]

      // Create post
      const postData: PostInsert = {
        user_id: user.id,
        content: data.content,
        type: data.type || 'text',
        visibility: data.visibility || 'public',
        location: data.location,
        hashtags: allHashtags
      }

      const { data: post, error: postError } = await this.supabase
        .from('posts')
        .insert(postData)
        .select()
        .single()

      if (postError) throw postError

      // Create hashtag records
      if (allHashtags.length > 0) {
        for (const hashtag of allHashtags) {
          await this.supabase
            .from('hashtags')
            .upsert({ name: hashtag }, { onConflict: 'name' })

          const { data: hashtagData } = await this.supabase
            .from('hashtags')
            .select('id')
            .eq('name', hashtag)
            .single()

          if (hashtagData) {
            await this.supabase
              .from('post_hashtags')
              .insert({
                post_id: post.id,
                hashtag_id: hashtagData.id
              })
          }
        }
      }

      // Create media records
      if (data.media && data.media.length > 0) {
        const mediaData = data.media.map((media, index) => ({
          post_id: post.id,
          type: media.type,
          url: media.url,
          thumbnail_url: media.thumbnail_url,
          alt_text: media.alt_text,
          order_index: index
        }))

        await this.supabase
          .from('post_media')
          .insert(mediaData)
      }

      return { data: post, error: null }
    } catch (error) {
      console.error('Error creating post:', error)
      return { data: null, error }
    }
  }

  async getFeed(page = 0, limit = 20, type: 'all' | 'following' = 'all') {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      
      let query = this.supabase
        .from('posts')
        .select(`
          *,
          post_media (
            id,
            type,
            url,
            thumbnail_url,
            alt_text
          ),
          post_likes!left (
            user_id
          )
        `)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1)

      if (type === 'following' && user) {
        const { data: following } = await this.supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)

        if (following && following.length > 0) {
          const followingIds = following.map(f => f.following_id)
          query = query.in('user_id', followingIds)
        } else {
          return { data: [], error: null }
        }
      }

      const { data: posts, error } = await query

      if (error) throw error
      const postsWithProfiles = await this.attachOwnerProfiles(posts || [])

      // Add is_liked flag and other computed fields
      const extendedPosts = postsWithProfiles.map(post => ({
        ...post,
        is_liked: user ? post.post_likes.some((like: any) => like.user_id === user.id) : false,
        is_following: false, // Will be computed in a separate query if needed
        hashtags_data: [] // Will be populated if needed
      }))

      return { data: extendedPosts, error: null }
    } catch (error) {
      console.error('Error fetching feed:', error)
      return { data: [], error }
    }
  }

  async getPost(postId: string) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()

      const { data: post, error } = await this.supabase
        .from('posts')
        .select(`
          *,
          post_media (
            id,
            type,
            url,
            thumbnail_url,
            alt_text,
            order_index
          ),
          post_likes!left (
            user_id
          )
        `)
        .eq('id', postId)
        .single()

      if (error) throw error
      const [postWithProfile] = await this.attachOwnerProfiles(post ? [post] : [])

      const extendedPost = {
        ...postWithProfile,
        is_liked: user ? postWithProfile.post_likes.some((like: any) => like.user_id === user.id) : false
      }

      return { data: extendedPost, error: null }
    } catch (error) {
      console.error('Error fetching post:', error)
      return { data: null, error }
    }
  }

  async likePost(postId: string) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await this.supabase
        .from('post_likes')
        .insert({
          post_id: postId,
          user_id: user.id
        })

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Error liking post:', error)
      return { error }
    }
  }

  async unlikePost(postId: string) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await this.supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Error unliking post:', error)
      return { error }
    }
  }

  // Comments Management
  async createComment(data: {
    postId: string
    content: string
    parentCommentId?: string
  }) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const commentData: CommentInsert = {
        post_id: data.postId,
        user_id: user.id,
        content: data.content,
        parent_comment_id: data.parentCommentId
      }

      const { data: comment, error } = await this.supabase
        .from('post_comments')
        .insert(commentData)
        .select(`
          *,
          profiles (
            username,
            full_name,
            avatar_url,
            is_verified
          )
        `)
        .single()

      if (error) throw error
      return { data: comment, error: null }
    } catch (error) {
      console.error('Error creating comment:', error)
      return { data: null, error }
    }
  }

  async getComments(postId: string, page = 0, limit = 20) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()

      const { data: comments, error } = await this.supabase
        .from('post_comments')
        .select(`
          *,
          profiles (
            username,
            full_name,
            avatar_url,
            is_verified
          ),
          comment_likes!left (
            user_id
          )
        `)
        .eq('post_id', postId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1)

      if (error) throw error

      const extendedComments = comments?.map(comment => ({
        ...comment,
        is_liked: user ? comment.comment_likes.some((like: any) => like.user_id === user.id) : false,
        replies_count: 0 // Will be computed if needed
      })) || []

      return { data: extendedComments, error: null }
    } catch (error) {
      console.error('Error fetching comments:', error)
      return { data: [], error }
    }
  }

  async likeComment(commentId: string) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await this.supabase
        .from('comment_likes')
        .insert({
          comment_id: commentId,
          user_id: user.id
        })

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Error liking comment:', error)
      return { error }
    }
  }

  async unlikeComment(commentId: string) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await this.supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id)

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Error unliking comment:', error)
      return { error }
    }
  }

  // Follow Management
  async followUser(userId: string) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await this.supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: userId
        })

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Error following user:', error)
      return { error }
    }
  }

  async unfollowUser(userId: string) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await this.supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Error unfollowing user:', error)
      return { error }
    }
  }

  // Hashtag Management
  async getTrendingHashtags(limit = 10) {
    try {
      const { data: hashtags, error } = await this.supabase
        .from('hashtags')
        .select('*')
        .order('posts_count', { ascending: false })
        .limit(limit)

      if (error) throw error
      return { data: hashtags || [], error: null }
    } catch (error) {
      console.error('Error fetching trending hashtags:', error)
      return { data: [], error }
    }
  }

  async getPostsByHashtag(hashtag: string, page = 0, limit = 20) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()

      const { data: posts, error } = await this.supabase
        .from('posts')
        .select(`
          *,
          post_media (
            id,
            type,
            url,
            thumbnail_url,
            alt_text
          ),
          post_likes!left (
            user_id
          )
        `)
        .contains('hashtags', [hashtag])
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1)

      if (error) throw error
      const postsWithProfiles = await this.attachOwnerProfiles(posts || [])

      const extendedPosts = postsWithProfiles.map(post => ({
        ...post,
        is_liked: user ? post.post_likes.some((like: any) => like.user_id === user.id) : false
      }))

      return { data: extendedPosts, error: null }
    } catch (error) {
      console.error('Error fetching posts by hashtag:', error)
      return { data: [], error }
    }
  }

  // Real-time subscriptions
  subscribeToFeed(callback: (payload: any) => void) {
    return this.supabase
      .channel('public:posts')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'posts'
      }, callback)
      .subscribe()
  }

  subscribeToPostComments(postId: string, callback: (payload: any) => void) {
    return this.supabase
      .channel(`public:post_comments:post_id=eq.${postId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'post_comments',
        filter: `post_id=eq.${postId}`
      }, callback)
      .subscribe()
  }

  subscribeToPostLikes(postId: string, callback: (payload: any) => void) {
    return this.supabase
      .channel(`public:post_likes:post_id=eq.${postId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'post_likes',
        filter: `post_id=eq.${postId}`
      }, callback)
      .subscribe()
  }
} 
