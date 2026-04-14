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
  ticket: "ticket",
  rental: "rental",
  artOriginal: "art_original",
  artPrint: "art_print",
  commission: "commission",
} as const

export const MARKETPLACE_SELLER_TYPE = {
  artist: "artist",
  venue: "venue",
  photographer: "photographer",
  painter: "painter",
  individual: "individual",
  company: "company",
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
    productTypes: [MARKETPLACE_PRODUCT_TYPE.digitalAsset, MARKETPLACE_PRODUCT_TYPE.podPrint, MARKETPLACE_PRODUCT_TYPE.artPrint],
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
    productTypes: [MARKETPLACE_PRODUCT_TYPE.service, MARKETPLACE_PRODUCT_TYPE.commission],
    supportsFulfillment: false,
  },
  {
    id: "support",
    label: "Support",
    productTypes: [MARKETPLACE_PRODUCT_TYPE.tip],
    supportsFulfillment: false,
  },
  {
    id: "tickets",
    label: "Tickets",
    productTypes: [MARKETPLACE_PRODUCT_TYPE.ticket],
    supportsFulfillment: true,
  },
  {
    id: "fine-art",
    label: "Fine Art",
    productTypes: [MARKETPLACE_PRODUCT_TYPE.artOriginal, MARKETPLACE_PRODUCT_TYPE.artPrint, MARKETPLACE_PRODUCT_TYPE.commission, MARKETPLACE_PRODUCT_TYPE.podPrint],
    supportsFulfillment: true,
  },
  {
    id: "photography",
    label: "Photography",
    productTypes: [MARKETPLACE_PRODUCT_TYPE.digitalAsset, MARKETPLACE_PRODUCT_TYPE.artPrint, MARKETPLACE_PRODUCT_TYPE.podPrint, MARKETPLACE_PRODUCT_TYPE.service],
    supportsFulfillment: true,
  },
  {
    id: "rentals",
    label: "Rentals",
    productTypes: [MARKETPLACE_PRODUCT_TYPE.rental],
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
