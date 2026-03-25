import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Simple authentication check
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { target_user_id } = body

    if (!target_user_id) {
      return NextResponse.json({ error: 'target_user_id is required' }, { status: 400 })
    }

    if (target_user_id === user.id) {
      return NextResponse.json({ error: 'Cannot send request to yourself' }, { status: 400 })
    }

    console.log('📤 Sending simple connection request from:', user.id, 'to:', target_user_id)

    // Check if already following
    const { data: existingFollow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', target_user_id)
      .single()

    if (existingFollow) {
      return NextResponse.json({ 
        error: 'Already following this user',
        details: 'You are already connected to this user'
      }, { status: 409 })
    }

    // Try to create follow request first
    const { data: requestData, error: requestError } = await supabase
      .from('follow_requests')
      .insert({
        requester_id: user.id,
        target_id: target_user_id,
        status: 'pending'
      })
      .select('id')
      .single()

    if (requestError) {
      // If follow_requests table doesn't exist, create direct follow
      console.log('Follow requests table not available, creating direct follow')
      
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: target_user_id
        })
        .select('id')
        .single()

      if (followError) {
        console.error('Error creating follow:', followError)
        return NextResponse.json({ 
          error: 'Failed to create connection',
          details: followError.message
        }, { status: 500 })
      }

      console.log('✅ Direct follow created successfully')
      return NextResponse.json({ 
        success: true,
        message: 'Now following this user',
        action: 'follow_created'
      })
    }

    console.log('✅ Connection request sent successfully')
    return NextResponse.json({ 
      success: true,
      message: 'Connection request sent successfully',
      action: 'request_created'
    })

  } catch (error) {
    console.error('💥 Simple connection request API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}




