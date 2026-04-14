import { adminHelpArticles } from "./articles/admin-articles"
import { venueHelpArticles } from "./articles/venue-articles"
import { generalHelpArticles } from "./articles/general-articles"
import { contextualTips } from "./contextual-tips"
import type { HelpArticle } from "./types"

export const allHelpArticles: HelpArticle[] = [
  ...generalHelpArticles,
  ...adminHelpArticles,
  ...venueHelpArticles,
]

export { contextualTips }

export function getArticleById(id: string): HelpArticle | undefined {
  return allHelpArticles.find((a) => a.id === id)
}

export function getArticlesByIds(ids: string[]): HelpArticle[] {
  return ids.map((id) => getArticleById(id)).filter(Boolean) as HelpArticle[]
}
