import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// RSS Feed Sources - Expanded Music Industry Focus with Indie & Underground
const RSS_SOURCES = [
  // Major Music Publications
  {
    name: 'Mixmag',
    url: 'https://mixmag.net/feed',
    category: 'Electronic Music',
    priority: 1
  },
  {
    name: 'Resident Advisor',
    url: 'https://ra.co/xml/rss.xml',
    category: 'Electronic Music',
    priority: 1
  },
  {
    name: 'Pitchfork',
    url: 'https://pitchfork.com/feed/feed-news/rss/',
    category: 'Music News',
    priority: 1
  },
  {
    name: 'Billboard',
    url: 'https://www.billboard.com/feed/rss/news',
    category: 'Music Industry',
    priority: 1
  },
  {
    name: 'Rolling Stone',
    url: 'https://www.rollingstone.com/feed/',
    category: 'Music & Culture',
    priority: 1
  },
  {
    name: 'NME',
    url: 'https://www.nme.com/feed',
    category: 'Music News',
    priority: 2
  },
  {
    name: 'Variety',
    url: 'https://variety.com/feed/music/',
    category: 'Music Industry',
    priority: 1
  },
  {
    name: 'Spin',
    url: 'https://www.spin.com/feed/',
    category: 'Music News',
    priority: 2
  },
  {
    name: 'The Guardian Music',
    url: 'https://www.theguardian.com/music/rss',
    category: 'Music News',
    priority: 2
  },
  {
    name: 'BBC Music',
    url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/music/rss.xml',
    category: 'Music News',
    priority: 2
  },
  {
    name: 'DJ Mag',
    url: 'https://djmag.com/rss.xml',
    category: 'Electronic Music',
    priority: 2
  },
  {
    name: 'Fact Magazine',
    url: 'https://www.factmag.com/feed/',
    category: 'Electronic Music',
    priority: 2
  },
  {
    name: 'The Quietus',
    url: 'https://thequietus.com/rss',
    category: 'Music News',
    priority: 2
  },
  {
    name: 'Clash Magazine',
    url: 'https://www.clashmusic.com/feed',
    category: 'Music News',
    priority: 2
  },
  {
    name: 'Drowned in Sound',
    url: 'https://drownedinsound.com/rss',
    category: 'Music News',
    priority: 3
  },
  {
    name: 'The Line of Best Fit',
    url: 'https://www.thelineofbestfit.com/feed',
    category: 'Music News',
    priority: 2
  },
  {
    name: 'Gorilla vs Bear',
    url: 'https://gorillavsbear.net/feed/',
    category: 'Indie Music',
    priority: 3
  },
  {
    name: 'Pigeons & Planes',
    url: 'https://pigeonsandplanes.com/feed',
    category: 'Hip Hop',
    priority: 2
  },
  {
    name: 'Complex Music',
    url: 'https://www.complex.com/music/rss.xml',
    category: 'Hip Hop',
    priority: 2
  },
  
  // Indie & Underground Music
  {
    name: 'Stereogum',
    url: 'https://www.stereogum.com/feed/',
    category: 'Indie Music',
    priority: 2
  },
  {
    name: 'BrooklynVegan',
    url: 'https://www.brooklynvegan.com/feed/',
    category: 'Indie Music',
    priority: 3
  },
  {
    name: 'The FADER',
    url: 'https://www.thefader.com/feed',
    category: 'Indie Music',
    priority: 2
  },
  {
    name: 'Consequence',
    url: 'https://consequence.net/feed/',
    category: 'Indie Music',
    priority: 2
  },
  {
    name: 'Alternative Press',
    url: 'https://www.altpress.com/feed/',
    category: 'Indie Music',
    priority: 3
  },
  {
    name: 'Under the Radar',
    url: 'https://undertheradarmag.com/feed/',
    category: 'Indie Music',
    priority: 3
  },
  {
    name: 'Aquarium Drunkard',
    url: 'https://aquariumdrunkard.com/feed/',
    category: 'Indie Music',
    priority: 3
  },
  {
    name: 'Gorilla vs Bear',
    url: 'https://gorillavsbear.net/feed/',
    category: 'Indie Music',
    priority: 3
  },
  {
    name: 'The Line of Best Fit',
    url: 'https://www.thelineofbestfit.com/feed',
    category: 'Indie Music',
    priority: 3
  },
  {
    name: 'DIY Magazine',
    url: 'https://diymag.com/feed',
    category: 'Indie Music',
    priority: 3
  },
  {
    name: 'The 405',
    url: 'https://www.thefourohfive.com/feed',
    category: 'Indie Music',
    priority: 3
  },
  {
    name: 'The Quietus',
    url: 'https://thequietus.com/feed',
    category: 'Indie Music',
    priority: 3
  },
  {
    name: 'Drowned in Sound',
    url: 'https://drownedinsound.com/feed',
    category: 'Indie Music',
    priority: 3
  },
  {
    name: 'The Skinny',
    url: 'https://www.theskinny.co.uk/music/feed',
    category: 'Indie Music',
    priority: 3
  },
  {
    name: 'Clash Magazine',
    url: 'https://www.clashmusic.com/feed',
    category: 'Indie Music',
    priority: 3
  },
  {
    name: 'The Music',
    url: 'https://themusic.com.au/feed',
    category: 'Indie Music',
    priority: 3
  },
  {
    name: 'The Ringer',
    url: 'https://www.theringer.com/music/feed',
    category: 'Indie Music',
    priority: 2
  },
  
  // Underground & Experimental
  {
    name: 'Tiny Mix Tapes',
    url: 'https://www.tinymixtapes.com/feed',
    category: 'Underground Music',
    priority: 3
  },
  {
    name: 'Fact Magazine',
    url: 'https://www.factmag.com/feed/',
    category: 'Underground Music',
    priority: 3
  },
  {
    name: 'The Wire',
    url: 'https://www.thewire.co.uk/feed',
    category: 'Underground Music',
    priority: 3
  },
  {
    name: 'Bandcamp Daily',
    url: 'https://daily.bandcamp.com/feed',
    category: 'Underground Music',
    priority: 3
  },
  {
    name: 'Noisey',
    url: 'https://www.vice.com/en_us/rss/topic/music',
    category: 'Underground Music',
    priority: 2
  },
  {
    name: 'Pitchfork Reviews',
    url: 'https://pitchfork.com/feed/feed-album-reviews/rss/',
    category: 'Underground Music',
    priority: 2
  },
  {
    name: 'The Needle Drop',
    url: 'https://www.theneedledrop.com/feed',
    category: 'Underground Music',
    priority: 3
  },
  {
    name: 'Sputnik Music',
    url: 'https://www.sputnikmusic.com/rss.php',
    category: 'Underground Music',
    priority: 3
  },
  {
    name: 'Rate Your Music',
    url: 'https://rateyourmusic.com/rss/news',
    category: 'Underground Music',
    priority: 3
  },
  
  // Hip-Hop & Urban
  {
    name: 'Complex',
    url: 'https://www.complex.com/feed/rss',
    category: 'Hip-Hop',
    priority: 2
  },
  {
    name: 'Hypebeast',
    url: 'https://hypebeast.com/music/feed',
    category: 'Hip-Hop',
    priority: 3
  },
  {
    name: 'XXL',
    url: 'https://www.xxlmag.com/feed/',
    category: 'Hip-Hop',
    priority: 2
  },
  {
    name: 'HotNewHipHop',
    url: 'https://www.hotnewhiphop.com/feed/',
    category: 'Hip-Hop',
    priority: 3
  },
  {
    name: 'Rap Radar',
    url: 'https://rapradar.com/feed/',
    category: 'Hip-Hop',
    priority: 3
  },
  {
    name: 'Okayplayer',
    url: 'https://www.okayplayer.com/feed',
    category: 'Hip-Hop',
    priority: 3
  },
  {
    name: 'The Source',
    url: 'https://thesource.com/feed/',
    category: 'Hip-Hop',
    priority: 3
  },
  {
    name: 'Vibe',
    url: 'https://www.vibe.com/feed/',
    category: 'Hip-Hop',
    priority: 3
  },
  
  // Electronic & Dance
  {
    name: 'Resident Advisor',
    url: 'https://ra.co/feed',
    category: 'Electronic Music',
    priority: 2
  },
  {
    name: 'Electronic Beats',
    url: 'https://www.electronicbeats.net/feed/',
    category: 'Electronic Music',
    priority: 3
  },
  {
    name: 'Mixmag',
    url: 'https://mixmag.net/feed',
    category: 'Electronic Music',
    priority: 2
  },
  {
    name: 'DJ Mag',
    url: 'https://djmag.com/feed',
    category: 'Electronic Music',
    priority: 2
  },
  {
    name: 'XLR8R',
    url: 'https://www.xlr8r.com/feed/',
    category: 'Electronic Music',
    priority: 3
  },
  
  // Metal & Heavy Music
  {
    name: 'Metal Injection',
    url: 'https://metalinjection.net/feed',
    category: 'Metal Music',
    priority: 3
  },
  {
    name: 'MetalSucks',
    url: 'https://www.metalsucks.net/feed/',
    category: 'Metal Music',
    priority: 3
  },
  {
    name: 'Lambgoat',
    url: 'https://lambgoat.com/feed/',
    category: 'Metal Music',
    priority: 3
  },
  {
    name: 'Metal Hammer',
    url: 'https://www.loudersound.com/feed',
    category: 'Metal Music',
    priority: 2
  },
  {
    name: 'Decibel Magazine',
    url: 'https://decibelmagazine.com/feed/',
    category: 'Metal Music',
    priority: 3
  },
  {
    name: 'Blabbermouth',
    url: 'https://blabbermouth.net/feed',
    category: 'Metal Music',
    priority: 3
  },
  {
    name: 'Metal Archives',
    url: 'https://www.metal-archives.com/rss/news',
    category: 'Metal Music',
    priority: 3
  },
  
  // Jazz & Experimental
  {
    name: 'JazzTimes',
    url: 'https://jazztimes.com/feed/',
    category: 'Jazz Music',
    priority: 3
  },
  {
    name: 'DownBeat',
    url: 'https://downbeat.com/feed/',
    category: 'Jazz Music',
    priority: 3
  },
  {
    name: 'All About Jazz',
    url: 'https://www.allaboutjazz.com/feed',
    category: 'Jazz Music',
    priority: 3
  },
  {
    name: 'Jazzwise',
    url: 'https://www.jazzwise.com/feed',
    category: 'Jazz Music',
    priority: 3
  },
  
  // Local & Regional
  {
    name: 'Chicago Reader',
    url: 'https://chicagoreader.com/music/feed/',
    category: 'Local Music',
    priority: 3
  },
  {
    name: 'LA Weekly',
    url: 'https://www.laweekly.com/music/feed/',
    category: 'Local Music',
    priority: 3
  },
  {
    name: 'Austin Chronicle',
    url: 'https://www.austinchronicle.com/music/feed/',
    category: 'Local Music',
    priority: 3
  },
  {
    name: 'Nashville Scene',
    url: 'https://www.nashvillescene.com/music/feed/',
    category: 'Local Music',
    priority: 3
  },
  {
    name: 'Seattle Weekly',
    url: 'https://www.seattleweekly.com/music/feed/',
    category: 'Local Music',
    priority: 3
  },
  {
    name: 'SF Weekly',
    url: 'https://www.sfweekly.com/music/feed/',
    category: 'Local Music',
    priority: 3
  },
  {
    name: 'Village Voice',
    url: 'https://www.villagevoice.com/music/feed/',
    category: 'Local Music',
    priority: 3
  }
]

