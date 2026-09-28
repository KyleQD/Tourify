"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { VKData } from "@/lib/services/venue-kit.service"
import { epkInput, epkSurface } from "@/components/epk/epk-ui-styles"

interface Props {
  vkData: VKData
  updateVKData: (updates: Partial<VKData>) => void
}

export default function SpecsSection({ vkData, updateVKData }: Props) {
  const s = vkData.specs

  const updateSpec = (key: keyof VKData["specs"], value: string | number | boolean) => {
    updateVKData({ specs: { ...s, [key]: value } })
  }

  return (
    <div className="space-y-6">
      {/* Capacity */}
      <Card className={epkSurface}>
        <CardHeader>
          <CardTitle className="text-base">Capacity</CardTitle>
          <CardDescription>Total and breakdown by configuration.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="vk-cap-total">Total</Label>
            <Input
              id="vk-cap-total"
              className={epkInput}
              type="number"
              min={0}
              value={s.capacityTotal || ""}
              onChange={(e) => updateSpec("capacityTotal", parseInt(e.target.value, 10) || 0)}
              placeholder="1500"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vk-cap-standing">Standing</Label>
            <Input
              id="vk-cap-standing"
              className={epkInput}
              type="number"
              min={0}
              value={s.capacityStanding || ""}
              onChange={(e) => updateSpec("capacityStanding", parseInt(e.target.value, 10) || 0)}
              placeholder="1200"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vk-cap-seated">Seated</Label>
            <Input
              id="vk-cap-seated"
              className={epkInput}
              type="number"
              min={0}
              value={s.capacitySeated || ""}
              onChange={(e) => updateSpec("capacitySeated", parseInt(e.target.value, 10) || 0)}
              placeholder="600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stage */}
      <Card className={epkSurface}>
        <CardHeader>
          <CardTitle className="text-base">Stage & Technical</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="vk-stage-dims">Stage Dimensions</Label>
            <Input
              id="vk-stage-dims"
              className={epkInput}
              value={s.stageDimensions}
              onChange={(e) => updateSpec("stageDimensions", e.target.value)}
              placeholder="40' W × 30' D × 20' H"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vk-sound">Sound System</Label>
            <Input
              id="vk-sound"
              className={epkInput}
              value={s.soundSystem}
              onChange={(e) => updateSpec("soundSystem", e.target.value)}
              placeholder="L-Acoustics K2 with 64-channel DiGiCo SD12"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vk-lighting">Lighting Rig</Label>
            <Input
              id="vk-lighting"
              className={epkInput}
              value={s.lightingRig}
              onChange={(e) => updateSpec("lightingRig", e.target.value)}
              placeholder="Full DMX — Clay Paky Sharpy, GLP X4 bars, hazer"
            />
          </div>
        </CardContent>
      </Card>

      {/* Facilities */}
      <Card className={epkSurface}>
        <CardHeader>
          <CardTitle className="text-base">Facilities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="vk-green-rooms">Green Rooms</Label>
              <Input
                id="vk-green-rooms"
                className={epkInput}
                type="number"
                min={0}
                value={s.greenRooms || ""}
                onChange={(e) => updateSpec("greenRooms", parseInt(e.target.value, 10) || 0)}
                placeholder="2"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vk-parking">Parking Spots</Label>
              <Input
                id="vk-parking"
                className={epkInput}
                type="number"
                min={0}
                value={s.parkingSpots || ""}
                onChange={(e) => updateSpec("parkingSpots", parseInt(e.target.value, 10) || 0)}
                placeholder="50"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vk-curfew">Curfew</Label>
              <Input
                id="vk-curfew"
                className={epkInput}
                value={s.curfew}
                onChange={(e) => updateSpec("curfew", e.target.value)}
                placeholder="2:00 AM"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="vk-age">Age Restrictions</Label>
              <Input
                id="vk-age"
                className={epkInput}
                value={s.ageRestrictions}
                onChange={(e) => updateSpec("ageRestrictions", e.target.value)}
                placeholder="21+ unless otherwise noted"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Loading Dock</p>
              <p className="text-xs text-muted-foreground">Ground-level load-in access</p>
            </div>
            <Switch
              checked={s.loadingDock}
              onCheckedChange={(v) => updateSpec("loadingDock", v)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
