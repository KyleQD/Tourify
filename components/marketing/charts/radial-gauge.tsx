"use client"

import { motion, useReducedMotion } from "framer-motion"
import { CountUp } from "@/components/marketing/motion/count-up"

interface RadialGaugeProps {
  value: number
  label: string
  color?: string
  size?: number
}

export function RadialGauge({ value, label, color = "#e879f9", size = 160 }: RadialGaugeProps) {
  const reduce = useReducedMotion()
  const stroke = 12
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${value} percent (sample data)`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c * (1 - value / 100) : c }}
          whileInView={{ strokeDashoffset: c * (1 - value / 100) }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <CountUp to={value} suffix="%" className="text-3xl font-bold text-white" />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
    </div>
  )
}
