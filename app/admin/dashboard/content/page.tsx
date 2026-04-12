import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface ContentItem {
  id: string
  content: string | null
  created_at: string
  user_id: string
}

interface MusicItem {
  id: string
  title: string | null
  genre: string | null
  created_at: string
  user_id: string
}

export default async function ContentPage() {
  const supabase = await createClient()
  const { data: postRows, error: postsError } = await supabase
    .from("posts")
    .select("id, content, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(12)

  const { data: musicRows, error: musicError } = await supabase
    .from("artist_music")
    .select("id, title, genre, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(12)

  const posts = (postRows || []) as ContentItem[]
  const music = (musicRows || []) as MusicItem[]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Content Management</h1>
          <p className="text-sm text-slate-400">
            Review latest feed posts and uploaded artist tracks.
          </p>
        </div>
        <Button asChild variant="outline" className="border-slate-700 text-slate-200">
          <Link href="/admin/dashboard">Back to admin dashboard</Link>
        </Button>
      </div>

      {(postsError || musicError) ? (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardHeader>
            <CardTitle className="text-amber-200">Limited access</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-amber-100">
            Some content sources are unavailable in this environment. Check RLS/admin data access for `posts` and `artist_music`.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-700 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-white">Latest feed posts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {posts.length ? posts.map((item) => (
              <div key={item.id} className="rounded-md border border-slate-700 p-3">
                <p className="line-clamp-2 text-sm text-slate-200">{item.content || "(no content)"}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                  <Badge variant="secondary" className="bg-slate-800 text-slate-200">
                    user {item.user_id.slice(0, 8)}
                  </Badge>
                </div>
              </div>
            )) : (
              <p className="text-sm text-slate-400">No posts found.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-white">Latest artist tracks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {music.length ? music.map((item) => (
              <div key={item.id} className="rounded-md border border-slate-700 p-3">
                <p className="text-sm font-medium text-slate-200">{item.title || "Untitled track"}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                  <Badge variant="secondary" className="bg-slate-800 text-slate-200">
                    {item.genre || "genre: n/a"}
                  </Badge>
                </div>
              </div>
            )) : (
              <p className="text-sm text-slate-400">No tracks found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}