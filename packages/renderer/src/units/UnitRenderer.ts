import { Container, Graphics, Sprite, Assets, Texture } from 'pixi.js'
import type { GameState, Unit, UnitType, TribeName, UnitRarity } from '@tribes/game-core'
import { hexToPixel, type HexLayout } from '@tribes/game-core'

// =============================================================================
// Direction Types
// =============================================================================

type Direction = 'north' | 'north-east' | 'east' | 'south-east' | 'south' | 'south-west' | 'west' | 'north-west'

// =============================================================================
// Category Colors (for glow effect)
// =============================================================================

type UnitCategory = 'melee' | 'ranged' | 'cavalry' | 'siege' | 'economy' | 'recon' | 'great_person'

const CATEGORY_COLORS: Record<UnitCategory, number> = {
  melee: 0xef4444,      // Red
  ranged: 0x22c55e,     // Green
  cavalry: 0x3b82f6,    // Blue
  siege: 0xf97316,      // Orange
  economy: 0xfbbf24,    // Yellow
  recon: 0xec4899,      // Pink
  great_person: 0xa855f7, // Purple
}

const RARITY_COLORS: Record<UnitRarity, number> = {
  common: 0xffffff,     // White
  uncommon: 0x22c55e,   // Green
  rare: 0x3b82f6,       // Blue
  epic: 0xa855f7,       // Purple
  legendary: 0xfbbf24,  // Gold
}

function getUnitCategory(type: UnitType): UnitCategory {
  switch (type) {
    case 'scout':
      return 'recon'
    case 'warrior':
    case 'swordsman':
    case 'bot_fighter':
    case 'deadgod':
    case 'stuckers':
      return 'melee'
    case 'archer':
    case 'sniper':
    case 'rockeeter':
    case 'banana_slinger':
    case 'neon_geck':
      return 'ranged'
    case 'horseman':
    case 'knight':
    case 'tank':
      return 'cavalry'
    case 'social_engineer':
    case 'bombard':
      return 'siege'
    case 'settler':
    case 'builder':
      return 'economy'
    case 'great_person':
      return 'great_person'
    default:
      return 'melee'
  }
}

// =============================================================================
// Badge Mapping (UnitType -> badge filename)
// =============================================================================

const UNIT_BADGE_MAP: Partial<Record<UnitType, string>> = {
  warrior: 'warrior',
  swordsman: 'swordsman',
  bot_fighter: 'botfighter',
  archer: 'archer',
  sniper: 'sniper',
  rockeeter: 'rocketeer',
  horseman: 'horseman',
  knight: 'knight',
  tank: 'tank',
  social_engineer: 'socialengineer',
  bombard: 'bombard',
  scout: 'scout',
  settler: 'settler',
  builder: 'builder',
  // Tribal unique units - fallback to base unit badge for now
  deadgod: 'swordsman',
  stuckers: 'swordsman',
  banana_slinger: 'archer',
  neon_geck: 'sniper',
}

// =============================================================================
// Sprite Asset Management
// =============================================================================

const TRIBE_SPRITES: Record<string, Record<Direction, Texture>> = {}
const UNIQUE_UNIT_SPRITES: Record<string, Record<Direction, Texture>> = {}
const BADGE_TEXTURES: Record<string, Texture> = {}
const SPRITE_LOAD_PROMISES: Map<string, Promise<void>> = new Map()

const DIRECTIONS: Direction[] = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']
const PLAYABLE_TRIBES: TribeName[] = ['monkes', 'geckos', 'degods', 'cets']

// Unique units that have their own sprite sheets (instead of using tribe sprites)
const UNIQUE_UNIT_TYPES: UnitType[] = ['banana_slinger', 'neon_geck', 'deadgod', 'stuckers']

