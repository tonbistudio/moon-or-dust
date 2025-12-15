import { Container, Graphics } from 'pixi.js'
import type { GameState, Unit, UnitRarity, UnitType } from '@tribes/game-core'
import { hexToPixel, type HexLayout } from '@tribes/game-core'

// =============================================================================
// Rarity Colors
// =============================================================================

const RARITY_COLORS: Record<UnitRarity, number | null> = {
  common: null, // No border
  uncommon: 0x22c55e, // Green
  rare: 0x3b82f6, // Blue
  epic: 0xa855f7, // Purple
  legendary: 0xeab308, // Gold
}

const RARITY_GLOW_INTENSITY: Record<UnitRarity, number> = {
  common: 0,
  uncommon: 0,
  rare: 0,
  epic: 0.3,
  legendary: 0.5,
}

// =============================================================================
// Unit Type Icons (simple shapes for now)
// =============================================================================

const UNIT_COLORS: Record<UnitType, number> = {
  scout: 0x38bdf8, // Light blue - exploration
  warrior: 0xef4444, // Red - melee combat
  ranged: 0xfbbf24, // Amber - ranged attack
  settler: 0x10b981, // Emerald - founding
  builder: 0x8b5cf6, // Violet - construction
  great_person: 0xec4899, // Pink - special
}

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

  constructor(layout: HexLayout) {
    this.layout = layout
    this.container = new Container()
  }

  getContainer(): Container {
    return this.container
  }

  setSelectedUnit(unitId: string | null): void {
    this.selectedUnitId = unitId
  }

  update(state: GameState, currentPlayerId: string): void {
    // Get visible units (respecting fog of war)
    const visibleFog = state.fog.get(state.currentPlayer)
    const visibleUnits: Unit[] = []

    for (const unit of state.units.values()) {
      const hexKey = `${unit.position.q},${unit.position.r}`
      // Show if in visible area or belongs to current player
      if (visibleFog?.has(hexKey) || unit.owner === currentPlayerId) {
        visibleUnits.push(unit)
      }
    }

    // Track which units to keep
    const visibleUnitIds = new Set(visibleUnits.map((u) => u.id))

    // Remove units that are no longer visible
    for (const [id, graphics] of this.unitGraphics) {
      if (!visibleUnitIds.has(id as never)) {
        this.container.removeChild(graphics)
        this.unitGraphics.delete(id)
      }
    }

    // Group units by hex position for stacking offsets
    this.unitsByHex.clear()
    for (const unit of visibleUnits) {
      const key = `${unit.position.q},${unit.position.r}`
      const existing = this.unitsByHex.get(key) ?? []
      existing.push(unit)
      this.unitsByHex.set(key, existing)
    }

    // Update or create visible units
    for (const unit of visibleUnits) {
      let unitContainer = this.unitGraphics.get(unit.id)

      if (!unitContainer) {
        // Create new unit graphic
        unitContainer = this.createUnitGraphic(unit, state)
        this.unitGraphics.set(unit.id, unitContainer)
        this.container.addChild(unitContainer)
      }

      // Update position with stacking offset
      const { x, y } = hexToPixel(unit.position, this.layout)
      const hexKey = `${unit.position.q},${unit.position.r}`
      const unitsAtHex = this.unitsByHex.get(hexKey) ?? []
      const stackIndex = unitsAtHex.indexOf(unit)
      const stackOffset = this.getStackOffset(stackIndex, unitsAtHex.length)

      unitContainer.x = x + stackOffset.x
      unitContainer.y = y + stackOffset.y

      // Update health bar if needed
      this.updateHealthBar(unitContainer, unit)
    }

    // Update selection highlight
    this.updateSelectionHighlight(state)
  }

  private updateSelectionHighlight(state: GameState): void {
    // Remove existing selection highlight
    if (this.selectionGraphic) {
      this.container.removeChild(this.selectionGraphic)
      this.selectionGraphic = null
    }

    // Draw new selection highlight if a unit is selected
    if (this.selectedUnitId) {
      const unit = state.units.get(this.selectedUnitId as never)
      if (unit) {
        const { x, y } = hexToPixel(unit.position, this.layout)
        const unitSize = this.layout.size * 0.4

        // Calculate stack offset for selection highlight
        const hexKey = `${unit.position.q},${unit.position.r}`
        const unitsAtHex = this.unitsByHex.get(hexKey) ?? []
        const stackIndex = unitsAtHex.findIndex((u) => u.id === unit.id)
        const stackOffset = this.getStackOffset(stackIndex, unitsAtHex.length)

        this.selectionGraphic = new Graphics()

        // Animated selection ring
        this.selectionGraphic.circle(0, 0, unitSize * 1.8)
        this.selectionGraphic.stroke({ color: 0xffffff, width: 3, alpha: 0.8 })

        // Inner pulsing ring
        this.selectionGraphic.circle(0, 0, unitSize * 1.5)
        this.selectionGraphic.stroke({ color: 0xf59e0b, width: 2, alpha: 0.6 })

        this.selectionGraphic.x = x + stackOffset.x
        this.selectionGraphic.y = y + stackOffset.y
        this.container.addChild(this.selectionGraphic)
      }
    }
  }

  private createUnitGraphic(unit: Unit, state: GameState): Container {
    const container = new Container()
    const unitSize = this.layout.size * 0.4

    // Get player color (fallback to white)
    const player = state.players.find((p) => p.tribeId === unit.owner)
    const playerColor = player ? 0xffffff : 0xffffff // TODO: get tribe color

    // Draw rarity glow (for epic and legendary)
    const glowIntensity = RARITY_GLOW_INTENSITY[unit.rarity]
    if (glowIntensity > 0) {
      const glow = new Graphics()
      const glowColor = RARITY_COLORS[unit.rarity]!
      glow.circle(0, 0, unitSize * 1.6)
      glow.fill({ color: glowColor, alpha: glowIntensity })
      container.addChild(glow)

      // Add outer glow layer
      const outerGlow = new Graphics()
      outerGlow.circle(0, 0, unitSize * 2)
      outerGlow.fill({ color: glowColor, alpha: glowIntensity * 0.5 })
      container.addChildAt(outerGlow, 0)
    }

    // Draw rarity border (colored ring)
    const rarityColor = RARITY_COLORS[unit.rarity]
    if (rarityColor !== null) {
      const border = new Graphics()
      border.circle(0, 0, unitSize * 1.2)
      border.fill({ color: rarityColor })
      container.addChild(border)
    }

    // Draw unit base (circle with unit type color)
    const base = new Graphics()
    base.circle(0, 0, unitSize)
    base.fill({ color: UNIT_COLORS[unit.type] })
    base.stroke({ color: playerColor, width: 2 })
    container.addChild(base)

    // Draw unit type symbol
    const symbol = this.createUnitSymbol(unit.type, unitSize * 0.6)
    container.addChild(symbol)

    // Draw health bar background
    const healthBarBg = new Graphics()
    const barWidth = unitSize * 2
    const barHeight = 4
    const barY = unitSize + 8
    healthBarBg.rect(-barWidth / 2, barY, barWidth, barHeight)
    healthBarBg.fill({ color: 0x1f2937 })
    healthBarBg.name = 'healthBarBg'
    container.addChild(healthBarBg)

    // Draw health bar fill
    const healthBarFill = new Graphics()
    healthBarFill.name = 'healthBarFill'
    container.addChild(healthBarFill)

    this.updateHealthBar(container, unit)

    return container
  }

  private createUnitSymbol(unitType: UnitType, size: number): Graphics {
    const symbol = new Graphics()

    switch (unitType) {
      case 'scout':
        // Eye symbol (exploration)
        symbol.circle(0, 0, size * 0.3)
        symbol.fill({ color: 0xffffff })
        symbol.circle(0, 0, size * 0.15)
        symbol.fill({ color: 0x000000 })
        break

      case 'warrior':
        // Sword symbol
        symbol.moveTo(0, -size * 0.5)
        symbol.lineTo(0, size * 0.3)
        symbol.moveTo(-size * 0.3, -size * 0.2)
        symbol.lineTo(size * 0.3, -size * 0.2)
        symbol.stroke({ color: 0xffffff, width: 3 })
        break

      case 'ranged':
        // Bow/arrow symbol
        symbol.moveTo(-size * 0.3, -size * 0.3)
        symbol.lineTo(size * 0.3, size * 0.3)
        symbol.moveTo(size * 0.1, size * 0.3)
        symbol.lineTo(size * 0.3, size * 0.3)
        symbol.lineTo(size * 0.3, size * 0.1)
        symbol.stroke({ color: 0xffffff, width: 2 })
        break

      case 'settler':
        // House symbol
        symbol.moveTo(0, -size * 0.4)
        symbol.lineTo(size * 0.4, 0)
        symbol.lineTo(size * 0.4, size * 0.4)
        symbol.lineTo(-size * 0.4, size * 0.4)
        symbol.lineTo(-size * 0.4, 0)
        symbol.closePath()
        symbol.fill({ color: 0xffffff })
        break

      case 'builder':
        // Hammer symbol
        symbol.rect(-size * 0.1, -size * 0.4, size * 0.2, size * 0.8)
        symbol.fill({ color: 0xffffff })
        symbol.rect(-size * 0.3, -size * 0.4, size * 0.6, size * 0.2)
        symbol.fill({ color: 0xffffff })
        break

      case 'great_person':
        // Star symbol
        const points: number[] = []
        for (let i = 0; i < 5; i++) {
          const outerAngle = (Math.PI / 2) + (i * 2 * Math.PI) / 5
          const innerAngle = outerAngle + Math.PI / 5
          points.push(Math.cos(outerAngle) * size * 0.5)
          points.push(-Math.sin(outerAngle) * size * 0.5)
          points.push(Math.cos(innerAngle) * size * 0.2)
          points.push(-Math.sin(innerAngle) * size * 0.2)
        }
        symbol.poly(points)
        symbol.fill({ color: 0xffffff })
        break
    }

    return symbol
  }

  private updateHealthBar(container: Container, unit: Unit): void {
    const healthBarFill = container.getChildByName('healthBarFill') as Graphics
    if (!healthBarFill) return

    const unitSize = this.layout.size * 0.4
    const barWidth = unitSize * 2
    const barHeight = 4
    const barY = unitSize + 8

    // Calculate health percentage
    const healthPercent = unit.health / unit.maxHealth
    const fillWidth = barWidth * healthPercent

    // Color based on health
    let fillColor = 0x22c55e // Green
    if (healthPercent < 0.5) fillColor = 0xfbbf24 // Yellow
    if (healthPercent < 0.25) fillColor = 0xef4444 // Red

    healthBarFill.clear()
    healthBarFill.rect(-barWidth / 2, barY, fillWidth, barHeight)
    healthBarFill.fill({ color: fillColor })
  }

  clear(): void {
    this.container.removeChildren()
    this.unitGraphics.clear()
  }

  /**
   * Calculate visual offset for stacked units on the same hex
   */
  private getStackOffset(index: number, total: number): { x: number; y: number } {
    if (total <= 1) return { x: 0, y: 0 }

    const unitSize = this.layout.size * 0.4
    const offset = unitSize * 0.8

    // For 2 units: offset left and right
    if (total === 2) {
      return index === 0 ? { x: -offset, y: 0 } : { x: offset, y: 0 }
    }

    // For 3 units: triangle arrangement
    if (total === 3) {
      if (index === 0) return { x: 0, y: -offset }
      if (index === 1) return { x: -offset, y: offset * 0.5 }
      return { x: offset, y: offset * 0.5 }
    }

    // For 4+ units: grid
    const col = index % 2
    const row = Math.floor(index / 2)
    return {
      x: (col - 0.5) * offset * 1.5,
      y: (row - 0.5) * offset * 1.5,
    }
  }
}
