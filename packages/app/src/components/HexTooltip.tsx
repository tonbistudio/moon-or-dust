// Tooltip for displaying hex tile information when hovering

import type { HexCoord, GameState, Unit, TribeId, Tile, PromotionId } from '@tribes/game-core'
import { hexKey, getTileYields, getPromotion, getTribeById } from '@tribes/game-core'
import { TooltipSection, TooltipRow, TooltipDivider } from './Tooltip'

interface HexTooltipProps {
  coord: HexCoord
  state: GameState
  currentPlayer: TribeId
  mousePosition?: { x: number; y: number } | undefined
}

// Terrain display names
const TERRAIN_NAMES: Record<string, string> = {
  grassland: 'Grassland',
  plains: 'Plains',
  forest: 'Forest',
  hills: 'Hills',
  mountain: 'Mountain',
  water: 'Ocean',
  desert: 'Desert',
  jungle: 'Jungle',
  marsh: 'Marsh',
}

// Terrain colors
const TERRAIN_COLORS: Record<string, string> = {
  grassland: '#4ade80',
  plains: '#fbbf24',
  forest: '#22c55e',
  hills: '#a3a3a3',
  mountain: '#737373',
  water: '#3b82f6',
  desert: '#fcd34d',
  jungle: '#16a34a',
  marsh: '#84cc16',
}

// Resource display names
const RESOURCE_NAMES: Record<string, string> = {
  iron: 'Iron',
  horses: 'Horses',
  gems: 'Gems',
  marble: 'Marble',
  hops: 'Hops',
  airdrop: 'Airdrop',
  silicon: 'Silicon',
  pig: 'Pig',
  cattle: 'Cattle',
}

// Resource type labels
const RESOURCE_TYPES: Record<string, { type: string; color: string }> = {
  iron: { type: 'Strategic', color: '#ef4444' },
  horses: { type: 'Strategic', color: '#ef4444' },
  gems: { type: 'Luxury', color: '#a855f7' },
  marble: { type: 'Luxury', color: '#a855f7' },
  hops: { type: 'Luxury', color: '#a855f7' },
  airdrop: { type: 'Luxury', color: '#a855f7' },
  silicon: { type: 'Luxury', color: '#a855f7' },
  pig: { type: 'Bonus', color: '#22c55e' },
  cattle: { type: 'Bonus', color: '#22c55e' },
}

// Yield colors
const YIELD_COLORS: Record<string, string> = {
  gold: '#fbbf24',
  alpha: '#3b82f6',
  vibes: '#ec4899',
  production: '#f97316',
  growth: '#22c55e',
}

// Get tile from hex map
function getTile(state: GameState, coord: HexCoord): Tile | undefined {
  const key = hexKey(coord)
  return state.map.tiles.get(key)
}