async function loadTribeSprites(tribeName: TribeName): Promise<void> {
  const key = tribeName

  if (TRIBE_SPRITES[key]) return // Already loaded

  // Check if already loading
  const existingPromise = SPRITE_LOAD_PROMISES.get(key)
  if (existingPromise) {
    await existingPromise
    return
  }

  // Start loading
  const loadPromise = (async () => {
    const textures: Partial<Record<Direction, Texture>> = {}

    for (const dir of DIRECTIONS) {
      const url = `/assets/sprites/tribes/${tribeName}/${dir}.png`
      try {
        const texture = await Assets.load(url)
        textures[dir] = texture
        console.log(`Loaded sprite: ${url}`)
      } catch (error) {
        console.warn(`Failed to load sprite: ${url}`, error)
        // Continue loading other directions even if one fails
      }
    }

    TRIBE_SPRITES[key] = textures as Record<Direction, Texture>
  })()

  SPRITE_LOAD_PROMISES.set(key, loadPromise)
  await loadPromise
}

// Load sprites for a unique unit type
async function loadUniqueUnitSprites(unitType: UnitType): Promise<void> {
  const key = unitType

  if (UNIQUE_UNIT_SPRITES[key]) return // Already loaded

  // Check if already loading
  const existingPromise = SPRITE_LOAD_PROMISES.get(`unit_${key}`)
  if (existingPromise) {
    await existingPromise
    return
  }

  // Start loading
  const loadPromise = (async () => {
    const textures: Partial<Record<Direction, Texture>> = {}

    for (const dir of DIRECTIONS) {
      const url = `/assets/sprites/units/${unitType}/${dir}.png`
      try {
        const texture = await Assets.load(url)
        textures[dir] = texture
        console.log(`Loaded unique unit sprite: ${url}`)
      } catch (error) {
        console.warn(`Failed to load unique unit sprite: ${url}`, error)
      }
    }

    UNIQUE_UNIT_SPRITES[key] = textures as Record<Direction, Texture>
  })()

  SPRITE_LOAD_PROMISES.set(`unit_${key}`, loadPromise)
  await loadPromise
}

// Load all badge textures
async function loadBadgeTextures(): Promise<void> {
  const badgeNames = [...new Set(Object.values(UNIT_BADGE_MAP))]

  for (const badgeName of badgeNames) {
    if (!badgeName) continue
    const url = `/assets/sprites/badges/${badgeName}.png`
    try {
      const texture = await Assets.load(url)
      BADGE_TEXTURES[badgeName] = texture
      console.log(`Loaded badge: ${url}`)
    } catch (error) {
      console.warn(`Failed to load badge: ${url}`, error)
    }
  }
}

// Preload all tribe sprites, unique unit sprites, and badges
export async function preloadAllSprites(): Promise<void> {
  try {
    console.log('Preloading tribe sprites, unique unit sprites, and badges...')
    await Promise.all([
      ...PLAYABLE_TRIBES.map(tribe => loadTribeSprites(tribe)),
      ...UNIQUE_UNIT_TYPES.map(unitType => loadUniqueUnitSprites(unitType)),
      loadBadgeTextures(),
    ])
    console.log('Sprite and badge preloading complete')
  } catch (error) {
    console.error('Failed to preload sprites:', error)
    // Don't block game initialization - fallback graphics will be used
  }
}

function getTribeTexture(tribeName: TribeName, direction: Direction): Texture | null {
  const tribeTextures = TRIBE_SPRITES[tribeName]
  if (!tribeTextures) return null
  return tribeTextures[direction] ?? null
}

function getUniqueUnitTexture(unitType: UnitType, direction: Direction): Texture | null {
  const unitTextures = UNIQUE_UNIT_SPRITES[unitType]
  if (!unitTextures) return null
  return unitTextures[direction] ?? null
}

function isUniqueUnitType(unitType: UnitType): boolean {
  return UNIQUE_UNIT_TYPES.includes(unitType)
}

