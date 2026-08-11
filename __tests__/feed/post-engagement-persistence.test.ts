import { afterEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  createPostComment,
  recordPostShare,
  setPostLike,
} from "@/lib/feed/post-engagement-client"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("post engagement persistence contracts", () => {
  it("awaits Next route params and keeps likes user-scoped and idempotent", () => {
    const source = read("app/api/posts/[id]/likes/route.ts")

    expect(source).toContain("const { id: postId } = await params")
    expect(source).toContain("checkAuth(request)")
    expect(source).toContain('error.code !== "23505"')
    expect(source).toContain("is_liked: Boolean")
    expect(source).toContain("likes_count:")
    expect(source).not.toContain("createServiceRoleClient")
  })

  it("returns canonical counts for comments and saved shares", () => {
    const comments = read("app/api/posts/[id]/comments/route.ts")
    const shares = read("app/api/posts/[id]/shares/route.ts")

    expect(comments).toContain('.select("comments_count")')
    expect(comments).toContain("comments_count: Number")
    expect(shares).toContain('new Set(["clipboard", "native", "feed"])')
    expect(shares).toContain('.from("post_shares")')
    expect(shares).toContain('.select("shares_count")')
  })

  it("installs one canonical counter trigger per interaction table", () => {
    const migration = read(
      "supabase/migrations/20260728233640_repair_post_engagement_persistence.sql",
    )

    expect(migration).toContain("drop trigger if exists trigger_post_like_count_update")
    expect(migration).toContain("drop trigger if exists trigger_update_post_comments_count")
    expect(migration).toContain("drop trigger if exists shares_count_trigger")
    expect(migration).toContain("create trigger canonical_post_likes_count")
    expect(migration).toContain("create trigger canonical_post_comments_count")
    expect(migration).toContain("create trigger canonical_post_shares_count")
    expect(migration).not.toMatch(/set\s+like_count\s*=/i)
  })

  it("uses the normalized client routes and surfaces nested API errors", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        is_liked: true,
        likes_count: 4,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        comment: { id: "comment-1" },
        comments_count: 2,
      }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: { code: "SHARE_CREATE_FAILED", message: "Share could not be saved" },
      }), { status: 500 }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(setPostLike("post-1", "like")).resolves.toMatchObject({ likes_count: 4 })
    await expect(createPostComment("post-1", "Hello")).resolves.toMatchObject({
      comments_count: 2,
    })
    await expect(recordPostShare("post-1", "clipboard")).rejects.toThrow(
      "Share could not be saved",
    )

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/posts/post-1/likes",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/posts/post-1/shares",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    )
  })

  it("creates feed reshares and share events in one database function", () => {
    const route = read("app/api/posts/share/route.ts")
    const migration = read(
      "supabase/migrations/20260728233640_repair_post_engagement_persistence.sql",
    )

    expect(route).toContain(".rpc('create_post_reshare'")
    expect(route).not.toContain("shares_count: (existing.shares_count || 0) + 1")
    expect(migration).toContain("security invoker")
    expect(migration).toContain("insert into public.post_shares")
  })
})