interface RSSItem {
  id: string
  title: string
  description: string
  link: string
  pubDate: string
  author?: string
  category?: string
  image?: string
  source: string
  priority: number
}

// Cache for RSS feeds to avoid hitting rate limits
const RSS_CACHE = new Map<string, { data: RSSItem[], timestamp: number }>()
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

function decodeXmlText(value: string) {
  return String(value || '')
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function pickFirstMatch(xml: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = xml.match(pattern)
    if (match?.[1]) return decodeXmlText(match[1])
  }
  return ''
}

function parseRssItems(params: { xmlText: string; source: typeof RSS_SOURCES[0] }) {
  const items: RSSItem[] = []
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi
  let itemMatch: RegExpExecArray | null

  while ((itemMatch = itemRegex.exec(params.xmlText)) && items.length < 14) {
    const itemXml = itemMatch[1]
    const title = pickFirstMatch(itemXml, [/<title[^>]*>([\s\S]*?)<\/title>/i])
    const description = pickFirstMatch(itemXml, [/<description[^>]*>([\s\S]*?)<\/description>/i])
    const link = pickFirstMatch(itemXml, [/<link[^>]*>([\s\S]*?)<\/link>/i])
    const pubDate = pickFirstMatch(itemXml, [/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i, /<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i])
    const author = pickFirstMatch(itemXml, [/<author[^>]*>([\s\S]*?)<\/author>/i, /<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i])
    const category = pickFirstMatch(itemXml, [/<category[^>]*>([\s\S]*?)<\/category>/i]) || params.source.category

    if (!title || !link) continue

    const mediaUrl = pickFirstMatch(itemXml, [
      /<media:content[^>]+url=["']([^"']+)["']/i,
      /<enclosure[^>]+url=["']([^"']+)["']/i,
      /<img[^>]+src=["']([^"']+)["']/i
    ])

    items.push({
      id: `${params.source.name.toLowerCase().replace(/\s+/g, '-')}-${items.length}-${Date.now()}`,
      title,
      description,
      link,
      pubDate: pubDate || new Date().toISOString(),
      author: author || params.source.name,
      category,
      image: mediaUrl || `https://dummyimage.com/400x250/ef4444/ffffff?text=${params.source.name.charAt(0)}`,
      source: params.source.name,
      priority: params.source.priority
    })
  }

  return items
}

