import { searchGlobal } from "@/lib/search/global-search-service"
import {
  GLOBAL_SEARCH_CATEGORIES,
  GLOBAL_SEARCH_PROFILE_TYPES,
  type GlobalSearchCategory,
  type GlobalSearchProfileType,
} from "@/lib/search/global-search-types"
import { normalizeSearchQuery } from "@/lib/search/global-search-ranking"
import { createClient } from "@/lib/supabase/server"
import { GlobalSearchResults } from "@/components/search/global-search-results"

export const dynamic = "force-dynamic"

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = normalizeSearchQuery(first(params.q))
  const rawCategory = first(params.category)
  const rawProfileType = first(params.profileType)
  const category = GLOBAL_SEARCH_CATEGORIES.includes(rawCategory as GlobalSearchCategory)
    ? rawCategory as GlobalSearchCategory
    : "all"
  const profileType = GLOBAL_SEARCH_PROFILE_TYPES.includes(rawProfileType as GlobalSearchProfileType)
    ? rawProfileType as GlobalSearchProfileType
    : "all"

  const initialResponse = await searchGlobal({
    query,
    category,
    profileType,
    limit: category === "all" ? 5 : 20,
    requestClient: await createClient(),
  })

  return <GlobalSearchResults initialResponse={initialResponse} />
}
