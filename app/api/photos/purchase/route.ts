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

const PLATFORM_FEE_PERCENTAGE = 0.15 // 15% platform fee

export const dynamic = 'force-dynamic'

/**
 * POST /api/photos/purchase
 * Initiate a photo purchase with Stripe payment
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { photoId, licenseType } = body

    if (!photoId) {
      return NextResponse.json(
        { error: 'Photo ID is required' },
        { status: 400 }
      )
    }

    // Fetch photo details
    const { data: photo, error: photoError } = await supabase
      .from('photos')
      .select('*')
      .eq('id', photoId)
      .single()

    if (photoError || !photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      )
    }

    // Check if photo is for sale
    if (!photo.is_for_sale || !photo.sale_price) {
      return NextResponse.json(
        { error: 'Photo is not available for purchase' },
        { status: 400 }
      )
    }

    // Check if user is trying to buy their own photo
    if (photo.user_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot purchase your own photo' },
        { status: 400 }
      )
    }

    // Check if already purchased
    const { data: existingPurchase } = await supabase
      .from('photo_purchases')
      .select('id')
      .eq('photo_id', photoId)
      .eq('buyer_user_id', user.id)
      .eq('payment_status', 'completed')
      .single()

    if (existingPurchase) {
      return NextResponse.json(
        { error: 'You have already purchased this photo' },
        { status: 400 }
      )
    }

    // Calculate fees
    const purchasePrice = photo.sale_price
    const platformFee = Math.round(purchasePrice * PLATFORM_FEE_PERCENTAGE * 100) / 100
    const sellerPayout = purchasePrice - platformFee

    // Create purchase record
    const { data: purchase, error: purchaseError } = await supabase
      .from('photo_purchases')
      .insert({
        photo_id: photoId,
        buyer_user_id: user.id,
        seller_user_id: photo.user_id,
        purchase_price: purchasePrice,
        license_type: licenseType || photo.license_type,
        platform_fee: platformFee,
        seller_payout: sellerPayout,
        payment_status: 'pending',
        payment_method: 'stripe',
        usage_rights: photo.usage_rights,
        license_agreement: generateLicenseAgreement(photo, licenseType || photo.license_type)
      })
      .select()
      .single()

    if (purchaseError || !purchase) {
      console.error('Error creating purchase record:', purchaseError)
      return NextResponse.json(
        { error: 'Failed to create purchase' },
        { status: 500 }
      )
    }

    // Create Stripe checkout session with multiple payment methods
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      // Enable all available payment methods (card, Apple Pay, Google Pay, PayPal, etc.)
      payment_method_types: ['card', 'us_bank_account'],
      // Stripe automatically enables Apple Pay, Google Pay, and Link on compatible devices
      payment_method_options: {
        us_bank_account: {
          financial_connections: {
            permissions: ['payment_method']
          }
        }
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: photo.title || 'Professional Photo',
              description: `${licenseType || photo.license_type} license - ${photo.description || ''}`,
              images: photo.watermarked_url ? [photo.watermarked_url] : [photo.preview_url]
            },
            unit_amount: Math.round(purchasePrice * 100) // Stripe uses cents
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/photos/purchase/success?purchase_id=${purchase.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/photos/marketplace?canceled=true`,
      metadata: {
        purchase_id: purchase.id,
        photo_id: photoId,
        buyer_user_id: user.id,
        seller_user_id: photo.user_id
      },
      customer_email: user.email,
      // Payment methods are manually specified above
    })

    // Update purchase with Stripe session ID
    await supabase
      .from('photo_purchases')
      .update({
        stripe_payment_intent_id: session.id,
        payment_status: 'processing'
      })
      .eq('id', purchase.id)

    return NextResponse.json({
      purchaseId: purchase.id,
      checkoutUrl: session.url
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * Generate license agreement text
 */
function generateLicenseAgreement(photo: any, licenseType: string): string {
  const agreements: Record<string, string> = {
    personal: `
      PERSONAL LICENSE AGREEMENT
      
      This license grants you the right to use this photo for personal, non-commercial purposes only.
      You may:
      - Use the photo for personal projects
      - Print the photo for personal display
      - Share the photo on personal social media (with attribution)
      
      You may NOT:
      - Use the photo for commercial purposes
      - Resell or redistribute the photo
      - Remove watermarks or modify attribution
      
      Photo: ${photo.title || 'Untitled'}
      Photographer: ${photo.photographer_name || 'Unknown'}
      License Date: ${new Date().toISOString()}
    `,
    commercial: `
      COMMERCIAL LICENSE AGREEMENT
      
      This license grants you the right to use this photo for commercial purposes.
      You may:
      - Use the photo in commercial projects
      - Use the photo in advertising and marketing
      - Modify the photo for your needs
      - Use the photo in digital and print media
      
      You may NOT:
      - Resell or redistribute the original photo
      - Claim ownership of the photo
      - Use the photo in ways that defame the photographer
      
      Photo: ${photo.title || 'Untitled'}
      Photographer: ${photo.photographer_name || 'Unknown'}
      License Date: ${new Date().toISOString()}
    `,
    editorial: `
      EDITORIAL LICENSE AGREEMENT
      
      This license grants you the right to use this photo for editorial purposes only.
      You may:
      - Use the photo in news articles
      - Use the photo in educational content
      - Use the photo in documentaries
      
      You may NOT:
      - Use the photo for commercial advertising
      - Resell or redistribute the photo
      - Use the photo to promote products or services
      
      Photo: ${photo.title || 'Untitled'}
      Photographer: ${photo.photographer_name || 'Unknown'}
      License Date: ${new Date().toISOString()}
    `,
    exclusive: `
      EXCLUSIVE LICENSE AGREEMENT
      
      This license grants you exclusive rights to use this photo.
      The photographer agrees to:
      - Remove the photo from public sale
      - Not license the photo to any other party
      - Grant you full commercial rights
      
      You may:
      - Use the photo for any legal purpose
      - Modify the photo as needed
      - Sublicense the photo with restrictions
      
      You may NOT:
      - Claim authorship of the photo
      - Use the photo in illegal or harmful ways
      
      Photo: ${photo.title || 'Untitled'}
      Photographer: ${photo.photographer_name || 'Unknown'}
      License Date: ${new Date().toISOString()}
    `
  }

  return agreements[licenseType] || agreements.personal
}

