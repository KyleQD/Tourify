"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
interface ArtistProfile {
  id: string
  user_id: string
  artist_name: string | null
  bio: string | null
  genres: string[] | null
  social_links: {
    instagram?: string
    twitter?: string
    facebook?: string
    youtube?: string
    spotify?: string
  } | null
  created_at: string
  updated_at: string
}

export default function ArtistProfileClient() {
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<ArtistProfile | null>(null)

  useEffect(() => {
    async function fetchProfile() {
      if (!params.id) return

      try {
        const { data, error } = await supabase
          .from("artist_profiles")
          .select("*")
          .eq("id", params.id)
          .single()

        if (error) throw error
        setProfile(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile")
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [params.id, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 to-slate-900">
        <div className="text-center p-8 max-w-md">
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mb-4" />
            <h1 className="text-xl font-semibold text-white">Loading profile...</h1>
          </div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 to-slate-900">
        <div className="text-center p-8 max-w-md">
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-semibold text-white">Error</h1>
            <p className="text-slate-400 mt-2">{error || "Profile not found"}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Cover Image */}
          <div className="relative h-64 rounded-lg overflow-hidden mb-8">
            <div className="w-full h-full bg-gradient-to-r from-purple-900/50 to-blue-900/50" />
          </div>

          {/* Profile Info */}
          <div className="flex flex-col md:flex-row gap-8">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-800">
                <div className="w-full h-full bg-gradient-to-br from-purple-900 to-blue-900" />
              </div>
            </div>

            {/* Profile Details */}
            <div className="flex-grow">
              <h1 className="text-3xl font-bold text-white mb-2">
                {profile.artist_name || "Artist Profile"}
              </h1>
              
              {profile.genres && profile.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {profile.genres.map((genre, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 text-sm bg-purple-900/50 text-purple-200 rounded-full"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-slate-300 mb-6">
                {profile.bio || "No bio available"}
              </p>

              {/* Social Links */}
              {profile.social_links && (
                <div className="flex flex-wrap gap-4">
                  {Object.entries(profile.social_links).map(([platform, url]) => {
                    if (!url) return null
                    return (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-purple-400 transition-colors"
                      >
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </a>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 