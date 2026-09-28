import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { resolveActingContext } from "@/lib/auth/acting-context"
import { listStyleProfiles } from "@/lib/post-style-profiles/profiles.service"
import { resolvePostStyleFlags } from "@/lib/post-style-flags"
import {
  getActiveTemplates,
  POST_TEMPLATE_CATALOG_VERSION,
} from "@/lib/post-appearance/template-registry"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const publicClient = await createClient()
  const { data: auth } = await publicClient.auth.getUser()
  if (!auth.user) {
    const flags = await resolvePostStyleFlags(publicClient, "public-feed")
    return NextResponse.json({
      flags,
      catalogVersion: POST_TEMPLATE_CATALOG_VERSION,
      templates: [],
      profiles: [],
      defaultProfile: null,
    })
  }

  const ctx = await resolveActingContext(request)
  if (ctx instanceof NextResponse) return ctx

  const { accountType, profileId, userId, supabase } = ctx
  const ownerId = profileId ?? userId

  const [flags, profiles] = await Promise.all([
    resolvePostStyleFlags(supabase, ownerId),
    listStyleProfiles(supabase, accountType, ownerId),
  ])

  return NextResponse.json({
    flags,
    catalogVersion: POST_TEMPLATE_CATALOG_VERSION,
    templates: getActiveTemplates().map((template) => ({
      id: template.id,
      label: template.label,
      description: template.description,
      family: template.family,
      layoutId: template.layoutId,
      previewImage: template.previewImage,
    })),
    profiles,
    defaultProfile:
      profiles.find(
        (profile) =>
          profile.is_default && getActiveTemplates().some((template) => template.id === profile.template_id),
      ) ?? null,
  })
}
