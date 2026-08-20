import { z } from 'zod'

export const bookingDetailsSchema = z.object({
  performanceType: z.string().trim().min(1, 'Choose a project or service type.'),
  description: z.string().trim().optional().default(''),
  performanceDate: z.string().trim().min(1, 'Choose a target date.'),
  soundcheckTime: z.string().optional(),
  performanceTime: z.string().optional(),
  duration: z.string().optional(),
  venue: z.string().trim().min(1, 'Enter the business or venue.'),
  location: z.string().trim().min(1, 'Enter the project location.'),
  compensation: z.string().trim().optional().default(''),
  requirements: z.string().optional(),
  additionalNotes: z.string().optional(),
})

export const publicArtistBookingDetailsSchema = z.object({
  performanceType: z.string().trim().min(1, 'Choose a booking type.'),
  description: z.string().trim().min(1, 'Add a note for the artist.').max(5000),
  location: z.string().trim().min(1, 'Enter the project location.'),
  performanceDate: z.string().trim().optional().default(''),
  venue: z.string().trim().optional().default(''),
  soundcheckTime: z.string().optional(),
  performanceTime: z.string().optional(),
  duration: z.string().optional(),
  compensation: z.string().trim().optional().default(''),
  requirements: z.string().optional(),
  additionalNotes: z.string().optional(),
})

export const createBookingRequestSchema = z.object({
  artistId: z.string().uuid().optional(),
  artistProfileId: z.string().uuid().optional(),
  venueId: z.string().uuid().optional(),
  requesterId: z.string().uuid().optional(),
  email: z.string().email('Enter a valid email address.').optional(),
  phone: z.string().optional(),
  eventId: z.string().uuid().optional(),
  tourId: z.string().uuid().optional(),
  eventName: z.string().optional(),
  eventType: z.string().optional(),
  eventDate: z.string().optional(),
  eventDuration: z.number().int().positive().optional(),
  expectedAttendance: z.number().int().nonnegative().optional(),
  budgetRange: z.string().optional(),
  bookingDetails: bookingDetailsSchema,
  token: z.string().optional(),
  status: z.enum(['pending', 'needs_info', 'accepted', 'declined', 'approved', 'rejected']).default('pending'),
  requestType: z.enum(['performance', 'collaboration']).default('performance'),
})

export const createPublicArtistBookingRequestSchema = createBookingRequestSchema.extend({
  artistId: z.string().uuid(),
  bookingDetails: publicArtistBookingDetailsSchema,
})

export const bookingStepOneSchema = z.object({
  requestType: z.enum(['performance', 'collaboration']),
  performanceType: publicArtistBookingDetailsSchema.shape.performanceType,
  description: publicArtistBookingDetailsSchema.shape.description,
  venue: publicArtistBookingDetailsSchema.shape.venue,
  location: publicArtistBookingDetailsSchema.shape.location,
  performanceDate: publicArtistBookingDetailsSchema.shape.performanceDate,
})

export const bookingDeferredDetailsSchema = z.object({
  compensation: z.string().trim().max(500).default(''),
  description: z.string().trim().max(5000).default(''),
  additionalNotes: z.string().trim().max(5000).default(''),
  email: z.union([z.literal(''), z.string().email('Enter a valid email address.')]).default(''),
  phone: z.string().trim().max(100).default(''),
})

export const bookingDecisionSchema = z.object({
  decision: z.enum(['accepted', 'declined', 'needs_info']),
  note: z.string().trim().max(2000).optional(),
})

export const bookingMessageSchema = z.object({
  content: z.string().trim().min(1, 'Write a message.').max(2000),
  messageType: z.enum(['message', 'info_request', 'info_response']).optional().default('message'),
})

export type PublicBookingDraft = z.infer<typeof bookingStepOneSchema>
export type BookingDeferredDetails = z.infer<typeof bookingDeferredDetailsSchema>
