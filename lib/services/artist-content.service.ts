import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/database.types'

// Types for content
export interface MusicContent {
  id?: string
  title: string
  description?: string
  type: 'single' | 'album' | 'ep' | 'mixtape'
  genre?: string
  release_date?: string
  duration?: number
  file_url?: string
  cover_art_url?: string
  spotify_url?: string
  apple_music_url?: string
  soundcloud_url?: string
  youtube_url?: string
  lyrics?: string
  credits?: Record<string, any>
  metadata?: Record<string, any>
  is_public?: boolean
  is_featured?: boolean
  tags?: string[]
}

export interface VideoContent {
  id?: string
  title: string
  description?: string
  type: 'music_video' | 'live_performance' | 'interview' | 'behind_scenes' | 'other'
  video_url: string
  thumbnail_url?: string
  youtube_url?: string
  vimeo_url?: string
  duration?: number
  resolution?: string
  is_public?: boolean
  is_featured?: boolean
  tags?: string[]
}

export interface PhotoContent {
  id?: string
  title?: string
  description?: string
  image_url: string
  thumbnail_url?: string
  alt_text?: string
  category?: 'performance' | 'studio' | 'portrait' | 'event' | 'behind_scenes' | 'other'
  location?: string
  photographer?: string
  shot_date?: string
  is_public?: boolean
  is_featured?: boolean
  tags?: string[]
}

export interface BlogContent {
  id?: string
  title: string
  slug: string
  content: string
  excerpt?: string
  featured_image_url?: string
  status?: 'draft' | 'published' | 'scheduled' | 'archived'
  published_at?: string
  scheduled_for?: string
  seo_title?: string
  seo_description?: string
  tags?: string[]
  categories?: string[]
}

export interface EventContent {
  id?: string
  title: string
  description?: string
  type: 'concert' | 'festival' | 'tour' | 'recording' | 'interview' | 'other'
  venue_name?: string
  venue_address?: string
  venue_city?: string
  venue_state?: string
  venue_country?: string
  event_date: string
  start_time?: string
  end_time?: string
  doors_open?: string
  ticket_url?: string
  ticket_price_min?: number
  ticket_price_max?: number
  capacity?: number
  status?: 'upcoming' | 'in_progress' | 'completed' | 'cancelled' | 'postponed'
  is_public?: boolean
  poster_url?: string
  setlist?: string[]
  notes?: string
}

export interface MerchandiseContent {
  id?: string
  name: string
  description?: string
  category: 'clothing' | 'accessories' | 'music' | 'art' | 'digital' | 'other'
  price: number
  currency?: string
  images?: string[]
  variants?: Record<string, any>
  inventory_count?: number
  sku?: string
  is_digital?: boolean
  digital_file_url?: string
  shipping_info?: Record<string, any>
  is_active?: boolean
  tags?: string[]
}

class ArtistContentService {
  private supabase = createClientComponentClient<Database>()

  // Music Content Management
  async createMusic(userId: string, artistProfileId: string, data: MusicContent) {
    const { data: result, error } = await this.supabase
      .from('artist_music')
      .insert({
        user_id: userId,
        artist_profile_id: artistProfileId,
        ...data
      })
      .select()
      .single()

    if (error) throw error
    return result
  }