function parseAtomItems(params: { xmlText: string; source: typeof RSS_SOURCES[0] }) {
  const entries: RSSItem[] = []
  const entryRegex = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi
  let entryMatch: RegExpExecArray | null

  while ((entryMatch = entryRegex.exec(params.xmlText)) && entries.length < 14) {
    const entryXml = entryMatch[1]
    const title = pickFirstMatch(entryXml, [/<title[^>]*>([\s\S]*?)<\/title>/i])
    const summary = pickFirstMatch(entryXml, [/<summary[^>]*>([\s\S]*?)<\/summary>/i, /<content[^>]*>([\s\S]*?)<\/content>/i])
    const link = pickFirstMatch(entryXml, [/<link[^>]+href=["']([^"']+)["']/i, /<id[^>]*>([\s\S]*?)<\/id>/i])
    const published = pickFirstMatch(entryXml, [/<updated[^>]*>([\s\S]*?)<\/updated>/i, /<published[^>]*>([\s\S]*?)<\/published>/i])
    const author = pickFirstMatch(entryXml, [/<author>[\s\S]*?<name[^>]*>([\s\S]*?)<\/name>[\s\S]*?<\/author>/i])

    if (!title || !link) continue

    entries.push({
      id: `${params.source.name.toLowerCase().replace(/\s+/g, '-')}-atom-${entries.length}-${Date.now()}`,
      title,
      description: summary,
      link,
      pubDate: published || new Date().toISOString(),
      author: author || params.source.name,
      category: params.source.category,
      image: `https://dummyimage.com/400x250/ef4444/ffffff?text=${params.source.name.charAt(0)}`,
      source: params.source.name,
      priority: params.source.priority
    })
  }

  return entries
}

