// HUD overlay container for game UI elements

import { useState, useMemo } from 'react'
import type { TechId, CultureId, HexCoord, Unit, SettlementId, PolicyId, PromotionId, UnitId } from '@tribes/game-core'
import { getTech, getResearchProgress, getTurnsToComplete, getCulture, getCultureProgress, getTurnsToCompleteCulture, hexKey, getValidTargets, hasPendingMilestone, isCultureReadyForCompletion, canLevelUp, calculateFloorPriceBreakdown } from '@tribes/game-core'
import { useGame, useCurrentPlayer, useSelectedSettlement, useSelectedUnit } from '../hooks/useGame'
import { useGameContext } from '../context/GameContext'
import { SettlementPanel } from './SettlementPanel'
import { UnitActionsPanel } from './UnitActionsPanel'
import { TechTreePanel } from './tech'
import { CultureTreePanel } from './cultures'
import { PolicyPanel, PolicySelectionPopup, type PolicyConfirmDestination } from './policies'
import { LootboxRewardPopup } from './LootboxRewardPopup'
import { TechCompletedPopup } from './TechCompletedPopup'
import { GoldenAgePopup } from './GoldenAgePopup'
import { YieldIcon } from './YieldIcon'
import { CombatPreviewPanel } from './CombatPreviewPanel'
import { EventLog } from './EventLog'
import { DiplomacyPanel } from './DiplomacyPanel'
import { TradePanel } from './TradePanel'
import { WarConfirmationPopup } from './WarConfirmationPopup'
import { MilestonePanel } from './MilestonePanel'
import { HexTooltip } from './HexTooltip'
import { PromotionSelectionPopup } from './PromotionSelectionPopup'
import { Tooltip, TooltipHeader, TooltipSection, TooltipRow, TooltipDivider } from './Tooltip'

interface GameUIProps {
  hoveredTile?: HexCoord | null
  mousePosition?: { x: number; y: number }
  onZoomIn?: (() => void) | undefined
  onZoomOut?: (() => void) | undefined
}

