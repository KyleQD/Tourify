import { supabase } from '@/lib/supabase/client'
import { type TicketType, type TicketSale, type SharePlatform, type PromoCode } from '@/types/ticketing'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'

export class TicketingService {
  private supabase = supabase

  // =============================================================================
  // CORE TICKETING OPERATIONS
  // =============================================================================

  async getEventTickets(eventId: string, includeAnalytics = false) {
    try {
      const response = await fetch(`/api/ticketing/enhanced?action=event_tickets&event_id=${eventId}&include_analytics=${includeAnalytics}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch event tickets')
      }
      
      return data
    } catch (error) {
      console.error('Error fetching event tickets:', error)
      throw error
    }
  }

  async checkAvailability(ticketTypeId: string, quantity: number, promoCode?: string) {
    try {
      const response = await fetch('/api/ticketing/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_availability',
          ticket_type_id: ticketTypeId,
          quantity,
          promo_code: promoCode
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check availability')
      }
      
      return data
    } catch (error) {
      console.error('Error checking availability:', error)
      throw error
    }
  }

  async purchaseTickets(purchaseData: {
    ticket_type_id: string
    event_id: string
    customer_email: string
    customer_name: string
    customer_phone?: string
    quantity: number
    payment_method?: string
    transaction_id?: string
    promo_code?: string
    referral_code?: string
    share_source?: string
    share_platform?: string
    social_media_share?: boolean
  }) {
    try {
      const response = await fetch('/api/ticketing/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'purchase',
          ...purchaseData
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to purchase tickets')
      }
      
      return data
    } catch (error) {
      console.error('Error purchasing tickets:', error)
      throw error
    }
  }

  // =============================================================================
  // SOCIAL SHARING & PROMOTION
  // =============================================================================

  async shareTicket(shareData: {
    event_id: string
    ticket_type_id?: string
    platform: SharePlatform
    share_text?: string
    share_url?: string
    user_id?: string
  }) {
    try {
      const response = await fetch('/api/ticketing/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'share',
          ...shareData
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to record share')
      }
      
      return data
    } catch (error) {
      console.error('Error sharing ticket:', error)
      throw error
    }
  }

  async getSocialStats(eventId: string) {
    try {
      const response = await fetch(`/api/ticketing/enhanced?action=social_stats&event_id=${eventId}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch social stats')
      }
      
      return data.social_stats
    } catch (error) {
      console.error('Error fetching social stats:', error)
      throw error
    }
  }

  async validatePromoCode(code: string, eventId: string, purchaseAmount: number, ticketTypeId?: string) {
    try {
      const response = await fetch('/api/ticketing/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate_promo_code',
          code,
          event_id: eventId,
          ticket_type_id: ticketTypeId,
          purchase_amount: purchaseAmount
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate promo code')
      }
      
      return data
    } catch (error) {
      console.error('Error validating promo code:', error)
      throw error
    }
  }

  async createReferral(referralData: {
    event_id: string
    referred_email: string
    referrer_id: string
    discount_amount: number
  }) {
    try {
      const response = await fetch('/api/ticketing/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_referral',
          ...referralData
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create referral')
      }
      
      return data
    } catch (error) {
      console.error('Error creating referral:', error)
      throw error
    }
  }

  // =============================================================================
  // FEED INTEGRATION
  // =============================================================================