function getBadgeTexture(unitType: UnitType): Texture | null {
  const badgeName = UNIT_BADGE_MAP[unitType]
  if (!badgeName) return null
  return BADGE_TEXTURES[badgeName] ?? null
}

// Rarity is displayed in UI panel, not on map (see UnitActionsPanel for rarity border)

// =============================================================================
// UnitRenderer
// =============================================================================

export class UnitRenderer {
  private readonly layout: HexLayout
  private readonly container: Container
  private unitGraphics: Map<string, Container> = new Map()
  private unitsByHex: Map<string, Unit[]> = new Map()
  private selectionGraphic: Graphics | null = null
  private selectedUnitId: string | null = null
  private unitDirections: Map<string, Direction> = new Map()
  private unitPreviousPositions: Map<string, { q: number; r: number }> = new Map()
  private hoverTargetHex: { q: number; r: number } | null = null

  constructor(layout: HexLayout) {
    this.layout = layout
    this.container = new Container()

    // Start preloading sprites
    preloadAllSprites()
  }

  getContainer(): Container {
    return this.container
  }

  setSelectedUnit(unitId: string | null): void {
    this.selectedUnitId = unitId
  }

  setHoverTarget(hex: { q: number; r: number } | null): void {
    this.hoverTargetHex = hex
    // Immediately update selected unit's direction for responsive hover rotation
    this.updateSelectedUnitHoverDirection()
  }

  /**
   * Update the selected unit's sprite to face the hover target
   */
  private updateSelectedUnitHoverDirection(): void {
    if (!this.selectedUnitId || !this.hoverTargetHex) return

    const unitContainer = this.unitGraphics.get(this.selectedUnitId)
    if (!unitContainer) return

    const prevPos = this.unitPreviousPositions.get(this.selectedUnitId)
    if (!prevPos) return

    const hoverDir = this.getDirectionToHex(
      prevPos.q, prevPos.r,
      this.hoverTargetHex.q, this.hoverTargetHex.r
    )

    if (hoverDir) {
      this.unitDirections.set(this.selectedUnitId, hoverDir)
      // Update the sprite texture immediately
      this.updateSpriteDirection(unitContainer, hoverDir)
    }
  }

  /**
   * Update a unit container's sprite to face a direction
   */
  private updateSpriteDirection(container: Container, direction: Direction): void {
    // Extract info from container name
    // Format: unit_tribeName_direction OR unique_unitType_direction
    const nameParts = container.name?.split('_')
    if (!nameParts || nameParts.length < 3) return

    const isUnique = nameParts[0] === 'unique'
    let texture: Texture | null = null

    if (isUnique) {
      const unitType = nameParts[1] as UnitType
      texture = getUniqueUnitTexture(unitType, direction)
      container.name = `unique_${unitType}_${direction}`
    } else {
      const tribeName = nameParts[1] as TribeName
      texture = getTribeTexture(tribeName, direction)
      container.name = `unit_${tribeName}_${direction}`
    }

    const spriteChild = container.getChildByName('sprite')
    if (spriteChild && spriteChild instanceof Sprite && texture) {
      spriteChild.texture = texture
    }
  }

  /**
   * Calculate and store unit facing direction based on movement
   */
  private calculateDirection(unitId: string, fromQ: number, fromR: number, toQ: number, toR: number): void {
    const dq = toQ - fromQ
    const dr = toR - fromR

    let direction: Direction = 'south' // default

    // Calculate direction based on hex movement
    if (dq === 0 && dr < 0) direction = 'north'
    else if (dq > 0 && dr < 0) direction = 'north-east'
    else if (dq > 0 && dr === 0) direction = 'east'
    else if (dq > 0 && dr > 0) direction = 'south-east'
    else if (dq === 0 && dr > 0) direction = 'south'
    else if (dq < 0 && dr > 0) direction = 'south-west'
    else if (dq < 0 && dr === 0) direction = 'west'
    else if (dq < 0 && dr < 0) direction = 'north-west'

    this.unitDirections.set(unitId, direction)
  }

