import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await context.params
  return withAdminAuth(async (req) => {
    const supabase = await createClient()
    const body = await req.json()
    const equipmentAssetId: string = body.equipmentAssetId
    const startTime: string | null = body.startTime || null
    const endTime: string | null = body.endTime || null
    const quantity: number = body.quantity ?? 1

    if (!equipmentAssetId) return NextResponse.json({ error: 'equipmentAssetId required' }, { status: 400 })

    // Conflict check: overlapping reservations for this asset
    if (startTime && endTime) {
      const { data: overlaps, error: overlapErr } = await supabase
        .from('logistics_task_equipment')
        .select('id, start_time, end_time')
        .eq('equipment_asset_id', equipmentAssetId)
        .neq('task_id', taskId)
      if (overlapErr) return NextResponse.json({ error: overlapErr.message }, { status: 400 })
      const start = new Date(startTime).getTime()
      const end = new Date(endTime).getTime()
      const hasOverlap = (overlaps || []).some(o => {
        if (!o.start_time || !o.end_time) return false
        const os = new Date(o.start_time as any).getTime()
        const oe = new Date(o.end_time as any).getTime()
        return Math.max(start, os) < Math.min(end, oe)
      })
      if (hasOverlap) return NextResponse.json({ error: 'Asset time window conflicts with another reservation' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('logistics_task_equipment')
      .insert({
        task_id: taskId,
        equipment_asset_id: equipmentAssetId,
        start_time: startTime,
        end_time: endTime,
        quantity
      })
      .select('*')
      .single()

    if (error) throw error

    // Log activity
    await supabase.from('logistics_activity').insert({
      task_id: taskId,
      action: 'equipment_attached',
      metadata: { equipment_asset_id: equipmentAssetId, start_time: startTime, end_time: endTime, quantity }
    })

    return NextResponse.json({ link: data }, { status: 201 })
  })(request)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await context.params
  return withAdminAuth(async (req) => {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const equipmentAssetId = searchParams.get('equipmentAssetId')
    if (!equipmentAssetId) return NextResponse.json({ error: 'equipmentAssetId required' }, { status: 400 })

    const { error } = await supabase
      .from('logistics_task_equipment')
      .delete()
      .eq('task_id', taskId)
      .eq('equipment_asset_id', equipmentAssetId)

    if (error) throw error

    // Log activity
    await supabase.from('logistics_activity').insert({
      task_id: taskId,
      action: 'equipment_detached',
      metadata: { equipment_asset_id: equipmentAssetId }
    })

    return NextResponse.json({ success: true })
  })(request)
}


