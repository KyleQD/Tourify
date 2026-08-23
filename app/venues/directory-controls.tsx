"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/**
 * VEN-278/281 — directory controls island: search box + pagination enhance the
 * server-rendered grid by writing URL search params (shareable, indexable,
 * works before hydration via the surrounding <form method="get">).
 */

interface DirectoryControlsProps {
  total: number
  page: number
  totalPages: number
  params: Record<string, string>
}

export function DirectoryControls({ total, page, totalPages, params }: DirectoryControlsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep the visible input in sync when navigation changes ?q= externally.
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== (params.q ?? "")) {
      inputRef.current.value = params.q ?? ""
    }
  }, [params.q])

  const pushPage = (target: number) => {
    const next = new URLSearchParams(searchParams.toString())
    next.set("page", String(target))
    router.push(`${pathname}?${next.toString()}`)
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-semibold">
          {total} {total === 1 ? "Venue" : "Venues"} Found
        </h2>
        {params.q && (
          <Badge_ label={`"${params.q}"`} />
        )}
      </div>

      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type="text"
          aria-label="Filter venues"
          placeholder="Filter results…"
          defaultValue={params.q}
          className="w-48 border-gray-600 bg-gray-800 text-white placeholder-gray-500"
          onKeyDown={(event) => {
            if (event.key !== "Enter") return
            const next = new URLSearchParams(searchParams.toString())
            const value = (event.target as HTMLInputElement).value.trim()
            if (value) next.set("q", value)
            else next.delete("q")
            next.delete("page")
            router.push(`${pathname}?${next.toString()}`)
          }}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => pushPage(page - 1)}
        >
          Previous
        </Button>
        <span className="text-sm text-gray-400">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => pushPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

function Badge_({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-gray-600 px-3 py-1 text-xs text-gray-300">
      {label}
    </span>
  )
}
