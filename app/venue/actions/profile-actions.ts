'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { VenueService } from '@/lib/services/venue.service'

const profileSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  type: z.string().min(2, 'Type is required'),
  description: z.string().optional(),
  location: z.string().min(2, 'Location is required'),
  avatar: z.string().url().optional(),
  coverImage: z.string().url().optional(),
  website: z.string().url().optional(),
  contactEmail: z.string().email().optional(),
  phone: z.string().optional(),
})

function mapProfileToVenueUpdates(data: z.infer<typeof profileSchema>) {
  const [city, state] = data.location.split(',').map(part => part.trim())
  return {
    venue_name: data.name,
    description: data.description,
    city: city || data.location,
    state: state || undefined,
    venue_types: [data.type],
    avatar_url: data.avatar,
    cover_image_url: data.coverImage,
    contact_info: {
      email: data.contactEmail,
      phone: data.phone,
      website: data.website,
    },
  }
}

export async function updateVenueProfile(id: string, data: z.infer<typeof profileSchema>) {
  try {
    const validated = profileSchema.parse(data)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const { data: venue } = await supabase
      .from('venue_profiles')
      .select('id, user_id, main_profile_id')
      .eq('id', id)
      .maybeSingle()

    if (!venue) return { success: false, error: 'Venue not found' }

    const isOwner =
      venue.user_id === user.id ||
      venue.main_profile_id === user.id

    if (!isOwner) {
      const { data: membership } = await supabase
        .from('venue_team_members')
        .select('id')
        .eq('venue_id', id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .contains('permissions', { manage_settings: true })
        .maybeSingle()

      if (!membership) return { success: false, error: 'You do not have permission to update this venue' }
    }

    const venueService = new VenueService(supabase as never)
    await venueService.updateVenueProfile(id, mapProfileToVenueUpdates(validated))

    revalidatePath('/venue')
    revalidatePath(`/venue/dashboard/profile`)
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', details: error.errors }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update profile',
    }
  }
}
