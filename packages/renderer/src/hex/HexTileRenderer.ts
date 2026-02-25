import { Container, Graphics, Text, TextStyle, Sprite, Texture, Assets } from 'pixi.js'
import type { GameState, HexCoord, Tile, TerrainType, Lootbox, TribeId, Settlement } from '@tribes/game-core'
import { hexToPixel, getTribe, hexKey, hexNeighbors, calculateTileYields, type HexLayout } from '@tribes/game-core'

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

// Resource textures
const RESOURCE_TEXTURES: Map<string, Texture> = new Map()
const RESOURCE_SPRITE_FILES: Record<string, string> = {
  iron: 'iron.png',
  horses: 'horses.png',
  gems: 'gem.png',
  marble: 'marble.png',
  hops: 'hops.png',
  airdrop: 'airdrop.png',
  silicon: 'silicon.png',
  pig: 'pig.png',
  cattle: 'cattle.png',
  oasis: 'oasis.png',
  lootbox: 'lootbox.png',
}

/**
 * Load all terrain sprite textures
 */
export async function loadTerrainTextures(): Promise<void> {
  // Check if textures are actually loaded and valid (not just the flag)
  // This handles the case where the app is destroyed and recreated
  const hasValidTextures = texturesLoaded &&
    TERRAIN_TEXTURES.size === Object.keys(TERRAIN_SPRITE_FILES).length &&
    settlementTexture !== null

  if (hasValidTextures) {
    console.log('[HexTileRenderer] Textures already loaded, skipping')
    return
  }

  console.log('[HexTileRenderer] Loading terrain textures...')

  // Clear any stale textures
  TERRAIN_TEXTURES.clear()
  RESOURCE_TEXTURES.clear()
  settlementTexture = null
  settlementCastleTexture = null
  texturesLoaded = false

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

  // Load resource textures
  const resourceBasePath = '/assets/icons/resources/'
  for (const [resource, filename] of Object.entries(RESOURCE_SPRITE_FILES)) {
    try {
      const fullPath = resourceBasePath + filename
      const texture = await Assets.load(fullPath)
      RESOURCE_TEXTURES.set(resource, texture)
    } catch (err) {
      console.warn(`Failed to load resource texture for ${resource}:`, err)
    }
  }

  console.log(`[HexTileRenderer] Loaded ${TERRAIN_TEXTURES.size} terrain textures`)
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

const YIELD_COLORS = {
  gold: 0xffd700,
  alpha: 0x64b5f6,
  vibes: 0xba68c8,
  production: 0xff9800,
  growth: 0x4caf50,
}

// =============================================================================
// HexTileRenderer
// =============================================================================

export class HexTileRenderer {
  private readonly hexSize: number
  private readonly layout: HexLayout
  private readonly tileContainer: Container
  private readonly overlayContainer: Container

  // Separate containers for different overlay types (for selective updates)
  private readonly fogContainer: Container
  private readonly rangeContainer: Container
  private readonly uiContainer: Container // hover, selection, arrows
  private readonly yieldContainer: Container // settlement yields (separate for caching)
  private readonly settlementHealthContainer: Container // settlement health bars

  private hoveredTile: HexCoord | null = null

  // Throttling for hover updates
  private hoverUpdatePending = false
  private lastHoverUpdate = 0
  private readonly HOVER_THROTTLE_MS = 16 // ~60fps
  private selectedTile: HexCoord | null = null
  private reachableHexes: Set<string> = new Set()
  private attackTargetHexes: Set<string> = new Set()
  private tileGraphics: Map<string, Container> = new Map()
  private lastState: GameState | null = null
  private selectedUnitPosition: HexCoord | null = null
  private selectedSettlement: Settlement | null = null

  // Dirty flags for overlay optimization
  private lastFogSet: Set<string> | null = null
  private lastReachableHexes: Set<string> = new Set()
  private lastAttackTargetHexes: Set<string> = new Set()
  private lastSelectedSettlementId: string | null = null
  private lastSettlementHealthMap: Map<string, number> = new Map()

  // Memoization cache for tile yield calculations
  private yieldCache: Map<string, { gold: number; alpha: number; vibes: number; production: number; growth: number }> = new Map()

  // Graphics object pools for yield indicators
  private yieldGraphicsPool: Graphics[] = []
  private yieldTextPool: Text[] = []
  private pooledGraphicsIndex = 0
  private pooledTextIndex = 0

  constructor(hexSize: number) {
    this.hexSize = hexSize
    this.layout = {
      size: hexSize,
      origin: { x: hexSize, y: hexSize },
    }
    this.tileContainer = new Container()
    this.overlayContainer = new Container()

    // Create layered overlay containers for selective updates
    this.fogContainer = new Container()
    this.rangeContainer = new Container()
    this.yieldContainer = new Container() // Settlement yields
    this.settlementHealthContainer = new Container() // Settlement health bars
    this.uiContainer = new Container()

    // Add in order: fog (bottom), range overlays, yields, health bars, ui highlights (top)
    this.overlayContainer.addChild(this.fogContainer)
    this.overlayContainer.addChild(this.rangeContainer)
    this.overlayContainer.addChild(this.yieldContainer)
    this.overlayContainer.addChild(this.settlementHealthContainer)
    this.overlayContainer.addChild(this.uiContainer)
  }

  update(state: GameState, parent: Container): void {
    const needsFullRebuild = !this.lastState || this.mapChanged(state, this.lastState)

    // Debug: log state changes
    if (!this.lastState) {
      console.log('[HexTileRenderer] First update - no previous state')
    } else if (state.map.tiles !== this.lastState.map.tiles) {
      console.log('[HexTileRenderer] Tiles Map changed, needsFullRebuild:', needsFullRebuild)
    }

    if (needsFullRebuild) {
      console.log('[HexTileRenderer] Rebuilding tiles, map size:', state.map.width, 'x', state.map.height)
      this.rebuildTiles(state)
      console.log('[HexTileRenderer] Rebuilt', this.tileContainer.children.length, 'tile containers')
    }

    // Add tile container to parent if not already added
    // Note: overlayContainer is added separately via getOverlayContainer()
    // to allow other renderers to be inserted between tiles and overlays
    if (!this.tileContainer.parent) {
      console.log('[HexTileRenderer] Adding tileContainer to parent')
      parent.addChild(this.tileContainer)
    } else if (this.tileContainer.parent !== parent) {
      // Re-add if parent changed (e.g., app recreated)
      console.log('[HexTileRenderer] Re-parenting tileContainer')
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
    // Count improvements to detect changes (more reliable than reference comparison)
    const countImprovements = (state: GameState) => {
      let count = 0
      for (const tile of state.map.tiles.values()) {
        if (tile.improvement) count++
        if (tile.resource?.improved) count += 100 // Different weight for improved resources
      }
      return count
    }

    return (
      newState.map.width !== oldState.map.width ||
      newState.map.height !== oldState.map.height ||
      newState.map.tiles !== oldState.map.tiles ||
      countImprovements(newState) !== countImprovements(oldState) ||
      newState.settlements.size !== oldState.settlements.size ||
      newState.lootboxes.length !== oldState.lootboxes.length ||
      this.lootboxClaimedChanged(newState, oldState) ||
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

  private lootboxClaimedChanged(newState: GameState, oldState: GameState): boolean {
    for (let i = 0; i < newState.lootboxes.length; i++) {
      const newLootbox = newState.lootboxes[i]
      const oldLootbox = oldState.lootboxes[i]
      if (newLootbox && oldLootbox && newLootbox.claimed !== oldLootbox.claimed) {
        return true
      }
    }
    return false
  }

  private rebuildTiles(state: GameState): void {
    // Clear existing graphics and caches
    this.tileContainer.removeChildren()
    this.tileGraphics.clear()
    this.yieldCache.clear() // Invalidate yield cache when tiles change

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
      sprite.anchor.set(0.5, 0.66)
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
      const oasisSprite = this.createOasisSprite()
      if (oasisSprite) {
        container.addChild(oasisSprite)
      }
    }

    // Draw resource indicator if revealed
    if (tile.resource?.revealed) {
      const resourceContainer = this.createResourceIndicator(tile.resource.type, tile.resource.improved)
      if (resourceContainer) {
        container.addChild(resourceContainer)
      }
    }

    // Draw territory border if owned (only on outer edges)
    if (tile.owner) {
      const borderGraphics = new Graphics()
      const tribeColor = this.getTribeColor(state, tile.owner)
      this.drawTerritoryBorder(borderGraphics, 0, 0, tribeColor, tile.coord, tile.owner, state)
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
    // Draw river along ONE hex edge (bottom-left edge)
    // For pointy-top hexes, vertices are at angles: -30°, 30°, 90°, 150°, 210°, 270°

    const getVertex = (index: number) => {
      const angleDeg = 60 * index - 30 // pointy-top
      const angleRad = (Math.PI / 180) * angleDeg
      return {
        x: x + this.hexSize * Math.cos(angleRad),
        y: y + this.hexSize * Math.sin(angleRad),
      }
    }

    // Bottom-left edge: from bottom vertex (90°) to lower-left vertex (150°)
    const v2 = getVertex(2) // 90° - bottom
    const v3 = getVertex(3) // 150° - lower-left

    // Draw river along this edge, slightly inset
    const inset = 0.95
    graphics.moveTo(
      x + (v2.x - x) * inset,
      y + (v2.y - y) * inset
    )
    graphics.lineTo(
      x + (v3.x - x) * inset,
      y + (v3.y - y) * inset
    )
    graphics.stroke({ color: FEATURE_COLORS.river, width: 5, alpha: 0.9 })
  }

  private createOasisSprite(): Container | null {
    const texture = RESOURCE_TEXTURES.get('oasis')
    const container = new Container()
    const size = this.hexSize * 0.8

    if (texture) {
      const sprite = new Sprite(texture)
      sprite.anchor.set(0.5)
      const scale = size / Math.max(texture.width, texture.height)
      sprite.scale.set(scale)
      container.addChild(sprite)
    } else {
      // Fallback to simple circle if texture not loaded
      const graphics = new Graphics()
      graphics.circle(0, 0, this.hexSize * 0.25)
      graphics.fill({ color: FEATURE_COLORS.oasis })
      container.addChild(graphics)
    }

    return container
  }

  private createResourceIndicator(resourceType: string, improved: boolean): Container | null {
    const texture = RESOURCE_TEXTURES.get(resourceType)

    const container = new Container()
    const size = this.hexSize * 0.5  // Slightly larger for pixel art visibility
    const yOffset = this.hexSize * 0.3

    if (texture) {
      // Create sprite with resource icon
      const sprite = new Sprite(texture)
      sprite.anchor.set(0.5)
      // Scale to fit while maintaining aspect ratio
      const scale = size / Math.max(texture.width, texture.height)
      sprite.scale.set(scale)
      sprite.y = yOffset
      container.addChild(sprite)

      // Add green checkmark overlay when improved
      if (improved) {
        const checkmark = new Text({
          text: '✓',
          style: {
            fontSize: this.hexSize * 0.35,
            fill: 0x22ff22,
            fontWeight: 'bold',
            stroke: { color: 0x000000, width: 3 },
          }
        })
        checkmark.anchor.set(0.5)
        checkmark.x = size * 0.4
        checkmark.y = yOffset + size * 0.3
        container.addChild(checkmark)
      }
    } else {
      // Fallback to colored circle if texture not loaded
      const graphics = new Graphics()
      graphics.circle(0, yOffset, size * 0.4)
      graphics.fill({ color: improved ? 0x22ff22 : 0x888888 })
      container.addChild(graphics)
    }

    return container
  }

  /**
   * Draw territory border - only on edges where neighbor is not owned by same player
   */
  private drawTerritoryBorder(
    graphics: Graphics,
    x: number,
    y: number,
    color: number,
    coord: HexCoord,
    owner: TribeId,
    state: GameState
  ): void {
    const borderSize = this.hexSize * 0.95

    // Get hex vertices (pointy-top orientation)
    const getVertex = (i: number) => {
      const angleDeg = 60 * i - 30
      const angleRad = (Math.PI / 180) * angleDeg
      return {
        x: x + borderSize * Math.cos(angleRad),
        y: y + borderSize * Math.sin(angleRad),
      }
    }

    // Map edge index to neighbor direction index
    // Edge 0 (right) → East (0), Edge 1 (bottom-right) → Southeast (5)
    // Edge 2 (bottom-left) → Southwest (4), Edge 3 (left) → West (3)
    // Edge 4 (top-left) → Northwest (2), Edge 5 (top-right) → Northeast (1)
    const edgeToNeighborIndex = [0, 5, 4, 3, 2, 1]

    const neighbors = hexNeighbors(coord)

    // Draw only edges where neighbor is not owned by same player
    for (let i = 0; i < 6; i++) {
      const neighborIndex = edgeToNeighborIndex[i]!
      const neighborCoord = neighbors[neighborIndex]!
      const neighborKey = hexKey(neighborCoord)
      const neighborTile = state.map.tiles.get(neighborKey)

      // Draw edge if neighbor doesn't exist or is owned by different player
      const neighborOwner = neighborTile?.owner
      if (neighborOwner !== owner) {
        const v1 = getVertex(i)
        const v2 = getVertex((i + 1) % 6)
        graphics.moveTo(v1.x, v1.y)
        graphics.lineTo(v2.x, v2.y)
        graphics.stroke({ color, width: 3, alpha: 0.8 })
      }
    }
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

  private createLootboxMarker(lootbox: Lootbox): Container {
    const container = new Container()
    const { x, y } = hexToPixel(lootbox.position, this.layout)
    container.x = x
    container.y = y

    const texture = RESOURCE_TEXTURES.get('lootbox')
    const size = this.hexSize * 0.6

    if (texture) {
      // Use PNG sprite
      const sprite = new Sprite(texture)
      sprite.anchor.set(0.5)
      const scale = size / Math.max(texture.width, texture.height)
      sprite.scale.set(scale)
      container.addChild(sprite)
    } else {
      // Fallback to drawn box
      const graphics = new Graphics()
      const boxSize = this.hexSize * 0.3

      // Outer glow
      graphics.circle(0, 0, boxSize * 1.5)
      graphics.fill({ color: UI_COLORS.lootbox, alpha: 0.3 })

      // Box shape
      graphics.rect(-boxSize, -boxSize, boxSize * 2, boxSize * 2)
      graphics.fill({ color: UI_COLORS.lootbox })
      graphics.stroke({ color: 0xffffff, width: 2 })

      // Question mark
      const style = new TextStyle({
        fontSize: boxSize * 1.5,
        fill: 0xffffff,
        fontWeight: 'bold',
      })
      const text = new Text({ text: '?', style })
      text.anchor.set(0.5)
      graphics.addChild(text)
      container.addChild(graphics)
    }

    return container
  }

  private updateOverlays(state: GameState): void {
    const currentPlayerFog = state.fog.get(state.currentPlayer)

    // === FOG LAYER (only rebuild when fog changes) ===
    const fogChanged = this.hasFogChanged(currentPlayerFog)
    if (fogChanged) {
      this.fogContainer.removeChildren()
      if (currentPlayerFog) {
        for (const [key, tile] of state.map.tiles) {
          if (!currentPlayerFog.has(key)) {
            const { x, y } = hexToPixel(tile.coord, this.layout)
            const fog = new Graphics()
            this.drawHex(fog, x, y, UI_COLORS.fog)
            fog.alpha = 1.0
            this.fogContainer.addChild(fog)
          }
        }
      }
      // Update fog tracking
      this.lastFogSet = currentPlayerFog ? new Set(currentPlayerFog) : null
    }

    // === RANGE LAYER (only rebuild when reachable/attack hexes change) ===
    const rangeChanged = this.hasRangeChanged()
    if (rangeChanged) {
      this.rangeContainer.removeChildren()

      // Draw reachable hexes (movement range)
      for (const hKey of this.reachableHexes) {
        const tile = state.map.tiles.get(hKey)
        if (tile && currentPlayerFog?.has(hKey)) {
          const { x, y } = hexToPixel(tile.coord, this.layout)
          const reachable = new Graphics()
          this.drawHexFill(reachable, x, y, UI_COLORS.reachable, 0.3)
          this.rangeContainer.addChild(reachable)
        }
      }

      // Draw attack target hexes (enemy units in range)
      for (const hKey of this.attackTargetHexes) {
        const tile = state.map.tiles.get(hKey)
        if (tile && currentPlayerFog?.has(hKey)) {
          const { x, y } = hexToPixel(tile.coord, this.layout)
          const attackTarget = new Graphics()
          this.drawHexFill(attackTarget, x, y, UI_COLORS.attackTarget, 0.4)
          this.drawHexOutline(attackTarget, x, y, UI_COLORS.attackTarget, 2)
          this.rangeContainer.addChild(attackTarget)
        }
      }

      // Update range tracking
      this.lastReachableHexes = new Set(this.reachableHexes)
      this.lastAttackTargetHexes = new Set(this.attackTargetHexes)
    }

    // === UI LAYER (hover/selection/arrows) ===
    this.updateUILayer(state)

    // === YIELD LAYER (only rebuild when settlement selection changes) ===
    const currentSettlementId = this.selectedSettlement?.id ?? null
    if (currentSettlementId !== this.lastSelectedSettlementId) {
      this.lastSelectedSettlementId = currentSettlementId
      this.updateYieldLayer(state)
    }

    // === SETTLEMENT HEALTH LAYER (only rebuild when health changes) ===
    this.updateSettlementHealthBars(state)
  }

  /**
   * Update only the UI layer (hover, selection, arrows) - called frequently on hover
   */
  private updateUILayer(_state: GameState): void {
    this.uiContainer.removeChildren()

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
        this.uiContainer.addChild(arrow)
      }
    }

    // Draw hover highlight
    if (this.hoveredTile) {
      const { x, y } = hexToPixel(this.hoveredTile, this.layout)
      const hover = new Graphics()
      this.drawHexOutline(hover, x, y, UI_COLORS.hover, 2)
      this.uiContainer.addChild(hover)
    }

    // Draw selection highlight
    if (this.selectedTile) {
      const { x, y } = hexToPixel(this.selectedTile, this.layout)
      const selection = new Graphics()
      this.drawHexOutline(selection, x, y, UI_COLORS.selected, 3)
      this.uiContainer.addChild(selection)
    }
  }

  /**
   * Update the yield layer (settlement tile yields) - called only when settlement selection changes
   */
  private updateYieldLayer(state: GameState): void {
    // Reset pool indices
    this.pooledGraphicsIndex = 0
    this.pooledTextIndex = 0

    // Hide all pooled objects (will show as needed)
    for (const g of this.yieldGraphicsPool) g.visible = false
    for (const t of this.yieldTextPool) t.visible = false

    if (this.selectedSettlement && this.selectedSettlement.owner === state.currentPlayer) {
      this.drawSettlementYields(state)
    }
  }

  /**
   * Update settlement health bars - only shows for damaged settlements
   */
  private updateSettlementHealthBars(state: GameState): void {
    // Check if any settlement health changed
    let healthChanged = false
    const currentHealthMap = new Map<string, number>()

    for (const settlement of state.settlements.values()) {
      currentHealthMap.set(settlement.id, settlement.health)
      const lastHealth = this.lastSettlementHealthMap.get(settlement.id)
      if (lastHealth !== settlement.health) {
        healthChanged = true
      }
    }

    // Also check if settlements were added/removed
    if (currentHealthMap.size !== this.lastSettlementHealthMap.size) {
      healthChanged = true
    }

    if (!healthChanged) return

    // Update tracking
    this.lastSettlementHealthMap = currentHealthMap

    // Rebuild health bars
    this.settlementHealthContainer.removeChildren()

    const currentPlayerFog = state.fog.get(state.currentPlayer)

    for (const settlement of state.settlements.values()) {
      // Only show health bar for damaged settlements
      if (settlement.health >= settlement.maxHealth) continue

      // Check if visible (in fog of war)
      const key = hexKey(settlement.position)
      if (currentPlayerFog && !currentPlayerFog.has(key)) continue

      // Draw health bar
      const { x, y } = hexToPixel(settlement.position, this.layout)
      const healthBar = this.createSettlementHealthBar(
        settlement.health,
        settlement.maxHealth
      )
      healthBar.x = x
      healthBar.y = y - this.hexSize * 0.6 // Position above settlement
      this.settlementHealthContainer.addChild(healthBar)
    }
  }

  /**
   * Create a health bar graphics for a settlement
   */
  private createSettlementHealthBar(health: number, maxHealth: number): Container {
    const container = new Container()
    const barWidth = this.hexSize * 1.2
    const barHeight = 6
    const healthPercent = health / maxHealth

    // Background (dark)
    const bg = new Graphics()
    bg.roundRect(-barWidth / 2, 0, barWidth, barHeight, 2)
    bg.fill({ color: 0x000000, alpha: 0.7 })
    container.addChild(bg)

    // Health fill
    const fill = new Graphics()
    const fillWidth = barWidth * healthPercent
    const fillColor = healthPercent > 0.5 ? 0x4ade80 : healthPercent > 0.25 ? 0xfbbf24 : 0xef4444
    fill.roundRect(-barWidth / 2, 0, fillWidth, barHeight, 2)
    fill.fill({ color: fillColor })
    container.addChild(fill)

    // Border
    const border = new Graphics()
    border.roundRect(-barWidth / 2, 0, barWidth, barHeight, 2)
    border.stroke({ color: 0xffffff, width: 1, alpha: 0.5 })
    container.addChild(border)

    // Health text
    const style = new TextStyle({
      fontSize: 10,
      fill: 0xffffff,
      fontWeight: 'bold',
      stroke: {
        color: 0x000000,
        width: 2,
      },
    })
    const text = new Text({ text: `${health}/${maxHealth}`, style })
    text.anchor.set(0.5, 0)
    text.y = barHeight + 2
    container.addChild(text)

    return container
  }

  /**
   * Check if fog of war has changed
   */
  private hasFogChanged(currentFog: ReadonlySet<string> | undefined): boolean {
    if (!this.lastFogSet && !currentFog) return false
    if (!this.lastFogSet || !currentFog) return true
    if (this.lastFogSet.size !== currentFog.size) return true

    for (const key of currentFog) {
      if (!this.lastFogSet.has(key)) return true
    }
    return false
  }

  /**
   * Check if reachable/attack hexes have changed
   */
  private hasRangeChanged(): boolean {
    if (this.reachableHexes.size !== this.lastReachableHexes.size) return true
    if (this.attackTargetHexes.size !== this.lastAttackTargetHexes.size) return true

    for (const key of this.reachableHexes) {
      if (!this.lastReachableHexes.has(key)) return true
    }
    for (const key of this.attackTargetHexes) {
      if (!this.lastAttackTargetHexes.has(key)) return true
    }
    return false
  }

  private drawSettlementYields(state: GameState): void {
    if (!this.selectedSettlement) return

    const settlementOwner = this.selectedSettlement.owner
    const settlementCoord = this.selectedSettlement.position
    const currentPlayerFog = state.fog.get(state.currentPlayer)

    // Iterate all tiles owned by this settlement's owner
    for (const [key, tile] of state.map.tiles) {
      // Only show tiles owned by the same tribe as the settlement
      if (tile.owner !== settlementOwner) continue

      // Skip the settlement tile itself
      if (tile.coord.q === settlementCoord.q && tile.coord.r === settlementCoord.r) continue

      // Check if visible
      if (currentPlayerFog && !currentPlayerFog.has(key)) continue

      // Get yields from cache or calculate and cache
      let yields = this.yieldCache.get(key)
      if (!yields) {
        yields = calculateTileYields(tile)
        this.yieldCache.set(key, yields)
      }

      const { x, y } = hexToPixel(tile.coord, this.layout)

      // Draw yield indicators
      this.drawTileYields(x, y, yields)
    }
  }

  private drawTileYields(
    x: number,
    y: number,
    yields: { gold: number; alpha: number; vibes: number; production: number; growth: number }
  ): void {
    const yieldEntries: Array<{ value: number; color: number; label: string }> = []

    if (yields.gold > 0) yieldEntries.push({ value: yields.gold, color: YIELD_COLORS.gold, label: 'G' })
    if (yields.production > 0) yieldEntries.push({ value: yields.production, color: YIELD_COLORS.production, label: 'P' })
    if (yields.alpha > 0) yieldEntries.push({ value: yields.alpha, color: YIELD_COLORS.alpha, label: 'A' })
    if (yields.vibes > 0) yieldEntries.push({ value: yields.vibes, color: YIELD_COLORS.vibes, label: 'V' })
    if (yields.growth > 0) yieldEntries.push({ value: yields.growth, color: YIELD_COLORS.growth, label: 'F' })

    if (yieldEntries.length === 0) return

    // Position yields in a row at bottom of hex
    const spacing = 18
    const totalWidth = yieldEntries.length * spacing
    const startX = x - totalWidth / 2 + spacing / 2
    const yPos = y + this.hexSize * 0.35

    for (let i = 0; i < yieldEntries.length; i++) {
      const entry = yieldEntries[i]!
      const xPos = startX + i * spacing

      // Get or create pooled background graphic
      const bg = this.getPooledGraphics()
      bg.clear()
      bg.circle(xPos, yPos, 10)
      bg.fill({ color: 0x000000, alpha: 0.7 })
      bg.visible = true

      // Get or create pooled text
      const text = this.getPooledText()
      text.text = entry.value.toString()
      text.style.fill = entry.color
      text.x = xPos
      text.y = yPos
      text.visible = true
    }
  }

  /**
   * Get a pooled Graphics object, creating if needed
   */
  private getPooledGraphics(): Graphics {
    if (this.pooledGraphicsIndex < this.yieldGraphicsPool.length) {
      return this.yieldGraphicsPool[this.pooledGraphicsIndex++]!
    }
    // Create new graphics and add to pool
    const g = new Graphics()
    this.yieldGraphicsPool.push(g)
    this.yieldContainer.addChild(g)
    this.pooledGraphicsIndex++
    return g
  }

  /**
   * Get a pooled Text object, creating if needed
   */
  private getPooledText(): Text {
    if (this.pooledTextIndex < this.yieldTextPool.length) {
      return this.yieldTextPool[this.pooledTextIndex++]!
    }
    // Create new text and add to pool
    const style = new TextStyle({
      fontSize: 12,
      fontWeight: 'bold',
      fill: 0xffffff,
    })
    const t = new Text({ text: '0', style })
    t.anchor.set(0.5)
    this.yieldTextPool.push(t)
    this.yieldContainer.addChild(t)
    this.pooledTextIndex++
    return t
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
    // Skip if no change
    if (this.hoveredTile?.q === coord?.q && this.hoveredTile?.r === coord?.r) {
      return
    }

    this.hoveredTile = coord

    // Throttle hover updates for performance
    const now = Date.now()
    if (now - this.lastHoverUpdate < this.HOVER_THROTTLE_MS) {
      if (!this.hoverUpdatePending) {
        this.hoverUpdatePending = true
        requestAnimationFrame(() => {
          this.hoverUpdatePending = false
          this.lastHoverUpdate = Date.now()
          if (this.lastState) {
            this.updateUILayer(this.lastState)
          }
        })
      }
      return
    }

    this.lastHoverUpdate = now
    // Only update UI layer (hover/selection), NOT yields or fog
    if (this.lastState) {
      this.updateUILayer(this.lastState)
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

  setSelectedSettlement(settlement: Settlement | null): void {
    // Skip if no change
    if (this.selectedSettlement?.id === settlement?.id) {
      return
    }
    this.selectedSettlement = settlement
    this.lastSelectedSettlementId = null // Force yield layer rebuild
    // Update yield layer (selection changes less frequently, so always update)
    if (this.lastState) {
      this.updateYieldLayer(this.lastState)
    }
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
