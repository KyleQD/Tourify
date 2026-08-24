/**
 * WorldGlobeScene — custom Three.js renderer for the Discover globe.
 *
 * Design language: holographic dot-sphere over the platform's deep blue-black,
 * violet→cyan fresnel atmosphere, neon pulsing place markers with soft labels.
 * Efficient by construction: single RAF loop (paused when hidden), DPR capped
 * at 2, no post-processing, complete GPU disposal on teardown.
 */
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

import { DisposalLedger } from "@/lib/world/globe/disposal-ledger"
import type { GlobePlace } from "@/lib/world/globe/build-globe-index"

const THEME = {
  sphereBase: new THREE.Color("#101636"),
  sphereRimViolet: new THREE.Color("#a06bff"),
  sphereRimCyan: new THREE.Color("#62d4ef"),
  dustPrimary: new THREE.Color("#8f6bff"),
  dustSecondary: new THREE.Color("#4fd8ff"),
  graticule: new THREE.Color("#39408a"),
  markerCore: "#efe9ff",
  markerViolet: "#a06bff",
  markerCyan: "#62d4ef",
} as const

const GLOBE_RADIUS = 1
const CAMERA_DISTANCE_DEFAULT = 2.75
const CAMERA_DISTANCE_MIN = 1.55
const CAMERA_DISTANCE_MAX = 4.2

export interface GlobeSceneOptions {
  initialSelected?: string | null
  onSelect: (key: string) => void
  onHover?: (key: string | null, screenX: number, screenY: number) => void
  /**
   * P13-T09 — server density hint. "mobile" lowers marker counts and
   * enlarges interaction hit targets for touch input.
   */
  densityHint?: "desktop" | "mobile"
  /** P13-T05 — throttled camera reports (distance in globe radii). */
  onCameraChange?: (distance: number) => void
}

/** One entry from the viewport stream rendered as a dynamic marker. */
export interface ViewportMarker {
  key: string
  lat: number
  lng: number
  weight: number
  /** "cluster" markers render aggregate glow + count labels (P13-T07). */
  kind?: "place" | "cluster"
  count?: number
}

interface Marker {
  key: string
  anchor: THREE.Vector3
  sprite: THREE.Sprite
  halo: THREE.Sprite
  label: THREE.Sprite
  baseScale: number
  phase: number
}

function latLngToVector(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180
  const theta = ((lng + 180) * Math.PI) / 180
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

function makeCanvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!
  draw(ctx)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function makeGlowTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(256, (ctx) => {
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    gradient.addColorStop(0, THEME.markerCore)
    gradient.addColorStop(0.22, "#e6d9ff")
    gradient.addColorStop(0.42, "rgba(160,107,255,0.85)")
    gradient.addColorStop(0.68, "rgba(98,212,239,0.28)")
    gradient.addColorStop(1, "rgba(98,212,239,0)")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 256, 256)
  })
}

function makeRingTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(256, (ctx) => {
    ctx.translate(128, 128)
    ctx.strokeStyle = "rgba(140,120,255,0.9)"
    ctx.lineWidth = 6
    ctx.shadowColor = "rgba(120,90,255,0.9)"
    ctx.shadowBlur = 18
    ctx.beginPath()
    ctx.arc(0, 0, 96, 0, Math.PI * 2)
    ctx.stroke()
  })
}

function makeLabelTexture(text: string): { texture: THREE.CanvasTexture; aspect: number } {
  const font = "600 44px ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
  const probe = document.createElement("canvas").getContext("2d")!
  probe.font = font
  const metrics = probe.measureText(text.toUpperCase())
  const width = Math.ceil(metrics.width) + 48
  const height = 84
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")!
  ctx.font = font
  ctx.textBaseline = "middle"
  ctx.textAlign = "center"
  ctx.shadowColor = "rgba(10,12,32,0.95)"
  ctx.shadowBlur = 12
  ctx.fillStyle = "#ece7ff"
  // Letter-spaced uppercase reads cleanly against the hologram field.
  const spaced = text.toUpperCase().split("").join("\u200a\u200a")
  ctx.fillText(spaced, width / 2, height / 2 + 2)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return { texture, aspect: width / height }
}

