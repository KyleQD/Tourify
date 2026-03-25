import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; elementId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id, elementId } = await params

    const { data: element, error } = await supabase
      .from('site_map_elements')
      .select('*')
      .eq('id', elementId)
      .eq('site_map_id', id)
      .single()

    if (error) {
      console.error('Error fetching element:', error)
      return NextResponse.json({ error: "Element not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: element })
  } catch (error) {
    console.error('Error in GET /api/admin/logistics/site-maps/[id]/elements/[elementId]:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; elementId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id, elementId } = await params

    const body = await request.json()
    const { 
      type,
      layerId,
      x,
      y,
      width,
      height,
      rotation,
      scale,
      opacity,
      color,
      strokeColor,
      strokeWidth,
      visible,
      locked,
      properties,
      pathData,
      shapeData,
      name
    } = body

    // Build update object with only provided fields
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (type !== undefined) {
      const validElementTypes = [
        'path', 'road', 'fence', 'tree', 'building', 'utility_line', 'water_source', 
        'power_station', 'waste_disposal', 'sign', 'marker', 'custom'
      ]
      updateData.element_type = validElementTypes.includes(type) ? type : 'custom'
    }
    if (x !== undefined) updateData.x = x
    if (y !== undefined) updateData.y = y
    if (width !== undefined) updateData.width = width
    if (height !== undefined) updateData.height = height
    if (rotation !== undefined) updateData.rotation = rotation
    if (opacity !== undefined) updateData.opacity = opacity
    if (color !== undefined) updateData.color = color
    if (strokeColor !== undefined) updateData.stroke_color = strokeColor
    if (strokeWidth !== undefined) updateData.stroke_width = strokeWidth
    if (pathData !== undefined) updateData.path_data = pathData
    if (shapeData !== undefined) updateData.shape_data = shapeData
    
    // Handle properties object
    if (properties !== undefined || visible !== undefined || locked !== undefined || scale !== undefined) {
      const currentProperties = properties || {}
      updateData.properties = {
        ...currentProperties,
        ...(visible !== undefined && { visible }),
        ...(locked !== undefined && { locked }),
        ...(scale !== undefined && { scale })
      }
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date().toISOString()

    const { data: element, error } = await supabase
      .from('site_map_elements')
      .update(updateData)
      .eq('id', elementId)
      .eq('site_map_id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating element:', error)
      return NextResponse.json({ error: "Failed to update element" }, { status: 500 })
    }

    if (!element) {
      return NextResponse.json({ error: "Element not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: element })
  } catch (error) {
    console.error('Error in PUT /api/admin/logistics/site-maps/[id]/elements/[elementId]:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; elementId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id, elementId } = await params

    const { error } = await supabase
      .from('site_map_elements')
      .delete()
      .eq('id', elementId)
      .eq('site_map_id', id)

    if (error) {
      console.error('Error deleting element:', error)
      return NextResponse.json({ error: "Failed to delete element" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Element deleted successfully" })
  } catch (error) {
    console.error('Error in DELETE /api/admin/logistics/site-maps/[id]/elements/[elementId]:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
