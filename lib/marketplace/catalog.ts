export interface MarketplaceCategoryDefinition {
  id: string
  label: string
  productTypes: string[]
  supportsFulfillment: boolean
}

export const MARKETPLACE_PRODUCT_TYPE = {
  digitalAsset: "digital_asset",
  podPrint: "pod_print",
  physicalMerch: "physical_merch",
  service: "service",
  tip: "tip",
} as const

export const MARKETPLACE_CATEGORIES: MarketplaceCategoryDefinition[] = [
  {
    id: "music",
    label: "Music",
    productTypes: [MARKETPLACE_PRODUCT_TYPE.digitalAsset],
    supportsFulfillment: true,
  },
  {
    id: "photos-and-prints",
    label: "Photos & Prints",
    productTypes: [MARKETPLACE_PRODUCT_TYPE.digitalAsset, MARKETPLACE_PRODUCT_TYPE.podPrint],
    supportsFulfillment: true,
  },
  {
    id: "merch",
    label: "Merch",
    productTypes: [MARKETPLACE_PRODUCT_TYPE.physicalMerch, MARKETPLACE_PRODUCT_TYPE.podPrint],
    supportsFulfillment: true,
  },
  {
    id: "services",
    label: "Services",
    productTypes: [MARKETPLACE_PRODUCT_TYPE.service],
    supportsFulfillment: false,
  },
  {
    id: "support",
    label: "Support",
    productTypes: [MARKETPLACE_PRODUCT_TYPE.tip],
    supportsFulfillment: false,
  },
]

const productTypeById = new Set(Object.values(MARKETPLACE_PRODUCT_TYPE))

export function isValidMarketplaceProductType(productType: string) {
  return productTypeById.has(productType as (typeof MARKETPLACE_PRODUCT_TYPE)[keyof typeof MARKETPLACE_PRODUCT_TYPE])
}

export function getMarketplaceCategoriesByProductType(productType: string) {
  return MARKETPLACE_CATEGORIES.filter(category => category.productTypes.includes(productType))
}