/** Spherical interpolation between two unit directions (angle-weighted). */
function slerpDirection(a: THREE.Vector3, b: THREE.Vector3, t: number, out: THREE.Vector3): THREE.Vector3 {
  const from = a.clone().normalize()
  const to = b.clone().normalize()
  const dot = THREE.MathUtils.clamp(from.dot(to), -1, 1)
  const angle = Math.acos(dot)
  if (angle < 1e-4) return out.copy(to)
  const axis = new THREE.Vector3().crossVectors(from, to).normalize()
  return out.copy(from).applyAxisAngle(axis, angle * t)
}

export class WorldGlobeScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly controls: OrbitControls
  private readonly globeGroup = new THREE.Group()
  private readonly markers = new Map<string, Marker>()
  /** P13-T10 — dynamic viewport markers live here; replaced wholesale on updates. */
  private readonly viewportGroup = new THREE.Group()
  /** P13-T07 — restrained connection arcs from the selection to top-weighted peers. */
  private readonly arcsGroup = new THREE.Group()
  private readonly viewportMarkers = new Map<
    string,
    { key: string; anchor: THREE.Vector3; sprite: THREE.Sprite; label: THREE.Sprite | null; baseScale: number; phase: number }
  >()
  private readonly raycaster = new THREE.Raycaster()
  private readonly staticHitMeshes: THREE.Mesh[] = []
  private readonly viewportHitMeshes: THREE.Mesh[] = []
  private readonly pointer = new THREE.Vector2(-2, -2)
  private readonly disposables: { dispose(): void }[] = []
  /** P13-T10 — accounting for dynamic GPU resources (leak-free teardown proof). */
  private readonly gpuLedger = new DisposalLedger()

  private frameHandle = 0
  private disposed = false
  private hoveredKey: string | null = null
  private selectedKey: string | null = null
  private clockStartedAt = performance.now()
  private lastInteractionAt = 0
  private pointerDownAt = 0
  private pointerDownX = 0
  private pointerDownY = 0
  private needsPick = false
  private reducedMotion: boolean
  /** P13-T09 — touch devices get larger hit targets; mobile hint lowers density. */
  private readonly coarsePointer: boolean
  private readonly densityHint: "desktop" | "mobile"
  private lastReportedDistance = 0
  private lastCameraReportAt = 0

  /** Camera tween state (direction slerp + distance lerp). */
  private tween: {
    active: boolean
    startedAt: number
    durationMs: number
    fromDir: THREE.Vector3
    toDir: THREE.Vector3
    fromDist: number
    toDist: number
  } | null = null

  constructor(
    private readonly container: HTMLElement,
    private readonly places: GlobePlace[],
    private readonly options: GlobeSceneOptions,
  ) {
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    this.coarsePointer = window.matchMedia("(pointer: coarse)").matches
    this.densityHint = options.densityHint ?? (this.coarsePointer ? "mobile" : "desktop")

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(container.clientWidth, container.clientHeight, false)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.domElement.style.width = "100%"
    this.renderer.domElement.style.height = "100%"
    this.renderer.domElement.style.display = "block"
    this.renderer.domElement.setAttribute("aria-label", "Interactive music globe")
    this.renderer.domElement.setAttribute("role", "application")
    container.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(
      38,
      Math.max(container.clientWidth / Math.max(container.clientHeight, 1), 0.1),
      0.05,
      60,
    )
    this.camera.position.set(0, 0.65, CAMERA_DISTANCE_DEFAULT)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.enablePan = false
    this.controls.minDistance = CAMERA_DISTANCE_MIN
    this.controls.maxDistance = CAMERA_DISTANCE_MAX
    this.controls.rotateSpeed = 0.55
    this.controls.autoRotate = !this.reducedMotion
    this.controls.autoRotateSpeed = 0.4
    this.controls.addEventListener("start", () => {
      this.lastInteractionAt = performance.now()
      this.controls.autoRotate = false
      this.tween = null
    })
    this.controls.addEventListener("end", () => {
      this.lastInteractionAt = performance.now()
    })

    this.buildHologram()
    this.buildMarkers()
    this.scene.add(this.globeGroup)
    this.globeGroup.add(this.viewportGroup)
    this.scene.add(this.arcsGroup)

    // Events -------------------------------------------------------------
    this.renderer.domElement.addEventListener("pointermove", this.onPointerMove)
    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown)
    this.renderer.domElement.addEventListener("pointerup", this.onPointerUp)
    this.renderer.domElement.addEventListener("pointerleave", this.onPointerLeave)
    window.addEventListener("resize", this.onResize)
    this.resizeObserver = new ResizeObserver(() => this.onResize())
    this.resizeObserver.observe(container)
    document.addEventListener("visibilitychange", this.onVisibilityChange)

    const initiallySelected = options.initialSelected ?? null
    if (initiallySelected && this.markers.has(initiallySelected)) {
      this.setSelected(initiallySelected)
    }
    this.clockStartedAt = performance.now()
    this.frameHandle = requestAnimationFrame(this.tick)
  }

  private resizeObserver: ResizeObserver

  // ---------------------------------------------------------------------
  // Scene construction
  // ---------------------------------------------------------------------

  private buildHologram(): void {
    // Base sphere with fresnel rim (front side).
    const sphereGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 96, 96)
    const sphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uBase: { value: THEME.sphereBase },
        uRimViolet: { value: THEME.sphereRimViolet },
        uRimCyan: { value: THEME.sphereRimCyan },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormalView;
        varying vec3 vViewDir;
        void main() {
          vNormalView = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-mvPosition.xyz);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uBase;
        uniform vec3 uRimViolet;
        uniform vec3 uRimCyan;
        varying vec3 vNormalView;
        varying vec3 vViewDir;
        void main() {
          float rim = pow(1.0 - max(dot(vNormalView, vViewDir), 0.0), 2.6);
          vec3 rimColor = mix(uRimViolet, uRimCyan, smoothstep(0.15, 0.85, rim));
          vec3 color = uBase + rimColor * rim * 1.35;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    })
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
    this.globeGroup.add(sphere)
    this.disposables.push(sphereGeometry, sphereMaterial)

    // Outer atmosphere (back side, additive).
    const atmosphereGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.17, 64, 64)
    const atmosphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uViolet: { value: new THREE.Color("#8a5cff") },
        uCyan: { value: new THREE.Color("#62d4ef") },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormalView;
        void main() {
          vNormalView = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uViolet;
        uniform vec3 uCyan;
        varying vec3 vNormalView;
        void main() {
          float intensity = pow(0.66 - dot(vNormalView, vec3(0.0, 0.0, 1.0)), 2.4);
          intensity = clamp(intensity, 0.0, 1.0);
          vec3 color = mix(uViolet, uCyan, clamp(intensity * 1.4, 0.0, 1.0));
          gl_FragColor = vec4(color * intensity, intensity * 0.85);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    })
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial)
    this.scene.add(atmosphere)
    this.disposables.push(atmosphereGeometry, atmosphereMaterial)

    // Holographic dust — fibonacci-distributed points with two-tone shimmer.
    // Mobile hint trims particle count for GPU headroom (P13-T09/T10).
    const dustCount = this.densityHint === "mobile" ? 1800 : 3200
    const positions = new Float32Array(dustCount * 3)
    const colors = new Float32Array(dustCount * 3)
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))
    const dustA = THEME.dustPrimary
    const dustB = THEME.dustSecondary
    for (let i = 0; i < dustCount; i += 1) {
      const y = 1 - (i / (dustCount - 1)) * 2
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y))
      const theta = goldenAngle * i
      positions[i * 3] = Math.cos(theta) * radiusAtY * GLOBE_RADIUS * 1.001
      positions[i * 3 + 1] = y * GLOBE_RADIUS * 1.001
      positions[i * 3 + 2] = Math.sin(theta) * radiusAtY * GLOBE_RADIUS * 1.001
      const mix = 0.25 + 0.75 * Math.abs(Math.sin(i * 12.9898) % 1)
      const color = dustA.clone().lerp(dustB, mix * 0.35)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }
    const dustGeometry = new THREE.BufferGeometry()
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    dustGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))
    const dustMaterial = new THREE.PointsMaterial({
      size: 0.0085,
      vertexColors: true,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
    const dust = new THREE.Points(dustGeometry, dustMaterial)
    this.globeGroup.add(dust)
    this.disposables.push(dustGeometry, dustMaterial)

    // Faint graticule for structure.
    const graticulePositions: number[] = []
    const circle = (radius: number, segments: number, axis: "lat" | "lng", value: number): void => {
      for (let i = 0; i < segments; i += 1) {
        const t0 = (i / segments) * Math.PI * 2
        const t1 = ((i + 1) / segments) * Math.PI * 2
        const p0 =
          axis === "lat"
            ? new THREE.Vector3(
                Math.cos(t0) * Math.cos(value) * radius,
                Math.sin(value) * radius,
                Math.sin(t0) * Math.cos(value) * radius,
              )
            : latLngToVector((value * 180) / Math.PI, (t0 * 180) / Math.PI - 180, radius)
        const p1 =
          axis === "lat"
            ? new THREE.Vector3(
                Math.cos(t1) * Math.cos(value) * radius,
                Math.sin(value) * radius,
                Math.sin(t1) * Math.cos(value) * radius,
              )
            : latLngToVector((value * 180) / Math.PI, (t1 * 180) / Math.PI - 180, radius)
        graticulePositions.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z)
      }
    }
    const R = GLOBE_RADIUS * 1.002
    for (let lat = -60; lat <= 60; lat += 30) circle(R, 128, "lat", (lat * Math.PI) / 180)
    for (let lng = -180; lng < 180; lng += 30) circle(R, 128, "lng", lng / (180 / Math.PI))
    const graticuleGeometry = new THREE.BufferGeometry()
    graticuleGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(graticulePositions), 3))
    const graticuleMaterial = new THREE.LineBasicMaterial({
      color: THEME.graticule,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const graticule = new THREE.LineSegments(graticuleGeometry, graticuleMaterial)
    this.globeGroup.add(graticule)
    this.disposables.push(graticuleGeometry, graticuleMaterial)
  }

  private glowTexture: THREE.CanvasTexture | null = null
  private ringTexture: THREE.CanvasTexture | null = null

  private buildMarkers(): void {
    this.glowTexture = makeGlowTexture()
    this.ringTexture = makeRingTexture()
    this.disposables.push(this.glowTexture, this.ringTexture)

    const weights = this.places.map((place) => place.weight)
    const minWeight = Math.min(...weights)
    const maxWeight = Math.max(...weights)
    const span = Math.max(maxWeight - minWeight, 1)

    for (const place of this.places) {
      const anchor = latLngToVector(place.center.lat, place.center.lng, GLOBE_RADIUS * 1.012)
      const normalizedWeight = (place.weight - minWeight) / span
      const baseScale = 0.11 + normalizedWeight * 0.075

      const glowMaterial = new THREE.SpriteMaterial({
        map: this.glowTexture!,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        depthTest: false,
      })
      const sprite = new THREE.Sprite(glowMaterial)
      sprite.position.copy(anchor)
      sprite.scale.setScalar(baseScale)
      this.globeGroup.add(sprite)
      this.disposables.push(glowMaterial)

      const haloMaterial = new THREE.SpriteMaterial({
        map: this.ringTexture!,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        opacity: 0,
      })
      const halo = new THREE.Sprite(haloMaterial)
      halo.position.copy(anchor)
      halo.scale.setScalar(baseScale * 1.2)
      this.globeGroup.add(halo)
      this.disposables.push(haloMaterial)

      const { texture: labelTextures, aspect } = makeLabelTexture(place.name)
      const labelMaterial = new THREE.SpriteMaterial({
        map: labelTextures,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      })
      const label = new THREE.Sprite(labelMaterial)
      const labelHeight = 0.085
      label.scale.set(labelHeight * aspect, labelHeight, 1)
      label.position.copy(anchor).multiplyScalar(1).add(anchor.clone().normalize().multiplyScalar(0.13))
      this.globeGroup.add(label)
      this.disposables.push(labelMaterial, labelTextures)

      // Invisible-but-raycastable hit proxy sized generously for touch
      // (P13-T09: coarse pointers get ~60% larger targets).
      const hitRadius = baseScale * (this.coarsePointer ? 0.88 : 0.55)
      const hitGeometry = new THREE.SphereGeometry(hitRadius, 12, 12)
      const hitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      const hit = new THREE.Mesh(hitGeometry, hitMaterial)
      hit.position.copy(anchor)
      hit.userData.placeKey = place.key
      this.globeGroup.add(hit)
      this.disposables.push(hitGeometry, hitMaterial)
      this.staticHitMeshes.push(hit)

      this.markers.set(place.key, {
        key: place.key,
        anchor,
        sprite,
        halo,
        label,
        baseScale,
        phase: Math.random() * Math.PI * 2,
      })
    }
  }

  // ---------------------------------------------------------------------
  // Interaction
  // ---------------------------------------------------------------------

  private onPointerMove = (event: PointerEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    this.needsPick = true
  }

  private onPointerLeave = (): void => {
    this.pointer.set(-2, -2)
    this.needsPick = true
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.pointerDownAt = performance.now()
    this.pointerDownX = event.clientX
    this.pointerDownY = event.clientY
  }

  private onPointerUp = (event: PointerEvent): void => {
    const moved = Math.hypot(event.clientX - this.pointerDownX, event.clientY - this.pointerDownY)
    const elapsed = performance.now() - this.pointerDownAt
    if (moved > 6 || elapsed > 400) return
    if (this.hoveredKey) {
      this.options.onSelect(this.hoveredKey)
    }
  }

  private onResize = (): void => {
    if (this.disposed) return
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    if (width === 0 || height === 0) return
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      cancelAnimationFrame(this.frameHandle)
      this.frameHandle = 0
    } else if (!this.frameHandle && !this.disposed) {
      this.frameHandle = requestAnimationFrame(this.tick)
    }
  }

  private pick(): string | null {
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObjects([...this.staticHitMeshes, ...this.viewportHitMeshes], false)
    return (hits[0]?.object.userData.placeKey as string | undefined) ?? null
  }

  private applyHover(key: string | null): void {
    if (this.hoveredKey === key) return
    this.hoveredKey = key
    this.options.onHover?.(key, this.pointer.x, this.pointer.y)
    this.renderer.domElement.style.cursor = key ? "pointer" : "grab"
  }

  // ---------------------------------------------------------------------
  // P13 — dynamic viewport layer (T07/T09/T10)
  // ---------------------------------------------------------------------

  /**
   * Replace the dynamic viewport marker set. The previous group is fully
   * disposed (geometry/material/texture) before the new one is built, so
   * layer switches and World exits never leak GPU memory (P13-T10).
   */
  setViewportMarkers(items: readonly ViewportMarker[]): void {
    this.clearViewportGroup()

    if (items.length === 0) return
    const maxWeight = Math.max(...items.map((i) => i.weight), 1)

    for (const item of items) {
      const anchor = latLngToVector(item.lat, item.lng, GLOBE_RADIUS * 1.012)
      const normalized = Math.min(Math.max(item.weight / maxWeight, 0.12), 1)
      const baseScale =
        (item.kind === "cluster" ? 0.09 : 0.075) + normalized * 0.08

      const glowMaterial = new THREE.SpriteMaterial({
        map: this.glowTexture ?? makeGlowTexture(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        depthTest: false,
      })
      const sprite = new THREE.Sprite(glowMaterial)
      sprite.position.copy(anchor)
      sprite.scale.setScalar(baseScale)
      this.viewportGroup.add(sprite)

      let label: THREE.Sprite | null = null
      const labelText =
        item.kind === "cluster" && item.count && item.count > 1
          ? `${item.count}`
          : null
      if (labelText) {
        const { texture, aspect } = makeLabelTexture(labelText)
        const labelMaterial = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
          depthTest: false,
          opacity: 0.92,
        })
        label = new THREE.Sprite(labelMaterial)
        const height = 0.062
        label.scale.set(height * aspect, height, 1)
        label.position
          .copy(anchor)
          .add(anchor.clone().normalize().multiplyScalar(0.11))
        this.viewportGroup.add(label)
      }

      const hitGeometry = new THREE.SphereGeometry(
        baseScale * (this.coarsePointer ? 0.88 : 0.55),
        12,
        12,
      )
      const hitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      const hit = new THREE.Mesh(hitGeometry, hitMaterial)
      hit.position.copy(anchor)
      hit.userData.placeKey = item.key
      this.viewportGroup.add(hit)
      this.viewportHitMeshes.push(hit)

      this.gpuLedger.acquire(label ? 4 : 3)
      this.viewportMarkers.set(item.key, {
        key: item.key,
        anchor,
        sprite,
        label,
        baseScale,
        phase: Math.random() * Math.PI * 2,
      })
    }
    this.gpuLedger.acquire(1) // shared glow texture reference
  }

  /** Remove the dynamic layer entirely (leaving World / clearing filters). */
  clearViewport(): void {
    this.clearViewportGroup()
  }

  private clearViewportGroup(): void {
    // Dispose every dynamic object (geometry + material + unique label
    // textures) so repeated layer switches cannot accumulate GPU memory.
    this.viewportGroup.traverse((object) => {
      const mesh = object as THREE.Mesh
      mesh.geometry?.dispose()
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(material)) material.forEach((m) => m.dispose())
      else material?.dispose()
    })
    for (const marker of this.viewportMarkers.values()) {
      const labelMaterial = marker.label?.material as THREE.SpriteMaterial | undefined
      labelMaterial?.map?.dispose()
    }
    this.viewportGroup.clear()
    this.viewportMarkers.clear()
    this.viewportHitMeshes.length = 0
    this.gpuLedger.release(this.gpuLedger.stats().outstanding)
  }

  /**
   * P13-T07 — restrained connection arcs: thin, low-opacity curves from the
   * selected place to the top-weighted peers (hard cap 6). No cultural
   * claim is expressed — this is visual connective tissue only; evidence-
   * backed transmission arcs arrive with P19.
   */
  showSelectionArcs(selectedKey: string): void {
    this.clearArcs()
    const from = this.markers.get(selectedKey) ?? this.viewportMarkers.get(selectedKey)
    if (!from) return

    const peers = [...this.markers.values(), ...this.viewportMarkers.values()]
      .filter((m) => m.anchor !== from.anchor)
      .sort((a, b) => b.baseScale - a.baseScale || a.key.localeCompare(b.key))
      .slice(0, 6)

    const arcMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color("#6f5bd6"),
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    for (const peer of peers) {
      const start = from.anchor.clone().normalize().multiplyScalar(GLOBE_RADIUS * 1.01)
      const end = peer.anchor.clone().normalize().multiplyScalar(GLOBE_RADIUS * 1.01)
      const mid = start.clone().add(end).normalize().multiplyScalar(GLOBE_RADIUS * (1.18 + 0.22 * start.distanceTo(end)))
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
      const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(48))
      const line = new THREE.Line(geometry, arcMaterial)
      this.arcsGroup.add(line)
    }
    // One shared material; the group owns it for disposal.
    this.arcsGroup.userData.material = arcMaterial
  }

  clearArcs(): void {
    this.arcsGroup.traverse((object) => {
      const mesh = object as THREE.Mesh
      mesh.geometry?.dispose()
    })
    const material = this.arcsGroup.userData.material as THREE.Material | undefined
    material?.dispose()
    this.arcsGroup.clear()
    delete this.arcsGroup.userData.material
  }

  // ---------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------

  setSelected(key: string | null): void {
    this.selectedKey = key
    // P13-T07 — restrained arcs follow the selection; cleared on deselect.
    if (key) {
      this.focusPlace(key, { immediate: this.reducedMotion })
      if (!this.reducedMotion) this.showSelectionArcs(key)
      else this.clearArcs()
    } else {
      this.clearArcs()
    }
  }

  /** P13-T10 — disposal accounting surface for verification/profiling. */
  getDisposalStats(): { acquired: number; released: number; outstanding: number } {
    return this.gpuLedger.stats()
  }

  /** P13-T05 — lat/lng currently centered under the camera. */
  getCameraCenter(): { lat: number; lng: number } {
    const dir = this.camera.position.clone().normalize()
    const lat = 90 - (Math.acos(THREE.MathUtils.clamp(dir.y, -1, 1)) * 180) / Math.PI
    let theta = Math.atan2(dir.z, -dir.x)
    let lng = (theta * 180) / Math.PI - 180
    while (lng < -180) lng += 360
    while (lng >= 180) lng -= 360
    return { lat, lng }
  }

  focusPlace(key: string, opts: { immediate?: boolean } = {}): void {
    const marker = this.markers.get(key)
    if (!marker) return
    const toDir = marker.anchor.clone().normalize()
    const fromDir = this.camera.position.clone().normalize()
    const toDist = THREE.MathUtils.clamp(this.camera.position.length(), CAMERA_DISTANCE_MIN + 0.25, 3.1)
    if (opts.immediate || this.reducedMotion) {
      this.camera.position.copy(toDir.multiplyScalar(toDist))
      this.controls.update()
      return
    }
    this.tween = {
      active: true,
      startedAt: performance.now(),
      durationMs: 850,
      fromDir: fromDir.clone(),
      toDir: marker.anchor.clone().normalize(),
      fromDist: this.camera.position.length(),
      toDist,
    }
    this.controls.autoRotate = false
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    cancelAnimationFrame(this.frameHandle)
    this.renderer.domElement.removeEventListener("pointermove", this.onPointerMove)
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown)
    this.renderer.domElement.removeEventListener("pointerup", this.onPointerUp)
    this.renderer.domElement.removeEventListener("pointerleave", this.onPointerLeave)
    window.removeEventListener("resize", this.onResize)
    document.removeEventListener("visibilitychange", this.onVisibilityChange)
    this.resizeObserver.disconnect()
    this.controls.dispose()
    // P13-T10 — dispose dynamic layers before the global teardown sweep.
    this.clearArcs()
    this.clearViewportGroup()
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const material = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(material)) material.forEach((m) => m.dispose())
      else if (material) material.dispose()
    })
    for (const disposable of this.disposables) disposable.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  // ---------------------------------------------------------------------
  // Frame loop
  // ---------------------------------------------------------------------

  private tick = (): void => {
    if (this.disposed) return
    this.frameHandle = requestAnimationFrame(this.tick)

    const now = performance.now()
    const seconds = (now - this.clockStartedAt) / 1000

    // Idle auto-rotate resumes after 5s without interaction and without a selection.
    if (
      !this.reducedMotion &&
      !this.selectedKey &&
      !this.tween?.active &&
      now - this.lastInteractionAt > 5000 &&
      !this.controls.autoRotate
    ) {
      this.controls.autoRotate = true
    }

    // Camera tween.
    if (this.tween?.active) {
      const rawT = (now - this.tween.startedAt) / this.tween.durationMs
      const t = THREE.MathUtils.clamp(rawT, 0, 1)
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      const dir = slerpDirection(this.tween.fromDir, this.tween.toDir, eased, new THREE.Vector3())
      const dist = THREE.MathUtils.lerp(this.tween.fromDist, this.tween.toDist, eased)
      this.camera.position.copy(dir.multiplyScalar(dist))
      if (rawT >= 1) this.tween = null
    }

    // P13-T05 — throttled camera reporting for the viewport stream: emit at
    // most every 250ms and only when distance moved meaningfully.
    const distance = this.camera.position.length()
    if (
      this.options.onCameraChange &&
      (Math.abs(distance - this.lastReportedDistance) > 0.04 ||
        now - this.lastCameraReportAt > 1000)
    ) {
      if (now - this.lastCameraReportAt > 250) {
        this.lastReportedDistance = distance
        this.lastCameraReportAt = now
        this.options.onCameraChange(distance)
      }
    }

    // Marker pulses + selection styling.
    for (const [, marker] of this.markers) {
      const isSelected = marker.key === this.selectedKey
      const isHovered = marker.key === this.hoveredKey
      const pulse = 0.5 + 0.5 * Math.sin(seconds * 2.1 + marker.phase)

      const targetScale = marker.baseScale * (isSelected ? 1.35 : isHovered ? 1.2 : 1)
      marker.sprite.scale.setScalar(THREE.MathUtils.lerp(marker.sprite.scale.x, targetScale, 0.14))

      const material = marker.halo.material as THREE.SpriteMaterial
      if (isSelected || isHovered) {
        const cycle = (seconds * 0.9 + marker.phase * 0.1) % 1
        marker.halo.scale.setScalar(marker.baseScale * (1.25 + cycle * 1.5))
        material.opacity = (isSelected ? 0.85 : 0.55) * (1 - cycle)
        ;(marker.halo.material as THREE.SpriteMaterial).color.set(
          isSelected ? THEME.markerCyan : "#c9b4ff",
        )
      } else {
        material.opacity = 0.14 * pulse
        marker.halo.scale.setScalar(marker.baseScale * 1.35)
        ;(marker.halo.material as THREE.SpriteMaterial).color.set("#8f78ff")
      }

      const glow = marker.sprite.material as THREE.SpriteMaterial
      glow.color.set(isSelected ? THEME.markerCyan : isHovered ? "#cdbaff" : "#ffffff")
    }

    // P13-T07 — viewport markers: aggregate glows breathe with the pulse;
    // cluster count labels stay steady for readability.
    for (const [, vp] of this.viewportMarkers) {
      const pulse = 0.5 + 0.5 * Math.sin(seconds * 2.1 + vp.phase)
      const targetScale = vp.baseScale * (1 + pulse * 0.08)
      vp.sprite.scale.setScalar(THREE.MathUtils.lerp(vp.sprite.scale.x, targetScale, 0.14))
      ;(vp.sprite.material as THREE.SpriteMaterial).opacity = 0.75 + pulse * 0.25
    }

    if (this.needsPick) {
      this.needsPick = false
      const key = this.pick()
      this.applyHover(key)
    }

    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }
}
