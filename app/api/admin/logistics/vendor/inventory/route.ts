import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkAdminPermissions } from "@/lib/auth/api-auth"

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const isAdmin = await checkAdminPermissions(user)
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  return null
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const denied = await requireAdmin(supabase)
    if (denied) return denied

    const { searchParams } = new URL(request.url)
    const vendorId = searchParams.get("vendorId")
    const status = searchParams.get("status")
    const category = searchParams.get("category")
    const search = searchParams.get("search")

    if (!vendorId) {
      return NextResponse.json({ error: "Vendor ID is required" }, { status: 400 })
    }

    // Build query
    let query = supabase
      .from("equipment_instances")
      .select(`
        *,
        catalog:equipment_catalog!inner(
          *,
          vendor_id
        )
      `)
      .eq("catalog.vendor_id", vendorId)

    // Apply filters
    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    if (category && category !== "all") {
      query = query.eq("catalog.category", category)
    }

    if (search) {
      query = query.or(`instance_name.ilike.%${search}%,serial_number.ilike.%${search}%,asset_tag.ilike.%${search}%`)
    }

    const { data: equipment, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching equipment inventory:", error)
      return NextResponse.json({ error: "Failed to fetch equipment inventory" }, { status: 500 })
    }

    // Calculate inventory statistics
    const stats = {
      totalEquipment: equipment?.length || 0,
      availableEquipment: equipment?.filter(item => item.status === 'available').length || 0,
      inUseEquipment: equipment?.filter(item => item.status === 'in_use').length || 0,
      maintenanceEquipment: equipment?.filter(item => item.status === 'maintenance').length || 0,
      totalValue: equipment?.reduce((sum, item) => sum + (item.rental_rate || 0), 0) || 0,
      utilizationRate: equipment?.length > 0 ? 
        Math.round((equipment.filter(item => item.status === 'in_use').length / equipment.length) * 100) : 0
    }

    // Get equipment locations
    const { data: locations, error: locationsError } = await supabase
      .from("equipment_locations")
      .select("*")
      .eq("vendor_id", vendorId)

    return NextResponse.json({
      equipment: equipment || [],
      stats,
      locations: locations || []
    })
  } catch (error) {
    console.error("Error in inventory API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const denied = await requireAdmin(supabase)
    if (denied) return denied

    const body = await request.json()
    const { vendorId, action, data } = body

    if (!vendorId) {
      return NextResponse.json({ error: "Vendor ID is required" }, { status: 400 })
    }

    switch (action) {
      case "create_equipment":
        // Create new equipment instance
        const { data: newEquipment, error: createError } = await supabase
          .from("equipment_instances")
          .insert([{
            ...data,
            catalog_id: data.catalogId,
            instance_name: data.instanceName,
            serial_number: data.serialNumber,
            asset_tag: data.assetTag,
            status: data.status || 'available',
            maintenance_notes: data.maintenanceNotes
          }])
          .select()
          .single()

        if (createError) {
          console.error("Error creating equipment:", createError)
          return NextResponse.json({ error: "Failed to create equipment" }, { status: 500 })
        }

        return NextResponse.json({ success: true, equipment: newEquipment })

      case "bulk_update":
        // Bulk update equipment status or location
        const { error: updateError } = await supabase
          .from("equipment_instances")
          .update({
            status: data.status,
            assigned_to_user_id: data.assignedTo,
            updated_at: new Date().toISOString()
          })
          .in("id", data.equipmentIds)

        if (updateError) {
          console.error("Error updating equipment:", updateError)
          return NextResponse.json({ error: "Failed to update equipment" }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: `${data.equipmentIds.length} items updated` })

      case "export_inventory":
        // Export inventory data
        const { data: exportData, error: exportError } = await supabase
          .from("equipment_instances")
          .select(`
            *,
            catalog:equipment_catalog!inner(
              *
            )
          `)
          .eq("catalog.vendor_id", vendorId)

        if (exportError) {
          console.error("Error exporting inventory:", exportError)
          return NextResponse.json({ error: "Failed to export inventory" }, { status: 500 })
        }

        return NextResponse.json({ success: true, data: exportData })

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in inventory POST API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
