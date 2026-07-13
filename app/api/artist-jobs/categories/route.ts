import { NextRequest, NextResponse } from 'next/server'
import {
  ensureArtistJobCategoriesSeeded,
  fetchActiveArtistJobCategoriesForApi,
} from '@/lib/artist-jobs/categories'

export async function GET(request: NextRequest) {
  try {
    let { data, error } = await fetchActiveArtistJobCategoriesForApi()

    if (!error && data && data.length > 0) {
      return NextResponse.json({ success: true, data })
    }

    if (error) console.error('Error fetching artist job categories:', error)

    await ensureArtistJobCategoriesSeeded()

    const refetch = await fetchActiveArtistJobCategoriesForApi()
    data = refetch.data
    error = refetch.error

    if (error) throw error
    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Job categories are unavailable. Please try again later.' },
        { status: 503 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in GET /api/artist-jobs/categories:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load job categories' },
      { status: 500 }
    )
  }
}
