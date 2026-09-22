import type {
  GlobalSearchProfileType,
  GlobalSearchRelationshipAction,
} from "@/lib/search/global-search-types"

interface ResolveProfileRelationshipActionOptions {
  profileType: Exclude<GlobalSearchProfileType, "all"> | undefined
  viewerId: string | null
  ownerUserId: string | null
  ownerAccountId: string | null
  outgoingUsers: ReadonlySet<string>
  incomingUsers: ReadonlySet<string>
  followedAccounts: ReadonlySet<string>
  outgoingFriendRequests: ReadonlySet<string>
  incomingFriendRequests: ReadonlySet<string>
}

export function resolveProfileRelationshipAction({
  profileType,
  viewerId,
  ownerUserId,
  ownerAccountId,
  outgoingUsers,
  incomingUsers,
  followedAccounts,
  outgoingFriendRequests,
  incomingFriendRequests,
}: ResolveProfileRelationshipActionOptions): GlobalSearchRelationshipAction | null {
  if (viewerId && ownerUserId === viewerId) return null

  const kind = profileType === "artist" || profileType === "venue" || profileType === "organization"
    ? "follow"
    : "friend"

  if (!viewerId) return { kind, status: "none", requiresAuthentication: true }

  if (kind === "follow") {
    return {
      kind,
      status: ownerAccountId && followedAccounts.has(ownerAccountId) ? "following" : "none",
      requiresAuthentication: false,
    }
  }

  let status: GlobalSearchRelationshipAction["status"] = "none"
  if (ownerUserId && outgoingUsers.has(ownerUserId) && incomingUsers.has(ownerUserId)) {
    status = "friends"
  } else if (ownerUserId && outgoingFriendRequests.has(ownerUserId)) {
    status = "pending"
  } else if (ownerUserId && incomingFriendRequests.has(ownerUserId)) {
    status = "incoming"
  } else if (ownerUserId && outgoingUsers.has(ownerUserId)) {
    status = "following"
  }

  return { kind, status, requiresAuthentication: false }
}
