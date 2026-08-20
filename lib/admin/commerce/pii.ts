import {
  hasCommercePermission,
  type CommerceContext,
  type CommercePermission,
} from "@/lib/admin/commerce/context"

export const COMMERCE_PII_FIELDS = [
  "customer.email",
  "customer.phone",
  "customer.shipping_address",
  "seller.email",
  "seller.phone",
  "seller.payout_destination",
] as const

export type CommercePiiField = (typeof COMMERCE_PII_FIELDS)[number]

export interface CommercePiiFieldRequirement {
  field: CommercePiiField
  requiredPermission: CommercePermission
  redactedValue: null
}

export const COMMERCE_PII_FIELD_REQUIREMENTS: Readonly<
  Record<CommercePiiField, CommercePiiFieldRequirement>
> = {
  "customer.email": {
    field: "customer.email",
    requiredPermission: "commerce.view_customers",
    redactedValue: null,
  },
  "customer.phone": {
    field: "customer.phone",
    requiredPermission: "commerce.view_customers",
    redactedValue: null,
  },
  "customer.shipping_address": {
    field: "customer.shipping_address",
    requiredPermission: "commerce.view_customers",
    redactedValue: null,
  },
  "seller.email": {
    field: "seller.email",
    requiredPermission: "commerce.view_seller_pii",
    redactedValue: null,
  },
  "seller.phone": {
    field: "seller.phone",
    requiredPermission: "commerce.view_seller_pii",
    redactedValue: null,
  },
  "seller.payout_destination": {
    field: "seller.payout_destination",
    requiredPermission: "commerce.view_seller_pii",
    redactedValue: null,
  },
}

export function canViewCommercePiiField(
  context: Pick<CommerceContext, "permissions">,
  field: CommercePiiField,
): boolean {
  return hasCommercePermission(
    context.permissions,
    COMMERCE_PII_FIELD_REQUIREMENTS[field].requiredPermission,
  )
}

export function projectCommercePiiValue<T>(
  context: Pick<CommerceContext, "permissions">,
  field: CommercePiiField,
  value: T | null | undefined,
): T | null {
  return canViewCommercePiiField(context, field) ? value ?? null : null
}

export function buildCommercePiiAwareSelect(
  context: Pick<CommerceContext, "permissions">,
  baseFields: readonly string[],
  piiFields: Partial<Record<CommercePiiField, string>>,
): string {
  const fields = new Set(baseFields)
  for (const [field, column] of Object.entries(piiFields) as Array<[CommercePiiField, string]>) {
    if (canViewCommercePiiField(context, field)) fields.add(column)
  }
  return Array.from(fields).join(", ")
}
