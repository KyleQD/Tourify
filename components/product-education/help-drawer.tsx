"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { usePathname } from "next/navigation"
import { Search, Bookmark, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  allHelpArticles,
  getArticleById,
  getArticlesByIds,
} from "@/lib/product-education/registry"
import {
  filterArticlesForPath,
  scoreArticleSearch,
} from "@/lib/product-education/matchers"
import {
  readHelpFavorites,
  readHelpRecent,
  writeHelpFavorites,
  writeHelpRecent,
} from "@/lib/product-education/storage"
import type { HelpArticle } from "@/lib/product-education/types"

interface HelpDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialQuery: string
  initialArticleId: string | null
}

export function HelpDrawer({ open, onOpenChange, initialQuery, initialArticleId }: HelpDrawerProps) {
  const pathname = usePathname()
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<HelpArticle | null>(null)
  const [favorites, setFavorites] = useState<string[]>([])

  const scopedArticles = useMemo(
    () => filterArticlesForPath(pathname, allHelpArticles),
    [pathname],
  )

  useEffect(() => {
    if (!open) return
    setQuery(initialQuery)
    if (initialArticleId) {
      const a = getArticleById(initialArticleId)
      if (a && filterArticlesForPath(pathname, [a]).length) setSelected(a)
      else setSelected(getArticleById(initialArticleId) ?? null)
    } else {
      setSelected(null)
    }
  }, [open, initialQuery, initialArticleId, pathname])

  useEffect(() => {
    if (open) setFavorites(readHelpFavorites())
  }, [open])

  const ranked = useMemo(() => {
    const q = query.trim()
    if (!q)
      return [...scopedArticles].sort((a, b) => a.title.localeCompare(b.title))
    const scored = scopedArticles
      .map((a) => ({ a, s: scoreArticleSearch(a, q, pathname) }))
      .filter((x) => x.s > 0)
      .sort((x, y) => y.s - x.s)
    return scored.map((x) => x.a)
  }, [scopedArticles, query, pathname])

  const selectArticle = useCallback(
    (article: HelpArticle) => {
      setSelected(article)
      const recent = readHelpRecent()
      const next = [article.id, ...recent.filter((id) => id !== article.id)].slice(0, 8)
      writeHelpRecent(next)
    },
    [],
  )

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      writeHelpFavorites(next)
      return next
    })
  }, [])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-[200] bg-black/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed z-[210] flex flex-col overflow-hidden border border-slate-700 bg-slate-950 shadow-2xl duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "inset-y-4 right-4 left-4 sm:left-auto sm:w-full sm:max-w-2xl rounded-xl",
          )}
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2 text-white">
              <BookOpen className="h-5 w-5 text-purple-400" />
              <DialogPrimitive.Title className="text-lg font-semibold">Help</DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                Close
              </Button>
            </DialogPrimitive.Close>
          </div>

          <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
            <div className="flex w-full flex-col border-b border-slate-800 sm:w-[42%] sm:border-b-0 sm:border-r">
              <div className="p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search guides…"
                    className="border-slate-700 bg-slate-900 pl-9 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                {ranked.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-slate-500">No matching guides.</p>
                ) : (
                  <ul className="space-y-1">
                    {ranked.map((article) => (
                      <li key={article.id}>
                        <button
                          type="button"
                          onClick={() => selectArticle(article)}
                          className={cn(
                            "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                            selected?.id === article.id
                              ? "bg-purple-600/20 text-white"
                              : "text-slate-300 hover:bg-slate-800/80",
                          )}
                        >
                          <span className="font-medium">{article.title}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{article.description}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              {selected ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800 px-4 py-3">
                    <div>
                      <h2 className="text-lg font-semibold text-white">{selected.title}</h2>
                      <p className="text-xs text-slate-500">{selected.category}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "shrink-0 text-slate-400 hover:text-amber-300",
                        favorites.includes(selected.id) && "text-amber-400",
                      )}
                      onClick={() => toggleFavorite(selected.id)}
                      aria-label={favorites.includes(selected.id) ? "Remove favorite" : "Add favorite"}
                    >
                      <Bookmark className={cn("h-4 w-4", favorites.includes(selected.id) && "fill-current")} />
                    </Button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                    <div
                      className="prose prose-invert prose-sm max-w-none prose-headings:text-slate-100 prose-p:text-slate-300 prose-li:text-slate-300 prose-a:text-purple-300"
                      dangerouslySetInnerHTML={{ __html: selected.contentHtml }}
                    />
                    {selected.relatedTopicIds.length > 0 ? (
                      <div className="mt-6 border-t border-slate-800 pt-4">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                          Related
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {getArticlesByIds(selected.relatedTopicIds).map((rel) => (
                            <Button
                              key={rel.id}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="border-slate-600 text-slate-200"
                              onClick={() => selectArticle(rel)}
                            >
                              {rel.title}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                  <p className="text-sm text-slate-400">
                    Search or choose a guide. Articles are filtered for your current area of the app.
                  </p>
                  <Badge variant="secondary" className="bg-slate-800 text-slate-300">
                    {pathname || "/"}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
