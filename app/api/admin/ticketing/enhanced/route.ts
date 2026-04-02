import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateApiRequest, checkAdminPermissions } from '@/lib/auth/api-auth'

// Enhanced validation schemas
const createTicketTypeSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  name: z.string().min(1, 'Ticket type name is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be non-negative'),
  quantity_available: z.number().int().min(1, 'Quantity must be at least 1'),
  max_per_customer: z.number().int().min(1).optional(),
  sale_start: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid sale start date').optional(),
  sale_end: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid sale end date').optional(),
  category: z.enum(['general', 'vip', 'premium', 'early_bird', 'student', 'senior', 'group', 'backstage']).default('general'),
  benefits: z.array(z.string()).optional(),
  seating_section: z.string().optional(),
  is_transferable: z.boolean().default(true),
  transfer_fee: z.number().min(0).default(0),
  refund_policy: z.string().default('No refunds'),
  age_restriction: z.number().int().min(0).optional(),
  requires_id: z.boolean().default(false),
  featured: z.boolean().default(false),
  priority_order: z.number().int().default(0),
  metadata: z.record(z.any()).optional()
})

const createCampaignSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  name: z.string().min(1, 'Campaign name is required'),
  description: z.string().optional(),
  campaign_type: z.enum(['early_bird', 'flash_sale', 'group_discount', 'loyalty', 'referral', 'social_media', 'email', 'influencer']),
  discount_type: z.enum(['percentage', 'fixed', 'buy_one_get_one', 'free_upgrade']),
  discount_value: z.number().min(0, 'Discount value must be non-negative'),
  start_date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid start date'),
  end_date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid end date'),
  max_uses: z.number().int().min(1).optional(),
  applicable_ticket_types: z.array(z.string().uuid()).optional(),
  target_audience: z.record(z.any()).optional(),
  social_media_platforms: z.array(z.string()).optional(),
  email_template_id: z.string().uuid().optional()
})

const createPromoCodeSchema = z.object({
  campaign_id: z.string().uuid('Invalid campaign ID').optional(),
  event_id: z.string().uuid('Invalid event ID'),
  code: z.string().min(1, 'Promo code is required'),
  description: z.string().optional(),
  discount_type: z.enum(['percentage', 'fixed', 'free_shipping']),
  discount_value: z.number().min(0, 'Discount value must be non-negative'),
  min_purchase_amount: z.number().min(0).default(0),
  max_discount_amount: z.number().min(0).optional(),
  max_uses: z.number().int().min(1).optional(),
  applicable_ticket_types: z.array(z.string().uuid()).optional(),
  start_date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid start date'),
  end_date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid end date')
})

const analyticsRequestSchema = z.object({
  event_id: z.string().uuid('Invalid event ID').optional(),
  ticket_type_id: z.string().uuid('Invalid ticket type ID').optional(),
  start_date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid start date').optional(),
  end_date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid end date').optional(),
  group_by: z.enum(['day', 'week', 'month', 'platform']).default('day'),
  include_social: z.boolean().default(true),
  include_campaigns: z.boolean().default(true)
})

