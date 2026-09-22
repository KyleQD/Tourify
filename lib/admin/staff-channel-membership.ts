export function invalidStaffChannelMemberIds(args: {
  requestedMemberIds: string[]
  approvedActiveUserIds: Iterable<string>
  creatorUserId?: string | null
}): string[] {
  const approved = new Set(args.approvedActiveUserIds)
  return Array.from(new Set(args.requestedMemberIds))
    .filter((userId) => userId !== args.creatorUserId && !approved.has(userId))
    .sort()
}

export function canManageStaffChannel(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin"
}

