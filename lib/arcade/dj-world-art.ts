import type { DJChapter } from './dj-world-tour'

/** Original vector backdrop art: no club logos, photos or scraped imagery. */
export function drawDJChapterScenery(
  ctx: CanvasRenderingContext2D,
  chapter: DJChapter,
  cam: number,
  time: number,
  width: number,
) {
  const ibiza = chapter.id === 'amnesia'
  ctx.save()

  if (ibiza) {
    // Mediterranean horizon, foam and rolling turquoise water.
    const sea = ctx.createLinearGradient(0, 242, 0, 365)
    sea.addColorStop(0, '#2cc4cf')
    sea.addColorStop(1, '#155b94')
    ctx.fillStyle = sea
    ctx.fillRect(0, 244, width, 121)
    ctx.fillStyle = '#ffffff66'
    for (let i = 0; i < 15; i++) {
      const x = ((i * 93 - cam * 0.18) % (width + 100) + width + 100) % (width + 100)
      const y = 272 + i % 4 * 20
      ctx.fillRect(x, y, 29 + i % 3 * 11, 2)
    }
    ctx.fillStyle = '#ffe1a0'
    ctx.beginPath(); ctx.arc(664, 80, 41, 0, Math.PI * 2); ctx.fill()
  } else if (chapter.id === 'eos') {
    // Santa Barbara coast at dusk: fictionalized American Riviera layering.
    // Shoreline and mountains are scenic silhouettes, not geographic data.
    ctx.fillStyle = '#ffdaa2'
    ctx.beginPath(); ctx.arc(670, 106, 44, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#3a5877'
    ctx.beginPath(); ctx.moveTo(0, 258)
    for (let x = 0; x <= width + 40; x += 40) {
      ctx.lineTo(x, 164 + 28 * Math.sin(x / 90) + 16 * Math.sin(x / 40))
    }
    ctx.lineTo(width, 287); ctx.lineTo(0, 287); ctx.fill()
    const ocean = ctx.createLinearGradient(0, 248, 0, 365)
    ocean.addColorStop(0, '#499fc1'); ocean.addColorStop(1, '#244e8c')
    ctx.fillStyle = ocean; ctx.fillRect(0, 264, width, 102)
    ctx.fillStyle = '#ffeac894'
    for (let i = 0; i < 16; i++) {
      const x = ((i * 94 - cam * 0.13) % (width + 130) + width + 130) % (width + 130)
      ctx.fillRect(x, 278 + (i % 5) * 16, 20 + i % 4 * 10, 2)
    }
  } else if (chapter.id === 'whisky') {
    // Sunset Strip sunset and hill silhouettes.
    ctx.fillStyle = '#f9ad6073'
    ctx.beginPath(); ctx.arc(670, 99, 55, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#25182f'
    ctx.beginPath(); ctx.moveTo(0, 252)
    for (let x = 0; x <= width + 30; x += 55) ctx.lineTo(x, 214 + (Math.sin(x / 71) + 1) * 19)
    ctx.lineTo(width, 340); ctx.lineTo(0, 340); ctx.fill()
  } else if (chapter.id === 'fabric') {
    ctx.fillStyle = '#9fb8d444'
    for (let x = 0; x < width; x += 30) {
      const fall = (x + Math.round(cam * 0.2)) % 29
      ctx.fillRect(x + fall, 20 + (x * 7) % 80, 1.5, 48)
    }
  } else if (chapter.id === 'tresor') {
    ctx.strokeStyle = '#c4b5fd1f'; ctx.lineWidth = 1
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 45); ctx.lineTo(x + 100, 357); ctx.stroke()
    }
  }

  // Place each illustrated landmark at a parallax coordinate. The world is a
  // playable collage, not an implied navigable road or a real map.
  for (const landmark of chapter.scenery) {
    const x = landmark.x - cam * 0.83
    if (x < -180 || x > width + 180) continue
    ctx.save()
    ctx.translate(x, 0)
    const drawRect = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color; ctx.fillRect(x, y, w, h)
    }
    const roof = '#fef3c7'
    switch (landmark.kind) {
      case 'islet': {
        const rock = ctx.createLinearGradient(-90, 125, 80, 300)
        rock.addColorStop(0, '#b6a38d'); rock.addColorStop(1, '#646b71')
        ctx.fillStyle = rock
        ctx.beginPath(); ctx.moveTo(-116, 265); ctx.lineTo(-77, 219)
        ctx.lineTo(-38, 155); ctx.lineTo(1, 136); ctx.lineTo(31, 191)
        ctx.lineTo(57, 223); ctx.lineTo(106, 267); ctx.closePath(); ctx.fill()
        drawRect(-106, 266, 222, 3, '#d8f4fb88')
        break
      }
      case 'cove': {
        ctx.fillStyle = '#dec58a'
        ctx.beginPath(); ctx.ellipse(0, 322, 100, 16, -0.1, Math.PI, Math.PI * 2); ctx.fill()
        drawRect(-12, 270, 4, 31, roof)
        ctx.fillStyle = '#fffdf0'
        ctx.beginPath(); ctx.moveTo(-9, 271); ctx.lineTo(21, 300); ctx.lineTo(-9, 300); ctx.fill()
        drawRect(-27, 301, 50, 5, '#fef08a')
        break
      }
      case 'old-town': {
        // Dalt Vila-inspired terraced whitewashed hill city and walls.
        ctx.fillStyle = '#bd9f80'
        ctx.beginPath(); ctx.moveTo(-130, 335); ctx.lineTo(-95, 255); ctx.lineTo(-40, 227)
        ctx.lineTo(26, 177); ctx.lineTo(107, 232); ctx.lineTo(135, 335); ctx.fill()
        for (let i = 0; i < 12; i++) {
          const step = i % 5
          drawRect(-103 + i * 20, 244 - (i % 4) * 24 + step * 7, 24, 34, i % 3 ? '#fff7df' : '#eee3d0')
          drawRect(-93 + i * 20, 258 - (i % 4) * 24 + step * 7, 5, 7, '#3d6d8f')
        }
        drawRect(-25, 151, 55, 71, '#f5e6d2')
        drawRect(-32, 146, 69, 9, '#bb806b')
        break
      }
      case 'salt-flats': {
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = i % 2 ? '#fff4da77' : '#ddf4edbb'
          ctx.fillRect(-111 + (i % 2) * 110, 271 + Math.floor(i / 2) * 31, 106, 28)
        }
        ctx.strokeStyle = '#ffffffaa'; ctx.lineWidth = 3
        ctx.strokeRect(-110, 271, 216, 64)
        break
      }
      case 'palm': {
        for (const dx of [-54, 37]) {
          ctx.strokeStyle = '#66432f'; ctx.lineWidth = 9
          ctx.beginPath(); ctx.moveTo(dx, 340); ctx.quadraticCurveTo(dx + 16, 258, dx + 8, 220); ctx.stroke()
          for (let i = 0; i < 7; i++) {
            const angle = -Math.PI + i * Math.PI / 6
            ctx.strokeStyle = '#226d63'; ctx.lineWidth = 6
            ctx.beginPath(); ctx.moveTo(dx + 8, 220)
            ctx.quadraticCurveTo(dx + 8 + Math.cos(angle) * 39, 200 + Math.sin(angle) * 39, dx + 8 + Math.cos(angle) * 75, 243 + Math.sin(angle) * 24)
            ctx.stroke()
          }
        }
        break
      }
      case 'hills': {
        ctx.fillStyle = ibiza ? '#536e54' : '#4a3650'
        ctx.beginPath(); ctx.moveTo(-125, 325)
        ctx.lineTo(-78, 250); ctx.lineTo(-31, 265); ctx.lineTo(17, 204)
        ctx.lineTo(70, 243); ctx.lineTo(125, 330); ctx.fill()
        break
      }
      case 'sunset': {
        ctx.fillStyle = '#fbbf2488'
        ctx.beginPath(); ctx.arc(0, 169, 41, 0, Math.PI * 2); ctx.fill()
        for (let i = 0; i < 5; i++) drawRect(-91 + i * 42, 283 - i * 9, 35, 67 + i * 9, '#2f243e')
        break
      }
      case 'skyline': {
        for (let i = 0; i < 7; i++) {
          const height = 57 + (i * 39 % 105)
          drawRect(-112 + i * 32, 339 - height, 30, height, '#1b1a40')
          if (i % 2 === 1) drawRect(-101 + i * 32, 350 - height, 6, 10, '#fbbf2488')
        }
        break
      }
      case 'billboards': {
        for (let i = 0; i < 3; i++) {
          drawRect(-110 + i * 81, 218 - i % 2 * 22, 73, 63, '#18152d')
          ctx.strokeStyle = i % 2 ? '#fbbf24' : '#f472b6'
          ctx.lineWidth = 3; ctx.strokeRect(-110 + i * 81, 218 - i % 2 * 22, 73, 63)
          drawRect(-80 + i * 81, 281 - i % 2 * 22, 8, 52 + i % 2 * 22, '#2e2642')
          ctx.fillStyle = '#ffe6f6'; ctx.textAlign = 'center'; ctx.font = 'bold 12px monospace'
          ctx.fillText(['LIVE', 'ROCK', 'DJ'][i], -73 + i * 81, 254 - i % 2 * 22)
        }
        break
      }
      case 'bridge': {
        drawRect(-124, 292, 255, 12, '#1b263f')
        for (const px of [-84, 81]) {
          drawRect(px, 207, 25, 102, '#283952')
          drawRect(px - 8, 200, 41, 16, '#51627f')
        }
        ctx.strokeStyle = '#98b6d1'; ctx.lineWidth = 3
        ctx.beginPath(); ctx.moveTo(-124, 266); ctx.quadraticCurveTo(0, 340, 130, 266); ctx.stroke()
        break
      }
      case 'clocktower': {
        drawRect(-42, 167, 84, 168, '#3d475c')
        drawRect(-34, 158, 68, 18, '#798399')
        drawRect(-11, 110, 22, 50, '#3d475c')
        ctx.fillStyle = '#fff0cd'; ctx.beginPath(); ctx.arc(0, 202, 24, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = '#3d475c'; ctx.lineWidth = 3
        ctx.beginPath(); ctx.moveTo(0, 202); ctx.lineTo(0, 185); ctx.moveTo(0, 202); ctx.lineTo(12, 208); ctx.stroke()
        break
      }
      case 'tube': {
        drawRect(-97, 253, 195, 82, '#203047')
        drawRect(-86, 265, 169, 38, '#3f647e')
        for (let i = 0; i < 4; i++) drawRect(-73 + i * 40, 273, 25, 20, '#b8cddd')
        ctx.strokeStyle = '#ed697d'; ctx.lineWidth = 8
        ctx.beginPath(); ctx.arc(0, 236, 23, 0, Math.PI * 2); ctx.stroke()
        drawRect(-28, 229, 56, 14, '#296894')
        break
      }
      case 'tower': {
        ctx.strokeStyle = '#98a3b6'; ctx.lineWidth = 8
        ctx.beginPath(); ctx.moveTo(0, 327); ctx.lineTo(0, 108); ctx.stroke()
        drawRect(-7, 90, 14, 20, '#9299af')
        ctx.fillStyle = '#aab3c4'; ctx.beginPath(); ctx.ellipse(0, 169, 49, 25, 0, 0, Math.PI * 2); ctx.fill()
        drawRect(-37, 178, 74, 12, '#56627b')
        break
      }
      case 'wall': {
        for (let i = 0; i < 8; i++) {
          const x = -119 + i * 30
          drawRect(x, 241, 28, 96, i % 2 ? '#777b81' : '#87898d')
          drawRect(x + 7, 265 + (i % 3) * 13, 12, 8, i % 2 ? '#f472b6' : '#38bdf8')
        }
        break
      }
      case 'wharf': {
        // Fantasy pier with timber supports and a white/red-roofed sea shop.
        drawRect(-125, 283, 250, 12, '#ab7152')
        for (let i = 0; i < 8; i++) drawRect(-113 + i * 32, 295, 10, 51, '#735144')
        drawRect(-62, 212, 123, 71, '#fff2db')
        ctx.fillStyle = '#b8675a'
        ctx.beginPath(); ctx.moveTo(-72, 214); ctx.lineTo(0, 177)
        ctx.lineTo(70, 214); ctx.closePath(); ctx.fill()
        for (let i = 0; i < 3; i++) {
          drawRect(-45 + i * 35, 234, 21, 30, '#417b9c')
          drawRect(-43 + i * 35, 236, 17, 3, '#dbeafe')
        }
        ctx.strokeStyle = '#ffead9'; ctx.lineWidth = 3
        ctx.beginPath(); ctx.moveTo(-125, 282); ctx.lineTo(125, 282); ctx.stroke()
        break
      }
      case 'coast': {
        // Cabana, striped beach umbrellas and shore palms.
        drawRect(-120, 319, 240, 23, '#e5bb8f')
        for (let i = 0; i < 3; i++) {
          const px = -83 + i * 78
          drawRect(px, 249, 4, 70, '#8e6b5a')
          ctx.fillStyle = i % 2 ? '#fba6a0' : '#ffe2ba'
          ctx.beginPath(); ctx.moveTo(px - 35, 268)
          ctx.quadraticCurveTo(px + 2, 204, px + 38, 268); ctx.fill()
          drawRect(px - 23, 316, 42, 3, '#fff4da')
        }
        break
      }
      case 'red-roofs': {
        // Generic downtown Spanish Colonial Revival-inspired rooftops.
        for (let i = 0; i < 4; i++) {
          const bx = -113 + i * 58
          const by = 232 + (i % 2) * 21
          drawRect(bx, by, 57, 336 - by, i % 2 ? '#fff3de' : '#f5e5d3')
          ctx.fillStyle = '#b85e50'
          ctx.beginPath(); ctx.moveTo(bx - 4, by)
          ctx.lineTo(bx + 28, by - 25); ctx.lineTo(bx + 62, by)
          ctx.closePath(); ctx.fill()
          drawRect(bx + 18, by + 32, 13, 29, '#497b9d')
          ctx.strokeStyle = '#fff6ee'; ctx.lineWidth = 2
          ctx.strokeRect(bx + 18, by + 32, 13, 29)
        }
        break
      }
      case 'courthouse': {
        // Inspired by the city's Spanish Colonial Revival courthouse tower.
        drawRect(-112, 259, 224, 84, '#fff2de')
        drawRect(-39, 164, 78, 175, '#f5e6d2')
        drawRect(-45, 157, 90, 13, '#bc6b5c')
        ctx.fillStyle = '#c9765a'
        ctx.beginPath(); ctx.moveTo(-48, 158)
        ctx.lineTo(0, 121); ctx.lineTo(48, 158); ctx.fill()
        for (const dx of [-24, 13]) {
          drawRect(dx, 180, 13, 29, '#376688')
          drawRect(dx, 242, 13, 20, '#376688')
        }
        ctx.fillStyle = '#fdf5e6'
        ctx.beginPath(); ctx.arc(0, 226, 19, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = '#48758b'; ctx.lineWidth = 3
        ctx.beginPath(); ctx.arc(0, 226, 19, 0, Math.PI * 2)
        ctx.moveTo(0, 226); ctx.lineTo(0, 214)
        ctx.moveTo(0, 226); ctx.lineTo(10, 231); ctx.stroke()
        for (let i = 0; i < 4; i++) drawRect(-92 + i * 50, 291, 21, 34, '#45758b')
        break
      }
      case 'patio': {
        // Original garden-party finale art; not a replica of EOS branding.
        drawRect(-113, 239, 226, 102, '#f6e8db')
        drawRect(-118, 220, 236, 22, '#db8697')
        for (const dx of [-90, 86]) {
          drawRect(dx, 233, 8, 94, '#4e8e79')
          ctx.fillStyle = '#2b8968'
          for (let i = 0; i < 3; i++) {
            ctx.beginPath(); ctx.arc(dx + (i - 1) * 15, 238 - i * 14, 19, 0, Math.PI * 2); ctx.fill()
          }
        }
        ctx.strokeStyle = '#ffebca'; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(-118, 215)
        ctx.quadraticCurveTo(0, 239, 116, 215); ctx.stroke()
        ctx.fillStyle = '#f6daab'
        for (let i = 0; i < 7; i++) {
          ctx.beginPath(); ctx.arc(-101 + i * 34, 223 + 5 * Math.sin(i), 4, 0, Math.PI * 2); ctx.fill()
        }
        ctx.fillStyle = '#ca8ebf'
        ctx.beginPath(); ctx.arc(0, 204, 21, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = '#f7e9ff'; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(-15, 194); ctx.lineTo(14, 213)
        ctx.moveTo(-15, 212); ctx.lineTo(14, 194); ctx.stroke()
        break
      }
      case 'warehouse': {
        drawRect(-120, 230, 240, 110, '#253246')
        for (let i = 0; i < 4; i++) {
          drawRect(-101 + i * 57, 258, 40, 52, '#40516a')
          drawRect(-96 + i * 57, 264, 30, 4, '#93c5fd66')
        }
        drawRect(-128, 214, 256, 18, '#6c7381')
        break
      }
    }

    const glow = 0.75 + (Math.sin(time * 1.4 + landmark.x) + 1) * 0.08
    ctx.globalAlpha = glow
    ctx.fillStyle = '#11162dcf'
    ctx.fillRect(-119, 342, 238, 18)
    ctx.textAlign = 'center'
    ctx.font = 'bold 12px sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(landmark.name.toUpperCase(), 0, 354, 230)
    ctx.restore()
  }
  ctx.restore()
}