async function fetchFeedXml(url: string) {
  const primary = await fetch(url, {
    signal: AbortSignal.timeout(12000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; TourifyBot/1.0)',
      Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8'
    }
  })
  if (primary.ok) return primary.text()

  // Fallback proxy for feeds that block direct requests.
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
  const fallback = await fetch(proxyUrl, {
    signal: AbortSignal.timeout(12000),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TourifyBot/1.0)' }
  })
  if (!fallback.ok) return ''
  const payload = await fallback.json()
  return String(payload?.contents || '')
}

async function fetchRSSFeed(source: typeof RSS_SOURCES[0]): Promise<RSSItem[]> {
  const cacheKey = source.name
  const cached = RSS_CACHE.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  try {
    const xmlText = await fetchFeedXml(source.url)
    if (!xmlText) {
      console.warn(`Failed to fetch RSS from ${source.name}: empty response`)
      return []
    }

    const items = parseRssItems({ xmlText, source })
    const parsedItems = items.length ? items : parseAtomItems({ xmlText, source })

    // Cache the results
    RSS_CACHE.set(cacheKey, { data: parsedItems, timestamp: Date.now() })
    
    return parsedItems
  } catch (error) {
    console.error(`Error fetching RSS from ${source.name}:`, error)
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category')
    const source = searchParams.get('source')

    // Filter sources based on parameters
    let sourcesToFetch = RSS_SOURCES
    if (source) {
      sourcesToFetch = RSS_SOURCES.filter(s => 
        s.name.toLowerCase().includes(source.toLowerCase())
      )
    }
    if (category) {
      sourcesToFetch = RSS_SOURCES.filter(s => 
        s.category.toLowerCase().includes(category.toLowerCase())
      )
    }

    // Fetch RSS feeds in parallel
    const fetchPromises = sourcesToFetch.map(fetchRSSFeed)
    const results = await Promise.allSettled(fetchPromises)

    // Combine all successful results
    let allItems: RSSItem[] = []
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allItems.push(...result.value)
      }
    })

    // Sort by priority and date
    allItems.sort((a, b) => {
      // First by priority (lower number = higher priority)
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      // Then by date (newer first)
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    })

    // Apply limit
    allItems = allItems.slice(0, limit)

    // Get unique sources
    const sources = [...new Set(allItems.map(item => item.source))]

    return NextResponse.json({
      success: true,
      news: allItems,
      total: allItems.length,
      sources,
      categories: [...new Set(RSS_SOURCES.map(s => s.category))],
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in RSS news API:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch RSS news',
      news: [],
      total: 0,
      sources: [],
      categories: []
    }, { status: 500 })
  }
}
