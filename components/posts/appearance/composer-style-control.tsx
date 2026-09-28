"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { Palette } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useActingContext } from "@/hooks/use-acting-context"
import { usePostStyleFlags } from "@/hooks/use-post-style-flags"
import type { PostAppearanceInput } from "@/lib/appearance/contracts"
import type { PostStylePreviewData } from "./appearance-editor"

const AppearanceEditor = dynamic(
  () => import("./appearance-editor").then((module) => module.AppearanceEditor),
  {
    ssr: false,
    loading: () => (
      <div className="py-12 text-center text-sm text-slate-400">
        Loading Style Studio…
      </div>
    ),
  },
)

interface ComposerStyleControlProps {
  value: PostAppearanceInput | null
  onChange: (value: PostAppearanceInput | null) => void
  preview?: PostStylePreviewData
  className?: string
}

/** Shared account-aware Style Studio launcher for every post composer. */
export function ComposerStyleControl({
  value,
  onChange,
  preview,
  className,
}: ComposerStyleControlProps) {
  const [open, setOpen] = useState(false)
  const { actingContextKey } = useActingContext()
  const { flags } = usePostStyleFlags()

  useEffect(() => {
    onChange(null)
    setOpen(false)
  }, [actingContextKey, onChange])

  if (!flags.post_styles_editor || !flags.post_styles_write) return null

  const active = Boolean(value && value.mode !== "standard")

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-pressed={active}
        className={className}
      >
        <Palette className="mr-2 h-4 w-4" />
        {active ? "Edit style" : "Style"}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="h-dvh w-screen max-w-none overflow-y-auto border-white/10 bg-slate-950 p-4 text-white sm:w-[92vw] sm:max-w-6xl sm:p-6"
        >
          <SheetHeader className="mb-6 pr-10">
            <SheetTitle className="text-white">Post Style Studio</SheetTitle>
            <SheetDescription className="text-slate-400">
              Choose a post-safe style and preview the exact published card.
            </SheetDescription>
          </SheetHeader>
          <AppearanceEditor
            value={value}
            onChange={onChange}
            onClose={() => setOpen(false)}
            preview={preview}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
