import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import {
  buildCreatorCapabilitiesV1,
  extractCreatorCapabilitiesV1,
  serializeCapabilityList
} from '@/lib/creator/capability-system'

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, supabase } = auth

  const [artistProfileRes, profileRes, certificationsRes, experiencesRes, portfolioRes, endorsementsRes] = await Promise.all([
    supabase.from('artist_profiles').select('id, settings').eq('user_id', user.id).maybeSingle(),
    supabase.from('profiles').select('top_skills').eq('id', user.id).maybeSingle(),
    supabase.from('profile_certifications').select('name').eq('user_id', user.id).order('issue_date', { ascending: false }).limit(12),
    supabase.from('profile_experiences').select('title, organization').eq('user_id', user.id).eq('is_visible', true).order('order_index', { ascending: true }).limit(12),
    supabase.from('portfolio_items').select('title, type').eq('user_id', user.id).order('created_at', { ascending: false }).limit(12),
    supabase.from('skill_endorsements').select('skill').eq('endorsed_id', user.id)
  ])

  const settings = artistProfileRes.data?.settings && typeof artistProfileRes.data.settings === 'object'
    ? artistProfileRes.data.settings
    : {}

  const capabilities = extractCreatorCapabilitiesV1(settings)
  const topSkills = Array.isArray(profileRes.data?.top_skills) ? profileRes.data?.top_skills : []
  const endorsements = Array.isArray(endorsementsRes.data)
    ? endorsementsRes.data as Array<{ skill?: string | null }>
    : []
  const endorsementCounts = endorsements.reduce((acc: Record<string, number>, item) => {
    if (!item?.skill) return acc
    acc[item.skill] = (acc[item.skill] || 0) + 1
    return acc
  }, {})

  const suggestedCredentials = (certificationsRes.data || []).map((item: any) => String(item.name || '').trim()).filter(Boolean)
  const suggestedHighlights = [
    ...(experiencesRes.data || []).map((item: any) => [item.title, item.organization].filter(Boolean).join(' @ ').trim()),
    ...(portfolioRes.data || []).map((item: any) => [item.title, item.type ? `(${item.type})` : null].filter(Boolean).join(' ').trim())
  ].filter(Boolean)

  return NextResponse.json({
    capabilities,
    top_skills: topSkills,
    endorsement_counts: endorsementCounts,
    suggested: {
      credentials: suggestedCredentials,
      work_highlights: suggestedHighlights
    }
  })
}

export async function PUT(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, supabase } = auth
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const nextCapabilities = buildCreatorCapabilitiesV1({
    creatorType: body.creatorType ?? body.creator_type,
    serviceOfferings: body.serviceOfferings ?? body.service_offerings,
    productsForSale: body.productsForSale ?? body.products_for_sale,
    credentials: body.credentials,
    workHighlights: body.workHighlights ?? body.work_highlights,
    availableForHire: body.availableForHire ?? body.available_for_hire,
    collaborationInterest: body.collaborationInterest ?? body.collaboration_interest,
    availability: body.availability,
    preferredContact: body.preferredContact ?? body.preferred_contact
  })

  const { data: artistProfile } = await supabase
    .from('artist_profiles')
    .select('settings')
    .eq('user_id', user.id)
    .maybeSingle()

  const existingSettings = artistProfile?.settings && typeof artistProfile.settings === 'object'
    ? (artistProfile.settings as Record<string, any>)
    : {}
  const existingProfessional = existingSettings.professional && typeof existingSettings.professional === 'object'
    ? existingSettings.professional
    : {}
  const existingPreferences = existingSettings.preferences && typeof existingSettings.preferences === 'object'
    ? existingSettings.preferences
    : {}

  const mergedSettings = {
    ...existingSettings,
    professional: {
      ...existingProfessional,
      creator_type: nextCapabilities.creatorType || '',
      service_offerings: serializeCapabilityList(nextCapabilities.serviceOfferings),
      products_for_sale: serializeCapabilityList(nextCapabilities.productsForSale),
      notable_performances: serializeCapabilityList(nextCapabilities.workHighlights),
      availability: nextCapabilities.availability || existingProfessional.availability || ''
    },
    preferences: {
      ...existingPreferences,
      available_for_hire: nextCapabilities.availableForHire,
      collaboration_interest: nextCapabilities.collaborationInterest,
      preferred_contact: nextCapabilities.preferredContact || existingPreferences.preferred_contact || 'email'
    },
    capabilities_v1: nextCapabilities
  }

  const { error: updateError } = await supabase
    .from('artist_profiles')
    .upsert({
      user_id: user.id,
      settings: mergedSettings,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ success: true, capabilities: nextCapabilities })
}