export function GameUI({ hoveredTile, mousePosition, onZoomIn, onZoomOut }: GameUIProps): JSX.Element | null {
  const { state, dispatch } = useGame()
  const {
    pendingLootboxReward,
    dismissLootboxReward,
    pendingTechCompletion,
    dismissTechCompletion,
    pendingGoldenAge,
    dismissGoldenAge,
    pendingWarAttack,
    confirmWarAttack,
    cancelWarAttack,
    canSwapPolicies,
    events,
  } = useGameContext()
  const currentPlayer = useCurrentPlayer()
  const selectedSettlement = useSelectedSettlement()
  const selectedUnit = useSelectedUnit()
  const [showTechTree, setShowTechTree] = useState(false)
  const [showCulturePanel, setShowCulturePanel] = useState(false)
  const [showPolicyPanel, setShowPolicyPanel] = useState(false)
  const [unitPendingPromotion, setUnitPendingPromotion] = useState<Unit | null>(null)

  // Memoize valid attack targets based only on selectedUnit (not full state)
  // This prevents recalculating targets on every state change
  const validTargets = useMemo(() => {
    if (!state || !selectedUnit) return []
    if (selectedUnit.owner !== state.currentPlayer) return []
    return getValidTargets(state, selectedUnit)
    // Only recompute when unit selection changes or unit position changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUnit?.id, selectedUnit?.position.q, selectedUnit?.position.r, state?.currentPlayer])

  // Find enemy unit on hovered tile for combat preview
  const hoveredEnemy: Unit | null = useMemo(() => {
    if (!hoveredTile || validTargets.length === 0) return null
    const hoveredKey = hexKey(hoveredTile)
    return validTargets.find(t => hexKey(t.position) === hoveredKey) ?? null
  }, [hoveredTile, validTargets])

  // Find first settlement owned by current player with pending milestones
  const settlementWithPendingMilestone = useMemo(() => {
    if (!state) return null
    for (const settlement of state.settlements.values()) {
      if (settlement.owner === state.currentPlayer && hasPendingMilestone(settlement)) {
        return settlement
      }
    }
    return null
  }, [state])

  if (!state || !currentPlayer) return null

  const handleEndTurn = () => {
    dispatch({ type: 'END_TURN' })
  }

  const handleSelectTech = (techId: TechId) => {
    dispatch({ type: 'START_RESEARCH', techId })
    setShowTechTree(false)
  }

  const handleSelectCulture = (cultureId: CultureId) => {
    dispatch({ type: 'START_CULTURE', cultureId })
    setShowCulturePanel(false)
  }

  const handleSelectMilestone = (level: number, choice: 'a' | 'b') => {
    if (!settlementWithPendingMilestone) return
    dispatch({
      type: 'SELECT_MILESTONE',
      settlementId: settlementWithPendingMilestone.id as SettlementId,
      level,
      choice,
    })
  }

  const handleSwapPolicies = (toSlot: PolicyId[], toUnslot: PolicyId[]) => {
    dispatch({
      type: 'SWAP_POLICIES',
      toSlot,
      toUnslot,
    })
  }

  const handleOpenPromotionPopup = (unit: Unit) => {
    setUnitPendingPromotion(unit)
  }

  const handleSelectPromotion = (promotionId: PromotionId) => {
    if (!unitPendingPromotion) return
    dispatch({
      type: 'SELECT_PROMOTION',
      unitId: unitPendingPromotion.id as UnitId,
      promotionId,
    })
    setUnitPendingPromotion(null)
  }

  const handleDismissPromotionPopup = () => {
    setUnitPendingPromotion(null)
  }

  const handleSelectPolicy = (choice: 'a' | 'b', navigateTo: PolicyConfirmDestination) => {
    dispatch({
      type: 'SELECT_POLICY',
      choice,
    })
    // Navigate to the appropriate panel after selection
    if (navigateTo === 'cultures') {
      setShowCulturePanel(true)
      setShowPolicyPanel(false)
    } else {
      setShowPolicyPanel(true)
      setShowCulturePanel(false)
    }
  }

  // Check if culture is ready for policy selection
  const cultureReadyForSelection = useMemo(() => {
    return currentPlayer ? isCultureReadyForCompletion(currentPlayer) : false
  }, [currentPlayer])

  // Current research info
  const currentResearch = currentPlayer.currentResearch ? getTech(currentPlayer.currentResearch) : null
  const progress = getResearchProgress(currentPlayer)
  const turnsRemaining = getTurnsToComplete(currentPlayer)

  // Current culture info
  const currentCulture = currentPlayer.currentCulture ? getCulture(currentPlayer.currentCulture) : null
  const cultureProgress = getCultureProgress(currentPlayer)
  const cultureTurnsRemaining = getTurnsToCompleteCulture(currentPlayer)

  // Check if selected settlement belongs to current player
  const canInteractWithSettlement =
    selectedSettlement && selectedSettlement.owner === state.currentPlayer

  // Check if selected unit belongs to current player
  const canInteractWithUnit =
    selectedUnit && selectedUnit.owner === state.currentPlayer

  // Check if golden age is active
  const isGoldenAgeActive = currentPlayer.goldenAge.active

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Golden Age border glow effect */}
      {isGoldenAgeActive && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            border: '4px solid transparent',
            borderImage: 'linear-gradient(135deg, #ffd700, #ffb347, #ffd700, #ff8c00, #ffd700) 1',
            boxShadow: 'inset 0 0 30px rgba(255, 215, 0, 0.3), inset 0 0 60px rgba(255, 215, 0, 0.15)',
            animation: 'goldenAgeBorderPulse 3s ease-in-out infinite',
            zIndex: 999,
          }}
        />
      )}
      {isGoldenAgeActive && (
        <style>{`
          @keyframes goldenAgeBorderPulse {
            0%, 100% {
              box-shadow: inset 0 0 30px rgba(255, 215, 0, 0.3), inset 0 0 60px rgba(255, 215, 0, 0.15);
            }
            50% {
              box-shadow: inset 0 0 50px rgba(255, 215, 0, 0.5), inset 0 0 80px rgba(255, 215, 0, 0.25);
            }
          }
        `}</style>
      )}
      {/* Top Bar - Turn info, yields, floor price */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
          pointerEvents: 'auto',
        }}
      >
        <div style={{ display: 'flex', gap: '20px', color: '#fff', alignItems: 'center' }}>
          <span>Turn {state.turn}/{state.maxTurns}</span>
          <YieldIcon type="gold" value={currentPlayer.treasury} />
          <YieldIcon type="alpha" value={currentPlayer.yields.alpha} label="/turn" />
          <YieldIcon type="vibes" value={currentPlayer.yields.vibes} label="/turn" />

          {/* Research Button with Progress */}
          <button
            onClick={() => setShowTechTree(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              background: currentResearch ? '#1a2a3a' : '#2a2a3a',
              border: '1px solid #64b5f6',
              borderRadius: '4px',
              color: '#64b5f6',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {currentResearch ? (
              <>
                <span>{currentResearch.name}</span>
                <span style={{ color: '#888', fontSize: '11px' }}>
                  ({progress?.percent ?? 0}% - {turnsRemaining === Infinity ? '∞' : turnsRemaining}t)
                </span>
              </>
            ) : (
              <span>Tech</span>
            )}
          </button>

          {/* Culture Button with Progress */}
          <button
            onClick={() => setShowCulturePanel(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              background: currentCulture ? '#2a1a3a' : '#2a2a3a',
              border: '1px solid #ba68c8',
              borderRadius: '4px',
              color: '#ba68c8',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {currentCulture ? (
              <>
                <span>{currentCulture.name}</span>
                <span style={{ color: '#888', fontSize: '11px' }}>
                  ({cultureProgress?.percent ?? 0}% - {cultureTurnsRemaining === null ? '∞' : cultureTurnsRemaining}t)
                </span>
              </>
            ) : (
              <span>Culture</span>
            )}
          </button>

          {/* Policy Cards Button */}
          <button
            onClick={() => setShowPolicyPanel(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              background: '#2a2a3a',
              border: '1px solid #a855f7',
              borderRadius: '4px',
              color: '#a855f7',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            <span>📜</span>
            <span>Policies</span>
            <span style={{ color: '#888', fontSize: '11px' }}>
              ({currentPlayer.policies.active.length}/{Object.values(currentPlayer.policies.slots).reduce((a, b) => a + b, 0)})
            </span>
          </button>

          {/* Diplomacy Panel */}
          <DiplomacyPanel currentPlayer={currentPlayer} />

          {/* Trade Panel */}
          <TradePanel currentPlayer={currentPlayer} />
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Tooltip
            content={(() => {
              const breakdown = calculateFloorPriceBreakdown(state, state.currentPlayer)
              return (
                <div>
                  <TooltipHeader title="Floor Price" subtitle="Victory Score" />
                  <TooltipDivider />
                  <TooltipSection label="Score Breakdown">
                    {breakdown.settlements > 0 && (
                      <TooltipRow label="Settlements" value={`+${breakdown.settlements}`} valueColor="#4caf50" />
                    )}
                    {breakdown.population > 0 && (
                      <TooltipRow label="Population" value={`+${breakdown.population}`} valueColor="#81c784" />
                    )}
                    {breakdown.tiles > 0 && (
                      <TooltipRow label="Territory" value={`+${breakdown.tiles}`} valueColor="#66bb6a" />
                    )}
                    {breakdown.technologies > 0 && (
                      <TooltipRow label="Technologies" value={`+${breakdown.technologies}`} valueColor="#64b5f6" />
                    )}
                    {breakdown.cultures > 0 && (
                      <TooltipRow label="Cultures" value={`+${breakdown.cultures}`} valueColor="#ba68c8" />
                    )}
                    {breakdown.gold > 0 && (
                      <TooltipRow label="Treasury" value={`+${breakdown.gold}`} valueColor="#ffd54f" />
                    )}
                    {breakdown.kills > 0 && (
                      <TooltipRow label="Kills" value={`+${breakdown.kills}`} valueColor="#ef5350" />
                    )}
                    {breakdown.units > 0 && (
                      <TooltipRow label="Units" value={`+${breakdown.units}`} valueColor="#90a4ae" />
                    )}
                    {breakdown.rarityBonus > 0 && (
                      <TooltipRow label="Rarity Bonus" value={`+${breakdown.rarityBonus}`} valueColor="#ce93d8" />
                    )}
                    {breakdown.wonders > 0 && (
                      <TooltipRow label="Wonders" value={`+${breakdown.wonders}`} valueColor="#ffc107" />
                    )}
                    {breakdown.policyBonus > 0 && (
                      <TooltipRow label="Policy Bonus" value={`+${breakdown.policyBonus}`} valueColor="#4dd0e1" />
                    )}
                  </TooltipSection>
                  <TooltipDivider />
                  <TooltipRow label="Total" value={String(breakdown.total)} valueColor="#4caf50" />
                </div>
              )
            })()}
            position="below"
            maxWidth={220}
          >
            <span style={{ color: '#4caf50', fontWeight: 'bold', cursor: 'help' }}>
              Floor Price: {state.floorPrices.get(state.currentPlayer) ?? 0}
            </span>
          </Tooltip>
          <button
            onClick={handleEndTurn}
            style={{
              padding: '8px 16px',
              background: '#4caf50',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            End Turn
          </button>
        </div>
      </div>

      {/* Main content area with side panel */}
      <div style={{ flex: 1, display: 'flex' }}>
        {/* Left Side Panel - Settlement or Unit info */}
        {canInteractWithSettlement && (
          <div style={{ pointerEvents: 'auto', height: '100%' }}>
            <SettlementPanel settlement={selectedSettlement} />
          </div>
        )}

        {/* Unit Actions Panel (only if owned by current player and no settlement selected) */}
        {canInteractWithUnit && !canInteractWithSettlement && (
          <div style={{ pointerEvents: 'auto' }}>
            <UnitActionsPanel
              unit={selectedUnit}
              onLevelUp={canLevelUp(selectedUnit) ? () => handleOpenPromotionPopup(selectedUnit) : undefined}
            />
          </div>
        )}

        {/* Spacer for game view */}
        <div style={{ flex: 1 }} />
      </div>

      {/* Tech Tree Modal */}
      {showTechTree && (
        <div style={{ pointerEvents: 'auto' }}>
          <TechTreePanel
            player={currentPlayer}
            onSelectTech={handleSelectTech}
            onClose={() => setShowTechTree(false)}
          />
        </div>
      )}

      {/* Culture Tree Modal */}
      {showCulturePanel && (
        <div style={{ pointerEvents: 'auto' }}>
          <CultureTreePanel
            player={currentPlayer}
            onSelectCulture={handleSelectCulture}
            onClose={() => setShowCulturePanel(false)}
          />
        </div>
      )}

      {/* Policy Panel Modal */}
      {showPolicyPanel && (
        <div style={{ pointerEvents: 'auto' }}>
          <PolicyPanel
            player={currentPlayer}
            canSwap={canSwapPolicies}
            onSwapPolicies={handleSwapPolicies}
            onClose={() => setShowPolicyPanel(false)}
          />
        </div>
      )}

      {/* Lootbox Reward Popup */}
      {pendingLootboxReward && (
        <div style={{ pointerEvents: 'auto' }}>
          <LootboxRewardPopup
            reward={pendingLootboxReward}
            onDismiss={dismissLootboxReward}
          />
        </div>
      )}

      {/* Tech Completed Popup */}
      {pendingTechCompletion && (
        <div style={{ pointerEvents: 'auto' }}>
          <TechCompletedPopup
            techId={pendingTechCompletion}
            onDismiss={dismissTechCompletion}
            onViewTechTree={() => {
              dismissTechCompletion()
              setShowTechTree(true)
            }}
          />
        </div>
      )}

      {/* Golden Age Popup */}
      {pendingGoldenAge && (
        <div style={{ pointerEvents: 'auto' }}>
          <GoldenAgePopup
            trigger={pendingGoldenAge.trigger}
            effect={pendingGoldenAge.effect}
            turnsRemaining={pendingGoldenAge.turnsRemaining}
            onDismiss={dismissGoldenAge}
          />
        </div>
      )}

      {/* War Confirmation Popup */}
      {pendingWarAttack && (
        <div style={{ pointerEvents: 'auto' }}>
          <WarConfirmationPopup
            attackerTribe={pendingWarAttack.attackerTribe}
            defenderTribe={pendingWarAttack.defenderTribe}
            onConfirm={confirmWarAttack}
            onCancel={cancelWarAttack}
          />
        </div>
      )}

      {/* Milestone Selection Panel */}
      {settlementWithPendingMilestone && (
        <div style={{ pointerEvents: 'auto' }}>
          <MilestonePanel
            settlement={settlementWithPendingMilestone}
            onSelect={handleSelectMilestone}
            onDismiss={() => {}}
          />
        </div>
      )}

      {/* Policy Selection Popup - shows when culture completes */}
      {cultureReadyForSelection && (
        <div style={{ pointerEvents: 'auto' }}>
          <PolicySelectionPopup
            player={currentPlayer}
            onConfirm={handleSelectPolicy}
          />
        </div>
      )}

      {/* Promotion Selection Popup - shows when clicking level up on a unit */}
      {unitPendingPromotion && (
        <div style={{ pointerEvents: 'auto' }}>
          <PromotionSelectionPopup
            unit={unitPendingPromotion}
            onSelect={handleSelectPromotion}
            onDismiss={handleDismissPromotionPopup}
          />
        </div>
      )}

      {/* Combat Preview Panel - shows when hovering over enemy with unit selected */}
      {hoveredEnemy && selectedUnit && (
        <div style={{ pointerEvents: 'none' }}>
          <CombatPreviewPanel
            attacker={selectedUnit}
            defender={hoveredEnemy}
          />
        </div>
      )}

      {/* Zoom Controls - bottom right */}
      {(onZoomIn || onZoomOut) && (
        <div
          style={{
            position: 'fixed',
            bottom: '120px',
            right: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            pointerEvents: 'auto',
          }}
        >
          <button
            onClick={onZoomIn}
            disabled={!onZoomIn}
            style={{
              width: '36px',
              height: '36px',
              background: '#2a2a4a',
              border: '1px solid #4a4a6a',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={onZoomOut}
            disabled={!onZoomOut}
            style={{
              width: '36px',
              height: '36px',
              background: '#2a2a4a',
              border: '1px solid #4a4a6a',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Zoom Out"
          >
            -
          </button>
        </div>
      )}

      {/* Event Log - bottom right */}
      <EventLog events={events} />

      {/* Hex Tooltip - shows on hover over tiles */}
      {hoveredTile && state && !hoveredEnemy && !selectedSettlement && (
        <HexTooltip
          coord={hoveredTile}
          state={state}
          currentPlayer={state.currentPlayer}
          mousePosition={mousePosition}
        />
      )}
    </div>
  )
}
