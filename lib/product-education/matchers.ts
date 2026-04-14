import type { HelpAudience, HelpArticle, ContextualTip } from "./types"

export function audienceFromPathname(pathname: string): HelpAudience | "general" {
  if (pathname.startsWith("/admin")) return "admin"
  if (pathname.startsWith("/venue")) return "venue"
  if (pathname.startsWith("/artist")) return "artist"
  if (pathname.startsWith("/business")) return "business"
  return "general"
}

export function audienceMatchesArticle(
  pathname: string,
  article: Pick<HelpArticle, "audiences">
): boolean {
  const surface = audienceFromPathname(pathname)
  if (article.audiences.includes("all")) return true
  if (surface === "general") return article.audiences.includes("all")
  return article.audiences.includes(surface)
}

export function filterArticlesForPath(pathname: string, articles: HelpArticle[]): HelpArticle[] {
  return articles.filter((a) => audienceMatchesArticle(pathname, a))
}

export function pickContextualTip(
  pathname: string,
  tips: ContextualTip[],
  isDismissed: (tipId: string) => boolean,
  isSnoozed: (tipId: string) => boolean
): ContextualTip | null {
  const surface = audienceFromPathname(pathname)
  const candidates = tips
    .filter((t) => pathname.startsWith(t.routePrefix))
    .filter((t) => t.audiences.includes("all") || t.audiences.includes(surface as HelpAudience))
    .filter((t) => !isDismissed(t.id) && !isSnoozed(t.id))
    .sort((a, b) => b.priority - a.priority)

  return candidates[0] ?? null
}

export function scoreArticleSearch(
  article: HelpArticle,
  query: string,
  pathname: string
): number {
  const q = query.trim().toLowerCase()
  if (!q) return 0
  let score = 0
  if (article.title.toLowerCase().includes(q)) score += 10
  if (article.description.toLowerCase().includes(q)) score += 6
  for (const kw of article.keywords) {
    if (kw.toLowerCase().includes(q)) score += 4
  }
  if (article.id.toLowerCase().includes(q)) score += 8
  const prefixes = article.relatedRoutePrefixes ?? []
  for (const p of prefixes) {
    if (pathname.startsWith(p)) score += 2
  }
  return score
}
