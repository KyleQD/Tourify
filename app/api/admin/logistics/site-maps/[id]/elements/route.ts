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

    // Batch upsert mode for canvas sync/autosave
    if (Array.isArray(body.elements)) {
      const incomingElements = body.elements as any[]
      const incomingIds = incomingElements.map((element) => element.id).filter(Boolean)

      const rows = incomingElements.map((element) => ({
        id: element.id,
        site_map_id: id,
        name: element.name || element.label || `element_${Date.now()}`,
        element_type: element.elementType || element.type || 'custom',
        x: element.x ?? 0,
        y: element.y ?? 0,
        width: element.width ?? 0,
        height: element.height ?? 0,
        rotation: element.rotation ?? 0,
        color: element.color || element.fill || '#3b82f6',
        stroke_color: element.strokeColor || element.stroke || '#1e40af',
        stroke_width: element.strokeWidth ?? 1,
        opacity: element.opacity ?? 1,
        properties: element.properties || element.data || {},
      }))

      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from('site_map_elements')
          .upsert(rows, { onConflict: 'id' })

        if (upsertError) {
          console.error('Error upserting elements:', upsertError)
          return NextResponse.json({ error: 'Failed to save elements' }, { status: 500 })
        }
      }

      if (body.sync === true) {
        const existingQuery = supabase
          .from('site_map_elements')
          .select('id')
          .eq('site_map_id', id)

        const { data: existing } = await existingQuery
        const idsToDelete = (existing || [])
          .map((row) => row.id)
          .filter((existingId) => !incomingIds.includes(existingId))

        if (idsToDelete.length > 0) {
          await supabase.from('site_map_elements').delete().in('id', idsToDelete)
        }
      }

      const { data: savedElements, error: savedError } = await supabase
        .from('site_map_elements')
        .select('*')
        .eq('site_map_id', id)
        .order('created_at', { ascending: true })

      if (savedError) {
        console.error('Error fetching saved elements:', savedError)
        return NextResponse.json({ error: 'Failed to fetch saved elements' }, { status: 500 })
      }

      return NextResponse.json({ success: true, data: savedElements || [] })
    }
    const { 
      id: elementId,
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
        ...(elementId ? { id: elementId } : {}),
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
