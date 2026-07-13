"use client"

import { Plus, X } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface JobPostingArrayFieldProps {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  description?: string
  className?: string
}

function sanitizeItem(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

export function JobPostingArrayField({
  label,
  value,
  onChange,
  placeholder = "Add item...",
  description,
  className,
}: JobPostingArrayFieldProps) {
  const [inputValue, setInputValue] = useState("")

  function addItem(): void {
    const nextItem = sanitizeItem(inputValue)
    if (!nextItem) return
    if (value.some((item) => item.toLowerCase() === nextItem.toLowerCase())) {
      setInputValue("")
      return
    }

    onChange([...value, nextItem])
    setInputValue("")
  }

  function removeItem(itemToRemove: string): void {
    onChange(value.filter((item) => item !== itemToRemove))
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              addItem()
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" onClick={addItem}>
          <Plus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </div>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((item) => (
            <Badge key={item} variant="secondary" className="gap-1 pr-1">
              {item}
              <button
                type="button"
                aria-label={`Remove ${item}`}
                className="rounded-sm p-0.5 hover:bg-background/50"
                onClick={() => removeItem(item)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  )
}
