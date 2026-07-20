/** Canvas symbol and primitive draw helpers for the site map editor. */

export function drawElementSymbol(ctx: CanvasRenderingContext2D, type: string, w: number, h: number, color: string) {
  const cx = w / 2
  const cy = (h - 25) / 2
  const s = Math.min(w, h - 25) * 0.3
  ctx.fillStyle = color
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const symbolMap: Record<string, () => void> = {
    // Tents & Shelters
    'vip-tent': () => { ctx.beginPath(); ctx.moveTo(cx - s, cy + s * 0.7); ctx.lineTo(cx, cy - s * 0.7); ctx.lineTo(cx + s, cy + s * 0.7); ctx.closePath(); ctx.stroke() },
    'pop-up-tent-10x10': () => symbolMap['vip-tent'](),
    'frame-tent-20x30': () => symbolMap['vip-tent'](),
    'pole-tent-40x60': () => symbolMap['vip-tent'](),
    'backstage-tent': () => symbolMap['vip-tent'](),
    'merchandise-tent': () => symbolMap['vip-tent'](),
    'information-tent': () => symbolMap['vip-tent'](),
    'check-in-tent': () => symbolMap['vip-tent'](),
    'medical-tent': () => { symbolMap['vip-tent'](); ctx.beginPath(); ctx.moveTo(cx - s * 0.3, cy); ctx.lineTo(cx + s * 0.3, cy); ctx.moveTo(cx, cy - s * 0.3); ctx.lineTo(cx, cy + s * 0.3); ctx.stroke() },
    'camping-tent-site': () => symbolMap['vip-tent'](),
    'glamping-bell-tent': () => symbolMap['vip-tent'](),
    'shade-sail': () => { ctx.beginPath(); ctx.moveTo(cx - s, cy - s * 0.4); ctx.lineTo(cx + s, cy - s * 0.4); ctx.lineTo(cx + s * 0.5, cy + s * 0.4); ctx.lineTo(cx - s * 0.5, cy + s * 0.4); ctx.closePath(); ctx.stroke() },

    // Stages & Music
    'main-stage': () => { ctx.fillStyle = color; ctx.fillRect(cx - s, cy - s * 0.3, s * 2, s * 0.6); ctx.beginPath(); ctx.arc(cx - s * 0.4, cy - s * 0.6, s * 0.15, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(cx + s * 0.4, cy - s * 0.6, s * 0.15, 0, Math.PI * 2); ctx.fill() },
    'dj-booth': () => symbolMap['main-stage'](),
    'acoustic-stage': () => symbolMap['main-stage'](),

    // Food & Drink
    'food-truck': () => { ctx.strokeRect(cx - s, cy - s * 0.4, s * 2, s * 0.8); ctx.beginPath(); ctx.arc(cx - s * 0.5, cy + s * 0.6, s * 0.2, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + s * 0.5, cy + s * 0.6, s * 0.2, 0, Math.PI * 2); ctx.stroke() },
    'food-vendor-tent': () => { ctx.beginPath(); ctx.moveTo(cx - s * 0.5, cy + s * 0.3); ctx.lineTo(cx - s * 0.3, cy - s * 0.3); ctx.lineTo(cx + s * 0.3, cy - s * 0.3); ctx.lineTo(cx + s * 0.5, cy + s * 0.3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - s * 0.2, cy + s * 0.3); ctx.lineTo(cx, cy - s * 0.1); ctx.lineTo(cx + s * 0.2, cy + s * 0.3); ctx.stroke() },
    'bbq-grill-station': () => { ctx.beginPath(); ctx.moveTo(cx - s * 0.4, cy + s * 0.3); ctx.lineTo(cx, cy - s * 0.5); ctx.lineTo(cx + s * 0.4, cy + s * 0.3); ctx.stroke() },
    'bar-station': () => { ctx.strokeRect(cx - s * 0.6, cy - s * 0.2, s * 1.2, s * 0.4); ctx.beginPath(); ctx.arc(cx, cy - s * 0.5, s * 0.15, 0, Math.PI * 2); ctx.stroke() },
    'coffee-cart': () => symbolMap['bar-station'](),
    'ice-cream-stand': () => symbolMap['food-vendor-tent'](),
    'water-refill-station': () => { ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.5); ctx.lineTo(cx, cy + s * 0.5); ctx.moveTo(cx - s * 0.2, cy - s * 0.3); ctx.lineTo(cx + s * 0.2, cy - s * 0.3); ctx.stroke() },

    // Vendors
    'vendor-booth-10x10': () => { ctx.strokeRect(cx - s * 0.7, cy - s * 0.5, s * 1.4, s); ctx.beginPath(); ctx.moveTo(cx - s * 0.7, cy - s * 0.2); ctx.lineTo(cx + s * 0.7, cy - s * 0.2); ctx.stroke() },
    'vendor-booth-10x20': () => symbolMap['vendor-booth-10x10'](),
    'artisan-market-stall': () => symbolMap['vendor-booth-10x10'](),
    'merch-trailer': () => symbolMap['food-truck'](),
    'atm-machine': () => { ctx.strokeRect(cx - s * 0.3, cy - s * 0.5, s * 0.6, s); ctx.fillStyle = color; ctx.font = `bold ${s * 0.4}px monospace`; ctx.textAlign = 'center'; ctx.fillText('$', cx, cy + s * 0.15) },
    'ticket-booth': () => { ctx.strokeRect(cx - s * 0.5, cy - s * 0.4, s, s * 0.8); ctx.beginPath(); ctx.moveTo(cx - s * 0.2, cy); ctx.lineTo(cx + s * 0.2, cy); ctx.stroke() },

    // Security
    'security-checkpoint': () => { ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.6); ctx.lineTo(cx - s * 0.5, cy + s * 0.4); ctx.lineTo(cx + s * 0.5, cy + s * 0.4); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.15); ctx.lineTo(cx, cy + s * 0.2); ctx.stroke() },
    'emergency-exit': () => { ctx.beginPath(); ctx.moveTo(cx + s * 0.4, cy); ctx.lineTo(cx - s * 0.4, cy); ctx.lineTo(cx - s * 0.1, cy - s * 0.3); ctx.moveTo(cx - s * 0.4, cy); ctx.lineTo(cx - s * 0.1, cy + s * 0.3); ctx.stroke(); ctx.strokeRect(cx - s * 0.6, cy - s * 0.5, s * 1.2, s) },
    'emergency-exit-gate': () => symbolMap['emergency-exit'](),
    'fire-extinguisher': () => { ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.6); ctx.lineTo(cx, cy + s * 0.4); ctx.moveTo(cx - s * 0.3, cy + s * 0.4); ctx.lineTo(cx + s * 0.3, cy + s * 0.4); ctx.stroke() },
    'fire-lane': () => { ctx.setLineDash([4, 4]); ctx.strokeRect(cx - s * 0.8, cy - s * 0.15, s * 1.6, s * 0.3); ctx.setLineDash([]) },
    'crowd-barrier': () => { ctx.beginPath(); ctx.moveTo(cx - s * 0.8, cy); ctx.lineTo(cx + s * 0.8, cy); ctx.stroke(); ctx.fillRect(cx - s * 0.8, cy - s * 0.1, s * 0.1, s * 0.2); ctx.fillRect(cx + s * 0.7, cy - s * 0.1, s * 0.1, s * 0.2) },
    'security-tower': () => { ctx.strokeRect(cx - s * 0.3, cy - s * 0.1, s * 0.6, s * 0.6); ctx.beginPath(); ctx.moveTo(cx - s * 0.4, cy - s * 0.1); ctx.lineTo(cx, cy - s * 0.6); ctx.lineTo(cx + s * 0.4, cy - s * 0.1); ctx.closePath(); ctx.stroke() },
    'bag-check-area': () => { ctx.strokeRect(cx - s * 0.5, cy - s * 0.3, s, s * 0.6); ctx.beginPath(); ctx.arc(cx, cy - s * 0.3, s * 0.15, Math.PI, 0); ctx.stroke() },

    // Essential services
    'first-aid-station': () => { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - s * 0.4, cy); ctx.lineTo(cx + s * 0.4, cy); ctx.moveTo(cx, cy - s * 0.4); ctx.lineTo(cx, cy + s * 0.4); ctx.stroke(); ctx.lineWidth = 2 },
    'ambulance-bay': () => symbolMap['first-aid-station'](),
    'info-booth': () => { ctx.font = `bold ${s}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('i', cx, cy) },
    'lost-and-found': () => { ctx.beginPath(); ctx.arc(cx, cy - s * 0.1, s * 0.4, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = color; ctx.font = `bold ${s * 0.5}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', cx, cy - s * 0.1) },
    'phone-charging-station': () => { ctx.strokeRect(cx - s * 0.2, cy - s * 0.4, s * 0.4, s * 0.7); ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.4); ctx.lineTo(cx, cy + s * 0.55); ctx.stroke() },
    'baby-changing-station': () => { ctx.beginPath(); ctx.arc(cx, cy - s * 0.2, s * 0.25, 0, Math.PI * 2); ctx.stroke(); ctx.strokeRect(cx - s * 0.4, cy + s * 0.1, s * 0.8, s * 0.1) },
    'accessibility-ramp': () => { ctx.beginPath(); ctx.moveTo(cx - s * 0.5, cy + s * 0.3); ctx.lineTo(cx + s * 0.5, cy - s * 0.3); ctx.lineTo(cx + s * 0.5, cy + s * 0.3); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, s * 0.25, 0, Math.PI * 2); ctx.stroke() },
    'accessible-viewing-platform': () => symbolMap['accessibility-ramp'](),

    // Signage
    'directional-sign': () => { ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.5); ctx.lineTo(cx, cy - s * 0.3); ctx.lineTo(cx + s * 0.4, cy - s * 0.1); ctx.lineTo(cx, cy + s * 0.1); ctx.stroke() },
    'event-banner': () => { ctx.beginPath(); ctx.moveTo(cx - s * 0.6, cy - s * 0.3); ctx.lineTo(cx - s * 0.6, cy + s * 0.5); ctx.moveTo(cx + s * 0.6, cy - s * 0.3); ctx.lineTo(cx + s * 0.6, cy + s * 0.5); ctx.moveTo(cx - s * 0.6, cy - s * 0.3); ctx.lineTo(cx + s * 0.6, cy - s * 0.3); ctx.stroke() },
    'digital-schedule-board': () => { ctx.strokeRect(cx - s * 0.5, cy - s * 0.4, s, s * 0.7); ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(cx - s * 0.35, cy - s * 0.15 + i * s * 0.2); ctx.lineTo(cx + s * 0.35, cy - s * 0.15 + i * s * 0.2) }; ctx.stroke() },
    'speaker-pa-tower': () => { ctx.beginPath(); ctx.moveTo(cx - s * 0.15, cy - s * 0.3); ctx.lineTo(cx + s * 0.15, cy - s * 0.3); ctx.lineTo(cx + s * 0.3, cy); ctx.lineTo(cx + s * 0.15, cy + s * 0.3); ctx.lineTo(cx - s * 0.15, cy + s * 0.3); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + s * 0.45, cy, s * 0.15, -0.5, 0.5); ctx.stroke() },

    // Sanitation
    'trash-bin': () => { ctx.strokeRect(cx - s * 0.3, cy - s * 0.2, s * 0.6, s * 0.5); ctx.beginPath(); ctx.moveTo(cx - s * 0.4, cy - s * 0.2); ctx.lineTo(cx + s * 0.4, cy - s * 0.2); ctx.stroke() },
    'recycling-station': () => { ctx.beginPath(); ctx.moveTo(cx - s * 0.3, cy - s * 0.3); ctx.lineTo(cx + s * 0.1, cy + s * 0.1); ctx.moveTo(cx + s * 0.3, cy - s * 0.3); ctx.lineTo(cx - s * 0.1, cy + s * 0.1); ctx.moveTo(cx, cy + s * 0.4); ctx.lineTo(cx, cy - s * 0.1); ctx.stroke() },
    'dumpster': () => { ctx.strokeRect(cx - s * 0.5, cy - s * 0.2, s, s * 0.5); ctx.beginPath(); ctx.moveTo(cx - s * 0.5, cy - s * 0.2); ctx.lineTo(cx - s * 0.4, cy - s * 0.4); ctx.lineTo(cx + s * 0.4, cy - s * 0.4); ctx.lineTo(cx + s * 0.5, cy - s * 0.2); ctx.stroke() },
    'hand-washing-station': () => symbolMap['water-refill-station'](),

    // Transportation
    'parking-lot': () => { ctx.font = `bold ${s * 0.8}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('P', cx, cy) },
    'vip-parking': () => symbolMap['parking-lot'](),
    'shuttle-stop': () => { ctx.strokeRect(cx - s * 0.6, cy - s * 0.3, s * 1.2, s * 0.6); ctx.beginPath(); ctx.arc(cx - s * 0.3, cy + s * 0.4, s * 0.12, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + s * 0.3, cy + s * 0.4, s * 0.12, 0, Math.PI * 2); ctx.stroke() },
    'rideshare-zone': () => { ctx.beginPath(); ctx.arc(cx, cy - s * 0.15, s * 0.35, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.2); ctx.lineTo(cx, cy + s * 0.5); ctx.stroke() },
    'bicycle-rack': () => { ctx.beginPath(); ctx.arc(cx, cy, s * 0.35, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.35); ctx.lineTo(cx, cy + s * 0.35); ctx.moveTo(cx - s * 0.35, cy); ctx.lineTo(cx + s * 0.35, cy); ctx.stroke() },
    'loading-dock': () => symbolMap['food-truck'](),
    'rv-hookup': () => { ctx.strokeRect(cx - s * 0.6, cy - s * 0.3, s * 1.2, s * 0.6); ctx.beginPath(); ctx.moveTo(cx - s * 0.6, cy - s * 0.1); ctx.lineTo(cx - s * 0.8, cy - s * 0.1); ctx.lineTo(cx - s * 0.8, cy + s * 0.1); ctx.lineTo(cx - s * 0.6, cy + s * 0.1); ctx.stroke() },

    // Landscaping
    'tree': () => { ctx.beginPath(); ctx.arc(cx, cy - s * 0.2, s * 0.35, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(cx - s * 0.05, cy + s * 0.15, s * 0.1, s * 0.35) },
    'planter-box': () => { ctx.strokeRect(cx - s * 0.5, cy - s * 0.15, s, s * 0.4); ctx.beginPath(); ctx.arc(cx - s * 0.15, cy - s * 0.3, s * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(cx + s * 0.15, cy - s * 0.3, s * 0.12, 0, Math.PI * 2); ctx.fill() },
    'string-lights': () => { ctx.beginPath(); ctx.moveTo(cx - s * 0.7, cy - s * 0.1); ctx.quadraticCurveTo(cx, cy + s * 0.2, cx + s * 0.7, cy - s * 0.1); ctx.stroke(); for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(cx + i * s * 0.25, cy + Math.abs(i) * s * 0.03, s * 0.06, 0, Math.PI * 2); ctx.fill() } },
    'spotlight': () => { ctx.beginPath(); ctx.arc(cx, cy, s * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.25); ctx.lineTo(cx - s * 0.15, cy - s * 0.5); ctx.lineTo(cx + s * 0.15, cy - s * 0.5); ctx.closePath(); ctx.fill() },

    // Technology
    'wifi-tower': () => { ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.4); ctx.lineTo(cx, cy - s * 0.2); ctx.stroke(); for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(cx, cy - s * 0.2, s * 0.15 * i, -Math.PI * 0.75, -Math.PI * 0.25); ctx.stroke() } },
    'camera-mount': () => { ctx.strokeRect(cx - s * 0.3, cy - s * 0.2, s * 0.6, s * 0.4); ctx.beginPath(); ctx.arc(cx, cy, s * 0.12, 0, Math.PI * 2); ctx.stroke() },

    // Special areas
    'smoking-area': () => { ctx.beginPath(); ctx.moveTo(cx - s * 0.1, cy + s * 0.3); ctx.lineTo(cx - s * 0.1, cy - s * 0.1); ctx.quadraticCurveTo(cx - s * 0.1, cy - s * 0.4, cx + s * 0.1, cy - s * 0.4); ctx.stroke() },
    'pet-relief-area': () => { ctx.beginPath(); ctx.arc(cx, cy - s * 0.15, s * 0.25, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx - s * 0.15, cy - s * 0.35, s * 0.08, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(cx + s * 0.15, cy - s * 0.35, s * 0.08, 0, Math.PI * 2); ctx.fill() },
    'quiet-zone': () => { ctx.beginPath(); ctx.arc(cx, cy, s * 0.35, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - s * 0.15, cy - s * 0.15); ctx.lineTo(cx + s * 0.15, cy + s * 0.15); ctx.moveTo(cx + s * 0.15, cy - s * 0.15); ctx.lineTo(cx - s * 0.15, cy + s * 0.15); ctx.stroke() },

    // Furniture
    'folding-chair': () => { ctx.strokeRect(cx - s * 0.3, cy - s * 0.3, s * 0.6, s * 0.6) },
    'round-table': () => { ctx.beginPath(); ctx.arc(cx, cy, s * 0.35, 0, Math.PI * 2); ctx.stroke() },
    'rectangular-table': () => { ctx.strokeRect(cx - s * 0.6, cy - s * 0.2, s * 1.2, s * 0.4) },
    'picnic-table': () => { ctx.strokeRect(cx - s * 0.5, cy - s * 0.15, s, s * 0.3); ctx.beginPath(); ctx.moveTo(cx - s * 0.6, cy + s * 0.25); ctx.lineTo(cx + s * 0.6, cy + s * 0.25); ctx.moveTo(cx - s * 0.6, cy - s * 0.25); ctx.lineTo(cx + s * 0.6, cy - s * 0.25); ctx.stroke() },

    // Power
    'generator-50kw': () => { ctx.beginPath(); ctx.moveTo(cx - s * 0.3, cy - s * 0.4); ctx.lineTo(cx + s * 0.1, cy); ctx.lineTo(cx - s * 0.1, cy); ctx.lineTo(cx + s * 0.3, cy + s * 0.4); ctx.stroke() },
    'generator-100kw': () => symbolMap['generator-50kw'](),
    'power-distribution': () => symbolMap['generator-50kw'](),
    'water-station': () => symbolMap['water-refill-station'](),
    'portable-restroom': () => { ctx.strokeRect(cx - s * 0.3, cy - s * 0.4, s * 0.6, s * 0.8); ctx.beginPath(); ctx.arc(cx, cy - s * 0.15, s * 0.12, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.03); ctx.lineTo(cx, cy + s * 0.25); ctx.stroke() },
    'luxury-restroom': () => symbolMap['portable-restroom'](),
  }

  const drawFn = symbolMap[type]
  if (drawFn) {
    ctx.globalAlpha = 0.7
    drawFn()
    ctx.globalAlpha = 1
  }
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function drawFittedLabel(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, maxWidth: number) {
  let fitted = label
  while (ctx.measureText(fitted).width > maxWidth && fitted.length > 3) {
    fitted = fitted.slice(0, -2) + '...'
  }
  ctx.fillText(fitted, x, y)
}

export function drawSelectionOutline(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
  color = '#2dd4bf'
) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.setLineDash([6, 4])
  ctx.strokeRect(rect.x - 1, rect.y - 1, rect.width + 2, rect.height + 2)
  ctx.setLineDash([])
  const handle = 7
  const corners = [
    [rect.x, rect.y],
    [rect.x + rect.width, rect.y],
    [rect.x, rect.y + rect.height],
    [rect.x + rect.width, rect.y + rect.height],
  ]
  ctx.fillStyle = '#0f172a'
  ctx.strokeStyle = color
  for (const [cx, cy] of corners) {
    ctx.beginPath()
    ctx.rect(cx - handle / 2, cy - handle / 2, handle, handle)
    ctx.fill()
    ctx.stroke()
  }
  ctx.restore()
}

export function drawScaleBarHud(
  ctx: CanvasRenderingContext2D,
  {
    cssWidth,
    cssHeight,
    worldLength,
    screenLength,
    label,
  }: {
    cssWidth: number
    cssHeight: number
    worldLength: number
    screenLength: number
    label: string
  }
) {
  const barW = Math.max(32, Math.min(160, screenLength))
  const x = 16
  const y = cssHeight - 28
  ctx.save()
  ctx.fillStyle = 'rgba(15, 23, 42, 0.82)'
  ctx.strokeStyle = 'rgba(45, 212, 191, 0.55)'
  ctx.lineWidth = 1
  roundRect(ctx, x - 8, y - 18, barW + 48, 30, 6)
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = '#f59e0b'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + barW, y)
  ctx.moveTo(x, y - 4)
  ctx.lineTo(x, y + 4)
  ctx.moveTo(x + barW, y - 4)
  ctx.lineTo(x + barW, y + 4)
  ctx.stroke()
  ctx.fillStyle = '#e2e8f0'
  ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(label || `${Math.round(worldLength)}`, x + barW + 8, y)
  ctx.restore()
}

export function drawWorldBoundary(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: 'dark' | 'light' = 'dark'
) {
  ctx.save()
  ctx.strokeStyle = theme === 'dark' ? 'rgba(45, 212, 191, 0.35)' : 'rgba(15, 118, 110, 0.4)'
  ctx.lineWidth = 2
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1)
  ctx.restore()
}