  async createTicketPost(eventId: string, ticketTypeId?: string, message?: string) {
    try {
      // Get event and ticket information
      const eventData = await this.getEventTickets(eventId)
      const event = eventData.ticket_types[0]?.events
      const ticketType = ticketTypeId ? eventData.ticket_types.find((t: any) => t.id === ticketTypeId) : null

      // Create post content
      const postContent = message || this.generateTicketPostContent(event, ticketType)
      
      // Create post in feed
      const { data: post, error } = await this.supabase
        .from('posts')
        .insert({
          user_id: (await this.supabase.auth.getUser()).data.user?.id,
          content: postContent,
          type: 'ticket_promotion',
          metadata: {
            event_id: eventId,
            ticket_type_id: ticketTypeId,
            share_url: `${window.location.origin}/events/${eventId}${ticketTypeId ? `?ticket_type=${ticketTypeId}` : ''}`,
            event_title: event?.title,
            ticket_price: ticketType?.price
          }
        })
        .select()
        .single()

      if (error) throw error

      // Record share for analytics
      await this.shareTicket({
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        platform: 'instagram',
        share_text: postContent,
        share_url: `${window.location.origin}/events/${eventId}`
      })

      return post
    } catch (error) {
      console.error('Error creating ticket post:', error)
      throw error
    }
  }

  async shareToFeed(eventId: string, ticketTypeId?: string, customMessage?: string) {
    try {
      const post = await this.createTicketPost(eventId, ticketTypeId, customMessage)
      
      // Trigger feed refresh
      window.dispatchEvent(new CustomEvent('feed-update', { detail: { post } }))
      
      return post
    } catch (error) {
      console.error('Error sharing to feed:', error)
      throw error
    }
  }

  // =============================================================================
  // MESSAGING INTEGRATION
  // =============================================================================

  async sendTicketMessage(recipientId: string, eventId: string, ticketTypeId?: string, message?: string) {
    try {
      const eventData = await this.getEventTickets(eventId)
      const event = eventData.ticket_types[0]?.events
      const ticketType = ticketTypeId ? eventData.ticket_types.find((t: any) => t.id === ticketTypeId) : null

      const messageContent = message || this.generateTicketMessageContent(event, ticketType)

      // Create message
      const { data: msg, error } = await this.supabase
        .from('messages')
        .insert({
          sender_id: (await this.supabase.auth.getUser()).data.user?.id,
          recipient_id: recipientId,
          content: messageContent,
          type: 'ticket_invitation',
          metadata: {
            event_id: eventId,
            ticket_type_id: ticketTypeId,
            share_url: `${window.location.origin}/events/${eventId}${ticketTypeId ? `?ticket_type=${ticketTypeId}` : ''}`,
            event_title: event?.title,
            ticket_price: ticketType?.price
          }
        })
        .select()
        .single()

      if (error) throw error

      // Record share for analytics
      await this.shareTicket({
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        platform: 'email',
        share_text: messageContent,
        share_url: `${window.location.origin}/events/${eventId}`
      })

      return msg
    } catch (error) {
      console.error('Error sending ticket message:', error)
      throw error
    }
  }

  async sendBulkTicketInvites(recipientIds: string[], eventId: string, ticketTypeId?: string, message?: string) {
    try {
      const promises = recipientIds.map(recipientId => 
        this.sendTicketMessage(recipientId, eventId, ticketTypeId, message)
      )
      
      const results = await Promise.allSettled(promises)
      
      const successful = results.filter(result => result.status === 'fulfilled').length
      const failed = results.filter(result => result.status === 'rejected').length
      
      return { successful, failed, total: recipientIds.length }
    } catch (error) {
      console.error('Error sending bulk ticket invites:', error)
      throw error
    }
  }

  // =============================================================================
  // NOTIFICATION INTEGRATION
  // =============================================================================

