// HUD overlay container for game UI elements

import { useState, useMemo, useCallback, useEffect } from 'react'
import type { TechId, CultureId, HexCoord, Unit, SettlementId, PolicyId, PromotionId, UnitId, PendingMint } from '@tribes/game-core'
import { getTech, getResearchProgress, getTurnsToComplete, getCulture, getCultureProgress, getTurnsToCompleteCulture, hexKey, getValidTargets, hasPendingMilestone, isCultureReadyForCompletion, canLevelUp, calculateFloorPriceBreakdown, getPendingMints, getAvailableTechs, getAvailableCultures, getGreatPersonDefinition, getTribe, getReachableHexes } from '@tribes/game-core'
import { useGame, useCurrentPlayer, useSelectedSettlement, useSelectedUnit } from '../hooks/useGame'
import { useGameContext } from '../context/GameContext'
import { OnChainVRFService } from '../magicblock/vrf'
import { WalletButton } from '../wallet/WalletButton'
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
import { PeaceProposalPopup } from './PeaceProposalPopup'
import { MilestonePanel } from './MilestonePanel'
import { HexTooltip } from './HexTooltip'
import { PromotionSelectionPopup } from './PromotionSelectionPopup'
import { MintPopup } from './MintPopup'
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
    vrfService,
    nextVRFNonce,
    selectUnit,
    selectSettlement,
    addEvent,
  } = useGameContext()
  const currentPlayer = useCurrentPlayer()
  const selectedSettlement = useSelectedSettlement()
  const selectedUnit = useSelectedUnit()
  const [showTechTree, setShowTechTree] = useState(false)
  const [showCulturePanel, setShowCulturePanel] = useState(false)
  const [showPolicyPanel, setShowPolicyPanel] = useState(false)
  const [buffsExpanded, setBuffsExpanded] = useState(false)
  const [unitPendingPromotion, setUnitPendingPromotion] = useState<Unit | null>(null)
  // Track ongoing mint animations so popup persists until Continue is clicked
  const [activeMint, setActiveMint] = useState<{
    pendingMint: PendingMint
    total: number
  } | null>(null)

  // Peace proposal popup — show first pending proposal targeting the human player
  const pendingPeaceProposal = useMemo(() => {
    if (!state) return null
    return state.pendingPeaceProposals.find(p => p.target === state.currentPlayer) ?? null
  }, [state])
  const peaceProposerInfo = useMemo(() => {
    if (!state || !pendingPeaceProposal) return null
    const player = state.players.find(p => p.tribeId === pendingPeaceProposal.proposer)
    if (!player) return null
    const tribe = getTribe(player.tribeName)
    return {
      tribeId: pendingPeaceProposal.proposer,
      tribeName: tribe?.displayName ?? player.tribeName,
      tribeColor: tribe?.color ?? '#888',
    }
  }, [state, pendingPeaceProposal])

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

  // Find pending mints for current player
  // If activeMint is set, use that (animation in progress)
  // Otherwise check for new pending mints in state
  const pendingMintInfo = useMemo(() => {
    // If there's an active mint animation, show that
    if (activeMint) {
      return {
        mint: activeMint.pendingMint,
        total: activeMint.total,
        isAnimating: true,
      }
    }
    // Otherwise check for pending mints in game state
    if (!state) return null
    const mints = getPendingMints(state)
    if (mints.length === 0) return null
    return {
      mint: mints[0]!,
      total: mints.length,
      isAnimating: false,
    }
  }, [state, activeMint])

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

  // Whether VRF is using on-chain verification (wallet connected)
  const isOnChainVRF = vrfService instanceof OnChainVRFService

  // Handle minting a pending unit — async to support VRF polling
  const handleMintUnit = useCallback(async (): Promise<Unit | null> => {
    if (!pendingMintInfo) return null
    // Capture mint info BEFORE dispatching so popup persists during animation
    setActiveMint({
      pendingMint: pendingMintInfo.mint,
      total: pendingMintInfo.total,
    })

    // Request VRF rarity roll (on-chain or local fallback)
    const nonce = nextVRFNonce()
    const { resultPDA } = await vrfService.requestRarityRoll(nonce)

    // Wait for VRF result — LocalVRFService resolves immediately,
    // OnChainVRFService polls until oracle callback fulfills
    const deadline = Date.now() + 30_000
    let vrfResult = await vrfService.getRarityResult(resultPDA)
    while (!vrfResult?.fulfilled && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 2000))
      vrfResult = await vrfService.getRarityResult(resultPDA)
    }

    if (!vrfResult?.fulfilled) {
      throw new Error('VRF rarity result not fulfilled within timeout')
    }

    // Dispatch MINT_UNIT with VRF-determined rarity
    const result = dispatch({
      type: 'MINT_UNIT',
      settlementId: pendingMintInfo.mint.settlementId,
      index: 0,
      rarity: vrfResult.rarity,
    })
    if (result.success && result.state) {
      // Find the newly created unit
      const newUnits = Array.from(result.state.units.values())
        .filter(u => u.owner === state.currentPlayer)
      const newUnit = newUnits.find(u =>
        u.position.q === pendingMintInfo.mint.position.q &&
        u.position.r === pendingMintInfo.mint.position.r &&
        u.type === pendingMintInfo.mint.unitType
      )
      return newUnit ?? null
    }
    return null
  }, [pendingMintInfo, vrfService, nextVRFNonce, dispatch, state?.currentPlayer])

  // Handle completing a mint animation (Continue button clicked)
  const handleMintComplete = () => {
    setActiveMint(null)
  }

  // Check if culture is ready for policy selection
  const cultureReadyForSelection = useMemo(() => {
    return currentPlayer ? isCultureReadyForCompletion(currentPlayer) : false
  }, [currentPlayer])

  // --- QOL: Tab key unit cycling ---
  const anyModalOpen = showTechTree || showCulturePanel || showPolicyPanel ||
    !!pendingMintInfo || !!settlementWithPendingMilestone || cultureReadyForSelection ||
    !!pendingTechCompletion || !!pendingGoldenAge || !!pendingLootboxReward ||
    !!pendingWarAttack || !!unitPendingPromotion

  useEffect(() => {
    if (!state || !currentPlayer) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || anyModalOpen) return
      e.preventDefault()

      const actionableUnits = Array.from(state.units.values())
        .filter(u => u.owner === state.currentPlayer && u.movementRemaining > 0 && !u.hasActed && !u.sleeping)
        .sort((a, b) => a.id.localeCompare(b.id))

      if (actionableUnits.length === 0) return

      const currentIdx = selectedUnit
        ? actionableUnits.findIndex(u => u.id === selectedUnit.id)
        : -1
      const nextIdx = (currentIdx + 1) % actionableUnits.length
      selectUnit(actionableUnits[nextIdx]!.id as UnitId)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state, currentPlayer, selectedUnit, anyModalOpen, selectUnit])

  // --- QOL: End Turn readiness issues ---
  const readinessIssues = useMemo(() => {
    if (!state || !currentPlayer) return []
    const issues: string[] = []

    // Units with moves left (exclude sleeping and units that can't actually reach any new tile)
    const idleUnits = Array.from(state.units.values())
      .filter(u => {
        if (u.owner !== state.currentPlayer || u.movementRemaining <= 0 || u.hasActed || u.sleeping) return false
        // Check if unit can actually move to any adjacent tile
        const reachable = getReachableHexes(state, u)
        // reachable always includes current position, so > 1 means it can move somewhere
        return reachable.size > 1
      })
    if (idleUnits.length > 0) issues.push(`${idleUnits.length} unit${idleUnits.length > 1 ? 's' : ''} with moves left`)

    // Idle settlements
    const idleSettlements = Array.from(state.settlements.values())
      .filter(s => s.owner === state.currentPlayer && s.productionQueue.length === 0)
    if (idleSettlements.length > 0) issues.push(`${idleSettlements.length} idle settlement${idleSettlements.length > 1 ? 's' : ''}`)

    // No tech selected
    if (!currentPlayer.currentResearch && getAvailableTechs(currentPlayer).length > 0) {
      issues.push('No tech selected')
    }

    // No culture selected
    if (!currentPlayer.currentCulture && getAvailableCultures(currentPlayer).length > 0) {
      issues.push('No culture selected')
    }

    return issues
  }, [state, currentPlayer])

  // --- QOL: Idle settlements for top bar indicator ---
  const idleSettlementsList = useMemo(() => {
    if (!state) return []
    return Array.from(state.settlements.values())
      .filter(s => s.owner === state.currentPlayer && s.productionQueue.length === 0)
  }, [state])

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

          {/* Idle Settlement Alert */}
          {idleSettlementsList.length > 0 && (
            <Tooltip
              content={
                <div>
                  <TooltipHeader title="Idle Settlements" />
                  <TooltipDivider />
                  {idleSettlementsList.map(s => (
                    <TooltipRow key={s.id} label={s.name} value="No production" valueColor="#ff9800" />
                  ))}
                </div>
              }
              position="below"
              maxWidth={200}
            >
              <button
                onClick={() => {
                  if (idleSettlementsList.length > 0) {
                    selectSettlement(idleSettlementsList[0]!.id as SettlementId)
                  }
                }}
                style={{
                  padding: '4px 10px',
                  background: 'rgba(255, 152, 0, 0.2)',
                  border: '1px solid #ff9800',
                  borderRadius: '4px',
                  color: '#ff9800',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                {idleSettlementsList.length} idle
              </button>
            </Tooltip>
          )}

          {/* Active Buff Indicators — foldable when multiple */}
          {currentPlayer.activeBuffs.length > 0 && (() => {
            const buffColorMap: Record<string, string> = {
              gold: '#ffd54f', alpha: '#64b5f6', vibes: '#ba68c8',
              trade: '#4caf50', production: '#ff9800',
            }
            const buffs = currentPlayer.activeBuffs
            if (buffs.length === 1) {
              const buff = buffs[0]!
              const color = buffColorMap[buff.yield ?? buff.type] ?? '#90a4ae'
              const gpDef = getGreatPersonDefinition(buff.source)
              return (
                <Tooltip
                  content={gpDef ? `${gpDef.name}: +${buff.percent}% ${buff.yield ?? buff.type}` : `+${buff.percent}% ${buff.yield ?? buff.type}`}
                  position="below"
                >
                  <span
                    style={{
                      padding: '2px 8px',
                      background: `${color}22`,
                      border: `1px solid ${color}`,
                      borderRadius: '4px',
                      color,
                      fontSize: '11px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    +{buff.percent}% {buff.yield ?? buff.type} ({buff.turnsRemaining}t)
                  </span>
                </Tooltip>
              )
            }
            // Multiple buffs — show foldable summary
            return (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setBuffsExpanded(!buffsExpanded)}
                  style={{
                    padding: '2px 10px',
                    background: '#4caf5022',
                    border: '1px solid #4caf50',
                    borderRadius: '4px',
                    color: '#4caf50',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {buffs.length} buffs active
                  <span style={{ fontSize: '9px' }}>{buffsExpanded ? '\u25B2' : '\u25BC'}</span>
                </button>
                {buffsExpanded && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '4px',
                      background: 'rgba(0, 0, 0, 0.9)',
                      border: '1px solid #333',
                      borderRadius: '6px',
                      padding: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      zIndex: 50,
                      minWidth: '180px',
                    }}
                  >
                    {buffs.map((buff, i) => {
                      const color = buffColorMap[buff.yield ?? buff.type] ?? '#90a4ae'
                      const gpDef = getGreatPersonDefinition(buff.source)
                      return (
                        <Tooltip
                          key={i}
                          content={gpDef ? `${gpDef.name}: +${buff.percent}% ${buff.yield ?? buff.type}` : `+${buff.percent}% ${buff.yield ?? buff.type}`}
                          position="right"
                        >
                          <span
                            style={{
                              padding: '2px 8px',
                              background: `${color}22`,
                              border: `1px solid ${color}`,
                              borderRadius: '4px',
                              color,
                              fontSize: '11px',
                              fontWeight: 'bold',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            +{buff.percent}% {buff.yield ?? buff.type} ({buff.turnsRemaining}t)
                          </span>
                        </Tooltip>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })()}
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {/* Wallet status */}
          <WalletButton
            style={{ transform: 'scale(0.85)', transformOrigin: 'right center' }}
          />
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
          <Tooltip
            content={
              pendingMintInfo ? 'Mint all pending units first' :
              readinessIssues.length > 0 ? (
                <div>
                  <TooltipHeader title="Unfinished Business" />
                  <TooltipDivider />
                  {readinessIssues.map((issue, i) => (
                    <TooltipRow key={i} label={issue} value="!" valueColor="#ff9800" />
                  ))}
                </div>
              ) : 'All done — ready to end turn'
            }
            position="below"
            maxWidth={220}
          >
            <button
              onClick={handleEndTurn}
              disabled={!!pendingMintInfo}
              style={{
                padding: '8px 16px',
                background: pendingMintInfo ? '#666' : readinessIssues.length > 0 ? '#ff9800' : '#4caf50',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                cursor: pendingMintInfo ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                opacity: pendingMintInfo ? 0.7 : 1,
              }}
            >
              {readinessIssues.length > 0 ? `End Turn (${readinessIssues.length}!)` : 'End Turn'}
            </button>
          </Tooltip>
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

      {/*
        === TURN-START POPUP PRIORITY ORDER ===
        1. Minting (highest) - must complete to create units
        2. Peace Proposal - required choice, must resolve before other popups
        3. Milestone - required choice
        4. Policy Selection - required choice
        5. Tech Completed - informational
        6. Golden Age - informational
        7. Lootbox (lowest) - informational

        Each popup waits for all higher-priority popups to be resolved.
      */}

      {/* Priority 2: Peace Proposal - waits for minting */}
      {!pendingMintInfo && peaceProposerInfo && !pendingWarAttack && (
        <div style={{ pointerEvents: 'auto' }}>
          <PeaceProposalPopup
            tribeName={peaceProposerInfo.tribeName}
            tribeColor={peaceProposerInfo.tribeColor}
            onAccept={() => {
              dispatch({ type: 'RESPOND_PEACE_PROPOSAL', target: peaceProposerInfo.tribeId, accept: true })
              addEvent(`Peace treaty accepted with ${peaceProposerInfo.tribeName}`, 'diplomacy')
            }}
            onReject={() => {
              dispatch({ type: 'RESPOND_PEACE_PROPOSAL', target: peaceProposerInfo.tribeId, accept: false })
              addEvent(`Rejected peace proposal from ${peaceProposerInfo.tribeName}`, 'diplomacy')
            }}
          />
        </div>
      )}

      {/* Priority 3: Milestone Selection - waits for minting, peace */}
      {!pendingMintInfo && !peaceProposerInfo && settlementWithPendingMilestone && (
        <div style={{ pointerEvents: 'auto' }}>
          <MilestonePanel
            settlement={settlementWithPendingMilestone}
            onSelect={handleSelectMilestone}
            onDismiss={() => {}}
          />
        </div>
      )}

      {/* Priority 4: Policy Selection - waits for minting, peace, milestone */}
      {!pendingMintInfo && !peaceProposerInfo && !settlementWithPendingMilestone && cultureReadyForSelection && (
        <div style={{ pointerEvents: 'auto' }}>
          <PolicySelectionPopup
            player={currentPlayer}
            onConfirm={handleSelectPolicy}
          />
        </div>
      )}

      {/* Priority 5: Tech Completed - waits for minting, peace, milestone, policy */}
      {!pendingMintInfo && !peaceProposerInfo && !settlementWithPendingMilestone && !cultureReadyForSelection && pendingTechCompletion && (
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

      {/* Priority 6: Golden Age - waits for minting, peace, milestone, policy, tech */}
      {!pendingMintInfo && !peaceProposerInfo && !settlementWithPendingMilestone && !cultureReadyForSelection && !pendingTechCompletion && pendingGoldenAge && (
        <div style={{ pointerEvents: 'auto' }}>
          <GoldenAgePopup
            trigger={pendingGoldenAge.trigger}
            effect={pendingGoldenAge.effect}
            turnsRemaining={pendingGoldenAge.turnsRemaining}
            onDismiss={dismissGoldenAge}
          />
        </div>
      )}

      {/* Priority 7: Lootbox Reward - waits for all above */}
      {!pendingMintInfo && !peaceProposerInfo && !settlementWithPendingMilestone && !cultureReadyForSelection && !pendingTechCompletion && !pendingGoldenAge && pendingLootboxReward && (
        <div style={{ pointerEvents: 'auto' }}>
          <LootboxRewardPopup
            reward={pendingLootboxReward}
            onDismiss={dismissLootboxReward}
          />
        </div>
      )}

      {/* War Confirmation Popup - user-initiated, always shows immediately */}
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

      {/* Mint Popup - shows when military units complete production */}
      {/* Priority 1 (highest): Minting - must complete to create units */}
      {pendingMintInfo && (
        <div style={{ pointerEvents: 'auto' }}>
          <MintPopup
            key={`${pendingMintInfo.mint.settlementId}-${pendingMintInfo.mint.unitType}-${pendingMintInfo.mint.position.q}-${pendingMintInfo.mint.position.r}`}
            pendingMint={pendingMintInfo.mint}
            index={0}
            totalPending={pendingMintInfo.total}
            onMint={handleMintUnit}
            onComplete={handleMintComplete}
            isOnChainVRF={isOnChainVRF}
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
