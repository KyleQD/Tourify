import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAuthorizedInternalRequest, unauthorizedResponse } from '@/lib/auth/route-guards'

export async function GET(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) return unauthorizedResponse()
  try {
    const supabase = await createClient()
    
    // Test 1: Check if cache table exists and is accessible
    const { data: cacheTest, error: cacheError } = await supabase
      .from('cache')
      .select('key, updated_at')
      .limit(1)

    // Test 2: Test RSS feed fetching
    const testFeeds = [
      {
        name: 'Billboard Test',
        url: 'https://www.billboard.com/feed/rss/news'
      }
    ]

    let rssTestResults = []
    for (const feed of testFeeds) {
      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feed.url)}`
        const response = await fetch(proxyUrl, {
          headers: {
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          },
          next: { revalidate: 60 } // 1 minute cache for testing
        })

        if (response.ok) {
          const data = await response.json()
          const xmlText = data.contents
          
          // Simple test to see if we got XML content
          const hasItems = xmlText.includes('<item>')
          const hasTitle = xmlText.includes('<title>')
          
          rssTestResults.push({
            feed: feed.name,
            status: 'success',
            hasItems,
            hasTitle,
            contentLength: xmlText.length
          })
        } else {
          rssTestResults.push({
            feed: feed.name,
            status: 'error',
            error: `HTTP ${response.status}`
          })
        }
      } catch (error) {
        rssTestResults.push({
          feed: feed.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Test 3: Test cache insertion
    const testCacheKey = 'test_rss_' + Date.now()
    const { error: insertError } = await supabase
      .from('cache')
      .insert({
        key: testCacheKey,
        data: { test: true, timestamp: new Date().toISOString() }
      })

    // Clean up test cache entry
    if (!insertError) {
      await supabase
        .from('cache')
        .delete()
        .eq('key', testCacheKey)
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tests: {
        cacheTable: {
          accessible: !cacheError,
          error: cacheError?.message,
          sampleData: cacheTest?.length || 0
        },
        rssFeeds: rssTestResults,
        cacheInsert: {
          success: !insertError,
          error: insertError?.message
        }
      },
      environment: {
        hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'Not set'
      }
    })

  } catch (error) {
    console.error('RSS Test Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 