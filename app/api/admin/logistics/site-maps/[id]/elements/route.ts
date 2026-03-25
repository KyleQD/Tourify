import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id } = await params

    const { data: elements, error } = await supabase
      .from('site_map_elements')
      .select('*')
      .eq('site_map_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching elements:', error)
      return NextResponse.json({ error: "Failed to fetch elements" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: elements })
  } catch (error) {
    console.error('Error in GET /api/admin/logistics/site-maps/[id]/elements:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id } = await params

    const body = await request.json()
    const { 
      type,
      layerId,
      x,
      y,
      width = 0,
      height = 0,
      rotation = 0,
      scale = 1,
      opacity = 1,
      color = '#3b82f6',
      strokeColor = '#1e40af',
      strokeWidth = 1,
      visible = true,
      locked = false,
      properties = {},
      pathData,
      shapeData,
      name
    } = body

    // Validate required fields
    if (!type || x === undefined || y === undefined) {
      return NextResponse.json({ error: "Missing required fields: type, x, y are required" }, { status: 400 })
    }

    // Map element_type to valid database values
    const validElementTypes = [
      'path', 'road', 'fence', 'tree', 'building', 'utility_line', 'water_source', 
      'power_station', 'waste_disposal', 'sign', 'marker', 'custom'
    ]
    
    const elementType = validElementTypes.includes(type) ? type : 'custom'

    const { data: element, error } = await supabase
      .from('site_map_elements')
      .insert({
        site_map_id: id,
        name: name || `${elementType}_${Date.now()}`,
        element_type: elementType,
        x,
        y,
        width,
        height,
        rotation,
        color,
        stroke_color: strokeColor,
        stroke_width: strokeWidth,
        opacity,
        properties: {
          ...properties,
          visible,
          locked,
          scale
        },
        path_data: pathData,
        shape_data: shapeData
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating element:', error)
      return NextResponse.json({ error: "Failed to create element" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: element })
  } catch (error) {
    console.error('Error in POST /api/admin/logistics/site-maps/[id]/elements:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