export async function GET(request: NextRequest) {
  try {
    console.log('[Enhanced Admin Ticketing API] GET request started')
    
    const authResult = await authenticateApiRequest(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = authResult

    // Check admin permissions
    const hasAdminAccess = await checkAdminPermissions(user)
    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'
    const event_idParam = searchParams.get('event_id')
    const event_id = event_idParam === null ? undefined : event_idParam
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (type === 'overview') {
      // Get comprehensive ticketing overview
      const overview = await getTicketingOverview(supabase, event_id)
      return NextResponse.json(overview)

    } else if (type === 'ticket_types') {
      // Get ticket types with enhanced data
      const ticketTypes = await getTicketTypes(supabase, event_id, limit, offset)
      return NextResponse.json(ticketTypes)

    } else if (type === 'campaigns') {
      // Get promotional campaigns
      const campaigns = await getCampaigns(supabase, event_id, limit, offset)
      return NextResponse.json(campaigns)

    } else if (type === 'promo_codes') {
      // Get promotional codes
      const promoCodes = await getPromoCodes(supabase, event_id, limit, offset)
      return NextResponse.json(promoCodes)

    } else if (type === 'sales') {
      // Get ticket sales with enhanced data
      const sales = await getSales(supabase, event_id, limit, offset)
      return NextResponse.json(sales)

    } else if (type === 'analytics') {
      // Get comprehensive analytics
      const analytics = await getAnalytics(supabase, event_id)
      return NextResponse.json(analytics)

    } else if (type === 'social_performance') {
      // Get social media performance
      const socialPerformance = await getSocialPerformance(supabase, event_id)
      return NextResponse.json(socialPerformance)

    } else if (type === 'referrals') {
      // Get referral data
      const referrals = await getReferrals(supabase, event_id, limit, offset)
      return NextResponse.json(referrals)

    } else {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }

  } catch (error) {
    console.error('[Enhanced Admin Ticketing API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Enhanced Admin Ticketing API] POST request started')
    
    const authResult = await authenticateApiRequest(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = authResult

    // Check admin permissions
    const hasAdminAccess = await checkAdminPermissions(user)
    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action, ...data } = body

    if (action === 'create_ticket_type') {
      const validatedData = createTicketTypeSchema.parse(data)

      // Validate sale dates
      if (validatedData.sale_start && validatedData.sale_end) {
        const startDate = new Date(validatedData.sale_start)
        const endDate = new Date(validatedData.sale_end)
        
        if (endDate <= startDate) {
          return NextResponse.json({ error: 'Sale end date must be after start date' }, { status: 400 })
        }
      }

      // Check if event exists (canonical events_v2 table)
      const { data: event } = await supabase
        .from('events_v2')
        .select('id')
        .eq('id', validatedData.event_id)
        .single()

      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }

      // Generate ticket code
      const ticketCode = `TKT${Date.now()}${Math.floor(Math.random() * 1000)}`

      const { data: ticketType, error } = await supabase
        .from('ticket_types')
        .insert({
          ...validatedData,
          ticket_code: ticketCode,
          quantity_sold: 0,
          is_active: true
        })
        .select('*')
        .single()

      if (error) {
        console.error('[Enhanced Admin Ticketing API] Error creating ticket type:', error)
        return NextResponse.json({ error: 'Failed to create ticket type' }, { status: 500 })
      }

      console.log('[Enhanced Admin Ticketing API] Successfully created ticket type:', ticketType.id)
      return NextResponse.json({ ticket_type: ticketType }, { status: 201 })

    } else if (action === 'create_campaign') {
      const validatedData = createCampaignSchema.parse(data)

      // Validate campaign dates
      const startDate = new Date(validatedData.start_date)
      const endDate = new Date(validatedData.end_date)
      
      if (endDate <= startDate) {
        return NextResponse.json({ error: 'Campaign end date must be after start date' }, { status: 400 })
      }

      const { data: campaign, error } = await supabase
        .from('ticket_campaigns')
        .insert({
          ...validatedData,
          current_uses: 0,
          is_active: true
        })
        .select('*')
        .single()

      if (error) {
        console.error('[Enhanced Admin Ticketing API] Error creating campaign:', error)
        return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
      }

      console.log('[Enhanced Admin Ticketing API] Successfully created campaign:', campaign.id)
      return NextResponse.json({ campaign }, { status: 201 })

    } else if (action === 'create_promo_code') {
      const validatedData = createPromoCodeSchema.parse(data)

      // Validate promo code dates
      const startDate = new Date(validatedData.start_date)
      const endDate = new Date(validatedData.end_date)
      
      if (endDate <= startDate) {
        return NextResponse.json({ error: 'Promo code end date must be after start date' }, { status: 400 })
      }

      // Check if code already exists
      const { data: existingCode } = await supabase
        .from('promo_codes')
        .select('id')
        .eq('code', validatedData.code)
        .single()

      if (existingCode) {
        return NextResponse.json({ error: 'Promo code already exists' }, { status: 400 })
      }

      const { data: promoCode, error } = await supabase
        .from('promo_codes')
        .insert({
          ...validatedData,
          current_uses: 0,
          is_active: true
        })
        .select('*')
        .single()

      if (error) {
        console.error('[Enhanced Admin Ticketing API] Error creating promo code:', error)
        return NextResponse.json({ error: 'Failed to create promo code' }, { status: 500 })
      }

      console.log('[Enhanced Admin Ticketing API] Successfully created promo code:', promoCode.id)
      return NextResponse.json({ promo_code: promoCode }, { status: 201 })

    } else if (action === 'generate_referral_codes') {
      const { event_id, count = 10, discount_amount = 10 } = data

      if (!event_id) {
        return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
      }

      const referralCodes = []
      for (let i = 0; i < count; i++) {
        const referralCode = `REF${Date.now()}${Math.floor(Math.random() * 1000)}${i}`
        
        const { data: referral, error } = await supabase
          .from('ticket_referrals')
          .insert({
            referrer_id: user.id,
            referred_email: '', // Will be filled when used
            event_id,
            referral_code: referralCode,
            discount_amount,
            status: 'pending'
          })
          .select('*')
          .single()

        if (!error && referral) {
          referralCodes.push(referral)
        }
      }

      return NextResponse.json({ referral_codes: referralCodes }, { status: 201 })

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('[Enhanced Admin Ticketing API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions
async function getTicketingOverview(supabase: any, event_id?: string) {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Get total metrics with event filtering
  let salesQuery = supabase
    .from('ticket_sales')
    .select('total_amount, quantity, payment_status')
    .eq('payment_status', 'paid')
    .gte('purchase_date', thirtyDaysAgo.toISOString())

  let ticketTypesQuery = supabase
    .from('ticket_types')
    .select('quantity_available, quantity_sold, price')
    .eq('is_active', true)

  let campaignsQuery = supabase
    .from('ticket_campaigns')
    .select('current_uses, max_uses')
    .eq('is_active', true)
    .gte('end_date', now.toISOString())

  let socialSharesQuery = supabase
    .from('ticket_shares')
    .select('click_count, conversion_count, revenue_generated')
    .gte('created_at', thirtyDaysAgo.toISOString())

  // Apply event filtering if event_id is provided
  if (event_id) {
    salesQuery = salesQuery.eq('event_id', event_id)
    ticketTypesQuery = ticketTypesQuery.eq('event_id', event_id)
    campaignsQuery = campaignsQuery.eq('event_id', event_id)
    socialSharesQuery = socialSharesQuery.eq('event_id', event_id)
  }

  const { data: totalSales } = await salesQuery
  const { data: ticketTypes } = await ticketTypesQuery
  const { data: campaigns } = await campaignsQuery
  const { data: socialShares } = await socialSharesQuery

  // Calculate metrics
  const totalRevenue = totalSales?.reduce((sum: number, sale: any) => sum + parseFloat(sale.total_amount), 0) || 0
  const totalTicketsSold = totalSales?.reduce((sum: number, sale: any) => sum + sale.quantity, 0) || 0
  const totalTicketsAvailable = ticketTypes?.reduce((sum: number, type: any) => sum + type.quantity_available, 0) || 0
  const totalTicketsSoldOverall = ticketTypes?.reduce((sum: number, type: any) => sum + type.quantity_sold, 0) || 0
  const averageTicketPrice = totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0

  const activeCampaigns = campaigns?.length || 0
  const campaignUsage = campaigns?.reduce((sum: number, campaign: any) => {
    const usage = campaign.max_uses ? (campaign.current_uses / campaign.max_uses) * 100 : 0
    return sum + usage
  }, 0) / Math.max(activeCampaigns, 1)

  const totalSocialClicks = socialShares?.reduce((sum: number, share: any) => sum + share.click_count, 0) || 0
  const totalSocialConversions = socialShares?.reduce((sum: number, share: any) => sum + share.conversion_count, 0) || 0
  const socialConversionRate = totalSocialClicks > 0 ? (totalSocialConversions / totalSocialClicks) * 100 : 0

  return {
    metrics: {
      total_revenue: totalRevenue,
      total_tickets_sold: totalTicketsSold,
      total_tickets_available: totalTicketsAvailable,
      total_tickets_sold_overall: totalTicketsSoldOverall,
      average_ticket_price: averageTicketPrice,
      active_campaigns: activeCampaigns,
      campaign_usage_percentage: campaignUsage,
      social_clicks: totalSocialClicks,
      social_conversions: totalSocialConversions,
      social_conversion_rate: socialConversionRate,
      // Add additional metrics for frontend compatibility
      weekly_trend: 0, // TODO: Calculate from historical data
      revenue_trend: 0, // TODO: Calculate from historical data
      conversion_rate: socialConversionRate,
      social_shares: totalSocialClicks,
      referral_revenue: 0 // TODO: Calculate from referral data
    }
  }
}

async function getTicketTypes(supabase: any, event_id?: string, limit = 50, offset = 0) {
  let query = supabase
    .from('ticket_types')
    .select(`
      *,
      events:event_id (
        id,
        title,
        date,
        location
      )
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (event_id) {
    query = query.eq('event_id', event_id)
  }

  const { data: ticketTypes, error } = await query

  if (error) {
    console.error('[Enhanced Admin Ticketing API] Error fetching ticket types:', error)
    return { ticket_types: [], total: 0 }
  }

  const { count } = await supabase
    .from('ticket_types')
    .select('*', { count: 'exact', head: true })

  return { 
    ticket_types: ticketTypes || [], 
    total: count || 0,
    limit,
    offset 
  }
}

async function getCampaigns(supabase: any, event_id?: string, limit = 50, offset = 0) {
  let query = supabase
    .from('ticket_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (event_id) {
    query = query.eq('event_id', event_id)
  }

  const { data: campaigns, error } = await query

  if (error) {
    console.error('[Enhanced Admin Ticketing API] Error fetching campaigns:', error)
    return { campaigns: [], total: 0 }
  }

  const { count } = await supabase
    .from('ticket_campaigns')
    .select('*', { count: 'exact', head: true })

  return { 
    campaigns: campaigns || [], 
    total: count || 0,
    limit,
    offset 
  }
}

async function getPromoCodes(supabase: any, event_id?: string, limit = 50, offset = 0) {
  let query = supabase
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (event_id) {
    query = query.eq('event_id', event_id)
  }

  const { data: promoCodes, error } = await query

  if (error) {
    console.error('[Enhanced Admin Ticketing API] Error fetching promo codes:', error)
    return { promo_codes: [], total: 0 }
  }

  const { count } = await supabase
    .from('promo_codes')
    .select('*', { count: 'exact', head: true })

  return { 
    promo_codes: promoCodes || [], 
    total: count || 0,
    limit,
    offset 
  }
}

async function getSales(supabase: any, event_id?: string, limit = 50, offset = 0) {
  let query = supabase
    .from('ticket_sales')
    .select(`
      *,
      ticket_types:ticket_type_id (
        id,
        name,
        price,
        category
      ),
      events:event_id (
        id,
        title,
        date,
        location
      ),
      promo_codes:promo_code_id (
        id,
        code,
        discount_type,
        discount_value
      )
    `)
    .order('purchase_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (event_id) {
    query = query.eq('event_id', event_id)
  }

  const { data: sales, error } = await query

  if (error) {
    console.error('[Enhanced Admin Ticketing API] Error fetching sales:', error)
    return { sales: [], total: 0 }
  }

  const { count } = await supabase
    .from('ticket_sales')
    .select('*', { count: 'exact', head: true })

  return { 
    sales: sales || [], 
    total: count || 0,
    limit,
    offset 
  }
}

async function getAnalytics(supabase: any, event_id?: string) {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Get daily sales data
  const { data: dailySales } = await supabase
    .from('ticket_analytics')
    .select('*')
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: true })

  // Get sales by ticket type
  const { data: salesByType } = await supabase
    .from('ticket_sales')
    .select(`
      ticket_type_id,
      total_amount,
      quantity,
      ticket_types:ticket_type_id (name, category)
    `)
    .eq('payment_status', 'paid')
    .gte('purchase_date', thirtyDaysAgo.toISOString())

  // Get social performance
  const { data: socialPerformance } = await supabase
    .from('social_media_performance')
    .select('*')
    .gte('created_at', thirtyDaysAgo.toISOString())

  return {
    analytics: {
      daily_sales: dailySales || [],
      sales_by_type: salesByType || [],
      social_performance: socialPerformance || []
    }
  }
}

async function getSocialPerformance(supabase: any, event_id?: string) {
  let query = supabase
    .from('ticket_shares')
    .select('platform, click_count, conversion_count, revenue_generated')
    .order('created_at', { ascending: false })

  if (event_id) {
    query = query.eq('event_id', event_id)
  }

  const { data: shares, error } = await query

  if (error) {
    console.error('[Enhanced Admin Ticketing API] Error fetching social performance:', error)
    return { social_performance: [] }
  }

  // Group by platform
  const platformStats = shares?.reduce((acc: any, share: any) => {
    if (!acc[share.platform]) {
      acc[share.platform] = {
        platform: share.platform,
        clicks: 0,
        conversions: 0,
        revenue: 0
      }
    }
    acc[share.platform].clicks += share.click_count
    acc[share.platform].conversions += share.conversion_count
    acc[share.platform].revenue += share.revenue_generated
    return acc
  }, {}) || {}

  return {
    social_performance: Object.values(platformStats)
  }
}

async function getReferrals(supabase: any, event_id?: string, limit = 50, offset = 0) {
  let query = supabase
    .from('ticket_referrals')
    .select(`
      *,
      events:event_id (
        id,
        title,
        date
      )
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (event_id) {
    query = query.eq('event_id', event_id)
  }

  const { data: referrals, error } = await query

  if (error) {
    console.error('[Enhanced Admin Ticketing API] Error fetching referrals:', error)
    return { referrals: [], total: 0 }
  }

  const { count } = await supabase
    .from('ticket_referrals')
    .select('*', { count: 'exact', head: true })

  return { 
    referrals: referrals || [], 
    total: count || 0,
    limit,
    offset 
  }
} 