import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { GameState, HexCoord, Tile, TerrainType, Lootbox, TribeId } from '@tribes/game-core'
import { hexToPixel, getTribeById, type HexLayout } from '@tribes/game-core'

// =============================================================================
// Color Definitions
// =============================================================================

const TERRAIN_COLORS: Record<TerrainType, number> = {
  grassland: 0x4ade80, // green
  plains: 0xfde047, // yellow
  forest: 0x166534, // dark green
  hills: 0x78716c, // stone
  mountain: 0x44403c, // dark stone
  water: 0x0ea5e9, // blue
  desert: 0xfbbf24, // amber
  jungle: 0x15803d, // emerald
  marsh: 0x64748b, // slate
}

const FEATURE_COLORS = {
  river: 0x38bdf8, // light blue
  oasis: 0x22d3ee, // cyan
}

const UI_COLORS = {
  hover: 0xffffff,
  selected: 0xf59e0b,
  reachable: 0x22d3ee, // cyan for movement range
  attackTarget: 0xef4444, // red for attack targets
  lootbox: 0xd946ef, // fuchsia
  fog: 0x1e1e2e,
  fogOverlay: 0x000000,
}

// =============================================================================
// HexTileRenderer
// =============================================================================

export class HexTileRenderer {
  private readonly hexSize: number
  private readonly layout: HexLayout
  private readonly tileContainer: Container
  private readonly overlayContainer: Container

  private hoveredTile: HexCoord | null = null
  private selectedTile: HexCoord | null = null
  private reachableHexes: Set<string> = new Set()
  private attackTargetHexes: Set<string> = new Set()
  private tileGraphics: Map<string, Graphics> = new Map()
  private lastState: GameState | null = null

  constructor(hexSize: number) {
    this.hexSize = hexSize
    this.layout = {
      size: hexSize,
      origin: { x: hexSize, y: hexSize },
    }
    this.tileContainer = new Container()
    this.overlayContainer = new Container()
  }

  update(state: GameState, parent: Container): void {
    const needsFullRebuild = !this.lastState || this.mapChanged(state, this.lastState)

    if (needsFullRebuild) {
      this.rebuildTiles(state)
    }

    // Add tile container to parent if not already added
    // Note: overlayContainer is added separately via getOverlayContainer()
    // to allow other renderers to be inserted between tiles and overlays
    if (!this.tileContainer.parent) {
      parent.addChild(this.tileContainer)
    }

    // Update overlays (selection, hover, fog)
    this.updateOverlays(state)

    this.lastState = state
  }

  getOverlayContainer(): Container {
    return this.overlayContainer
  }

  private mapChanged(newState: GameState, oldState: GameState): boolean {
    return (
      newState.map.width !== oldState.map.width ||
      newState.map.height !== oldState.map.height ||
      newState.map.tiles.size !== oldState.map.tiles.size ||
      newState.settlements.size !== oldState.settlements.size ||
      newState.lootboxes.length !== oldState.lootboxes.length ||
      // Check if any tile ownership changed
      this.tileOwnershipChanged(newState, oldState)
    )
  }

  private tileOwnershipChanged(newState: GameState, oldState: GameState): boolean {
    for (const [key, newTile] of newState.map.tiles) {
      const oldTile = oldState.map.tiles.get(key)
      if (oldTile && newTile.owner !== oldTile.owner) {
        return true
      }
    }
    return false
  }

  private rebuildTiles(state: GameState): void {
    // Clear existing graphics
    this.tileContainer.removeChildren()
    this.tileGraphics.clear()

    // Create graphics for each tile
    for (const [key, tile] of state.map.tiles) {
      const graphics = this.createTileGraphic(tile, state)
      this.tileGraphics.set(key, graphics)
      this.tileContainer.addChild(graphics)
    }

    // Add lootbox markers
    for (const lootbox of state.lootboxes) {
      if (!lootbox.claimed) {
        const marker = this.createLootboxMarker(lootbox)
        this.tileContainer.addChild(marker)
      }
    }

    // Add settlement markers
    for (const settlement of state.settlements.values()) {
      const marker = this.createSettlementMarker(
        state,
        settlement.position,
        settlement.isCapital,
        settlement.owner,
        settlement.name
      )
      this.tileContainer.addChild(marker)
    }
  }

