import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { formatDistanceToNow } from "date-fns"
import { resolvePostAppearanceDTO } from "@/lib/feed/resolve-post-appearance-dto"
import { resolvePostStyleFlags } from "@/lib/post-style-flags"
import { StyledPostRoot } from "@/components/posts/appearance/styled-post-root"
import { resolveAccountAuthorSnapshotsBatch } from "@/lib/accounts/acting-account-snapshot"
import { getAccountAuthor, getAccountAuthorPath } from "@/lib/accounts/account-author"

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
      posted_as_profile_id,
      posted_as_type,
      account_display_name,
      account_username,
      account_avatar_url,
      profiles:user_id (
        id,
        username,
        full_name,
        avatar_url
      ),
      post_appearances (
        template_id,
        template_version,
        schema_version,
        snapshot,
        snapshot_hash,
        status
      )
    `,
    )
    .eq("id", id)
    .maybeSingle()

  if (error || !post) return null

  const visibility = String(post.visibility || "public").toLowerCase()
  const isOwner = Boolean(auth?.user?.id && auth.user.id === post.user_id)
  let isFollower = false
  if (visibility === "followers" && auth?.user?.id && !isOwner) {
    const { data: follow } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", auth.user.id)
      .eq("following_id", post.user_id)
      .maybeSingle()
    isFollower = Boolean(follow)
  }
  if (visibility !== "public" && !isOwner && !isFollower) return null

  const accountType = post.posted_as_type || "general"
  const profileId = post.posted_as_profile_id || post.user_id
  const key = `${accountType}:${profileId}:${post.user_id || ""}`
  const authors = await resolveAccountAuthorSnapshotsBatch(reader, [key])

  return { ...post, resolved_author: authors.get(key) || null }
}

export default async function PublicPostPage({ params }: PostPageProps) {
  const { id } = await params
  const post = await loadPost(id)

  if (!post) notFound()

  // Resolve post-style flags server-side (no user ID needed — flag is global for now)
  const supabaseForFlags = await createClient()
  const styleFlags = await resolvePostStyleFlags(supabaseForFlags, post.id)

  const author = getAccountAuthor(post)
  const displayName = author.name
  const username = author.username
  const avatarUrl = author.avatarUrl || undefined
  const authorPath = getAccountAuthorPath(author)
  const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls.filter(Boolean) : []
  const createdLabel = post.created_at
    ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
    : null

  // Resolve appearance DTO for permalink (server component — no hook, direct call)
  const rawAppearance = Array.isArray((post as any).post_appearances)
    ? ((post as any).post_appearances)[0] ?? null
    : (post as any).post_appearances ?? null
  const appearanceDTO = styleFlags.post_styles_read
    ? resolvePostAppearanceDTO(rawAppearance, post.id)
    : { mode: "standard" as const }

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

      {/*
        Post appearance: when appearance.mode === 'styled', the data-post-appearance
        and data-template attributes signal the template to the client for CSS variable
        hydration. Full StyledPostRoot wrapping requires a Client Component boundary —
        see the post-style-boundary.tsx for the full client-side implementation.
      */}
      {appearanceDTO.mode === 'styled' ? (
        <StyledPostRoot postId={post.id} appearance={appearanceDTO} surface="detail">
          <PostDetailCard
            post={post}
            displayName={displayName}
            username={username}
            avatarUrl={avatarUrl}
            createdLabel={createdLabel}
            mediaUrls={mediaUrls}
            authorPath={authorPath}
          />
        </StyledPostRoot>
      ) : (
        <PostDetailCard
          post={post}
          displayName={displayName}
          username={username}
          avatarUrl={avatarUrl}
          createdLabel={createdLabel}
          mediaUrls={mediaUrls}
          authorPath={authorPath}
        />
      )}
    </main>
  )
}

function PostDetailCard({
  post,
  displayName,
  username,
  avatarUrl,
  createdLabel,
  mediaUrls,
  authorPath,
}: {
  post: any
  displayName: string
  username: string | null
  avatarUrl?: string
  createdLabel: string | null
  mediaUrls: string[]
  authorPath: string | null
}) {
  return (
      <Card data-slot="card">
        <CardHeader data-post-region="header" className="flex flex-row items-center gap-3 space-y-0">
          {authorPath ? <Link href={authorPath} aria-label={`View ${displayName} profile`}>
          <Avatar>
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          </Link> : <Avatar>
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>}
          <div className="min-w-0">
            {authorPath ? <Link href={authorPath} className="truncate font-semibold hover:underline">{displayName}</Link> : <p className="truncate font-semibold">{displayName}</p>}
            <p data-post-region="metadata" className="truncate text-sm text-muted-foreground">
              {username ? `@${username}` : "Public post"}
              {createdLabel ? ` · ${createdLabel}` : null}
            </p>
          </div>
        </CardHeader>
        <CardContent data-post-region="body" className="space-y-4">
          <p className="whitespace-pre-wrap text-base leading-relaxed">{post.content}</p>

          {mediaUrls.length > 0 ? (
            <div className="grid gap-3">
              {mediaUrls.map((url: string) => (

                <img
                  key={url}
                  src={url}
                  alt="Post media"
                  className="max-h-[480px] w-full rounded-lg object-cover"
                />
              ))}
            </div>
          ) : null}

          <div data-post-region="actions" className="flex gap-4 text-sm text-muted-foreground">
            <span>{post.likes_count || 0} likes</span>
            <span>{post.comments_count || 0} comments</span>
          </div>
        </CardContent>
      </Card>
  )
}
