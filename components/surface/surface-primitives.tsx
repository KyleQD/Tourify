"use client"

import * as React from "react"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { TabsList } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface SurfaceHeroProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SurfaceHero({ className, ...props }: SurfaceHeroProps) {
  return <div className={cn("surface-hero", className)} {...props} />
}

interface SurfaceCardProps extends React.ComponentPropsWithoutRef<typeof Card> {}

export function SurfaceCard({ className, ...props }: SurfaceCardProps) {
  return <Card className={cn("surface-card", className)} {...props} />
}

interface SurfaceTabsListProps extends React.ComponentPropsWithoutRef<typeof TabsList> {}

export function SurfaceTabsList({ className, ...props }: SurfaceTabsListProps) {
  return <TabsList className={cn("surface-tabs", className)} {...props} />
}

const SurfaceInput = React.forwardRef<
  React.ElementRef<typeof Input>,
  React.ComponentPropsWithoutRef<typeof Input>
>(({ className, ...props }, ref) => {
  return <Input ref={ref} className={cn("surface-entry", className)} {...props} />
})

SurfaceInput.displayName = "SurfaceInput"

export { SurfaceInput }
