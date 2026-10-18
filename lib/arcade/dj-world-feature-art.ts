import { getFeatureRect, type DJWorldFeature } from './dj-world-events'

/** Original EOS Santa Barbara set pieces: all vector, no venue assets. */
export function drawDJWorldFeatures(
  ctx: CanvasRenderingContext2D,
  features: readonly DJWorldFeature[],
  cameraX: number,
  time: number,
  collected: ReadonlySet<string>,
) {
  ctx.save()
  for (const feature of features) {
    if (collected.has(feature.id)) continue
    const position = getFeatureRect(feature, time)
    const x = position.x - cameraX
    if (x + position.w < -50 || x > 870) continue
    ctx.save()
    ctx.translate(x, position.y)
    if (feature.kind === 'launch-pad') {
      // Jump-boost stripes and a pulsing spring coil.
      ctx.fillStyle = '#e2a86e'; ctx.fillRect(0, 4, feature.w, 8)
      ctx.fillStyle = '#ffe2a4'; ctx.fillRect(3, 0, feature.w - 6, 7)
      for (let dx = 8; dx < feature.w - 3; dx += 12) {
        ctx.strokeStyle = '#ef4e96'; ctx.lineWidth = 3
        ctx.beginPath(); ctx.moveTo(dx, 2); ctx.lineTo(dx + 5, 6); ctx.stroke()
      }
      ctx.fillStyle = '#fff7df'; ctx.textAlign = 'center'
      ctx.font = 'bold 11px sans-serif'
      ctx.fillText('BOUNCE!', feature.w / 2, -12)
      ctx.strokeStyle = '#ffe2a4'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(feature.w / 2 - 6, -10); ctx.lineTo(feature.w / 2, -17)
      ctx.lineTo(feature.w / 2 + 6, -10); ctx.stroke()
    } else if (feature.kind === 'surf-hazard') {
      // The crest is entirely within the collision rectangle.
      const crest = 4 * Math.sin(time * 8)
      ctx.fillStyle = '#0f7f9f'; ctx.fillRect(0, 11, feature.w, feature.h - 11)
      ctx.fillStyle = '#b9f9ff'
      ctx.beginPath(); ctx.moveTo(0, 16)
      ctx.quadraticCurveTo(feature.w * 0.36, crest - 2, feature.w * 0.69, 10)
      ctx.quadraticCurveTo(feature.w * 0.85, crest + 2, feature.w, 5)
      ctx.lineTo(feature.w, 19); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = '#f3f4f6'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(5, 12); ctx.quadraticCurveTo(feature.w / 2, 0, feature.w - 4, 12); ctx.stroke()
    } else if (feature.kind === 'record-crate') {
      // Independent bonus item; clearly different from ordinary vinyl pickups.
      ctx.fillStyle = '#97613a'; ctx.fillRect(0, 12, feature.w, feature.h - 12)
      ctx.strokeStyle = '#ffdc96'; ctx.lineWidth = 3; ctx.strokeRect(2, 12, feature.w - 4, feature.h - 12)
      ctx.fillStyle = '#f5dfb8'; ctx.fillRect(-2, 4, feature.w + 4, 10)
      ctx.fillStyle = '#1c1230'; ctx.beginPath(); ctx.arc(feature.w / 2, 7, 13, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3; ctx.stroke()
      ctx.fillStyle = '#fbbf24'; ctx.fillRect(feature.w / 2 - 2, 5, 4, 4)
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 10px sans-serif'; ctx.fillText('+500 VINYL', feature.w / 2, -18)
    } else if (feature.kind === 'patio-lights') {
      // Original garden strings and rotating mini disco balls.
      ctx.strokeStyle = '#fee2af'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(0, 10)
      ctx.quadraticCurveTo(feature.w / 2, 48, feature.w, 10)
      ctx.stroke()
      for (let i = 0; i < 9; i++) {
        const lampX = (i / 8) * feature.w
        const lampY = 10 + Math.sin(Math.PI * i / 8) * 19
        ctx.globalAlpha = 0.65 + 0.28 * Math.abs(Math.sin(time * 2 + i))
        ctx.fillStyle = i % 2 ? '#f8b4cd' : '#fde68a'
        ctx.beginPath(); ctx.arc(lampX, lampY, 4.5, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(feature.w / 2, 5); ctx.lineTo(feature.w / 2, 38); ctx.stroke()
      ctx.fillStyle = '#c4b5fd'; ctx.beginPath()
      ctx.arc(feature.w / 2, 46, 12, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.fillRect(feature.w / 2 - 4, 44, 8, 3)
    }
    ctx.restore()
  }
  ctx.restore()
}
