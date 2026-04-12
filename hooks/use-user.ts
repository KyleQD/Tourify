"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/types/supabase"

interface User {
  id: string
  display_name: string
  username: string
  profile_picture_url: string
  email: string
  role: string
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        if (!session?.user) {
          setUser(null)
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileError) throw profileError

        setUser({
          id: session.user.id,
          display_name: profile.display_name || 'Anonymous',
          username: profile.username || profile.display_name?.toLowerCase().replace(/\s+/g, '') || 'anonymous',
          profile_picture_url: profile.profile_picture_url || '/placeholder.svg',
          email: session.user.email || '',
          role: profile.role || 'user'
        })
      } catch (error) {
        console.error('Error fetching user:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUser()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
} 