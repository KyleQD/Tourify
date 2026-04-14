import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' })
  : null

// Enhanced validation schemas
const purchaseTicketSchema = z.object({
  ticket_type_id: z.string().uuid('Invalid ticket type ID'),
  event_id: z.string().uuid('Invalid event ID'),
  customer_email: z.string().email('Invalid customer email'),
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_phone: z.string().optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  payment_method: z.string().optional(),
  transaction_id: z.string().optional(),
  promo_code: z.string().optional(),
  referral_code: z.string().optional(),
  share_source: z.string().optional(),
  share_platform: z.string().optional(),
  billing_address: z.record(z.any()).optional(),
  delivery_method: z.enum(['digital', 'email', 'sms', 'mail']).default('digital'),
  social_media_share: z.boolean().default(false),
  metadata: z.record(z.any()).optional()
})

const checkAvailabilitySchema = z.object({
  ticket_type_id: z.string().uuid('Invalid ticket type ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  promo_code: z.string().optional()
})

const shareTicketSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  ticket_type_id: z.string().uuid('Invalid ticket type ID').optional(),
  platform: z.enum(['facebook', 'twitter', 'instagram', 'linkedin', 'tiktok', 'email', 'sms', 'whatsapp', 'telegram', 'copy_link']),
  share_text: z.string().optional(),
  share_url: z.string().optional(),
  user_id: z.string().uuid('Invalid user ID').optional()
})

const createReferralSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  referred_email: z.string().email('Invalid email'),
  referrer_id: z.string().uuid('Invalid referrer ID'),
  discount_amount: z.number().min(0, 'Discount amount must be non-negative')
})

const validatePromoCodeSchema = z.object({
  code: z.string().min(1, 'Promo code is required'),
  event_id: z.string().uuid('Invalid event ID'),
  ticket_type_id: z.string().uuid('Invalid ticket type ID').optional(),
  purchase_amount: z.number().min(0, 'Purchase amount must be non-negative')
})

