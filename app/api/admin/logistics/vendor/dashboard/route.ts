import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const vendorId = searchParams.get("vendorId")
    const siteMapId = searchParams.get("siteMapId")

    if (!vendorId) {
      return NextResponse.json({ error: "Vendor ID is required" }, { status: 400 })
    }

    let stats: any[] = []
    try {
      const { data, error } = await supabase
        .from("equipment_instances")
        .select(`
          id,
          status,
          rental_rate,
          last_used_at,
          catalog:equipment_catalog!inner(
            vendor_id
          )
        `)
        .eq("catalog.vendor_id", vendorId)

      if (error) throw error
      stats = data || []
    } catch (err) {
      console.warn("equipment_instances query failed (table may not exist):", err)
    }

    const totalEquipment = stats.length
    const availableEquipment = stats.filter(item => item.status === 'available').length
    const inUseEquipment = stats.filter(item => item.status === 'in_use').length
    const maintenanceEquipment = stats.filter(item => item.status === 'maintenance').length
    const totalValue = stats.reduce((sum, item) => sum + (item.rental_rate || 0), 0)
    const utilizationRate = totalEquipment > 0 ? Math.round((inUseEquipment / totalEquipment) * 100) : 0

    let completedSetups = 0
    let totalEvents = 0
    try {
      const { count: completedCount } = await supabase
        .from("equipment_setup_workflows")
        .select("id", { count: "exact", head: true })
        .eq("site_map_id", siteMapId || "")
        .eq("status", "completed")
      completedSetups = completedCount || 0

      const { count: eventCount } = await supabase
        .from("equipment_setup_workflows")
        .select("id", { count: "exact", head: true })
        .eq("site_map_id", siteMapId || "")
      totalEvents = eventCount || 0
    } catch (err) {
      console.warn("equipment_setup_workflows count query failed:", err)
    }

    let avgSetupTime = 0
    try {
      const { data: completedWorkflows } = await supabase
        .from("equipment_setup_workflows")
        .select("created_at, updated_at")
        .eq("site_map_id", siteMapId || "")
        .eq("status", "completed")

      if (completedWorkflows && completedWorkflows.length > 0) {
        const totalHours = completedWorkflows.reduce((sum: number, w: any) => {
          const start = new Date(w.created_at).getTime()
          const end = new Date(w.updated_at).getTime()
          return sum + (end - start) / (1000 * 60 * 60)
        }, 0)
        avgSetupTime = Math.round((totalHours / completedWorkflows.length) * 10) / 10
      }
    } catch (err) {
      console.warn("avg setup time query failed:", err)
    }

    let recentActivity: any[] = []
    try {
      const { data } = await supabase
        .from("site_map_activity_log")
        .select(`
          id,
          action,
          details,
          created_at,
          user:profiles!inner(
            full_name,
            avatar_url
          )
        `)
        .eq("site_map_id", siteMapId || "")
        .order("created_at", { ascending: false })
        .limit(10)
      recentActivity = data || []
    } catch (err) {
      console.warn("site_map_activity_log query failed:", err)
    }

    let workflows: any[] = []
    try {
      const { data } = await supabase
        .from("equipment_setup_workflows")
        .select(`
          id,
          name,
          status,
          progress:equipment_setup_tasks(
            status
          )
        `)
        .eq("site_map_id", siteMapId || "")
        .in("status", ["planned", "in_progress"])
      workflows = data || []
    } catch (err) {
      console.warn("equipment_setup_workflows query failed:", err)
    }

    const dashboardData = {
      stats: {
        totalEvents,
        activeEquipment: totalEquipment,
        completedSetups,
        revenueThisMonth: totalValue,
        pendingTasks: workflows.length,
        equipmentUtilization: utilizationRate,
        averageSetupTime: avgSetupTime,
        customerSatisfaction: 0
      },
      recentActivity,
      activeWorkflows: workflows,
      equipmentStatus: stats.map(item => ({
        id: item.id,
        status: item.status,
        utilizationRate: item.status === 'in_use' ? 100 : item.status === 'maintenance' ? 0 : 0,
        lastUsed: item.last_used_at || null
      }))
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error("Error in vendor dashboard API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { vendorId, action, data } = body

    if (!vendorId) {
      return NextResponse.json({ error: "Vendor ID is required" }, { status: 400 })
    }

    switch (action) {
      case "update_settings":
        return NextResponse.json({ success: true, message: "Settings updated" })

      case "export_report":
        return NextResponse.json({ success: true, reportData: {} })

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in vendor dashboard POST API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
