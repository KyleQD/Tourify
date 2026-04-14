'use server'

import { z } from 'zod'
import { createSafeActionClient } from 'next-safe-action'
import { PrismaClient, Prisma } from '@prisma/client'
import { getStripe } from '@/lib/stripe'

const prisma = new PrismaClient()

const stripe = getStripe()

// Define your action client if you're using next-safe-action
// If not, you'd export plain async functions.
const action = createSafeActionClient()

const CreateTicketTypeSchema = z.object({
  eventId: z.string().cuid({ message: 'Invalid event ID' }),
  name: z.string().min(3, 'Ticket type name must be at least 3 characters').max(100),
  price: z.number().positive('Price must be a positive number').refine(p => (p * 100) % 1 === 0, {
    message: 'Price must have at most two decimal places.',
  }),
  currency: z.string().length(3, 'Currency code must be 3 characters, e.g., usd').default('usd'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  requiresRegistration: z.boolean().default(false),
})

interface CreateTicketTypeOutput {
  success: boolean
  ticketType?: {
    id: string
    name: string
    price: number
    stripePriceId: string
  }
  error?: string
}

export const createTicketTypeAction = action
  .schema(CreateTicketTypeSchema)
  .action(async ({ parsedInput }): Promise<CreateTicketTypeOutput> => {
    const {
      eventId,
      name,
      price,
      currency = 'usd',
      quantity,
      requiresRegistration = false,
    } = parsedInput
    try {
      const event = await (prisma as any).event.findUnique({
        where: { id: eventId },
        select: { id: true, name: true },
      })

      if (!event) {
        return { success: false, error: 'Event not found.' }
      }

      // For more robust product management, consider one Stripe Product per Event
      // and then multiple Stripe Prices (one for each TicketType) under that Product.
      // This example creates a new Stripe Product for each TicketType for simplicity.
      const stripeProduct = await stripe.products.create({
        name: `${event.name} - ${name}`, // e.g., "Awesome Concert - General Admission"
        // metadata: { eventId: event.id, ticketTypeName: name } // Useful for reconciliation
      })

      const priceInCents = Math.round(price * 100) // Convert to smallest currency unit

      const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: priceInCents,
        currency: currency.toLowerCase(),
        // metadata: { eventId: event.id, ticketTypeName: name }
      })

      const newTicketType = await (prisma as any).ticketType.create({
        data: {
          eventId,
          name,
          price, // Store the display price (e.g., 10.50)
          quantity,
          sold: 0,
          stripePriceId: stripePrice.id, // IMPORTANT: Store this ID
          requiresRegistration,
          // currency: currency.toLowerCase(), // Add currency to your Prisma model if needed
        },
        select: {
            id: true,
            name: true,
            price: true,
            stripePriceId: true,
        }
      })

      return { success: true, ticketType: newTicketType }
    } catch (error: any) {
      console.error('Error creating ticket type:', error)
      // Basic error handling. In a real app, you might try to clean up Stripe entities
      // if the DB operation fails, or use a more robust transactional pattern.
      // Handle Prisma-like errors without depending on class types
      if ((error as any)?.code && (error as any)?.message) {
        return { success: false, error: `Database error: ${(error as any).message}` }
      }
      if (error.type && error.type.startsWith('Stripe')) { // Check if it's a Stripe error
        return { success: false, error: `Stripe error: ${error.message}` }
      }
      return { success: false, error: 'An unexpected error occurred.' }
    }
  })

// TODO:
// - updateTicketTypeAction:
//   - If price changes, Stripe Prices are immutable. You must create a new Price and archive the old one.
//   - Update Stripe Product name if TicketType name or Event name changes.
// - deleteTicketTypeAction:
//   - Archive the Stripe Price (price.update(id, { active: false }))
//   - Optionally archive or delete the Stripe Product if no other prices are attached
//     (product.update(id, { active: false }) or product.del(id))
//   - Delete the TicketType from your database. 