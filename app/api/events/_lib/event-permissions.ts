interface HasEventPermissionInput {
  supabase: any
  eventId: string
  userId: string
  ownerUserId: string | null
  permissionName: string
}

export async function hasEventPermission({
  supabase,
  eventId,
  userId,
  ownerUserId,
  permissionName,
}: HasEventPermissionInput): Promise<boolean> {
  try {
    const { data: hasPermission, error } = await supabase.rpc('has_entity_permission', {
      p_user_id: userId,
      p_entity_type: 'Event',
      p_entity_id: eventId,
      p_permission_name: permissionName,
    })

    if (error) return ownerUserId === userId
    if (hasPermission) return true
    return ownerUserId === userId
  } catch {
    return ownerUserId === userId
  }
}
