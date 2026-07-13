/**
 * Inventory reservation helpers wrapping Postgres RPCs.
 */

type AwaitablePostgrestResult = PromiseLike<{ data: any; error: any }>

export interface InventoryClient {
  rpc: (fn: string, args?: Record<string, unknown>) => AwaitablePostgrestResult
  from: (table: string) => any
}

export async function reserveInventory(params: {
  supabase: InventoryClient
  ticketTypeId: string
  quantity: number
  orderId?: string | null
  ttlSeconds?: number
  createdBy?: string | null
}): Promise<{ reservationId: string }> {
  const { data, error } = await params.supabase.rpc('reserve_ticket_inventory', {
    p_ticket_type_id: params.ticketTypeId,
    p_quantity: params.quantity,
    p_order_id: params.orderId ?? null,
    p_ttl_seconds: params.ttlSeconds ?? 900,
    p_created_by: params.createdBy ?? null,
  })

  if (error)
    throw new Error(error.message || 'Failed to reserve inventory')

  return { reservationId: data as string }
}

export async function releaseInventory(params: {
  supabase: InventoryClient
  reservationId: string
}): Promise<boolean> {
  const { data, error } = await params.supabase.rpc('release_ticket_inventory', {
    p_reservation_id: params.reservationId,
  })
  if (error)
    throw new Error(error.message || 'Failed to release inventory')
  return Boolean(data)
}

export async function finalizeInventory(params: {
  supabase: InventoryClient
  reservationId: string
}): Promise<boolean> {
  const { data, error } = await params.supabase.rpc('finalize_ticket_inventory', {
    p_reservation_id: params.reservationId,
  })
  if (error)
    throw new Error(error.message || 'Failed to finalize inventory')
  return Boolean(data)
}

export async function getAvailableQuantity(params: {
  supabase: InventoryClient
  ticketTypeId: string
}): Promise<number> {
  const { data, error } = await params.supabase
    .from('ticket_types')
    .select('quantity_available, quantity_sold, quantity_reserved')
    .eq('id', params.ticketTypeId)
    .maybeSingle()

  if (error || !data) return 0
  return Math.max(
    0,
    (data.quantity_available ?? 0) - (data.quantity_sold ?? 0) - (data.quantity_reserved ?? 0)
  )
}
