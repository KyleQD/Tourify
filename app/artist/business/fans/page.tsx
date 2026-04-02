"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useArtist } from "@/contexts/artist-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  MessageSquare,
  Users,
  Heart,
  ArrowLeft,
  Share2,
  Music,
  Radio,
} from "lucide-react"
import { getArtistPublicProfilePath } from "@/lib/utils/public-profile-routes"
import { formatSafeNumber } from "@/lib/format/number-format"

export default function FanEngagementPage() {
  const { stats, profile, isLoading } = useArtist()

  const publicPath = useMemo(
    () => getArtistPublicProfilePath(profile?.artist_name),
    [profile?.artist_name]
  )

  const followers = stats?.totalFans ?? 0
  const engagement = stats?.engagementRate ?? 0
  const streams = stats?.totalStreams ?? stats?.totalPlays ?? 0
  const postsApprox = stats?.blogCount ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/artist/business">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Business
            </Button>
          </Link>
          <div className="h-8 w-px bg-slate-700 hidden sm:block" />
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Fan engagement</h1>
              <p className="text-slate-400 text-sm">Signals from your artist profile and content</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="border-slate-700">
            <Link href="/artist/business/marketing">
              <Share2 className="h-4 w-4 mr-2" />
              Marketing Hub
            </Link>
          </Button>
          {publicPath ? (
            <Button asChild className="bg-cyan-600 hover:bg-cyan-700">
              <Link href={publicPath}>
                <Users className="h-4 w-4 mr-2" />
                Public profile
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-slate-800 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Followers</p>
                <p className="text-2xl font-bold text-white">{formatSafeNumber(followers)}</p>
                <p className="text-xs text-slate-500 mt-1">From your profile aggregate</p>
              </div>
              <Users className="h-8 w-8 text-cyan-500" />
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Engagement rate</p>
                <p className="text-2xl font-bold text-white">{engagement}%</p>
                <p className="text-xs text-slate-500 mt-1">Model estimate from activity</p>
              </div>
              <Heart className="h-8 w-8 text-rose-500" />
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Streams / plays</p>
                <p className="text-2xl font-bold text-white">{formatSafeNumber(streams)}</p>
                <p className="text-xs text-slate-500 mt-1">Across connected stats</p>
              </div>
              <Radio className="h-8 w-8 text-purple-500" />
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Content pieces</p>
                <p className="text-2xl font-bold text-white">{postsApprox}</p>
                <p className="text-xs text-slate-500 mt-1">Blog-style count in stats</p>
              </div>
              <Music className="h-8 w-8 text-blue-500" />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">What we don&apos;t show yet</CardTitle>
            <CardDescription className="text-slate-400">
              Per-fan leaderboards, purchase history, and live activity feeds need dedicated data pipelines. We removed
              placeholder content so this page stays trustworthy.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-400 space-y-2">
            <p>Use Marketing Hub for campaigns and scheduled posts.</p>
            <p>Post and interact from Feed and Community to grow engagement.</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Quick links</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild variant="outline" className="justify-start border-slate-700">
              <Link href="/artist/feed">Feed</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start border-slate-700">
              <Link href="/artist/community">Community</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start border-slate-700">
              <Link href="/artist/content">Content</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start border-slate-700">
              <Link href="/artist/music">Music</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