  async sendTicketNotification(userId: string, notificationType: string, eventId: string, data?: any) {
    try {
      const { data: notification, error } = await this.supabase
        .from('ticket_notifications')
        .insert({
          user_id: userId,
          event_id: eventId,
          notification_type: notificationType,
          title: this.getNotificationTitle(notificationType),
          message: this.getNotificationMessage(notificationType, data),
          sent_via: ['in_app', 'email']
        })
        .select()
        .single()

      if (error) throw error

      return notification
    } catch (error) {
      console.error('Error sending ticket notification:', error)
      throw error
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private generateTicketPostContent(event: any, ticketType?: any): string {
    const priceText = ticketType ? ` starting at $${ticketType.price}` : ''
    const dateText = event?.date ? formatSafeDate(event.date) : ''
    const locationText = event?.location || ''
    
    return `🎫 ${event?.title}${priceText}\n📅 ${dateText}\n📍 ${locationText}\n\nGet your tickets now! #LiveMusic #Events`
  }

  private generateTicketMessageContent(event: any, ticketType?: any): string {
    const priceText = ticketType ? ` starting at $${ticketType.price}` : ''
    const dateText = event?.date ? formatSafeDate(event.date) : ''
    const locationText = event?.location || ''
    
    return `Hey! I thought you might be interested in this event:\n\n🎫 ${event?.title}${priceText}\n📅 ${dateText}\n📍 ${locationText}\n\nCheck it out and let me know if you want to go together!`
  }

  private getNotificationTitle(notificationType: string): string {
    const titles = {
      'purchase_confirmation': 'Ticket Purchase Confirmed',
      'event_reminder': 'Event Reminder',
      'ticket_transfer': 'Ticket Transferred',
      'refund_processed': 'Refund Processed',
      'promo_code': 'New Promo Code Available',
      'event_update': 'Event Update',
      'cancellation': 'Event Cancelled'
    }
    
    return titles[notificationType as keyof typeof titles] || 'Ticket Notification'
  }

  private getNotificationMessage(notificationType: string, data?: any): string {
    const messages = {
      'purchase_confirmation': `Your tickets for ${data?.event_title} have been confirmed! Order #${data?.order_number}`,
      'event_reminder': `Don't forget! ${data?.event_title} is tomorrow at ${data?.event_time}`,
      'ticket_transfer': `Your ticket for ${data?.event_title} has been transferred successfully.`,
      'refund_processed': `Your refund for ${data?.event_title} has been processed. Amount: $${data?.refund_amount}`,
      'promo_code': `Use code ${data?.promo_code} for ${data?.discount_value}% off ${data?.event_title}!`,
      'event_update': `Important update for ${data?.event_title}: ${data?.update_message}`,
      'cancellation': `Unfortunately, ${data?.event_title} has been cancelled. Your refund will be processed automatically.`
    }
    
    return messages[notificationType as keyof typeof messages] || 'You have a new ticket notification.'
  }

  // =============================================================================
  // ANALYTICS & REPORTING
  // =============================================================================

  async getTicketAnalytics(eventId?: string, startDate?: string, endDate?: string) {
    try {
      const params = new URLSearchParams()
      if (eventId) params.append('event_id', eventId)
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      
      const response = await fetch(`/api/admin/ticketing/enhanced?type=analytics&${params.toString()}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analytics')
      }
      
      return data.analytics
    } catch (error) {
      console.error('Error fetching ticket analytics:', error)
      throw error
    }
  }

  async getSocialPerformance(eventId?: string) {
    try {
      const params = new URLSearchParams()
      if (eventId) params.append('event_id', eventId)
      
      const response = await fetch(`/api/admin/ticketing/enhanced?type=social_performance&${params.toString()}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch social performance')
      }
      
      return data.social_performance
    } catch (error) {
      console.error('Error fetching social performance:', error)
      throw error
    }
  }

  // =============================================================================
  // EXPORT & REPORTING
  // =============================================================================

  async exportTicketData(eventId: string, format: 'csv' | 'json' = 'csv') {
    try {
      const response = await fetch(`/api/admin/ticketing/enhanced?type=export&event_id=${eventId}&format=${format}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to export ticket data')
      }
      
      return data
    } catch (error) {
      console.error('Error exporting ticket data:', error)
      throw error
    }
  }

  async generateTicketReport(eventId: string, reportType: 'sales' | 'analytics' | 'social' = 'sales') {
    try {
      const response = await fetch(`/api/admin/ticketing/enhanced?type=report&event_id=${eventId}&report_type=${reportType}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate report')
      }
      
      return data
    } catch (error) {
      console.error('Error generating ticket report:', error)
      throw error
    }
  }
}

// Export singleton instance
export const ticketingService = new TicketingService() 