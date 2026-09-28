"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface ScheduleExportButtonProps {
  rows: Array<Record<string, unknown>>
}

/**
 * VEN-118 — permission-safe schedule export. Rows arrive from the
 * server-authorized week snapshot; this island only shapes and downloads.
 */
export function ScheduleExportButton({ rows }: ScheduleExportButtonProps) {
  const handleExport = () => {
    const header = "shift_id,date,start_time,end_time,status,assigned"
    const csv = [
      header,
      ...rows.map((shift) =>
        [
          String(shift.id ?? ""),
          String(shift.shift_date ?? ""),
          String(shift.start_time ?? ""),
          String(shift.end_time ?? ""),
          String(shift.status ?? ""),
          shift.staff_member_id ? "assigned" : "open",
        ]
          .map((v) => `"${v.replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `schedule-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
      <Download className="h-4 w-4 mr-2" />
      Export
    </Button>
  )
}