  async getMusic(userId: string, options?: { limit?: number; featured?: boolean; ownerScope?: boolean }) {
    let query = this.supabase
      .from('artist_music')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (!options?.ownerScope) {
      query = query.eq('is_public', true)
    }

    if (options?.featured) {
      query = query.eq('is_featured', true)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  async updateMusic(id: string, userId: string, data: Partial<MusicContent>) {
    const { data: result, error } = await this.supabase
      .from('artist_music')
      .update(data)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return result
  }

  async deleteMusic(id: string, userId: string) {
    const { error } = await this.supabase
      .from('artist_music')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  }

  // Video Content Management
  async createVideo(userId: string, artistProfileId: string, data: VideoContent) {
    const { data: result, error } = await this.supabase
      .from('artist_videos')
      .insert({
        user_id: userId,
        artist_profile_id: artistProfileId,
        ...data
      })
      .select()
      .single()

    if (error) throw error
    return result
  }

  async getVideos(userId: string, options?: { limit?: number; featured?: boolean; ownerScope?: boolean }) {
    let query = this.supabase
      .from('artist_videos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (!options?.ownerScope) {
      query = query.eq('is_public', true)
    }

    if (options?.featured) {
      query = query.eq('is_featured', true)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  // Photo Content Management
  async createPhoto(userId: string, artistProfileId: string, data: PhotoContent) {
    const { data: result, error } = await this.supabase
      .from('artist_photos')
      .insert({
        user_id: userId,
        artist_profile_id: artistProfileId,
        ...data
      })
      .select()
      .single()

    if (error) throw error
    return result
  }

  async getPhotos(userId: string, options?: { limit?: number; category?: string; ownerScope?: boolean }) {
    let query = this.supabase
      .from('artist_photos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (!options?.ownerScope) {
      query = query.eq('is_public', true)
    }

    if (options?.category) {
      query = query.eq('category', options.category)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  // Blog Content Management
  async createBlogPost(userId: string, artistProfileId: string, data: BlogContent) {
    const { data: result, error } = await this.supabase
      .from('artist_blog_posts')
      .insert({
        user_id: userId,
        artist_profile_id: artistProfileId,
        ...data
      })
      .select()
      .single()

    if (error) throw error
    return result
  }

  async getBlogPosts(userId: string, options?: { limit?: number; status?: string }) {
    let query = this.supabase
      .from('artist_blog_posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (options?.status) {
      query = query.eq('status', options.status)
    } else {
      // Default to published posts for public view
      query = query.eq('status', 'published')
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  // Event Content Management
  async createEvent(userId: string, artistProfileId: string, data: EventContent) {
    const { data: result, error } = await this.supabase
      .from('artist_events')
      .insert({
        user_id: userId,
        artist_profile_id: artistProfileId,
        ...data
      })
      .select()
      .single()

    if (error) throw error
    return result
  }

  async getEvents(userId: string, options?: { limit?: number; status?: string; upcoming?: boolean; ownerScope?: boolean }) {
    let query = this.supabase
      .from('artist_events')
      .select('*')
      .eq('user_id', userId)

    if (!options?.ownerScope) {
      query = query.eq('is_public', true)
    }

    if (options?.status) {
      query = query.eq('status', options.status)
    }

    if (options?.upcoming) {
      query = query.gte('event_date', new Date().toISOString().split('T')[0])
    }

    query = query.order('event_date', { ascending: true })

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  // Merchandise Management
  async createMerchandise(userId: string, artistProfileId: string, data: MerchandiseContent) {
    const { data: result, error } = await this.supabase
      .from('artist_merchandise')
      .insert({
        user_id: userId,
        artist_profile_id: artistProfileId,
        ...data
      })
      .select()
      .single()

    if (error) throw error
    return result
  }

  async getMerchandise(userId: string, options?: { limit?: number; active?: boolean }) {
    let query = this.supabase
      .from('artist_merchandise')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (options?.active !== undefined) {
      query = query.eq('is_active', options.active)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  // Analytics and Stats
  async recordContentView(contentType: string, contentId: string, userId?: string) {
    try {
      // Record the view in analytics
      const { error } = await this.supabase
        .from('artist_fan_interactions')
        .insert({
          artist_id: userId || 'anonymous',
          fan_id: userId || 'anonymous',
          interaction_type: 'view',
          content_type: contentType,
          content_id: contentId,
          metadata: { timestamp: new Date().toISOString() }
        })

      if (error) {
        console.error('Error recording content view:', error)
      }
    } catch (error) {
      console.error('Error recording content view:', error)
    }
  }

  async getContentStats(userId: string) {
    try {
      const { data, error } = await this.supabase
        .rpc('get_artist_content_stats', { artist_user_id: userId })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting content stats:', error)
      return null
    }
  }

  // File Upload Helpers
  async uploadFile(bucket: string, path: string, file: File) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error
    return data
  }

  async getFileUrl(bucket: string, path: string) {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return data.publicUrl
  }

  async deleteFile(bucket: string, path: string) {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([path])

    if (error) throw error
  }
}

export const artistContentService = new ArtistContentService()
export default artistContentService 