export async function GET(request: NextRequest) {
  try {
    console.log('[Enhanced Ticketing API] GET request started')
    
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const event_id = searchParams.get('event_id')
    const ticket_type_id = searchParams.get('ticket_type_id')
    const include_analytics = searchParams.get('include_analytics') === 'true'

    const supabase = await createClient()

    if (action === 'event_tickets') {
      // Get all ticket types for an event with enhanced data
      if (!event_id) {
        return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
      }

      let query = supabase
        .from('ticket_types')
        .select(`
          *,
          events:event_id (
            id,
            title,
            date,
            location,
            description
          )
        `)
        .eq('event_id', event_id)
        .eq('is_active', true)
        .order('priority_order', { ascending: true })
        .order('price', { ascending: true })

      const { data: ticketTypes, error } = await query

      if (error) {
        console.error('[Enhanced Ticketing API] Error fetching ticket types:', error)
        return NextResponse.json({ error: 'Failed to fetch ticket types' }, { status: 500 })
      }

      // Get active campaigns for this event
      const { data: campaigns } = await supabase
        .from('ticket_campaigns')
        .select('*')
        .eq('event_id', event_id)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())

      // Get active promo codes
      const { data: promoCodes } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('event_id', event_id)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())

      // Get social sharing stats if requested
      let socialStats = null
      if (include_analytics) {
        const { data: shares } = await supabase
          .from('ticket_shares')
          .select('platform, click_count, conversion_count, revenue_generated')
          .eq('event_id', event_id)

        socialStats = shares?.reduce((acc: any, share: any) => {
          if (!acc[share.platform]) {
            acc[share.platform] = {
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
      }

      const ticketTypesWithAvailability = ticketTypes?.map(ticket => ({
        ...ticket,
        available: ticket.quantity_available - ticket.quantity_sold,
        is_available: (ticket.quantity_available - ticket.quantity_sold) > 0,
        percentage_sold: ticket.quantity_available > 0 
          ? Math.round((ticket.quantity_sold / ticket.quantity_available) * 100)
          : 0
      })) || []

      return NextResponse.json({ 
        ticket_types: ticketTypesWithAvailability,
        campaigns: campaigns || [],
        promo_codes: promoCodes || [],
        social_stats: socialStats
      })

    } else if (action === 'availability') {
      // Check ticket availability with promo code validation
      if (!ticket_type_id) {
        return NextResponse.json({ error: 'Ticket type ID is required' }, { status: 400 })
      }

      const { data: ticketType, error } = await supabase
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
        .eq('id', ticket_type_id)
        .eq('is_active', true)
        .single()

      if (error || !ticketType) {
        return NextResponse.json({ error: 'Ticket type not found or inactive' }, { status: 404 })
      }

      const available = ticketType.quantity_available - ticketType.quantity_sold
      const isAvailable = available > 0

      return NextResponse.json({
        available,
        is_available: isAvailable,
        ticket_type: {
          id: ticketType.id,
          name: ticketType.name,
          price: ticketType.price,
          description: ticketType.description,
          category: ticketType.category,
          benefits: ticketType.benefits,
          max_per_customer: ticketType.max_per_customer,
          sale_start: ticketType.sale_start,
          sale_end: ticketType.sale_end,
          is_transferable: ticketType.is_transferable,
          transfer_fee: ticketType.transfer_fee,
          refund_policy: ticketType.refund_policy
        },
        event: ticketType.events
      })

    } else if (action === 'social_stats') {
      // Get social sharing statistics for an event
      if (!event_id) {
        return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
      }

      const { data: shares, error } = await supabase
        .from('ticket_shares')
        .select('platform, click_count, conversion_count, revenue_generated')
        .eq('event_id', event_id)

      if (error) {
        console.error('[Enhanced Ticketing API] Error fetching social stats:', error)
        return NextResponse.json({ error: 'Failed to fetch social statistics' }, { status: 500 })
      }

      const stats = shares?.reduce((acc: any, share: any) => {
        if (!acc[share.platform]) {
          acc[share.platform] = {
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

      return NextResponse.json({ social_stats: stats })

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('[Enhanced Ticketing API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Enhanced Ticketing API] POST request started')
    
    const body = await request.json()
    const { action, ...data } = body

    const supabase = await createClient()

    if (action === 'purchase') {
      const validatedData = purchaseTicketSchema.parse(data)

      // Check ticket availability
      const { data: ticketType, error: ticketError } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('id', validatedData.ticket_type_id)
        .eq('is_active', true)
        .single()

      if (ticketError || !ticketType) {
        return NextResponse.json({ error: 'Ticket type not found or inactive' }, { status: 404 })
      }

      const remainingTickets = ticketType.quantity_available - ticketType.quantity_sold
      if (validatedData.quantity > remainingTickets) {
        return NextResponse.json({ error: 'Not enough tickets available' }, { status: 400 })
      }

      // Validate promo code if provided
      let promoCode = null
      let discountAmount = 0
      if (validatedData.promo_code) {
        const { data: promoCodeData, error: promoError } = await supabase
          .from('promo_codes')
          .select('*')
          .eq('code', validatedData.promo_code)
          .eq('is_active', true)
          .gte('end_date', new Date().toISOString())
          .single()

        if (promoError || !promoCodeData) {
          return NextResponse.json({ error: 'Invalid or expired promo code' }, { status: 400 })
        }

        if (promoCodeData.current_uses >= (promoCodeData.max_uses || Infinity)) {
          return NextResponse.json({ error: 'Promo code usage limit reached' }, { status: 400 })
        }

        promoCode = promoCodeData
        const baseAmount = ticketType.price * validatedData.quantity
        
        if (promoCode.discount_type === 'percentage') {
          discountAmount = (baseAmount * promoCode.discount_value) / 100
          if (promoCode.max_discount_amount) {
            discountAmount = Math.min(discountAmount, promoCode.max_discount_amount)
          }
        } else {
          discountAmount = promoCode.discount_value
        }
      }

      // Validate referral code if provided
      let referral = null
      if (validatedData.referral_code) {
        const { data: referralData, error: referralError } = await supabase
          .from('ticket_referrals')
          .select('*')
          .eq('referral_code', validatedData.referral_code)
          .eq('status', 'pending')
          .single()

        if (referralError || !referralData) {
          return NextResponse.json({ error: 'Invalid or expired referral code' }, { status: 400 })
        }

        referral = referralData
        discountAmount += referral.discount_amount
      }

      // Calculate total amount
      const baseAmount = ticketType.price * validatedData.quantity
      const totalAmount = Math.max(0, baseAmount - discountAmount)
      const fees = totalAmount * 0.03 // 3% processing fee
      const orderNumber = `TKT${Date.now()}${Math.floor(Math.random() * 1000)}`

      const isFreeTicket = totalAmount === 0
      const useStripe = stripe && !isFreeTicket

      // Create ticket sale with pending status when using Stripe
      const { data: sale, error: saleError } = await supabase
        .from('ticket_sales')
        .insert({
          ticket_type_id: validatedData.ticket_type_id,
          event_id: validatedData.event_id,
          customer_email: validatedData.customer_email,
          customer_name: validatedData.customer_name,
          customer_phone: validatedData.customer_phone,
          quantity: validatedData.quantity,
          total_amount: totalAmount,
          fees,
          payment_status: useStripe ? 'pending' : 'paid',
          payment_method: validatedData.payment_method || 'stripe',
          transaction_id: validatedData.transaction_id,
          order_number: orderNumber,
          promo_code_id: promoCode?.id,
          referral_id: referral?.id,
          share_source: validatedData.share_source,
          share_platform: validatedData.share_platform,
          billing_address: validatedData.billing_address,
          delivery_method: validatedData.delivery_method,
          social_media_share: validatedData.social_media_share,
          metadata: validatedData.metadata
        })
        .select('*')
        .single()

      if (saleError) {
        console.error('[Enhanced Ticketing API] Error creating sale:', saleError)
        return NextResponse.json({ error: 'Failed to create ticket sale' }, { status: 500 })
      }

      // Update promo code usage
      if (promoCode) {
        await supabase
          .from('promo_codes')
          .update({ current_uses: promoCode.current_uses + 1 })
          .eq('id', promoCode.id)
      }

      // Update referral status
      if (referral) {
        await supabase
          .from('ticket_referrals')
          .update({ 
            status: 'used',
            used_at: new Date().toISOString()
          })
          .eq('id', referral.id)
      }

      // Track social share if provided
      if (validatedData.share_platform && validatedData.share_source) {
        await supabase
          .from('ticket_shares')
          .insert({
            event_id: validatedData.event_id,
            ticket_type_id: validatedData.ticket_type_id,
            platform: validatedData.share_platform,
            share_url: validatedData.share_source,
            conversion_count: 1,
            revenue_generated: totalAmount
          })
      }

      // Create Stripe Checkout session for paid tickets
      if (useStripe) {
        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          customer_email: validatedData.customer_email,
          line_items: [
            {
              price_data: {
                currency: 'usd',
                unit_amount: Math.round((totalAmount / validatedData.quantity) * 100),
                product_data: {
                  name: ticketType.name,
                  description: ticketType.description || `Ticket for event`,
                },
              },
              quantity: validatedData.quantity,
            },
          ],
          metadata: {
            sale_id: sale.id,
            user_id: validatedData.customer_email,
            event_id: validatedData.event_id,
            ticket_type_id: validatedData.ticket_type_id,
            order_number: orderNumber,
          },
          success_url: `${origin}/tickets/confirmation?order=${orderNumber}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/tickets/purchase?event_id=${validatedData.event_id}&cancelled=true`,
        })

        console.log('[Enhanced Ticketing API] Stripe Checkout session created:', session.id)
        return NextResponse.json({
          sale,
          order_number: orderNumber,
          discount_applied: discountAmount > 0,
          discount_amount: discountAmount,
          checkout_url: session.url,
          checkout_session_id: session.id,
        }, { status: 201 })
      }

      // Free ticket or dev mode without Stripe — mark as paid directly
      console.log('[Enhanced Ticketing API] Successfully created ticket sale:', sale.id)
      return NextResponse.json({ 
        sale,
        order_number: orderNumber,
        discount_applied: discountAmount > 0,
        discount_amount: discountAmount
      }, { status: 201 })

    } else if (action === 'share') {
      const validatedData = shareTicketSchema.parse(data)

      // Create share record
      const { data: share, error: shareError } = await supabase
        .from('ticket_shares')
        .insert({
          event_id: validatedData.event_id,
          ticket_type_id: validatedData.ticket_type_id,
          user_id: validatedData.user_id,
          platform: validatedData.platform,
          share_url: validatedData.share_url,
          share_text: validatedData.share_text
        })
        .select('*')
        .single()

      if (shareError) {
        console.error('[Enhanced Ticketing API] Error creating share:', shareError)
        return NextResponse.json({ error: 'Failed to record share' }, { status: 500 })
      }

      return NextResponse.json({ share }, { status: 201 })

    } else if (action === 'create_referral') {
      const validatedData = createReferralSchema.parse(data)

      const referralCode = `REF${Date.now()}${Math.floor(Math.random() * 1000)}`

      const { data: referral, error: referralError } = await supabase
        .from('ticket_referrals')
        .insert({
          referrer_id: validatedData.referrer_id,
          referred_email: validatedData.referred_email,
          event_id: validatedData.event_id,
          referral_code: referralCode,
          discount_amount: validatedData.discount_amount
        })
        .select('*')
        .single()

      if (referralError) {
        console.error('[Enhanced Ticketing API] Error creating referral:', referralError)
        return NextResponse.json({ error: 'Failed to create referral' }, { status: 500 })
      }

      return NextResponse.json({ referral }, { status: 201 })

    } else if (action === 'validate_promo_code') {
      const validatedData = validatePromoCodeSchema.parse(data)

      const { data: promoCode, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', validatedData.code)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .single()

      if (error || !promoCode) {
        return NextResponse.json({ 
          valid: false, 
          error: 'Invalid or expired promo code' 
        })
      }

      // Check usage limits
      if (promoCode.current_uses >= (promoCode.max_uses || Infinity)) {
        return NextResponse.json({ 
          valid: false, 
          error: 'Promo code usage limit reached' 
        })
      }

      // Check minimum purchase amount
      if (validatedData.purchase_amount < promoCode.min_purchase_amount) {
        return NextResponse.json({ 
          valid: false, 
          error: `Minimum purchase amount of $${promoCode.min_purchase_amount} required` 
        })
      }

      // Calculate discount
      let discountAmount = 0
      if (promoCode.discount_type === 'percentage') {
        discountAmount = (validatedData.purchase_amount * promoCode.discount_value) / 100
        if (promoCode.max_discount_amount) {
          discountAmount = Math.min(discountAmount, promoCode.max_discount_amount)
        }
      } else {
        discountAmount = promoCode.discount_value
      }

      return NextResponse.json({
        valid: true,
        promo_code: promoCode,
        discount_amount: discountAmount,
        final_amount: Math.max(0, validatedData.purchase_amount - discountAmount)
      })

    } else if (action === 'check_availability') {
      const validatedData = checkAvailabilitySchema.parse(data)

      const { data: ticketType, error } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('id', validatedData.ticket_type_id)
        .eq('is_active', true)
        .single()

      if (error || !ticketType) {
        return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 })
      }

      const available = ticketType.quantity_available - ticketType.quantity_sold
      const canPurchase = available >= validatedData.quantity

      // Check promo code if provided
      let promoCodeInfo = null
      if (validatedData.promo_code) {
        const { data: promoCode } = await supabase
          .from('promo_codes')
          .select('*')
          .eq('code', validatedData.promo_code)
          .eq('is_active', true)
          .gte('end_date', new Date().toISOString())
          .single()

        if (promoCode) {
          const baseAmount = ticketType.price * validatedData.quantity
          let discountAmount = 0
          
          if (promoCode.discount_type === 'percentage') {
            discountAmount = (baseAmount * promoCode.discount_value) / 100
            if (promoCode.max_discount_amount) {
              discountAmount = Math.min(discountAmount, promoCode.max_discount_amount)
            }
          } else {
            discountAmount = promoCode.discount_value
          }

          promoCodeInfo = {
            code: promoCode.code,
            discount_amount: discountAmount,
            final_amount: Math.max(0, baseAmount - discountAmount)
          }
        }
      }

      return NextResponse.json({
        available,
        requested: validatedData.quantity,
        can_purchase: canPurchase,
        ticket_type: {
          id: ticketType.id,
          name: ticketType.name,
          price: ticketType.price,
          category: ticketType.category
        },
        promo_code: promoCodeInfo
      })

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

    console.error('[Enhanced Ticketing API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 