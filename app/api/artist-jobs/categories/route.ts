import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const FALLBACK_CATEGORIES = [
  { id: '1', name: 'Opening Slots', description: 'Opening act opportunities', icon: 'Music', color: '#8B5CF6', is_active: true, parent_category_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '2', name: 'Venue Bookings', description: 'Direct booking opportunities', icon: 'MapPin', color: '#10B981', is_active: true, parent_category_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '3', name: 'Collaborations', description: 'Music collaborations', icon: 'Users', color: '#F59E0B', is_active: true, parent_category_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '4', name: 'Session Work', description: 'Studio session opportunities', icon: 'Mic', color: '#EF4444', is_active: true, parent_category_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '5', name: 'Production', description: 'Music production opportunities', icon: 'Settings', color: '#6366F1', is_active: true, parent_category_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('artist_job_categories')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (!error && data && data.length > 0) {
      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json({ success: true, data: FALLBACK_CATEGORIES })
  } catch (error) {
    console.error('Error in GET /api/artist-jobs/categories:', error)
    return NextResponse.json({ success: true, data: FALLBACK_CATEGORIES })
  }
}
