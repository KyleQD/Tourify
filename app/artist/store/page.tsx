"use client"

import { SellerStoreDashboard } from "@/components/marketplace/seller-store-dashboard"

export default function ArtistStorePage() {
  return (
    <SellerStoreDashboard
      storeTitle="Artist Marketplace"
      storeDescription="Sell music, digital work, prints, merch, and services from your storefront"
      showMusicFeatures
    />
  )
}