  private createTileGraphic(tile: Tile, _state: GameState): Graphics {
    const graphics = new Graphics()
    const { x, y } = hexToPixel(tile.coord, this.layout)
    const color = TERRAIN_COLORS[tile.terrain]

    // Draw hex shape
    this.drawHex(graphics, x, y, color)

    // Draw river if present
    if (tile.feature === 'river') {
      this.drawRiver(graphics, x, y)
    }

    // Draw oasis if present
    if (tile.feature === 'oasis') {
      this.drawOasis(graphics, x, y)
    }

    // Draw resource indicator if revealed
    if (tile.resource?.revealed) {
      this.drawResourceIndicator(graphics, x, y, tile.resource.improved)
    }

    // Draw territory border if owned
    if (tile.owner) {
      const tribeColor = this.getTribeColor(tile.owner)
      this.drawTerritoryBorder(graphics, x, y, tribeColor)
    }

    return graphics
  }

  private drawHex(graphics: Graphics, x: number, y: number, color: number): void {
    const points: number[] = []

    for (let i = 0; i < 6; i++) {
      const angleDeg = 60 * i - 30 // pointy-top
      const angleRad = (Math.PI / 180) * angleDeg
      points.push(x + this.hexSize * Math.cos(angleRad))
      points.push(y + this.hexSize * Math.sin(angleRad))
    }

    graphics.poly(points)
    graphics.fill({ color })
    graphics.stroke({ color: 0x000000, width: 1, alpha: 0.3 })
  }

  private drawRiver(graphics: Graphics, x: number, y: number): void {
    // Draw a wavy line through the hex
    graphics.moveTo(x - this.hexSize * 0.4, y - this.hexSize * 0.3)
    graphics.bezierCurveTo(
      x - this.hexSize * 0.1,
      y - this.hexSize * 0.1,
      x + this.hexSize * 0.1,
      y + this.hexSize * 0.1,
      x + this.hexSize * 0.4,
      y + this.hexSize * 0.3
    )
    graphics.stroke({ color: FEATURE_COLORS.river, width: 3 })
  }

  private drawOasis(graphics: Graphics, x: number, y: number): void {
    // Draw a small circle for oasis
    graphics.circle(x, y, this.hexSize * 0.25)
    graphics.fill({ color: FEATURE_COLORS.oasis })
  }

  private drawResourceIndicator(
    graphics: Graphics,
    x: number,
    y: number,
    improved: boolean
  ): void {
    const size = this.hexSize * 0.15
    graphics.circle(x, y + this.hexSize * 0.3, size)
    graphics.fill({ color: improved ? 0x22c55e : 0x94a3b8 })
    graphics.stroke({ color: 0x000000, width: 1 })
  }

  private drawTerritoryBorder(
    graphics: Graphics,
    x: number,
    y: number,
    color: number
  ): void {
    const points: number[] = []
    const borderSize = this.hexSize * 0.95

    for (let i = 0; i < 6; i++) {
      const angleDeg = 60 * i - 30
      const angleRad = (Math.PI / 180) * angleDeg
      points.push(x + borderSize * Math.cos(angleRad))
      points.push(y + borderSize * Math.sin(angleRad))
    }

    graphics.poly(points)
    graphics.stroke({ color, width: 2, alpha: 0.5 })
  }

  /**
   * Convert tribe color string (#RRGGBB) to Pixi number (0xRRGGBB)
   */
  private getTribeColor(tribeId: TribeId): number {
    const tribe = getTribeById(tribeId)
    if (!tribe) return 0xffffff
    // Convert hex string like '#FFD700' to number 0xFFD700
    return parseInt(tribe.color.replace('#', ''), 16)
  }

