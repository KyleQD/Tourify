// =============================================================================
// TICKETING SYSTEM TYPES
// Comprehensive types for the enhanced ticketing system
// =============================================================================

import type { User } from '@/lib/types'

export type TicketOrderStatus = 'pending' | 'completed' | 'paid' | 'refunded' | 'failed' | 'canceled'
export type TicketStatus = 'valid' | 'assigned' | 'transferred' | 'checked_in' | 'refunded' | 'canceled' | 'void'
export type TicketCredentialStatus = 'active' | 'revoked' | 'expired' | 'superseded'
export type TicketTransferStatus = 'pending' | 'accepted' | 'declined' | 'canceled' | 'expired'
export type TicketDeliveryStatus = 'queued' | 'sent' | 'failed' | 'resent' | 'opened' | 'claimed' | 'expired'
export type TicketScanOutcome = 'admit' | 'deny' | 'duplicate' | 'offline_queued' | 'revoked' | 'wrong_event' | 'expired' | 'conflict' | 'invalid' | 'refunded' | 'canceled'
export type TicketCompRequestStatus = 'requested' | 'approved' | 'denied' | 'issued' | 'canceled'
export type TicketProviderEventStatus = 'pending' | 'processed' | 'quarantined' | 'failed' | 'ignored'
export type TicketSettlementStatus = 'draft' | 'review' | 'approved' | 'exported' | 'paid' | 'reopened'

// =============================================================================
// CORE TICKETING TYPES
// =============================================================================

export interface TicketType {
  id: string
  event_id: string
  name: string
  description?: string
  price: number
  quantity_available: number
  quantity_sold: number
  max_per_customer?: number
  sale_start?: string
  sale_end?: string
  is_active: boolean
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  
  // Enhanced fields
  ticket_code?: string
  category: 'general' | 'vip' | 'premium' | 'early_bird' | 'student' | 'senior' | 'group' | 'backstage'
  benefits?: string[]
  seating_section?: string
  seating_row?: string
  seating_number?: string
  is_transferable: boolean
  transfer_fee: number
  refund_policy: string
  age_restriction?: number
  requires_id: boolean
  promo_codes: string[]
  share_url?: string
  social_media_meta?: Record<string, any>
  featured: boolean
  priority_order: number
  
  // Computed fields
  available?: number
  percentage_sold?: number
  is_available?: boolean
}

export interface TicketSale {
  id: string
  ticket_type_id: string
  event_id: string
  customer_email: string
  customer_name: string
  customer_phone?: string
  quantity: number
  total_amount: number
  fees: number
  payment_status: 'pending' | 'paid' | 'refunded' | 'failed'
  payment_method?: string
  transaction_id?: string
  order_number: string
  purchase_date: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  
  // Enhanced fields
  promo_code_id?: string
  referral_id?: string
  share_source?: string
  share_platform?: string
  share_id?: string
  customer_id?: string
  billing_address?: Record<string, any>
  delivery_method: 'digital' | 'email' | 'sms' | 'mail'
  ticket_pdf_url?: string
  qr_code_url?: string
  is_verified: boolean
  verification_date?: string
  refund_amount: number
  refund_reason?: string
  refund_date?: string
  transfer_to_email?: string
  transfer_date?: string
  social_media_share: boolean
  review_requested: boolean
  review_sent_date?: string
  
  // Related data
  ticket_type?: TicketType
  event?: Event
  promo_code?: PromoCode
}

// =============================================================================
// PROMOTION & MARKETING TYPES
// =============================================================================

export interface TicketCampaign {
  id: string
  event_id: string
  name: string
  description?: string
  campaign_type: 'early_bird' | 'flash_sale' | 'group_discount' | 'loyalty' | 'referral' | 'social_media' | 'email' | 'influencer'
  discount_type: 'percentage' | 'fixed' | 'buy_one_get_one' | 'free_upgrade'
  discount_value: number
  start_date: string
  end_date: string
  max_uses?: number
  current_uses: number
  applicable_ticket_types: string[]
  target_audience: Record<string, any>
  social_media_platforms: string[]
  email_template_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
  
  // Computed fields
  is_active_now?: boolean
  remaining_uses?: number
  usage_percentage?: number
}

export interface PromoCode {
  id: string
  campaign_id?: string
  event_id?: string
  code: string
  description?: string
  discount_type: 'percentage' | 'fixed' | 'free_shipping'
  discount_value: number
  min_purchase_amount: number
  max_discount_amount?: number
  max_uses?: number
  current_uses: number
  applicable_ticket_types: string[]
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
  updated_at: string
  
  // Computed fields
  is_valid?: boolean
  remaining_uses?: number
  usage_percentage?: number
}

// =============================================================================
// SOCIAL SHARING & REFERRAL TYPES
// =============================================================================

