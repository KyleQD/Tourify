import { supabase } from '@/lib/supabase'
import type { EquipmentAsset } from '@/types/database.types'

export interface ListAssetsArgs {
  ownerType: EquipmentAsset['owner_type'] | string
  ownerId: string
}

export interface CreateAssetArgs {
  ownerType: EquipmentAsset['owner_type'] | string
  ownerId: string
  name: string
  category?: string
  description?: string
  serialNumber?: string
  metadata?: Record<string, any>
}

export async function listAssets({ ownerType, ownerId }: ListAssetsArgs): Promise<EquipmentAsset[]> {
  if (!ownerType || !ownerId) return []
  const { data, error } = await supabase
    .from('equipment_assets')
    .select('*')
    .eq('owner_type', ownerType)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createAsset(args: CreateAssetArgs): Promise<EquipmentAsset> {
  const { ownerType, ownerId, name, category, description, serialNumber, metadata } = args
  if (!ownerType || !ownerId || !name) throw new Error('Missing required fields')

  const { data, error } = await supabase
    .from('equipment_assets')
    .insert({
      owner_type: ownerType,
      owner_id: ownerId,
      name,
      category: category ?? null,
      description: description ?? null,
      serial_number: serialNumber ?? null,
      metadata: metadata ?? null
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}


