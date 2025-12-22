import { Application, Container } from 'pixi.js'
import type { GameState, HexCoord, Settlement } from '@tribes/game-core'
import { HexTileRenderer, loadTerrainTextures } from './hex/HexTileRenderer'
import { CameraController } from './camera/CameraController'
import { UnitRenderer, preloadAllSprites } from './units/UnitRenderer'

export interface GameRendererConfig {
  readonly canvas: HTMLCanvasElement
  readonly width: number
  readonly height: number
  readonly hexSize: number
  readonly onTileClick?: (coord: HexCoord) => void
  readonly onTileRightClick?: (coord: HexCoord) => void
  readonly onTileHover?: (coord: HexCoord | null) => void
}

export interface RenderOptions {
  selectedUnitId?: string | null
  selectedSettlement?: Settlement | null
  reachableHexes?: Set<string>
  attackTargetHexes?: Set<string>
}

export class GameRenderer {
  private readonly app: Application
  private readonly config: GameRendererConfig
  private readonly worldContainer: Container
  private readonly hexRenderer: HexTileRenderer
  private readonly unitRenderer: UnitRenderer
  private readonly camera: CameraController

  private currentState: GameState | null = null
  private initialized = false
  private destroyed = false

  constructor(config: GameRendererConfig) {
    this.config = config
    this.app = new Application()
    this.worldContainer = new Container()
    this.hexRenderer = new HexTileRenderer(config.hexSize)
    this.unitRenderer = new UnitRenderer({
      size: config.hexSize,
      origin: { x: config.hexSize, y: config.hexSize },
    })
    this.camera = new CameraController(this.worldContainer, {
      viewportWidth: config.width,
      viewportHeight: config.height,
      minZoom: 0.5,
      maxZoom: 2.0,
    })
  }

  async init(): Promise<void> {
    if (this.initialized || this.destroyed) return

    // Preload all sprite assets before initializing (in parallel)
    await Promise.all([
      preloadAllSprites(),
      loadTerrainTextures(),
    ])

    await this.app.init({
      canvas: this.config.canvas,
      width: this.config.width,
      height: this.config.height,
      backgroundColor: 0x1a1a2e,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })

    // Check if destroyed during async init
    if (this.destroyed) return

    // Set up container hierarchy
    this.app.stage.addChild(this.worldContainer)

    // Note: Unit container is added during first update() after hex tiles,
    // so units render on top of tiles

    // Set up input handlers
    this.setupInputHandlers()

    // Start render loop
    this.app.ticker.add(() => this.render())

    this.initialized = true
  }

