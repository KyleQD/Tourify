import { cn } from "@/lib/utils"
import { Reveal } from "@/components/marketing/motion/reveal"

interface SectionHeadingProps {
  eyebrow: string
  title: React.ReactNode
  description?: string
  align?: "center" | "left"
  className?: string
}

export function SectionHeading({ eyebrow, title, description, align = "center", className }: SectionHeadingProps) {
  return (
    <Reveal className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">{eyebrow}</p>
      <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.6rem] lg:leading-[1.1]">
        {title}
      </h2>
      {description && <p className="mt-4 text-pretty text-base leading-relaxed text-slate-300 sm:text-lg">{description}</p>}
    </Reveal>
  )
}

export function GradientText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "bg-gradient-to-r from-purple-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent",
        className,
      )}
    >
      {children}
    </span>
  )
}
