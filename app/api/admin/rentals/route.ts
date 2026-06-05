import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest, checkAdminPermissions } from '@/lib/auth/api-auth'

async function getAuth(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return { denied: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), auth: null }
  const isAdmin = await checkAdminPermissions(auth.user)
  if (!isAdmin) return { denied: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), auth: null }
  return { denied: null, auth }
}

// =============================================================================
// GET
// =============================================================================

export async function GET(request: NextRequest) {
  const { denied, auth } = await getAuth(request)
  if (denied || !auth) return denied!

  const { supabase } = auth
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'agreements'
  const status = searchParams.get('status')
  const clientId = searchParams.get('client_id')
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  try {
    if (type === 'clients') {
      let query = supabase
        .from('rental_clients')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (status) query = query.eq('status', status)

      const { data, count, error } = await query
      if (error) throw error

      return NextResponse.json({ clients: data || [], total: count ?? 0 })
    }

    if (type === 'agreements') {
      let query = supabase
        .from('rental_agreements')
        .select(`
          *,
          rental_clients (*),
          rental_agreement_items (
            *,
            equipment:logistics_equipment (id, name, category, rental_rate)
          ),
          events:events_v2 (id, name, start_date),
          tours (id, name, start_date)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (status) query = query.eq('status', status)
      if (clientId) query = query.eq('client_id', clientId)

      const { data, count, error } = await query
      if (error) throw error

      return NextResponse.json({ agreements: data || [], total: count ?? 0 })
    }

    if (type === 'analytics') {
      const now = new Date()
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const quarter = `Q${Math.ceil((now.getMonth() + 1) / 3)}`
      const year = String(now.getFullYear())

      const { data: agreements, error } = await supabase
        .from('rental_agreements')
        .select(`
          id, status, payment_status, total_amount, paid_amount,
          rental_agreement_items (id, equipment_id, total_days, subtotal, status, damage_notes)
        `)

      if (error) throw error

      const rows: any[] = agreements || []
      const totalRentals = rows.length
      const totalRevenue = rows.reduce((s: number, r: any) => s + (r.total_amount || 0), 0)
      const totalPaid = rows.reduce((s: number, r: any) => s + (r.paid_amount || 0), 0)
      const activeRentals = rows.filter(r => r.status === 'active').length
      const completedRentals = rows.filter(r => r.status === 'completed').length
      const overdueRentals = rows.filter(r => r.status === 'overdue').length
      const paidRentals = rows.filter(r => r.payment_status === 'paid').length
      const overduePayments = rows.filter(r => r.payment_status === 'overdue').length

      const allItems = rows.flatMap((r: any) => r.rental_agreement_items || [])
      const uniqueEquipment = new Set(allItems.map((i: any) => i.equipment_id)).size
      const totalEquipmentDays = allItems.reduce((s: number, i: any) => s + (i.total_days || 0), 0)
      const damageReports = allItems.filter(i => i.damage_notes).length
      const uniqueClients = new Set(rows.map((r: any) => r.client_id).filter(Boolean)).size

      const analytics = [{
        month,
        quarter,
        year,
        total_rentals: totalRentals,
        total_revenue: totalRevenue,
        total_paid: totalPaid,
        avg_rental_value: totalRentals ? totalRevenue / totalRentals : 0,
        unique_equipment_rented: uniqueEquipment,
        total_equipment_days: totalEquipmentDays,
        unique_clients: uniqueClients,
        active_rentals: activeRentals,
        completed_rentals: completedRentals,
        overdue_rentals: overdueRentals,
        paid_rentals: paidRentals,
        overdue_payments: overduePayments,
        damage_reports: damageReports,
        total_repair_costs: 0
      }]

      return NextResponse.json({ analytics })
    }

    if (type === 'utilization') {
      const { data: items, error } = await supabase
        .from('rental_agreement_items')
        .select(`
          id, equipment_id, quantity, daily_rate, total_days, subtotal,
          status, damage_notes, actual_return_date,
          equipment:logistics_equipment (id, name, category, rental_rate, is_rentable)
        `)

      if (error) throw error

      const grouped = new Map<string, {
        equipment: any
        totalRentals: number
        totalDays: number
        totalRevenue: number
        rates: number[]
        damageReports: number
        lastReturnDate: string | null
        currentStatus: string
      }>()

      for (const item of items || []) {
        const eqId = item.equipment_id
        if (!eqId) continue

        const existing = grouped.get(eqId)
        if (existing) {
          existing.totalRentals += 1
          existing.totalDays += item.total_days || 0
          existing.totalRevenue += item.subtotal || 0
          existing.rates.push(item.daily_rate || 0)
          if (item.damage_notes) existing.damageReports += 1
          if (item.actual_return_date && (!existing.lastReturnDate || item.actual_return_date > existing.lastReturnDate)) {
            existing.lastReturnDate = item.actual_return_date
          }
          if (item.status === 'picked_up') existing.currentStatus = 'rented'
        } else {
          grouped.set(eqId, {
            equipment: item.equipment,
            totalRentals: 1,
            totalDays: item.total_days || 0,
            totalRevenue: item.subtotal || 0,
            rates: [item.daily_rate || 0],
            damageReports: item.damage_notes ? 1 : 0,
            lastReturnDate: item.actual_return_date || null,
            currentStatus: item.status === 'picked_up' ? 'rented' : 'available'
          })
        }
      }

      const utilization = Array.from(grouped.entries()).map(([eqId, g]) => ({
        id: eqId,
        name: g.equipment?.name || 'Unknown',
        category: g.equipment?.category || 'uncategorized',
        rental_rate: g.equipment?.rental_rate || 0,
        is_rentable: g.equipment?.is_rentable ?? true,
        total_rentals: g.totalRentals,
        total_rental_days: g.totalDays,
        avg_rental_rate: g.rates.length ? g.rates.reduce((a, b) => a + b, 0) / g.rates.length : 0,
        total_rental_revenue: g.totalRevenue,
        current_status: g.currentStatus,
        damage_reports: g.damageReports,
        total_repair_costs: 0,
        last_rental_date: g.lastReturnDate || undefined
      }))

      return NextResponse.json({ utilization })
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
  } catch (error) {
    console.error('[Rentals API] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch rental data' }, { status: 500 })
  }
}

// =============================================================================
// POST
// =============================================================================

export async function POST(request: NextRequest) {
  const { denied, auth } = await getAuth(request)
  if (denied || !auth) return denied!

  const { supabase, user } = auth

  try {
    const body = await request.json()
    const { action } = body

    if (action === 'create_client') {
      const { action: _, ...clientData } = body

      const { data, error } = await supabase
        .from('rental_clients')
        .insert({ ...clientData, created_by: user.id })
        .select('*')
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, client: data }, { status: 201 })
    }

    if (action === 'create_agreement') {
      const { action: _, items, ...agreementData } = body

      const totalDays = items?.reduce((s: number, i: any) => {
        const days = i.total_days || Math.ceil(
          (new Date(agreementData.end_date).getTime() - new Date(agreementData.start_date).getTime())
          / (1000 * 60 * 60 * 24)
        ) || 1
        return s + days * (i.quantity || 1)
      }, 0) || 0

      const subtotal = items?.reduce((s: number, i: any) => {
        const days = i.total_days || Math.ceil(
          (new Date(agreementData.end_date).getTime() - new Date(agreementData.start_date).getTime())
          / (1000 * 60 * 60 * 24)
        ) || 1
        return s + (i.daily_rate || 0) * days * (i.quantity || 1)
      }, 0) || 0

      const agreementNumber = `RA-${Date.now().toString(36).toUpperCase()}`

      const { data: agreement, error: agError } = await supabase
        .from('rental_agreements')
        .insert({
          ...agreementData,
          agreement_number: agreementNumber,
          subtotal,
          total_amount: subtotal + (agreementData.tax_amount || 0) + (agreementData.insurance_amount || 0),
          paid_amount: 0,
          status: agreementData.status || 'draft',
          payment_status: 'pending',
          created_by: user.id
        })
        .select('*')
        .single()

      if (agError) throw agError

      if (items?.length) {
        const agreementItems = items.map((item: any) => {
          const days = item.total_days || Math.ceil(
            (new Date(agreementData.end_date).getTime() - new Date(agreementData.start_date).getTime())
            / (1000 * 60 * 60 * 24)
          ) || 1

          return {
            rental_agreement_id: agreement.id,
            equipment_id: item.equipment_id,
            quantity: item.quantity || 1,
            daily_rate: item.daily_rate || 0,
            total_days: days,
            subtotal: (item.daily_rate || 0) * days * (item.quantity || 1),
            status: 'reserved',
            notes: item.notes || null
          }
        })

        const { error: itemsError } = await supabase
          .from('rental_agreement_items')
          .insert(agreementItems)

        if (itemsError) throw itemsError
      }

      return NextResponse.json({ success: true, agreement }, { status: 201 })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[Rentals API] POST error:', error)
    return NextResponse.json({ error: 'Failed to create rental record' }, { status: 500 })
  }
}

// =============================================================================
// PUT
// =============================================================================

export async function PUT(request: NextRequest) {
  const { denied, auth } = await getAuth(request)
  if (denied || !auth) return denied!

  const { supabase } = auth

  try {
    const body = await request.json()
    const { id, type, ...updateData } = body

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    if (!type) return NextResponse.json({ error: 'Missing type' }, { status: 400 })

    if (type === 'client') {
      const { data, error } = await supabase
        .from('rental_clients')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, client: data })
    }

    if (type === 'agreement') {
      const { data, error } = await supabase
        .from('rental_agreements')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, agreement: data })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('[Rentals API] PUT error:', error)
    return NextResponse.json({ error: 'Failed to update rental record' }, { status: 500 })
  }
}

// =============================================================================
// DELETE
// =============================================================================

export async function DELETE(request: NextRequest) {
  const { denied, auth } = await getAuth(request)
  if (denied || !auth) return denied!

  const { supabase } = auth
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const type = searchParams.get('type')

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  if (!type) return NextResponse.json({ error: 'Missing type' }, { status: 400 })

  try {
    if (type === 'client') {
      const { error } = await supabase
        .from('rental_clients')
        .delete()
        .eq('id', id)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (type === 'agreement') {
      const { error: itemsError } = await supabase
        .from('rental_agreement_items')
        .delete()
        .eq('rental_agreement_id', id)

      if (itemsError) throw itemsError

      const { error } = await supabase
        .from('rental_agreements')
        .delete()
        .eq('id', id)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('[Rentals API] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete rental record' }, { status: 500 })
  }
}
