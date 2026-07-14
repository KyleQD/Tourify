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
    if (ownerUserId === userId) return true

    const { data: hasPermission, error } = await supabase.rpc('has_entity_permission', {
      p_user_id: userId,
      p_entity_type: 'Event',
      p_entity_id: eventId,
      p_permission_name: permissionName,
    })

    if (!error && hasPermission) return true

    // Platform admin override
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .maybeSingle()
    if (profile?.is_admin) return true

    // Admin org members of events_v2 should manage hub tabs without entity ACL rows
    const { data: eventV2 } = await supabase
      .from('events_v2')
      .select('org_id, created_by')
      .eq('id', eventId)
      .maybeSingle()

    if (eventV2?.created_by === userId) return true

    if (eventV2?.org_id) {
      const { data: membership } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('org_id', eventV2.org_id)
        .eq('user_id', userId)
        .maybeSingle()
      if (membership?.org_id) return true
    }

    return ownerUserId === userId
  } catch {
    return ownerUserId === userId
  }
}