export function HexTooltip({
  coord,
  state,
  currentPlayer,
  mousePosition,
}: HexTooltipProps): JSX.Element | null {
  const tile = getTile(state, coord)

  if (!tile) return null

  const terrainName = TERRAIN_NAMES[tile.terrain] || tile.terrain
  const terrainColor = TERRAIN_COLORS[tile.terrain] || '#888'

  // Get tile yields
  const yields = getTileYields(tile)
  const hasYields = yields.gold > 0 || yields.alpha > 0 || yields.vibes > 0 || yields.production > 0 || yields.growth > 0

  // Get resource info
  const resource = tile.resource?.type
  const resourceInfo = resource ? RESOURCE_TYPES[resource] : null
  const isImproved = tile.resource?.improved ?? false

  // Check for unit on tile
  const unitOnTile = Array.from(state.units.values()).find(
    u => u.position.q === coord.q && u.position.r === coord.r
  )

  // Check for settlement on tile
  const settlementOnTile = Array.from(state.settlements.values()).find(
    s => s.position.q === coord.q && s.position.r === coord.r
  )

  const posX = mousePosition?.x ?? 200
  const posY = mousePosition?.y ?? 200

  return (
    <div
      style={{
        position: 'fixed',
        left: posX + 16,
        top: posY + 16,
        background: 'linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 100%)',
        border: '1px solid #444',
        borderRadius: '6px',
        padding: '10px 12px',
        maxWidth: 240,
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        pointerEvents: 'none',
        zIndex: 9999,
        color: '#fff',
        fontSize: '12px',
      }}
    >
      {/* Terrain header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '2px',
            background: terrainColor,
          }}
        />
        <div style={{ fontWeight: 600, color: terrainColor }}>{terrainName}</div>
        <div style={{ fontSize: '10px', color: '#666', marginLeft: 'auto' }}>
          ({coord.q}, {coord.r})
        </div>
      </div>

      {/* Settlement info */}
      {settlementOnTile && (
        <>
          <TooltipDivider />
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontWeight: 600, color: settlementOnTile.owner === currentPlayer ? '#22c55e' : '#ef4444', marginBottom: '2px' }}>
              {settlementOnTile.name}
            </div>
            <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>
              Level {settlementOnTile.level} Settlement
              {settlementOnTile.owner !== currentPlayer && ' (Enemy)'}
            </div>
            {/* Settlement HP */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#888' }}>HP:</span>
              <div style={{ flex: 1, height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${(settlementOnTile.health / settlementOnTile.maxHealth) * 100}%`,
                    height: '100%',
                    background: settlementOnTile.health < settlementOnTile.maxHealth * 0.5 ? '#ef4444' : '#4ade80',
                    transition: 'width 0.2s',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: '11px',
                  color: settlementOnTile.health < settlementOnTile.maxHealth * 0.5 ? '#ef4444' : '#4ade80',
                  minWidth: '45px',
                  textAlign: 'right',
                }}
              >
                {settlementOnTile.health}/{settlementOnTile.maxHealth}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Unit info */}
      {unitOnTile && !settlementOnTile && (
        <>
          <TooltipDivider />
          <UnitInfo unit={unitOnTile} isEnemy={unitOnTile.owner !== currentPlayer} />
        </>
      )}

      {/* Resource */}
      {resource && resourceInfo && (
        <>
          <TooltipDivider />
          <TooltipSection label="Resource">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: resourceInfo.color, fontWeight: 600 }}>
                {RESOURCE_NAMES[resource] || resource}
              </span>
              <span style={{ fontSize: '10px', color: '#666' }}>({resourceInfo.type})</span>
              {!isImproved && (
                <span style={{ fontSize: '10px', color: '#f97316', marginLeft: 'auto' }}>
                  Unimproved
                </span>
              )}
            </div>
          </TooltipSection>
        </>
      )}

      {/* Yields section */}
      {hasYields && (
        <>
          <TooltipDivider />
          <TooltipSection label="Yields">
            {yields.gold > 0 && <TooltipRow label="Gold" value={`+${yields.gold}`} valueColor={YIELD_COLORS.gold!} />}
            {yields.alpha > 0 && <TooltipRow label="Alpha" value={`+${yields.alpha}`} valueColor={YIELD_COLORS.alpha!} />}
            {yields.vibes > 0 && <TooltipRow label="Vibes" value={`+${yields.vibes}`} valueColor={YIELD_COLORS.vibes!} />}
            {yields.production > 0 && <TooltipRow label="Production" value={`+${yields.production}`} valueColor={YIELD_COLORS.production!} />}
            {yields.growth > 0 && <TooltipRow label="Growth" value={`+${yields.growth}`} valueColor={YIELD_COLORS.growth!} />}
          </TooltipSection>
        </>
      )}

      {/* Improvement */}
      {tile.improvement && (
        <>
          <TooltipDivider />
          <div style={{ fontSize: '11px' }}>
            <span style={{ color: '#888' }}>Improvement: </span>
            <span style={{ color: '#f97316', fontWeight: 500 }}>
              {tile.improvement.replace(/_/g, ' ')}
            </span>
          </div>
        </>
      )}

      {/* Ownership */}
      {tile.owner && (
        <div style={{ fontSize: '10px', color: '#666', marginTop: '6px' }}>
          Controlled by {getTribeById(tile.owner)?.displayName ?? tile.owner}
        </div>
      )}
    </div>
  )
}

// Path colors for promotions
const PROMOTION_PATH_COLORS: Record<string, string> = {
  combat: '#ef4444',
  mobility: '#3b82f6',
  survival: '#22c55e',
}

// Unit info sub-component
function UnitInfo({ unit, isEnemy }: { unit: Unit; isEnemy: boolean }): JSX.Element {
  const unitName = unit.type.replace(/_/g, ' ')
  const nameColor = isEnemy ? '#ef4444' : '#22c55e'

  return (
    <div style={{ marginBottom: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <span style={{ fontWeight: 600, color: nameColor, textTransform: 'capitalize' }}>
          {unitName}
        </span>
        <span style={{ fontSize: '10px', color: '#888' }}>
          ({isEnemy ? 'Enemy' : 'Friendly'})
        </span>
      </div>
      <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
        <span>
          <span style={{ color: '#888' }}>HP:</span>{' '}
          <span style={{ color: unit.health < unit.maxHealth / 2 ? '#ef4444' : '#4ade80' }}>
            {unit.health}/{unit.maxHealth}
          </span>
        </span>
        <span>
          <span style={{ color: '#888' }}>Str:</span>{' '}
          <span style={{ color: '#fbbf24' }}>{unit.combatStrength}</span>
        </span>
        <span>
          <span style={{ color: '#888' }}>Mov:</span>{' '}
          <span style={{ color: '#3b82f6' }}>{unit.movementRemaining}/{unit.maxMovement}</span>
        </span>
      </div>
      {/* Rarity */}
      {unit.rarity && unit.rarity !== 'common' && (
        <div style={{ fontSize: '10px', marginTop: '4px' }}>
          <span
            style={{
              color:
                unit.rarity === 'legendary'
                  ? '#fbbf24'
                  : unit.rarity === 'epic'
                    ? '#a855f7'
                    : unit.rarity === 'rare'
                      ? '#3b82f6'
                      : '#22c55e',
              fontWeight: 600,
              textTransform: 'capitalize',
            }}
          >
            {unit.rarity}
          </span>
        </div>
      )}
      {/* Level and XP */}
      {unit.level > 0 && (
        <div style={{ fontSize: '10px', marginTop: '4px', color: '#a855f7' }}>
          Level {unit.level} | XP: {unit.experience}
        </div>
      )}
      {/* Promotions */}
      {unit.promotions.length > 0 && (
        <div style={{ marginTop: '6px' }}>
          <div style={{ fontSize: '9px', color: '#666', marginBottom: '2px' }}>Promotions:</div>
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
            {unit.promotions.map((promoId: PromotionId) => {
              const promo = getPromotion(promoId)
              if (!promo) return null
              const color = PROMOTION_PATH_COLORS[promo.path] ?? '#888'
              return (
                <div
                  key={promoId}
                  style={{
                    padding: '1px 4px',
                    fontSize: '9px',
                    background: `${color}20`,
                    border: `1px solid ${color}40`,
                    borderRadius: '2px',
                    color,
                  }}
                  title={promo.description}
                >
                  {promo.name}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
