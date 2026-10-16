"use client"

import { animate, useInView, useReducedMotion } from "framer-motion"
import { useEffect, useRef, useState } from "react"

interface CountUpProps {
  to: number
  prefix?: string
  suffix?: string
  decimals?: number
  duration?: number
  className?: string
}

export function CountUp({ to, prefix = "", suffix = "", decimals = 0, duration = 1.6, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-40px" })
  const reduce = useReducedMotion()
  const [value, setValue] = useState(reduce ? to : 0)

  useEffect(() => {
    if (!inView) return
    if (reduce) {
      setValue(to)
      return
    }
    const controls = animate(0, to, { duration, ease: "easeOut", onUpdate: setValue })
    return () => controls.stop()
  }, [inView, reduce, to, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  )
}
