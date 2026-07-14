import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isArtistEventDiscoverable } from '@/lib/artist/artist-event-visibility'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
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
        }
      } catch (accountsError) {
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

    // Search events (published only for public discoverability)
    if (type === 'all' || type === 'events') {
      let legacyEventsQuery = supabase
        .from('events')
        .select(`
          id,
          slug,
          name,
          description,
          event_type,
          status,
          event_date,
          city,
          state,
          country,
          venue_name,
          tags,
          producer_settings,
          is_public
        `)
        .eq('status', 'published')
        .order('event_date', { ascending: true })

      let canonicalEventsQuery = supabase
        .from('events_v2')
        .select('id, title, status, start_at, settings')
        .in('status', ['confirmed', 'advancing', 'onsite'])
        .order('start_at', { ascending: true })

      if (query) {
        const cleaned = query.replace(/[\\%_]/g, '')
        legacyEventsQuery = legacyEventsQuery.or(
          [
            `name.ilike.%${cleaned}%`,
            `description.ilike.%${cleaned}%`,
            `venue_name.ilike.%${cleaned}%`,
            `city.ilike.%${cleaned}%`
          ].join(',')
        )
        canonicalEventsQuery = canonicalEventsQuery.or(`title.ilike.%${cleaned}%`)
      }

      if (location) {
        const cleanedLocation = location.replace(/[\\%_]/g, '')
        legacyEventsQuery = legacyEventsQuery.or(`city.ilike.%${cleanedLocation}%,state.ilike.%${cleanedLocation}%`)
      }

      if (genre) {
        const cleanedGenre = genre.replace(/[\\%_]/g, '')
        legacyEventsQuery = legacyEventsQuery.filter('tags', 'cs', `["${cleanedGenre}"]`)
      }

      const [legacyEventsResult, canonicalEventsResult] = await Promise.all([
        legacyEventsQuery.range(offset, offset + limit - 1),
        canonicalEventsQuery.range(offset, offset + limit - 1),
      ])

      const legacyEvents = (legacyEventsResult.data || [])
        .filter(isArtistEventDiscoverable)
        .map((event: any) => ({
        ...event,
        title: event.name,
        type: event.event_type,
        event_table: 'events'
      }))

      const canonicalEvents = (canonicalEventsResult.data || []).map((event: any) => {
        const settings = event.settings && typeof event.settings === 'object'
          ? (event.settings as Record<string, unknown>)
          : {}
        return {
          id: event.id,
          slug: null,
          name: event.title,
          title: event.title,
          description: typeof settings.description === 'string' ? settings.description : '',
          event_type: typeof settings.event_type === 'string' ? settings.event_type : null,
          type: typeof settings.event_type === 'string' ? settings.event_type : null,
          status: event.status,
          event_date: event.start_at ? String(event.start_at).slice(0, 10) : null,
          city: typeof settings.city === 'string' ? settings.city : null,
          state: typeof settings.state === 'string' ? settings.state : null,
          country: typeof settings.country === 'string' ? settings.country : null,
          venue_name: typeof settings.venue_name === 'string' ? settings.venue_name : null,
          tags: Array.isArray(settings.tags) ? settings.tags : [],
          event_table: 'events_v2'
        }
      })

      const mergedEvents = [...legacyEvents, ...canonicalEvents]
      const filteredMergedEvents = location
        ? mergedEvents.filter((event) => {
            const cleanedLocation = location.replace(/[\\%_]/g, '').toLowerCase()
            const locationText = `${event.city || ''} ${event.state || ''}`.toLowerCase()
            return locationText.includes(cleanedLocation)
          })
        : mergedEvents

      results.events = filteredMergedEvents
        .sort((a, b) => {
          const firstDate = a.event_date ? new Date(a.event_date).getTime() : Number.MAX_SAFE_INTEGER
          const secondDate = b.event_date ? new Date(b.event_date).getTime() : Number.MAX_SAFE_INTEGER
          return firstDate - secondDate
        })
        .slice(0, limit)
    }

    // Search music releases
    if (type === 'all' || type === 'music') {
      const cleanedQuery = query.replace(/[\\%_]/g, '').trim()

      let musicQuery = supabase
        .from('music_releases')
        .select('id, title, artist_name, release_type, release_date, cover_art_url, genre, description, artist_id')
        .order('release_date', { ascending: false })

      if (cleanedQuery) {
        musicQuery = musicQuery.or(
          [
            `title.wfts.${cleanedQuery}`,
            `artist_name.wfts.${cleanedQuery}`,
            `description.wfts.${cleanedQuery}`,
          ].join(',')
        )
      }

      let { data: musicRows, error: musicError } = await musicQuery.range(offset, offset + limit - 1)

      if (musicError && cleanedQuery) {
        let ilikeMusicQuery = supabase
          .from('music_releases')
          .select('id, title, artist_name, release_type, release_date, cover_art_url, genre, description, artist_id')
          .order('release_date', { ascending: false })
          .or(`title.ilike.%${cleanedQuery}%,artist_name.ilike.%${cleanedQuery}%,description.ilike.%${cleanedQuery}%`)

        const ilikeResult = await ilikeMusicQuery.range(offset, offset + limit - 1)
        musicRows = ilikeResult.data
        musicError = ilikeResult.error
      }

      if (!musicError && musicRows) {
        results.music = musicRows.map((row: any) => ({
          id: row.id,
          title: row.title,
          artist_name: row.artist_name,
          type: row.release_type,
          release_date: row.release_date,
          cover_art_url: row.cover_art_url,
          genre: row.genre,
          description: row.description,
          artist_id: row.artist_id,
        }))
      } else if (musicError) {
        let fallbackQuery = supabase
          .from('artist_music')
          .select('id, title, artist_id, genre, description, cover_url, created_at, is_public')
          .eq('is_public', true)
          .order('created_at', { ascending: false })

        if (cleanedQuery) {
          fallbackQuery = fallbackQuery.textSearch('title', cleanedQuery, { type: 'websearch', config: 'english' })
        }

        const { data: artistMusic, error: artistMusicError } = await fallbackQuery.range(offset, offset + limit - 1)

        if (artistMusicError && cleanedQuery) {
          const ilikeFallback = await supabase
            .from('artist_music')
            .select('id, title, artist_id, genre, description, cover_url, created_at, is_public')
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .or(`title.ilike.%${cleanedQuery}%,description.ilike.%${cleanedQuery}%`)
            .range(offset, offset + limit - 1)

          results.music = (ilikeFallback.data || []).map((row: any) => ({
            id: row.id,
            title: row.title,
            artist_id: row.artist_id,
            genre: row.genre,
            description: row.description,
            cover_art_url: row.cover_url,
            release_date: row.created_at,
          }))
        } else {
          results.music = (artistMusic || []).map((row: any) => ({
            id: row.id,
            title: row.title,
            artist_id: row.artist_id,
            genre: row.genre,
            description: row.description,
            cover_art_url: row.cover_url,
            release_date: row.created_at,
          }))
        }
      }
    }

    // Search posts
    if (type === 'all' || type === 'posts') {
      const cleanedQuery = query.replace(/[\\%_]/g, '').trim()

      let postsQuery = supabase
        .from('posts')
        .select(`
          id,
          user_id,
          content,
          type,
          visibility,
          created_at,
          profiles (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })

      if (cleanedQuery) {
        postsQuery = postsQuery.textSearch('content', cleanedQuery, { type: 'websearch', config: 'english' })
      }

      let { data: postRows, error: postsError } = await postsQuery.range(offset, offset + limit - 1)

      if (postsError && cleanedQuery) {
        const ilikePostsResult = await supabase
          .from('posts')
          .select(`
            id,
            user_id,
            content,
            type,
            visibility,
            created_at,
            profiles (
              username,
              full_name,
              avatar_url
            )
          `)
          .eq('visibility', 'public')
          .order('created_at', { ascending: false })
          .ilike('content', `%${cleanedQuery}%`)
          .range(offset, offset + limit - 1)

        postRows = ilikePostsResult.data
        postsError = ilikePostsResult.error
      }
      if (!postsError && postRows) {
        results.posts = postRows.map((post: any) => ({
          id: post.id,
          user_id: post.user_id,
          content: post.content,
          type: post.type,
          visibility: post.visibility,
          created_at: post.created_at,
          author: {
            username: post.profiles?.username,
            full_name: post.profiles?.full_name,
            avatar_url: post.profiles?.avatar_url,
          },
        }))
      }
    }

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