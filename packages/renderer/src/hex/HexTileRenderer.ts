import { Container, Graphics, Text, TextStyle, Sprite, Texture, Assets } from 'pixi.js'
import type { GameState, HexCoord, Tile, TerrainType, Lootbox, TribeId } from '@tribes/game-core'
import { hexToPixel, getTribe, type HexLayout } from '@tribes/game-core'

// Terrain sprite system loaded

// =============================================================================
// Terrain Sprite System
// =============================================================================

// Map terrain types to sprite filenames
const TERRAIN_SPRITE_FILES: Record<TerrainType, string> = {
  grassland: 'grassland.png',
  plains: 'plains.png',
  forest: 'forest.png',
  hills: 'hills.png',
  mountain: 'mountain.png',
  water: 'water.png',
  desert: 'desert.png',
  jungle: 'jungle.png',
  marsh: 'marsh.png',
}

// Terrain texture cache
const TERRAIN_TEXTURES: Map<TerrainType, Texture> = new Map()
let texturesLoaded = false

// Settlement textures
let settlementTexture: Texture | null = null
let settlementCastleTexture: Texture | null = null

/**
 * Load all terrain sprite textures
 */
export async function loadTerrainTextures(): Promise<void> {
  if (texturesLoaded) return

  const basePath = '/assets/sprites/terrain/'

  for (const [terrain, filename] of Object.entries(TERRAIN_SPRITE_FILES)) {
    try {
      const texture = await Assets.load(basePath + filename)
      TERRAIN_TEXTURES.set(terrain as TerrainType, texture)
    } catch (err) {
      console.warn(`Failed to load terrain texture for ${terrain}:`, err)
    }
  }

  // Load settlement textures
  try {
    settlementTexture = await Assets.load(basePath + 'settlement.png')
  } catch (err) {
    console.warn('Failed to load settlement texture:', err)
  }

  try {
    settlementCastleTexture = await Assets.load(basePath + 'settlement_castle.png')
  } catch (err) {
    console.warn('Failed to load settlement castle texture:', err)
  }

  texturesLoaded = true
}

/**
 * Get terrain texture, or null if not loaded
 */