  private createSettlementMarker(
    _state: GameState,
    coord: HexCoord,
    isCapital: boolean,
    tribeId: TribeId,
    name: string
  ): Graphics {
    const graphics = new Graphics()
    const { x, y } = hexToPixel(coord, this.layout)
    const tribeColor = this.getTribeColor(tribeId)

    // Settlement size - capitals are larger
    const baseSize = this.hexSize * (isCapital ? 0.45 : 0.35)

    // Outer glow
    graphics.circle(x, y, baseSize * 1.3)
    graphics.fill({ color: tribeColor, alpha: 0.3 })

    // Main circle
    graphics.circle(x, y, baseSize)
    graphics.fill({ color: tribeColor })
    graphics.stroke({ color: 0xffffff, width: 2 })

    // Capital star indicator
    if (isCapital) {
      this.drawStar(graphics, x, y, baseSize * 0.5, tribeColor)
    }

    // Settlement name
    const style = new TextStyle({
      fontSize: this.hexSize * 0.25,
      fill: 0xffffff,
      fontWeight: 'bold',
      dropShadow: {
        alpha: 0.8,
        angle: Math.PI / 4,
        blur: 2,
        distance: 1,
        color: 0x000000,
      },
    })
    const text = new Text({ text: name, style })
    text.anchor.set(0.5, 0)
    text.x = x
    text.y = y + baseSize + 4
    graphics.addChild(text)

    return graphics
  }

