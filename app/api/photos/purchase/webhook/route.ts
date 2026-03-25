import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia' as any
  })
}

const getWebhookSecret = () => {
  if (!process.env.STRIPE_WEBHOOK_SECRET_PHOTOS) {
    throw new Error('STRIPE_WEBHOOK_SECRET_PHOTOS is not set')
  }
  return process.env.STRIPE_WEBHOOK_SECRET_PHOTOS
}

export const dynamic = 'force-dynamic'

/**
 * POST /api/photos/purchase/webhook
 * Handle Stripe webhook events for photo purchases
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      const stripe = getStripe()
      const webhookSecret = getWebhookSecret()
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.payment_status === 'paid') {
          const { purchase_id, photo_id } = session.metadata || {}

          if (purchase_id) {
            // Generate secure download URL (valid for 24 hours)
            const downloadExpiresAt = new Date()
            downloadExpiresAt.setHours(downloadExpiresAt.getHours() + 24)

            // Update purchase status
            const { error: updateError } = await supabase
              .from('photo_purchases')
              .update({
                payment_status: 'completed',
                transaction_id: session.payment_intent as string,
                download_expires_at: downloadExpiresAt.toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', purchase_id)

            if (updateError) {
              console.error('Error updating purchase:', updateError)
              return NextResponse.json(
                { error: 'Failed to update purchase' },
                { status: 500 }
              )
            }

            console.log('[Photo Purchase] Successfully completed:', purchase_id)
          }
        }
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('[Photo Purchase] Payment succeeded:', paymentIntent.id)
        break
      }

      case 'payment_intent.payment_failed': {
        const failedPayment = event.data.object as Stripe.PaymentIntent
        console.log('[Photo Purchase] Payment failed:', failedPayment.id)

        // Update purchase status to failed
        const { error: updateError } = await supabase
          .from('photo_purchases')
          .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('transaction_id', failedPayment.id)

        if (updateError) {
          console.error('Error updating failed purchase:', updateError)
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        console.log('[Photo Purchase] Refund processed:', charge.id)

        // Update purchase status to refunded
        const { error: updateError } = await supabase
          .from('photo_purchases')
          .update({
            payment_status: 'refunded',
            updated_at: new Date().toISOString()
          })
          .eq('transaction_id', charge.payment_intent as string)

        if (updateError) {
          console.error('Error updating refunded purchase:', updateError)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

