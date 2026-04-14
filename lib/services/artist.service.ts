import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/database.types'

export interface EventData {
  id?: string
  name: string
  description: string
  date: string
  venue: string
  location?: string
  capacity?: number
  ticket_price?: number
  currency?: string
  status: 'draft' | 'published' | 'cancelled'
  type: 'concert' | 'festival' | 'tour' | 'other'
  user_id?: string
}

export interface ContentData {
  id?: string
  title: string
  description?: string
  type: 'music' | 'video' | 'photo' | 'blog' | 'document'
  url?: string
  file_path?: string
  tags?: string[]
  is_public: boolean
  user_id?: string
}

export interface BusinessData {
  revenue: number
  expenses: number
  profit: number
  transactions: Array<{
    id: string
    type: 'income' | 'expense'
    amount: number
    description: string
    date: string
    category: string
  }>
}

class ArtistService {
  private readonly supabase = supabase

  // Events Management
  async createEvent(eventData: EventData): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await this.supabase
        .from('events')
        .insert({
          ...eventData,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error creating event:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async getEvents(): Promise<{ success: boolean; data?: EventData[]; error?: string }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await this.supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error fetching events:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async updateEvent(id: string, eventData: Partial<EventData>): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('events')
        .update({
          ...eventData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error updating event:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async deleteEvent(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('events')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error deleting event:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Content Management
  async uploadContent(contentData: ContentData, file?: File): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let filePath = ''
      
      // Upload file if provided
      if (file) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`
        
        const { data: uploadData, error: uploadError } = await this.supabase.storage
          .from('content')
          .upload(fileName, file)

        if (uploadError) throw uploadError
        filePath = uploadData.path
      }

      const { data, error } = await this.supabase
        .from('content')
        .insert({
          ...contentData,
          user_id: user.id,
          file_path: filePath,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error uploading content:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async getContent(type?: string): Promise<{ success: boolean; data?: ContentData[]; error?: string }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let query = this.supabase
        .from('content')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (type) {
        query = query.eq('type', type)
      }

      const { data, error } = await query

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error fetching content:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Business Analytics
  async getBusinessAnalytics(): Promise<{ success: boolean; data?: BusinessData; error?: string }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // For now, return simulated data
      // In a real app, this would fetch from actual business/transaction tables
      const mockData: BusinessData = {
        revenue: Math.floor(Math.random() * 50000) + 10000,
        expenses: Math.floor(Math.random() * 20000) + 5000,
        profit: 0,
        transactions: [
          {
            id: '1',
            type: 'income',
            amount: 2450,
            description: 'Streaming royalties',
            date: new Date().toISOString(),
            category: 'royalties'
          },
          {
            id: '2',
            type: 'expense',
            amount: 150,
            description: 'Studio rental',
            date: new Date().toISOString(),
            category: 'equipment'
          },
          {
            id: '3',
            type: 'income',
            amount: 890,
            description: 'Concert ticket sales',
            date: new Date().toISOString(),
            category: 'live'
          }
        ]
      }
      
      mockData.profit = mockData.revenue - mockData.expenses

      return { success: true, data: mockData }
    } catch (error) {
      console.error('Error fetching business analytics:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Network/Collaboration
  async searchArtists(query: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .or(`stage_name.ilike.%${query}%,bio.ilike.%${query}%,genre.ilike.%${query}%`)
        .limit(20)

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error searching artists:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async sendConnectionRequest(targetUserId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await this.supabase
        .from('connections')
        .insert({
          requester_id: user.id,
          target_id: targetUserId,
          status: 'pending',
          created_at: new Date().toISOString()
        })

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error sending connection request:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Messages
  async getConversations(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // For now return mock data
      const mockConversations = [
        {
          id: '1',
          other_user: {
            id: '2',
            name: 'Sarah Chen',
            avatar: null,
            stage_name: 'Electronic Producer'
          },
          last_message: 'Hey! Loved your new track!',
          last_message_time: new Date().toISOString(),
          unread_count: 2
        },
        {
          id: '2',
          other_user: {
            id: '3',
            name: 'Mike Rodriguez',
            avatar: null,
            stage_name: 'Sound Engineer'
          },
          last_message: 'When are you free for a studio session?',
          last_message_time: new Date(Date.now() - 86400000).toISOString(),
          unread_count: 0
        }
      ]

      return { success: true, data: mockConversations }
    } catch (error) {
      console.error('Error fetching conversations:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async sendMessage(conversationId: string, content: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await this.supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          created_at: new Date().toISOString()
        })

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error sending message:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Profile Management
  async updateProfile(profileData: any): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await this.supabase
        .from('profiles')
        .update({
          ...profileData,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error updating profile:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Utility Functions
  async uploadFile(file: File, bucket: string, path?: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const fileExt = file.name.split('.').pop()
      const fileName = path || `${user.id}/${Date.now()}.${fileExt}`
      
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(fileName, file)

      if (error) throw error

      const { data: urlData } = this.supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)

      return { success: true, url: urlData.publicUrl }
    } catch (error) {
      console.error('Error uploading file:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

export const artistService = new ArtistService()
export default artistService 