  /**
   * Get direction from one hex to another (for hover preview)
   */
  private getDirectionToHex(fromQ: number, fromR: number, toQ: number, toR: number): Direction | null {
    const dq = toQ - fromQ
    const dr = toR - fromR

    if (dq === 0 && dr === 0) return null // Same hex

    // Calculate direction based on hex movement
    if (dq === 0 && dr < 0) return 'north'
    if (dq > 0 && dr < 0) return 'north-east'
    if (dq > 0 && dr === 0) return 'east'
    if (dq > 0 && dr > 0) return 'south-east'
    if (dq === 0 && dr > 0) return 'south'
    if (dq < 0 && dr > 0) return 'south-west'
    if (dq < 0 && dr === 0) return 'west'
    if (dq < 0 && dr < 0) return 'north-west'

    // For diagonal cases not covered above, approximate
    if (dq > 0 && dr < 0) return 'north-east'
    if (dq > 0) return 'south-east'
    if (dq < 0 && dr < 0) return 'north-west'
    return 'south-west'
  }

  update(state: GameState, currentPlayerId: string): void {
    // Get visible units (respecting fog of war)
    const visibleFog = state.fog.get(state.currentPlayer)
    const visibleUnits: Unit[] = []

    for (const unit of state.units.values()) {
      const hexKey = `${unit.position.q},${unit.position.r}`
      if (visibleFog?.has(hexKey) || unit.owner === currentPlayerId) {
        visibleUnits.push(unit)
      }
    }

    const visibleUnitIds = new Set(visibleUnits.map((u) => u.id))

    // Remove units no longer visible
    for (const [id, graphics] of this.unitGraphics) {
      if (!visibleUnitIds.has(id as never)) {
        this.container.removeChild(graphics)
        this.unitGraphics.delete(id)
      }
    }

    // Group units by hex for stacking
    this.unitsByHex.clear()
    for (const unit of visibleUnits) {
      const key = `${unit.position.q},${unit.position.r}`
      const existing = this.unitsByHex.get(key) ?? []
      existing.push(unit)
      this.unitsByHex.set(key, existing)
    }

    // Update or create visible units
    for (const unit of visibleUnits) {
      // Check if unit moved and update direction
      const prevPos = this.unitPreviousPositions.get(unit.id)
      if (prevPos && (prevPos.q !== unit.position.q || prevPos.r !== unit.position.r)) {
        this.calculateDirection(unit.id, prevPos.q, prevPos.r, unit.position.q, unit.position.r)
      }
      this.unitPreviousPositions.set(unit.id, { q: unit.position.q, r: unit.position.r })

      // If this is the selected unit and we have a hover target, temporarily face it
      if (unit.id === this.selectedUnitId && this.hoverTargetHex) {
        const hoverDir = this.getDirectionToHex(
          unit.position.q, unit.position.r,
          this.hoverTargetHex.q, this.hoverTargetHex.r
        )
        if (hoverDir) {
          this.unitDirections.set(unit.id, hoverDir)
        }
      }

      let unitContainer = this.unitGraphics.get(unit.id)

      if (!unitContainer) {
        unitContainer = this.createUnitGraphic(unit, state)
        this.unitGraphics.set(unit.id, unitContainer)
        this.container.addChild(unitContainer)
      } else {
        // Update sprite direction if changed
        this.updateUnitSprite(unitContainer, unit, state)
      }

      // Update position with stacking offset
      const { x, y } = hexToPixel(unit.position, this.layout)
      const hexKey = `${unit.position.q},${unit.position.r}`
      const unitsAtHex = this.unitsByHex.get(hexKey) ?? []
      const stackIndex = unitsAtHex.indexOf(unit)
      const stackOffset = this.getStackOffset(stackIndex, unitsAtHex.length)

      unitContainer.x = x + stackOffset.x
      unitContainer.y = y + stackOffset.y

      this.updateHealthBar(unitContainer, unit)
    }

    this.updateSelectionHighlight(state)
  }

