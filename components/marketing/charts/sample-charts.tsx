"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export const revenueData = [
  { city: "Los Angeles", revenue: 18200 },
  { city: "Denver", revenue: 14100 },
  { city: "Chicago", revenue: 22600 },
  { city: "Nashville", revenue: 19800 },
  { city: "Atlanta", revenue: 24400 },
  { city: "New York", revenue: 31200 },
]

export const audienceData = [
  { week: "W1", followers: 120 },
  { week: "W2", followers: 180 },
  { week: "W3", followers: 260 },
  { week: "W4", followers: 340 },
  { week: "W5", followers: 520 },
  { week: "W6", followers: 610 },
  { week: "W7", followers: 780 },
  { week: "W8", followers: 910 },
]

export const capacityData = [
  { show: "Fri", sold: 92 },
  { show: "Sat", sold: 100 },
  { show: "Sun", sold: 64 },
  { show: "Mon", sold: 38 },
  { show: "Tue", sold: 51 },
]

const tooltipStyle = {
  background: "rgba(15,23,42,0.95)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  fontSize: 12,
  color: "#fff",
}

const axisProps = {
  stroke: "rgba(148,163,184,0.5)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={revenueData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="mkt-rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="city" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v) => `$${v / 1000}k`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
        <Area type="monotone" dataKey="revenue" stroke="#c084fc" strokeWidth={2.5} fill="url(#mkt-rev)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function AudienceChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={audienceData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="mkt-aud" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="week" {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toLocaleString(), "Followers"]} />
        <Area type="monotone" dataKey="followers" stroke="#67e8f9" strokeWidth={2.5} fill="url(#mkt-aud)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function CapacityChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={capacityData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="show" {...axisProps} />
        <YAxis {...axisProps} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          contentStyle={tooltipStyle}
          formatter={(v: number) => [`${v}%`, "Capacity sold"]}
        />
        <Bar dataKey="sold" radius={[8, 8, 0, 0]}>
          {capacityData.map((d) => (
            <Cell key={d.show} fill={d.sold >= 90 ? "#e879f9" : "#818cf8"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function MiniBarChart({
  data,
  dataKey,
  nameKey,
  color = "#60a5fa",
}: {
  data: Record<string, string | number>[]
  dataKey: string
  nameKey: string
  color?: string
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey={nameKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={tooltipStyle} />
        <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