  private setupInputHandlers(): void {
    const { canvas } = this.config

    // Mouse/touch events for camera panning
    let isDragging = false
    let lastPosition = { x: 0, y: 0 }

    canvas.addEventListener('pointerdown', (e) => {
      isDragging = true
      lastPosition = { x: e.clientX, y: e.clientY }
    })

    canvas.addEventListener('pointermove', (e) => {
      const worldPos = this.screenToWorld(e.clientX, e.clientY)
      const hexCoord = this.hexRenderer.pixelToHex(worldPos.x, worldPos.y)

      // Check if hex is in bounds
      if (this.currentState && this.isInBounds(hexCoord)) {
        this.config.onTileHover?.(hexCoord)
        this.hexRenderer.setHoveredTile(hexCoord)
        this.unitRenderer.setHoverTarget(hexCoord)
      } else {
        this.config.onTileHover?.(null)
        this.hexRenderer.setHoveredTile(null)
        this.unitRenderer.setHoverTarget(null)
      }

      // Handle panning
      if (isDragging) {
        const dx = e.clientX - lastPosition.x
        const dy = e.clientY - lastPosition.y
        this.camera.pan(dx, dy)
        lastPosition = { x: e.clientX, y: e.clientY }
      }
    })

    canvas.addEventListener('pointerup', (e) => {
      // Only handle left-click (button 0), not right-click (button 2)
      if (e.button === 0 && isDragging && Math.abs(e.clientX - lastPosition.x) < 5) {
        // This was a click, not a drag
        const worldPos = this.screenToWorld(e.clientX, e.clientY)
        const hexCoord = this.hexRenderer.pixelToHex(worldPos.x, worldPos.y)

        if (this.currentState && this.isInBounds(hexCoord)) {
          this.config.onTileClick?.(hexCoord)
          this.hexRenderer.setSelectedTile(hexCoord)
        }
      }
      isDragging = false
    })

    canvas.addEventListener('pointerleave', () => {
      isDragging = false
      this.config.onTileHover?.(null)
      this.hexRenderer.setHoveredTile(null)
      this.unitRenderer.setHoverTarget(null)
    })

    // Right-click handler (reserved for future use)
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      const worldPos = this.screenToWorld(e.clientX, e.clientY)
      const hexCoord = this.hexRenderer.pixelToHex(worldPos.x, worldPos.y)

      if (this.currentState && this.isInBounds(hexCoord)) {
        this.config.onTileRightClick?.(hexCoord)
      }
    })

    // Mouse wheel for zoom
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault()
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      this.camera.zoom(zoomDelta, mouseX, mouseY)
    })

    // Touch pinch zoom
    let lastTouchDistance = 0

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0]!.clientX - e.touches[1]!.clientX
        const dy = e.touches[0]!.clientY - e.touches[1]!.clientY
        lastTouchDistance = Math.sqrt(dx * dx + dy * dy)
      }
    })

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0]!.clientX - e.touches[1]!.clientX
        const dy = e.touches[0]!.clientY - e.touches[1]!.clientY
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (lastTouchDistance > 0) {
          const zoomDelta = distance / lastTouchDistance
          const centerX = (e.touches[0]!.clientX + e.touches[1]!.clientX) / 2
          const centerY = (e.touches[0]!.clientY + e.touches[1]!.clientY) / 2
          const rect = canvas.getBoundingClientRect()
          this.camera.zoom(zoomDelta, centerX - rect.left, centerY - rect.top)
        }

        lastTouchDistance = distance
      }
    })

    canvas.addEventListener('touchend', () => {
      lastTouchDistance = 0
    })
  }

  private screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.config.canvas.getBoundingClientRect()
    const canvasX = screenX - rect.left
    const canvasY = screenY - rect.top

    return this.camera.screenToWorld(canvasX, canvasY)
  }

  private isInBounds(coord: HexCoord): boolean {
    if (!this.currentState) return false
    const { width, height } = this.currentState.map
    return coord.q >= 0 && coord.q < width && coord.r >= 0 && coord.r < height
  }

  update(state: GameState, options?: RenderOptions): void {
    if (this.destroyed || !this.initialized) return
    const prevState = this.currentState
    this.currentState = state

    // Update reachable hexes for movement range display
    this.hexRenderer.setReachableHexes(options?.reachableHexes ?? new Set())
    this.hexRenderer.setAttackTargetHexes(options?.attackTargetHexes ?? new Set())

    // Update selected settlement for yield display
    this.hexRenderer.setSelectedSettlement(options?.selectedSettlement ?? null)

    // Set selected unit position for path arrow
    if (options?.selectedUnitId) {
      const unit = state.units.get(options.selectedUnitId as never)
      if (unit) {
        this.hexRenderer.setSelectedUnitPosition(unit.position)
      } else {
        this.hexRenderer.setSelectedUnitPosition(null)
      }
    } else {
      this.hexRenderer.setSelectedUnitPosition(null)
    }

    // Update hex tiles (adds tileContainer to worldContainer)
    this.hexRenderer.update(state, this.worldContainer)

    // Set up z-order on first update: tiles -> units -> overlays
    if (!prevState) {
      this.worldContainer.addChild(this.unitRenderer.getContainer())
      this.worldContainer.addChild(this.hexRenderer.getOverlayContainer())
    }

    // Update unit selection
    this.unitRenderer.setSelectedUnit(options?.selectedUnitId ?? null)

    // Update units with rarity borders
    this.unitRenderer.update(state, state.currentPlayer)

    // Center camera on map if first update
    if (!prevState) {
      this.centerOnMap()
    }
  }

  private centerOnMap(): void {
    if (!this.currentState) return

    const { width, height } = this.currentState.map
    const centerQ = width / 2
    const centerR = height / 2
    const worldCenter = this.hexRenderer.hexToPixel(centerQ, centerR)

    this.camera.centerOn(worldCenter.x, worldCenter.y)
  }

  private render(): void {
    // Skip if destroyed
    if (this.destroyed) return
    // Pixi handles rendering automatically via ticker
    // This is where we'd add any per-frame updates
  }

  resize(width: number, height: number): void {
    if (this.destroyed || !this.initialized) return
    this.app.renderer.resize(width, height)
    this.camera.setViewport(width, height)
  }

  destroy(): void {
    this.destroyed = true
    if (this.initialized && this.app.stage) {
      this.app.destroy(true)
    }
  }

  // Public camera controls
  centerOn(coord: HexCoord): void {
    const worldPos = this.hexRenderer.hexToPixel(coord.q, coord.r)
    this.camera.centerOn(worldPos.x, worldPos.y)
  }

  setZoom(level: number): void {
    this.camera.setZoom(level)
  }
}