export interface TicketShare {
  id: string
  ticket_type_id?: string
  event_id: string
  user_id: string
  platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'tiktok' | 'email' | 'sms' | 'whatsapp' | 'telegram' | 'copy_link'
  share_url?: string
  share_text?: string
  click_count: number
  conversion_count: number
  revenue_generated: number
  created_at: string
  
  // Computed fields
  conversion_rate?: number
  revenue_per_click?: number
}

export interface TicketReferral {
  id: string
  referrer_id: string
  referred_email: string
  event_id: string
  referral_code: string
  discount_amount: number
  status: 'pending' | 'used' | 'expired'
  used_at?: string
  created_at: string
  
  // Related data
  referrer?: User
  event?: Event
}

// =============================================================================
// ANALYTICS & REPORTING TYPES
// =============================================================================

export interface TicketAnalytics {
  id: string
  event_id: string
  ticket_type_id?: string
  date: string
  tickets_sold: number
  revenue: number
  refunds: number
  refund_amount: number
  shares_count: number
  clicks_count: number
  conversions_count: number
  conversion_rate: number
  avg_ticket_price: number
  created_at: string
}

export interface SocialMediaPerformance {
  id: string
  event_id: string
  platform: string
  post_id?: string
  post_url?: string
  shares_count: number
  clicks_count: number
  conversions_count: number
  revenue_generated: number
  engagement_rate: number
  post_date?: string
  created_at: string
  
  // Computed fields
  conversion_rate?: number
  revenue_per_click?: number
}

// =============================================================================
// NOTIFICATION & COMMUNICATION TYPES
// =============================================================================

export interface TicketNotification {
  id: string
  user_id: string
  event_id?: string
  ticket_sale_id?: string
  notification_type: 'purchase_confirmation' | 'event_reminder' | 'ticket_transfer' | 'refund_processed' | 'promo_code' | 'event_update' | 'cancellation'
  title: string
  message: string
  is_read: boolean
  sent_via: string[]
  sent_at: string
  read_at?: string
  created_at: string
}

export interface TicketEmailTemplate {
  id: string
  name: string
  subject: string
  html_template: string
  text_template?: string
  variables: Record<string, any>
  is_active: boolean
  created_at: string
  updated_at: string
}

// =============================================================================
// INTEGRATION & WEBHOOK TYPES
// =============================================================================

export interface TicketingIntegration {
  id: string
  platform_name: string
  api_key?: string
  api_secret?: string
  webhook_url?: string
  sync_enabled: boolean
  last_sync?: string
  sync_status: 'idle' | 'syncing' | 'error'
  error_log?: string
  created_at: string
  updated_at: string
}