  private updateSelectionHighlight(state: GameState): void {
    if (this.selectionGraphic) {
      this.container.removeChild(this.selectionGraphic)
      this.selectionGraphic = null
    }

    if (this.selectedUnitId) {
      const unit = state.units.get(this.selectedUnitId as never)
      if (unit) {
        const { x, y } = hexToPixel(unit.position, this.layout)
        const unitSize = this.layout.size * 0.5

        const hexKey = `${unit.position.q},${unit.position.r}`
        const unitsAtHex = this.unitsByHex.get(hexKey) ?? []
        const stackIndex = unitsAtHex.findIndex((u) => u.id === unit.id)
        const stackOffset = this.getStackOffset(stackIndex, unitsAtHex.length)

        this.selectionGraphic = new Graphics()

        // Selection ring
        this.selectionGraphic.circle(0, 0, unitSize * 1.4)
        this.selectionGraphic.stroke({ color: 0xffffff, width: 3, alpha: 0.8 })

        this.selectionGraphic.circle(0, 0, unitSize * 1.2)
        this.selectionGraphic.stroke({ color: 0xf59e0b, width: 2, alpha: 0.6 })

        this.selectionGraphic.x = x + stackOffset.x
        this.selectionGraphic.y = y + stackOffset.y
        this.container.addChild(this.selectionGraphic)
      }
    }
  }

  private createUnitGraphic(unit: Unit, state: GameState): Container {
    const container = new Container()

    // Get tribe name from player
    const player = state.players.find((p) => p.tribeId === unit.owner)
    const tribeName: TribeName = player?.tribeName ?? 'cets'

    // Get direction (default to south)
    const direction = this.unitDirections.get(unit.id) ?? 'south'

    // 1. Draw category glow (ellipse underneath) - smaller size
    const category = getUnitCategory(unit.type)
    const glowColor = CATEGORY_COLORS[category]
    const glow = new Graphics()
    glow.ellipse(0, 24, 20, 7)
    glow.fill({ color: glowColor, alpha: 0.6 })
    glow.name = 'glow'
    container.addChild(glow)

    // 2. Add unit sprite - check for unique unit sprite first, then fall back to tribe sprite
    const isUnique = isUniqueUnitType(unit.type)
    const texture = isUnique
      ? getUniqueUnitTexture(unit.type, direction)
      : getTribeTexture(tribeName, direction)

    if (texture) {
      const sprite = new Sprite(texture)
      sprite.anchor.set(0.5, 0.5)
      sprite.name = 'sprite'
      // Scale sprite to fit nicely in hex (1.3x for good visibility)
      const targetSize = this.layout.size * 1.3
      const scale = targetSize / Math.max(sprite.width, sprite.height)
      sprite.scale.set(scale)
      container.addChild(sprite)
    } else {
      // Fallback: colored circle if sprite not loaded
      const fallback = new Graphics()
      fallback.circle(0, 0, this.layout.size * 0.35)
      fallback.fill({ color: glowColor })
      fallback.stroke({ color: 0xffffff, width: 2 })
      fallback.name = 'sprite'
      container.addChild(fallback)
    }

    // 3. Health bar background
    const barWidth = this.layout.size * 1.0
    const barHeight = 4
    const barY = 34

    const healthBarBg = new Graphics()
    healthBarBg.rect(-barWidth / 2, barY, barWidth, barHeight)
    healthBarBg.fill({ color: 0x1f2937 })
    healthBarBg.name = 'healthBarBg'
    container.addChild(healthBarBg)

    // 4. Health bar fill
    const healthBarFill = new Graphics()
    healthBarFill.name = 'healthBarFill'
    container.addChild(healthBarFill)

    // 5. Badge icon (upper-right corner)
    const badgeTexture = getBadgeTexture(unit.type)
    if (badgeTexture) {
      const badge = new Sprite(badgeTexture)
      badge.anchor.set(0.5, 0.5)
      badge.name = 'badge'
      // Scale badge to ~12px
      const badgeTargetSize = 12
      const badgeScale = badgeTargetSize / Math.max(badge.width, badge.height)
      badge.scale.set(badgeScale)
      // Tint badge with rarity color
      const rarityColor = RARITY_COLORS[unit.rarity]
      badge.tint = rarityColor
      // Use additive blend mode to make black background transparent
      badge.blendMode = 'add'
      // Position in upper-right corner
      badge.x = 18
      badge.y = -18
      container.addChild(badge)
    }

    // Store metadata for updates - include unit type for unique units
    container.name = isUnique
      ? `unique_${unit.type}_${direction}`
      : `unit_${tribeName}_${direction}`

    this.updateHealthBar(container, unit)

    return container
  }