  private drawStar(
    graphics: Graphics,
    x: number,
    y: number,
    size: number,
    _color: number
  ): void {
    // Draw a 5-pointed star
    const points: number[] = []
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0 ? size : size * 0.5
      const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2
      points.push(x + radius * Math.cos(angle))
      points.push(y + radius * Math.sin(angle))
    }
    graphics.poly(points)
    graphics.fill({ color: 0xffffff })
  }

  private createLootboxMarker(lootbox: Lootbox): Graphics {
    const graphics = new Graphics()
    const { x, y } = hexToPixel(lootbox.position, this.layout)

    // Draw glowing box icon
    const size = this.hexSize * 0.3

    // Outer glow
    graphics.circle(x, y, size * 1.5)
    graphics.fill({ color: UI_COLORS.lootbox, alpha: 0.3 })

    // Box shape
    graphics.rect(x - size, y - size, size * 2, size * 2)
    graphics.fill({ color: UI_COLORS.lootbox })
    graphics.stroke({ color: 0xffffff, width: 2 })

    // Question mark
    const style = new TextStyle({
      fontSize: size * 1.5,
      fill: 0xffffff,
      fontWeight: 'bold',
    })
    const text = new Text({ text: '?', style })
    text.anchor.set(0.5)
    text.x = x
    text.y = y
    graphics.addChild(text)

    return graphics
  }

  private updateOverlays(state: GameState): void {
    this.overlayContainer.removeChildren()

    // Draw fog of war
    const currentPlayerFog = state.fog.get(state.currentPlayer)
    if (currentPlayerFog) {
      for (const [key, tile] of state.map.tiles) {
        if (!currentPlayerFog.has(key)) {
          const { x, y } = hexToPixel(tile.coord, this.layout)
          const fog = new Graphics()
          this.drawHex(fog, x, y, UI_COLORS.fogOverlay)
          fog.alpha = 0.7
          this.overlayContainer.addChild(fog)
        }
      }
    }

    // Draw reachable hexes (movement range)
    for (const hexKey of this.reachableHexes) {
      const tile = state.map.tiles.get(hexKey)
      if (tile && currentPlayerFog?.has(hexKey)) {
        const { x, y } = hexToPixel(tile.coord, this.layout)
        const reachable = new Graphics()
        this.drawHexFill(reachable, x, y, UI_COLORS.reachable, 0.3)
        this.overlayContainer.addChild(reachable)
      }
    }

    // Draw attack target hexes (enemy units in range)
    for (const hexKey of this.attackTargetHexes) {
      const tile = state.map.tiles.get(hexKey)
      if (tile && currentPlayerFog?.has(hexKey)) {
        const { x, y } = hexToPixel(tile.coord, this.layout)
        const attackTarget = new Graphics()
        this.drawHexFill(attackTarget, x, y, UI_COLORS.attackTarget, 0.4)
        this.drawHexOutline(attackTarget, x, y, UI_COLORS.attackTarget, 2)
        this.overlayContainer.addChild(attackTarget)
      }
    }

    // Draw hover highlight
    if (this.hoveredTile) {
      const { x, y } = hexToPixel(this.hoveredTile, this.layout)
      const hover = new Graphics()
      this.drawHexOutline(hover, x, y, UI_COLORS.hover, 2)
      this.overlayContainer.addChild(hover)
    }

    // Draw selection highlight
    if (this.selectedTile) {
      const { x, y } = hexToPixel(this.selectedTile, this.layout)
      const selection = new Graphics()
      this.drawHexOutline(selection, x, y, UI_COLORS.selected, 3)
      this.overlayContainer.addChild(selection)
    }
  }

  private drawHexOutline(
    graphics: Graphics,
    x: number,
    y: number,
    color: number,
    width: number
  ): void {
    const points: number[] = []

    for (let i = 0; i < 6; i++) {
      const angleDeg = 60 * i - 30
      const angleRad = (Math.PI / 180) * angleDeg
      points.push(x + this.hexSize * Math.cos(angleRad))
      points.push(y + this.hexSize * Math.sin(angleRad))
    }

    graphics.poly(points)
    graphics.stroke({ color, width })
  }

  private drawHexFill(
    graphics: Graphics,
    x: number,
    y: number,
    color: number,
    alpha: number
  ): void {
    const points: number[] = []

    for (let i = 0; i < 6; i++) {
      const angleDeg = 60 * i - 30
      const angleRad = (Math.PI / 180) * angleDeg
      points.push(x + this.hexSize * Math.cos(angleRad))
      points.push(y + this.hexSize * Math.sin(angleRad))
    }

    graphics.poly(points)
    graphics.fill({ color, alpha })
  }

  // Public methods for interaction
  setHoveredTile(coord: HexCoord | null): void {
    this.hoveredTile = coord
  }

  setSelectedTile(coord: HexCoord | null): void {
    this.selectedTile = coord
  }

  setReachableHexes(hexKeys: Set<string>): void {
    this.reachableHexes = hexKeys
  }

  setAttackTargetHexes(hexKeys: Set<string>): void {
    this.attackTargetHexes = hexKeys
  }

  hexToPixel(q: number, r: number): { x: number; y: number } {
    return hexToPixel({ q, r }, this.layout)
  }

  pixelToHex(x: number, y: number): HexCoord {
    // Convert pixel to hex using layout
    const localX = x - this.layout.origin.x
    const localY = y - this.layout.origin.y
    const q = ((Math.sqrt(3) / 3) * localX - (1 / 3) * localY) / this.layout.size
    const r = ((2 / 3) * localY) / this.layout.size

    // Round to nearest hex
    return this.hexRound(q, r)
  }

  private hexRound(q: number, r: number): HexCoord {
    const s = -q - r

    let rq = Math.round(q)
    let rr = Math.round(r)
    let rs = Math.round(s)

    const qDiff = Math.abs(rq - q)
    const rDiff = Math.abs(rr - r)
    const sDiff = Math.abs(rs - s)

    if (qDiff > rDiff && qDiff > sDiff) {
      rq = -rr - rs
    } else if (rDiff > sDiff) {
      rr = -rq - rs
    }

    return { q: rq, r: rr }
  }
}
