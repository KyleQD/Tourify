import { NextRequest, NextResponse } from "next/server"

import { adminAccessErrorResponse, assertAdminTourAccess } from "@/lib/admin/admin-tour-event-access"
import { withAdminCapability } from "@/lib/auth/api-auth"

function extractTourId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("tours")
  return index >= 0 ? segments[index + 1] || null : null
}

export const GET = withAdminCapability("logistics.view", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const tourId = extractTourId(request.url)
    if (!tourId) return NextResponse.json({ error: "Missing tour id" }, { status: 400 })
    await assertAdminTourAccess({ supabase, userId: user.id, tourId, orgId: admin.orgId })

    const { data: tasks, error } = await supabase
      .from("logistics_tasks")
      .select("type, status")
      .eq("tour_id", tourId)

    if (error) {
      if (error.code === "42P01" || error.code === "42703") {
        return NextResponse.json({
          summary: {
            percentage: 0,
            total: 0,
            completed: 0,
            categories: {
              travel: { total: 0, completed: 0 },
              lodging: { total: 0, completed: 0 },
              equipment: { total: 0, completed: 0 },
            },
          },
        })
      }
      throw new Error(error.message)
    }

    const categories = {
      travel: { total: 0, completed: 0 },
      lodging: { total: 0, completed: 0 },
      equipment: { total: 0, completed: 0 },
    }

    for (const task of tasks ?? []) {
      const key = task.type === "lodging" || task.type === "accommodations"
        ? "lodging"
        : task.type === "equipment" || task.type === "backline"
          ? "equipment"
          : task.type === "transportation" || task.type === "travel"
            ? "travel"
            : null
      if (!key) continue
      categories[key].total += 1
      if (task.status === "completed") categories[key].completed += 1
    }

    const total = Object.values(categories).reduce((sum, category) => sum + category.total, 0)
    const completed = Object.values(categories).reduce((sum, category) => sum + category.completed, 0)
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    return NextResponse.json({ summary: { percentage, total, completed, categories } })
  } catch (error) {
    const resolved = adminAccessErrorResponse(error, "Failed to load logistics summary", 500)
    return NextResponse.json({ error: resolved.message }, { status: resolved.status })
  }
})