function getTerrainTexture(terrain: TerrainType): Texture | null {
  return TERRAIN_TEXTURES.get(terrain) ?? null
}

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
  private tileGraphics: Map<string, Container> = new Map()
  private lastState: GameState | null = null
  private selectedUnitPosition: HexCoord | null = null

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
      this.tileOwnershipChanged(newState, oldState) ||
      // Check if any settlement level changed (for castle upgrade)
      this.settlementLevelChanged(newState, oldState)
    )
  }

  private settlementLevelChanged(newState: GameState, oldState: GameState): boolean {
    for (const [id, newSettlement] of newState.settlements) {
      const oldSettlement = oldState.settlements.get(id)
      if (oldSettlement && newSettlement.level !== oldSettlement.level) {
        // Only rebuild if crossing the castle threshold
        if ((oldSettlement.level < 10 && newSettlement.level >= 10) ||
            (oldSettlement.level >= 10 && newSettlement.level < 10)) {
          return true
        }
      }
    }
    return false
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

  private createTileGraphic(tile: Tile, state: GameState): Container {
    const container = new Container()
    const { x, y } = hexToPixel(tile.coord, this.layout)
    container.x = x
    container.y = y

    // Check if there's a settlement on this tile
    const tileKey = `${tile.coord.q},${tile.coord.r}`
    let settlementOnTile: { level: number } | null = null
    for (const settlement of state.settlements.values()) {
      const settlementKey = `${settlement.position.q},${settlement.position.r}`
      if (settlementKey === tileKey) {
        settlementOnTile = settlement
        break
      }
    }

    // Determine which texture to use
    let texture: Texture | null = null
    if (settlementOnTile) {
      // Use castle texture at level 10+, otherwise village
      texture = settlementOnTile.level >= 10 ? settlementCastleTexture : settlementTexture
    }
    // Fall back to terrain texture
    if (!texture) {
      texture = getTerrainTexture(tile.terrain)
    }

    if (texture) {
      const sprite = new Sprite(texture)
      // Anchor adjusted - higher y shifts sprite up
      sprite.anchor.set(0.5, 0.65)
      // Scale sprite to fit hex - stretch taller to match grid
      const baseScale = (this.hexSize * 2.6) / texture.height
      sprite.scale.set(baseScale, baseScale * 1.15)
      container.addChild(sprite)
    } else {
      // Fallback: solid color terrain
      const graphics = new Graphics()
      const color = TERRAIN_COLORS[tile.terrain]
      this.drawHexPath(graphics, 0, 0)
      graphics.fill({ color })
      graphics.stroke({ color: 0x000000, width: 1, alpha: 0.3 })
      container.addChild(graphics)
    }

    // Draw river if present
    if (tile.feature === 'river') {
      const riverGraphics = new Graphics()
      this.drawRiver(riverGraphics, 0, 0)
      container.addChild(riverGraphics)
    }

    // Draw oasis if present
    if (tile.feature === 'oasis') {
      const oasisGraphics = new Graphics()
      this.drawOasis(oasisGraphics, 0, 0)
      container.addChild(oasisGraphics)
    }

    // Draw resource indicator if revealed
    if (tile.resource?.revealed) {
      const resourceGraphics = new Graphics()
      this.drawResourceIndicator(resourceGraphics, 0, 0, tile.resource.improved)
      container.addChild(resourceGraphics)
    }

    // Draw territory border if owned
    if (tile.owner) {
      const borderGraphics = new Graphics()
      const tribeColor = this.getTribeColor(state, tile.owner)
      this.drawTerritoryBorder(borderGraphics, 0, 0, tribeColor)
      container.addChild(borderGraphics)
    }

    return container
  }

  /**
   * Draw a hex polygon path (just the shape, no fill/stroke)
   */
  private drawHexPath(graphics: Graphics, x: number, y: number): void {
    const points: number[] = []

    for (let i = 0; i < 6; i++) {
      const angleDeg = 60 * i - 30 // pointy-top
      const angleRad = (Math.PI / 180) * angleDeg
      points.push(x + this.hexSize * Math.cos(angleRad))
      points.push(y + this.hexSize * Math.sin(angleRad))
    }

    graphics.poly(points)
  }

  private drawHex(graphics: Graphics, x: number, y: number, color: number): void {
    this.drawHexPath(graphics, x, y)
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
   * Looks up player by tribeId to get their tribeName, then gets tribe definition
   */
  private getTribeColor(state: GameState, tribeId: TribeId): number {
    // Find the player with this tribeId to get their tribeName
    const player = state.players.find(p => p.tribeId === tribeId)
    if (!player) return 0xffffff
    // Get tribe definition by name
    const tribe = getTribe(player.tribeName)
    if (!tribe) return 0xffffff
    // Convert hex string like '#FFD700' to number 0xFFD700
    return parseInt(tribe.color.replace('#', ''), 16)
  }

  private createSettlementMarker(
    state: GameState,
    coord: HexCoord,
    isCapital: boolean,
    tribeId: TribeId,
    name: string
  ): Graphics {
    const graphics = new Graphics()
    const { x, y } = hexToPixel(coord, this.layout)

    // Settlement name with capital star prefix, uppercase, tribe color
    const displayName = isCapital ? `★ ${name.toUpperCase()}` : name.toUpperCase()
    const tribeColor = this.getTribeColor(state, tribeId)
    const style = new TextStyle({
      fontSize: this.hexSize * 0.22,
      fill: tribeColor,
      fontWeight: 'bold',
      stroke: {
        color: 0x000000,
        width: 2,
      },
      wordWrap: true,
      wordWrapWidth: this.hexSize * 1.6,
      align: 'center',
    })
    const text = new Text({ text: displayName, style })
    text.anchor.set(0.5, 0)
    text.x = x
    text.y = y + this.hexSize * 0.25
    graphics.addChild(text)

    return graphics
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

    // Draw path arrow from selected unit to hovered tile
    if (this.selectedUnitPosition && this.hoveredTile) {
      const hoveredKey = `${this.hoveredTile.q},${this.hoveredTile.r}`
      const isReachable = this.reachableHexes.has(hoveredKey)
      const isAttackTarget = this.attackTargetHexes.has(hoveredKey)

      if (isReachable || isAttackTarget) {
        const from = hexToPixel(this.selectedUnitPosition, this.layout)
        const to = hexToPixel(this.hoveredTile, this.layout)
        const arrow = new Graphics()
        const arrowColor = isAttackTarget ? UI_COLORS.attackTarget : UI_COLORS.reachable
        this.drawArrow(arrow, from.x, from.y, to.x, to.y, arrowColor)
        this.overlayContainer.addChild(arrow)
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

  private drawArrow(
    graphics: Graphics,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: number
  ): void {
    const dx = toX - fromX
    const dy = toY - fromY
    const length = Math.sqrt(dx * dx + dy * dy)

    if (length < 1) return

    // Normalize direction
    const nx = dx / length
    const ny = dy / length

    // Shorten the line so it doesn't overlap unit/target
    const startOffset = this.hexSize * 0.5
    const endOffset = this.hexSize * 0.5
    const startX = fromX + nx * startOffset
    const startY = fromY + ny * startOffset
    const endX = toX - nx * endOffset
    const endY = toY - ny * endOffset

    // Draw line
    graphics.moveTo(startX, startY)
    graphics.lineTo(endX, endY)
    graphics.stroke({ color, width: 4, alpha: 0.8 })

    // Draw arrowhead
    const arrowSize = 12
    const arrowAngle = Math.PI / 6 // 30 degrees
    const angle = Math.atan2(dy, dx)

    const arrow1X = endX - arrowSize * Math.cos(angle - arrowAngle)
    const arrow1Y = endY - arrowSize * Math.sin(angle - arrowAngle)
    const arrow2X = endX - arrowSize * Math.cos(angle + arrowAngle)
    const arrow2Y = endY - arrowSize * Math.sin(angle + arrowAngle)

    graphics.moveTo(endX, endY)
    graphics.lineTo(arrow1X, arrow1Y)
    graphics.moveTo(endX, endY)
    graphics.lineTo(arrow2X, arrow2Y)
    graphics.stroke({ color, width: 4, alpha: 0.8 })
  }

  // Public methods for interaction
  setHoveredTile(coord: HexCoord | null): void {
    this.hoveredTile = coord
    // Redraw overlays immediately for responsive hover feedback
    if (this.lastState) {
      this.updateOverlays(this.lastState)
    }
  }

  setSelectedTile(coord: HexCoord | null): void {
    this.selectedTile = coord
    // Redraw overlays immediately
    if (this.lastState) {
      this.updateOverlays(this.lastState)
    }
  }

  setReachableHexes(hexKeys: Set<string>): void {
    this.reachableHexes = hexKeys
  }

  setAttackTargetHexes(hexKeys: Set<string>): void {
    this.attackTargetHexes = hexKeys
  }

  setSelectedUnitPosition(coord: HexCoord | null): void {
    this.selectedUnitPosition = coord
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
