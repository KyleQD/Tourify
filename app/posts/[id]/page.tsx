import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { formatDistanceToNow } from "date-fns"

interface PostPageProps {
  params: Promise<{ id: string }>
}

async function loadPost(id: string) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()

  const reader = auth?.user ? supabase : createServiceRoleClient()

  const { data: post, error } = await reader
    .from("posts")
    .select(
      `
      id,
      user_id,
      content,
      type,
      visibility,
      media_urls,
      created_at,
      likes_count,
      comments_count,
      account_display_name,
      account_username,
      account_avatar_url,
      profiles:user_id (
        id,
        username,
        full_name,
        avatar_url
      )
    `,
    )
    .eq("id", id)
    .maybeSingle()

  if (error || !post) return null

  const visibility = String(post.visibility || "public").toLowerCase()
  const isOwner = Boolean(auth?.user?.id && auth.user.id === post.user_id)
  if (visibility !== "public" && !isOwner) return null

  return post
}

export default async function PublicPostPage({ params }: PostPageProps) {
  const { id } = await params
  const post = await loadPost(id)

  if (!post) notFound()

  const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
  const displayName =
    post.account_display_name || profile?.full_name || profile?.username || "Tourify member"
  const username = post.account_username || profile?.username || null
  const avatarUrl = post.account_avatar_url || profile?.avatar_url || undefined
  const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls.filter(Boolean) : []
  const createdLabel = post.created_at
    ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
    : null

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/news">Back to feed</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <Avatar>
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold">{displayName}</p>
            <p className="truncate text-sm text-muted-foreground">
              {username ? `@${username}` : "Public post"}
              {createdLabel ? ` · ${createdLabel}` : null}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap text-base leading-relaxed">{post.content}</p>

          {mediaUrls.length > 0 ? (
            <div className="grid gap-3">
              {mediaUrls.map((url: string) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt="Post media"
                  className="max-h-[480px] w-full rounded-lg object-cover"
                />
              ))}
            </div>
          ) : null}

          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{post.likes_count || 0} likes</span>
            <span>{post.comments_count || 0} comments</span>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