  private updateUnitSprite(container: Container, unit: Unit, state: GameState): void {
    const player = state.players.find((p) => p.tribeId === unit.owner)
    const tribeName: TribeName = player?.tribeName ?? 'cets'
    const direction = this.unitDirections.get(unit.id) ?? 'south'
    const isUnique = isUniqueUnitType(unit.type)

    // Check if we need to update the sprite
    const expectedName = isUnique
      ? `unique_${unit.type}_${direction}`
      : `unit_${tribeName}_${direction}`
    if (container.name === expectedName) return

    // Update glow color (in case unit type changed, unlikely but possible)
    const glow = container.getChildByName('glow') as Graphics
    if (glow) {
      const category = getUnitCategory(unit.type)
      const glowColor = CATEGORY_COLORS[category]
      glow.clear()
      glow.ellipse(0, 26, 28, 10)
      glow.fill({ color: glowColor, alpha: 0.6 })
    }

    // Update sprite texture - use unique unit sprite if applicable
    const spriteChild = container.getChildByName('sprite')
    if (spriteChild && spriteChild instanceof Sprite) {
      const texture = isUnique
        ? getUniqueUnitTexture(unit.type, direction)
        : getTribeTexture(tribeName, direction)
      if (texture) {
        spriteChild.texture = texture
      }
    }

    container.name = expectedName
  }

  private updateHealthBar(container: Container, unit: Unit): void {
    const healthBarFill = container.getChildByName('healthBarFill') as Graphics
    if (!healthBarFill) return

    const barWidth = this.layout.size * 1.0
    const barHeight = 4
    const barY = 34

    const healthPercent = unit.health / unit.maxHealth
    const fillWidth = barWidth * healthPercent

    let fillColor = 0x22c55e
    if (healthPercent < 0.5) fillColor = 0xfbbf24
    if (healthPercent < 0.25) fillColor = 0xef4444

    healthBarFill.clear()
    healthBarFill.rect(-barWidth / 2, barY, fillWidth, barHeight)
    healthBarFill.fill({ color: fillColor })
  }

  clear(): void {
    this.container.removeChildren()
    this.unitGraphics.clear()
  }

  private getStackOffset(index: number, total: number): { x: number; y: number } {
    if (total <= 1) return { x: 0, y: 0 }

    // Increased offset for better separation when stacking
    const offset = this.layout.size * 0.5

    if (total === 2) {
      return index === 0 ? { x: -offset, y: 0 } : { x: offset, y: 0 }
    }

    if (total === 3) {
      if (index === 0) return { x: 0, y: -offset }
      if (index === 1) return { x: -offset, y: offset * 0.5 }
      return { x: offset, y: offset * 0.5 }
    }

    const col = index % 2
    const row = Math.floor(index / 2)
    return {
      x: (col - 0.5) * offset * 1.5,
      y: (row - 0.5) * offset * 1.5,
    }
  }
}
