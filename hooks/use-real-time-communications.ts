"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// =============================================================================
// TYPES
// =============================================================================

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type?: string
  is_read: boolean
  read_at?: string
  created_at: string
  updated_at?: string
  sender?: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
  }
}

interface Announcement {
  id: string
  venue_id?: string
  sender_id: string
  recipients: string[]
  subject: string
  content: string
  message_type: string
  priority: string
  read_by: string[]
  requires_acknowledgment: boolean
  acknowledged_by: string[]
  sent_at: string
  created_at: string
}

interface Channel {
  id: string
  name: string
  description?: string
  channel_type: string
  is_public: boolean
  is_archived: boolean
  created_at: string
}

interface CommunicationState {
  messages: Message[]
  announcements: Announcement[]
  channels: Channel[]
  onlineUsers: string[]
  isConnected: boolean
  lastUpdate?: Date
}

interface UseRealTimeCommunicationsOptions {
  channelIds?: string[]
  tourId?: string
  eventId?: string
  venueId?: string
  enablePresence?: boolean
  autoReconnect?: boolean
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useRealTimeCommunications(options: UseRealTimeCommunicationsOptions = {}) {
  const {
    channelIds = [],
    tourId,
    eventId,
    venueId,
    enablePresence = true,
    autoReconnect = true
  } = options

  // State
  const [state, setState] = useState<CommunicationState>({
    messages: [],
    announcements: [],
    channels: [],
    onlineUsers: [],
    isConnected: false
  })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Refs for managing subscriptions
  const subscriptionsRef = useRef<RealtimeChannel[]>([])
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  // Initialize Supabase client
  // Using imported supabase instance

  // =============================================================================
  // SUBSCRIPTION MANAGEMENT
  // =============================================================================

  const setupSubscriptions = useCallback(async () => {
    try {
      // Clear existing subscriptions
      subscriptionsRef.current.forEach(channel => {
        supabase.removeChannel(channel)
      })
      subscriptionsRef.current = []

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('User not authenticated')
        return
      }

      // Subscribe to messages in specified conversations
      if (channelIds.length > 0) {
        const messagesChannel = supabase
          .channel('messages')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `conversation_id=in.(${channelIds.join(',')})`
            },
            (payload) => {
              const newMessage = payload.new as Message
              setState(prev => ({
                ...prev,
                messages: [newMessage, ...prev.messages.slice(0, 99)],
                lastUpdate: new Date()
              }))
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'messages',
              filter: `conversation_id=in.(${channelIds.join(',')})`
            },
            (payload) => {
              const updatedMessage = payload.new as Message
              setState(prev => ({
                ...prev,
                messages: prev.messages.map(msg => 
                  msg.id === updatedMessage.id ? updatedMessage : msg
                ),
                lastUpdate: new Date()
              }))
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'messages',
              filter: `conversation_id=in.(${channelIds.join(',')})`
            },
            (payload) => {
              const deletedMessage = payload.old as Message
              setState(prev => ({
                ...prev,
                messages: prev.messages.filter(msg => msg.id !== deletedMessage.id),
                lastUpdate: new Date()
              }))
            }
          )

        subscriptionsRef.current.push(messagesChannel)
      }

      // Subscribe to team_communications (announcements)
      const announcementsChannel = supabase
        .channel('announcements')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'team_communications'
          },
          (payload) => {
            const newAnnouncement = payload.new as Announcement
            setState(prev => ({
              ...prev,
              announcements: [newAnnouncement, ...prev.announcements],
              lastUpdate: new Date()
            }))
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'team_communications'
          },
          (payload) => {
            const updatedAnnouncement = payload.new as Announcement
            setState(prev => ({
              ...prev,
              announcements: prev.announcements.map(ann => 
                ann.id === updatedAnnouncement.id ? updatedAnnouncement : ann
              ),
              lastUpdate: new Date()
            }))
          }
        )

      subscriptionsRef.current.push(announcementsChannel)

      // Subscribe to channels
      const channelsChannel = supabase
        .channel('channels')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'communication_channels'
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newChannel = payload.new as Channel
              setState(prev => ({
                ...prev,
                channels: [...prev.channels, newChannel],
                lastUpdate: new Date()
              }))
            } else if (payload.eventType === 'UPDATE') {
              const updatedChannel = payload.new as Channel
              setState(prev => ({
                ...prev,
                channels: prev.channels.map(ch => 
                  ch.id === updatedChannel.id ? updatedChannel : ch
                ),
                lastUpdate: new Date()
              }))
            } else if (payload.eventType === 'DELETE') {
              const deletedChannel = payload.old as Channel
              setState(prev => ({
                ...prev,
                channels: prev.channels.filter(ch => ch.id !== deletedChannel.id),
                lastUpdate: new Date()
              }))
            }
          }
        )

      subscriptionsRef.current.push(channelsChannel)

      // Set up presence tracking if enabled
      if (enablePresence) {
        const presenceChannel = supabase
          .channel('presence', {
            config: {
              presence: {
                key: user.id
              }
            }
          })
          .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState()
            const onlineUsers = Object.keys(state)
            setState(prev => ({
              ...prev,
              onlineUsers,
              lastUpdate: new Date()
            }))
          })
          .on('presence', { event: 'join' }, ({ key }) => {
            setState(prev => ({
              ...prev,
              onlineUsers: [...new Set([...prev.onlineUsers, key])],
              lastUpdate: new Date()
            }))
          })
          .on('presence', { event: 'leave' }, ({ key }) => {
            setState(prev => ({
              ...prev,
              onlineUsers: prev.onlineUsers.filter(id => id !== key),
              lastUpdate: new Date()
            }))
          })

        // Track user presence
        presenceChannel.track({
          user_id: user.id,
          online_at: new Date().toISOString()
        })

        subscriptionsRef.current.push(presenceChannel)
      }

      // Subscribe to all channels
      await Promise.all(subscriptionsRef.current.map(channel => channel.subscribe()))

      setState(prev => ({ ...prev, isConnected: true }))
      setError(null)

    } catch (err) {
      console.error('Error setting up real-time subscriptions:', err)
      setError(err instanceof Error ? err.message : 'Connection error')
      setState(prev => ({ ...prev, isConnected: false }))

      // Auto-reconnect if enabled
      if (autoReconnect && !reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = undefined
          setupSubscriptions()
        }, 5000)
      }
    }
  }, [channelIds, tourId, eventId, venueId, enablePresence, autoReconnect])

  // =============================================================================
  // EFFECT HOOKS
  // =============================================================================

  useEffect(() => {
    setIsLoading(true)
    setupSubscriptions().finally(() => setIsLoading(false))

    return () => {
      // Cleanup subscriptions
      subscriptionsRef.current.forEach(channel => {
        supabase.removeChannel(channel)
      })
      
      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [setupSubscriptions])

  // =============================================================================
  // ACTION METHODS
  // =============================================================================

  const sendMessage = useCallback(async (conversationId: string, content: string, options: {
    messageType?: string
    priority?: string
  } = {}) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          message_type: options.messageType || 'text'
        })
        .select(`
          id,
          content,
          sender_id,
          conversation_id,
          is_read,
          created_at,
          sender:profiles!sender_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .single()

      if (insertError) throw new Error(insertError.message)

      await supabase
        .from('conversations')
        .update({
          last_message_id: data.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

      return data
    } catch (err) {
      console.error('Error sending message:', err)
      throw err
    }
  }, [])

  const createAnnouncement = useCallback(async (announcement: {
    subject: string
    content: string
    messageType?: string
    priority?: string
    recipients?: string[]
    venueId?: string
    requiresAcknowledgment?: boolean
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error: insertError } = await supabase
        .from('team_communications')
        .insert({
          sender_id: user.id,
          subject: announcement.subject,
          content: announcement.content,
          message_type: announcement.messageType || 'announcement',
          priority: announcement.priority || 'normal',
          recipients: announcement.recipients || [],
          venue_id: announcement.venueId || venueId || null,
          requires_acknowledgment: announcement.requiresAcknowledgment ?? false
        })
        .select()
        .single()

      if (insertError) throw new Error(insertError.message)
      return data
    } catch (err) {
      console.error('Error creating announcement:', err)
      throw err
    }
  }, [venueId])

  const acknowledgeAnnouncement = useCallback(async (announcementId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data: existing, error: fetchError } = await supabase
        .from('team_communications')
        .select('acknowledged_by')
        .eq('id', announcementId)
        .single()

      if (fetchError) throw new Error(fetchError.message)

      const alreadyAcknowledged = (existing.acknowledged_by || []) as string[]
      if (alreadyAcknowledged.includes(user.id)) return existing

      const { data, error: updateError } = await supabase
        .from('team_communications')
        .update({
          acknowledged_by: [...alreadyAcknowledged, user.id]
        })
        .eq('id', announcementId)
        .select()
        .single()

      if (updateError) throw new Error(updateError.message)
      return data
    } catch (err) {
      console.error('Error acknowledging announcement:', err)
      throw err
    }
  }, [])

  const reconnect = useCallback(() => {
    setState(prev => ({ ...prev, isConnected: false }))
    setupSubscriptions()
  }, [setupSubscriptions])

  // =============================================================================
  // RETURN HOOK INTERFACE
  // =============================================================================

  return {
    // State
    ...state,
    isLoading,
    error,

    // Actions
    sendMessage,
    createAnnouncement,
    acknowledgeAnnouncement,
    reconnect,

    getConversationMessages: (conversationId: string) => 
      state.messages.filter(msg => msg.conversation_id === conversationId),
    
    getUnreadCount: async (conversationId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return 0

      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .eq('is_read', false)
        .neq('sender_id', user.id)

      if (error) {
        console.error('Error fetching unread count:', error)
        return 0
      }
      return count ?? 0
    },

    getActiveAnnouncements: () => state.announcements
  }
}

// =============================================================================
// UTILITY HOOK FOR SIMPLE MESSAGE LISTENING
// =============================================================================

export function useConversationMessages(conversationId: string) {
  const { messages, isConnected, sendMessage } = useRealTimeCommunications({
    channelIds: [conversationId]
  })

  const conversationMessages = messages.filter(msg => msg.conversation_id === conversationId)

  return {
    messages: conversationMessages,
    isConnected,
    sendMessage: (content: string, options?: any) => sendMessage(conversationId, content, options)
  }
}

// =============================================================================
// UTILITY HOOK FOR ANNOUNCEMENTS
// =============================================================================

export function useAnnouncements(options: {
  venueId?: string
} = {}) {
  const { announcements, isConnected, createAnnouncement, acknowledgeAnnouncement } = 
    useRealTimeCommunications(options)

  const urgentAnnouncements = announcements.filter(ann => ann.priority === 'urgent')
  const highAnnouncements = announcements.filter(ann => ann.priority === 'high')

  return {
    announcements,
    urgentAnnouncements,
    highAnnouncements,
    isConnected,
    createAnnouncement,
    acknowledgeAnnouncement
  }
}