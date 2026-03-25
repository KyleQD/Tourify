import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const type = searchParams.get('type') || 'all' // all, artists, venues, events, users, music
    const location = searchParams.get('location')
    const genre = searchParams.get('genre')
    const verified = searchParams.get('verified')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const results: {
      artists: any[]
      venues: any[]
      events: any[]
      users: any[]
      music: any[]
      posts: any[]
      total: number
    } = {
      artists: [],
      venues: [],
      events: [],
      users: [],
      music: [],
      posts: [],
      total: 0
    }

    // Search profiles (artists, venues, general users)
    if (type === 'all' || type === 'artists' || type === 'venues' || type === 'users') {
      // First, try to search the unified accounts table (new structure)
      try {
        let accountsQuery = supabase
          .from('accounts')
          .select(`
            id,
            owner_user_id,
            account_type,
            profile_table,
            profile_id,
            display_name,
            username,
            avatar_url,
            is_verified,
            is_active,
            metadata,
            created_at,
            updated_at
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        // Apply filters based on account type
        if (type === 'artists') {
          accountsQuery = accountsQuery.eq('account_type', 'artist')
        } else if (type === 'venues') {
          accountsQuery = accountsQuery.eq('account_type', 'venue')
        } else if (type === 'users') {
          accountsQuery = accountsQuery.eq('account_type', 'general')
        }

        // Apply search query with tokenized partial matching
        if (query) {
          const rawTokens = query.trim().split(/\s+/).filter(Boolean).slice(0, 5)
          const tokens = rawTokens.map(t => t.replace(/[\\%_]/g, ''))
          const orConditions = (tokens.length > 0 ? tokens : [query]).flatMap(t => [
            `display_name.ilike.%${t}%`,
            `username.ilike.%${t}%`
          ])
          accountsQuery = accountsQuery.or(orConditions.join(','))
        }

        const { data: accounts, error: accountsError } = await accountsQuery
          .range(offset, offset + limit - 1)

        if (!accountsError && accounts && accounts.length > 0) {
          console.log(`Found ${accounts.length} accounts in unified accounts table`)
          
          // Categorize accounts by type
          accounts.forEach(account => {
            const accountData = {
              id: account.id,
              user_id: account.owner_user_id,
              username: account.username,
              display_name: account.display_name,
              avatar_url: account.avatar_url,
              account_type: account.account_type,
              location: null,
              verified: account.is_verified,
              stats: { followers: 0, following: 0, posts: 0 },
              created_at: account.created_at,
              updated_at: account.updated_at,
              metadata: account.metadata
            }

            if (account.account_type === 'artist') {
              results.artists.push({
                ...accountData,
                artist_name: account.display_name,
                bio: account.metadata?.bio || '',
                genres: account.metadata?.genres || [],
                social_links: account.metadata?.social_links || {}
              })
            } else if (account.account_type === 'venue') {
              results.venues.push({
                ...accountData,
                venue_name: account.display_name,
                description: account.metadata?.description || '',
                address: account.metadata?.address || '',
                city: account.metadata?.city || '',
                state: account.metadata?.state || '',
                country: account.metadata?.country || '',
                capacity: account.metadata?.capacity || 0,
                amenities: account.metadata?.amenities || []
              })
            } else {
              results.users.push({
                ...accountData,
                name: account.display_name,
                bio: account.metadata?.bio || ''
              })
            }
          })
        } else {
          console.log('No accounts found in unified accounts table, falling back to profiles table')
        }
      } catch (accountsError) {
        console.log('Unified accounts table not available, falling back to profiles table:', accountsError)
      }

      // Fallback: Search in profiles table (legacy structure)
      // Be resilient to schema differences (some databases have full_name, not name,
      // and may not have account_type/account_settings). We intentionally select
      // only stable columns and include full_name for name-based searches.
      let profilesQuery = supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          name,
          username,
          bio,
          avatar_url,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })

      // Apply search query with tokenized partial matching across key fields
      if (query) {
        const rawTokens = query.trim().split(/\s+/).filter(Boolean).slice(0, 5)
        const tokens = rawTokens.map(t => t.replace(/[\\%_]/g, ''))
        const orConditions = (tokens.length > 0 ? tokens : [query]).flatMap(t => [
          `username.ilike.%${t}%`,
          `name.ilike.%${t}%`,
          `full_name.ilike.%${t}%`,
          `bio.ilike.%${t}%`
        ])
        profilesQuery = profilesQuery.or(orConditions.join(','))
      }

      const { data: profiles, error: profileError } = await profilesQuery
        .range(offset, offset + limit - 1)

      if (!profileError && profiles) {
        // Categorize profiles by account type
        profiles.forEach(profile => {
          const profileData = {
            ...profile,
            display_name: profile.full_name || profile.name || profile.username,
            location: null,
            verified: false,
            stats: { followers: 0, following: 0, posts: 0 }
          }

          // Without relying on optional columns like account_type, default to users.
          // If your DB has artist/venue specific tables, those are handled earlier
          // via the unified accounts path or separate endpoints.
          results.users.push(profileData)
        })

        // Also search within multi-account system (account_settings)
        profiles.forEach(profile => {
          // account_settings may not exist in some schemas; guard access
          // @ts-ignore - runtime guard ensures safety if absent
          if (profile.account_settings) {
            // Search in organizer_accounts (admin accounts)
            // @ts-ignore
            if (profile.account_settings.organizer_accounts) {
              // @ts-ignore
              profile.account_settings.organizer_accounts.forEach((organizer: any) => {
                if (query) {
                  const searchText = `${organizer.organization_name} ${organizer.description || ''}`.toLowerCase()
                  if (!searchText.includes(query.toLowerCase())) return
                }
                
                results.users.push({
                  id: organizer.id || `${profile.id}-organizer-${organizer.organization_name}`,
                  name: organizer.organization_name,
                  username: organizer.organization_name.toLowerCase().replace(/\s+/g, '-'),
                  bio: organizer.description || '',
                  avatar_url: organizer.logo_url || null,
                  account_type: 'admin',
                  display_name: organizer.organization_name,
                  location: organizer.location || null,
                  verified: false,
                  stats: { followers: 0, following: 0, posts: 0 }
                })
              })
            }

            // Search in artist_accounts (if they exist in account_settings)
            // @ts-ignore
            if (profile.account_settings.artist_accounts) {
              // @ts-ignore
              profile.account_settings.artist_accounts.forEach((artist: any) => {
                if (query) {
                  const searchText = `${artist.artist_name} ${artist.bio || ''}`.toLowerCase()
                  if (!searchText.includes(query.toLowerCase())) return
                }
                
                results.artists.push({
                  id: artist.id || `${profile.id}-artist-${artist.artist_name}`,
                  user_id: profile.id,
                  username: artist.artist_name.toLowerCase().replace(/\s+/g, '-'),
                  artist_name: artist.artist_name,
                  bio: artist.bio || '',
                  genres: artist.genres || [],
                  social_links: artist.social_links || {},
                  avatar_url: artist.avatar_url || null,
                  account_type: 'artist',
                  display_name: artist.artist_name,
                  location: artist.location || null,
                  verified: false,
                  stats: { followers: 0, following: 0, posts: 0 },
                  created_at: artist.created_at || profile.created_at,
                  updated_at: artist.updated_at || profile.updated_at
                })
              })
            }

            // Search in venue_accounts (if they exist in account_settings)
            // @ts-ignore
            if (profile.account_settings.venue_accounts) {
              // @ts-ignore
              profile.account_settings.venue_accounts.forEach((venue: any) => {
                if (query) {
                  const searchText = `${venue.venue_name} ${venue.description || ''}`.toLowerCase()
                  if (!searchText.includes(query.toLowerCase())) return
                }
                
                results.venues.push({
                  id: venue.id || `${profile.id}-venue-${venue.venue_name}`,
                  user_id: profile.id,
                  username: venue.venue_name.toLowerCase().replace(/\s+/g, '-'),
                  venue_name: venue.venue_name,
                  description: venue.description || '',
                  address: venue.address || '',
                  city: venue.city || '',
                  state: venue.state || '',
                  country: venue.country || '',
                  capacity: venue.capacity || 0,
                  amenities: venue.amenities || [],
                  avatar_url: venue.avatar_url || null,
                  account_type: 'venue',
                  display_name: venue.venue_name,
                  location: venue.city && venue.state ? `${venue.city}, ${venue.state}` : venue.city || venue.state || null,
                  verified: false,
                  stats: { followers: 0, following: 0, posts: 0 },
                  created_at: venue.created_at || profile.created_at,
                  updated_at: venue.updated_at || profile.updated_at
                })
              })
            }
          }
        })
      }
    }

    // Search events - TODO: Implement when events table is ready
    // if (type === 'all' || type === 'events') {
    //   results.events = []
    // }

    // Search music releases - TODO: Implement when music_releases table is ready
    // if (type === 'all' || type === 'music') {
    //   results.music = []
    // }

    // Search posts - TODO: Implement when posts table structure is ready
    // if (type === 'all' || type === 'posts') {
    //   results.posts = []
    // }

    // Calculate total results
    results.total = results.artists.length + results.venues.length + 
                   results.events.length + results.users.length + 
                   results.music.length + results.posts.length

    return NextResponse.json({
      success: true,
      results,
      query,
      filters: {
        type,
        location,
        genre,
        verified,
        limit,
        offset
      }
    })

  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 