export interface TicketingWebhook {
  id: string
  integration_id: string
  event_type: string
  payload: Record<string, any>
  status: 'pending' | 'processed' | 'failed'
  processed_at?: string
  error_message?: string
  created_at: string
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface CreateTicketTypeRequest {
  event_id: string
  name: string
  description?: string
  price: number
  quantity_available: number
  max_per_customer?: number
  sale_start?: string
  sale_end?: string
  category?: TicketType['category']
  benefits?: string[]
  seating_section?: string
  is_transferable?: boolean
  transfer_fee?: number
  refund_policy?: string
  age_restriction?: number
  requires_id?: boolean
  featured?: boolean
  priority_order?: number
}

export interface CreateTicketSaleRequest {
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
  billing_address?: Record<string, any>
  delivery_method?: TicketSale['delivery_method']
  social_media_share?: boolean
}

export interface CreateCampaignRequest {
  event_id: string
  name: string
  description?: string
  campaign_type: TicketCampaign['campaign_type']
  discount_type: TicketCampaign['discount_type']
  discount_value: number
  start_date: string
  end_date: string
  max_uses?: number
  applicable_ticket_types?: string[]
  target_audience?: Record<string, any>
  social_media_platforms?: string[]
  email_template_id?: string
}

export interface CreatePromoCodeRequest {
  campaign_id?: string
  event_id?: string
  code: string
  description?: string
  discount_type: PromoCode['discount_type']
  discount_value: number
  min_purchase_amount?: number
  max_discount_amount?: number
  max_uses?: number
  applicable_ticket_types?: string[]
  start_date: string
  end_date: string
}

export interface ShareTicketRequest {
  event_id: string
  ticket_type_id?: string
  platform: TicketShare['platform']
  share_text?: string
  share_url?: string
}

export interface TicketAnalyticsRequest {
  event_id?: string
  ticket_type_id?: string
  start_date?: string
  end_date?: string
  group_by?: 'day' | 'week' | 'month'
}

// =============================================================================
// DASHBOARD & UI TYPES
// =============================================================================

export interface TicketingMetrics {
  total_tickets_sold: number
  revenue_generated: number
  average_ticket_price: number
  weekly_trend: number
  revenue_trend: number
  conversion_rate: number
  social_shares: number
  referral_revenue: number
}

export interface TicketTypeWithAnalytics extends TicketType {
  analytics?: {
    daily_sales: TicketAnalytics[]
    social_performance: SocialMediaPerformance[]
    conversion_rate: number
    revenue_per_share: number
  }
}

export interface EventWithTicketing {
  id: string
  title: string
  date: string
  location: string
  ticket_types: TicketType[]
  campaigns: TicketCampaign[]
  analytics: TicketingMetrics
  social_shares: TicketShare[]
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type TicketCategory = TicketType['category']
export type PaymentStatus = TicketSale['payment_status']
export type CampaignType = TicketCampaign['campaign_type']
export type DiscountType = PromoCode['discount_type']
export type SharePlatform = TicketShare['platform']
export type NotificationType = TicketNotification['notification_type']

export interface TicketFilters {
  event_id?: string
  category?: TicketCategory
  price_min?: number
  price_max?: number
  available_only?: boolean
  featured_only?: boolean
}

export interface SalesFilters {
  event_id?: string
  payment_status?: PaymentStatus
  date_from?: string
  date_to?: string
  customer_email?: string
}

export interface AnalyticsFilters {
  event_id?: string
  ticket_type_id?: string
  date_from?: string
  date_to?: string
  platform?: SharePlatform
  group_by?: 'day' | 'week' | 'month' | 'platform'
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const TICKET_CATEGORIES: Record<TicketCategory, { label: string; color: string; icon: string }> = {
  general: { label: 'General Admission', color: 'bg-blue-500', icon: '🎫' },
  vip: { label: 'VIP Access', color: 'bg-purple-500', icon: '👑' },
  premium: { label: 'Premium', color: 'bg-yellow-500', icon: '⭐' },
  early_bird: { label: 'Early Bird', color: 'bg-green-500', icon: '🐦' },
  student: { label: 'Student', color: 'bg-indigo-500', icon: '🎓' },
  senior: { label: 'Senior', color: 'bg-gray-500', icon: '👴' },
  group: { label: 'Group', color: 'bg-pink-500', icon: '👥' },
  backstage: { label: 'Backstage', color: 'bg-red-500', icon: '🎭' }
}

export const SHARE_PLATFORMS: Record<SharePlatform, { label: string; color: string; icon: string; url: string }> = {
  facebook: { label: 'Facebook', color: 'bg-blue-600', icon: '📘', url: 'https://www.facebook.com/sharer/sharer.php' },
  twitter: { label: 'Twitter', color: 'bg-sky-500', icon: '🐦', url: 'https://twitter.com/intent/tweet' },
  instagram: { label: 'Instagram', color: 'bg-pink-600', icon: '📷', url: 'https://www.instagram.com' },
  linkedin: { label: 'LinkedIn', color: 'bg-blue-700', icon: '💼', url: 'https://www.linkedin.com/sharing/share-offsite' },
  tiktok: { label: 'TikTok', color: 'bg-black', icon: '🎵', url: 'https://www.tiktok.com' },
  email: { label: 'Email', color: 'bg-gray-600', icon: '📧', url: 'mailto:' },
  sms: { label: 'SMS', color: 'bg-green-600', icon: '📱', url: 'sms:' },
  whatsapp: { label: 'WhatsApp', color: 'bg-green-500', icon: '💬', url: 'https://wa.me' },
  telegram: { label: 'Telegram', color: 'bg-blue-500', icon: '✈️', url: 'https://t.me/share' },
  copy_link: { label: 'Copy Link', color: 'bg-gray-500', icon: '🔗', url: '' }
}

export const PAYMENT_STATUSES: Record<PaymentStatus, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-500', icon: '⏳' },
  paid: { label: 'Paid', color: 'bg-green-500', icon: '✅' },
  refunded: { label: 'Refunded', color: 'bg-red-500', icon: '↩️' },
  failed: { label: 'Failed', color: 'bg-gray-500', icon: '❌' }
}

export const CAMPAIGN_TYPES: Record<CampaignType, { label: string; description: string; icon: string }> = {
  early_bird: { label: 'Early Bird', description: 'Discount for early purchases', icon: '🐦' },
  flash_sale: { label: 'Flash Sale', description: 'Limited time discount', icon: '⚡' },
  group_discount: { label: 'Group Discount', description: 'Discount for group purchases', icon: '👥' },
  loyalty: { label: 'Loyalty', description: 'Reward for returning customers', icon: '💎' },
  referral: { label: 'Referral', description: 'Reward for referring friends', icon: '🤝' },
  social_media: { label: 'Social Media', description: 'Promotion through social platforms', icon: '📱' },
  email: { label: 'Email', description: 'Email marketing campaign', icon: '📧' },
  influencer: { label: 'Influencer', description: 'Influencer marketing campaign', icon: '🌟' }
}
