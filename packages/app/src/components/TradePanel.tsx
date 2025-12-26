// Panel for managing trade routes between settlements

import { useState } from 'react'
import type { Player, SettlementId, TradeRoute } from '@tribes/game-core'
import {
  getPlayerTradeRoutes,
  getTradeRouteCapacity,
  hasTradeUnlocked,
  calculateTradeRouteIncome,
  getAvailableTradeDestinations,
  canCreateTradeRoute,
} from '@tribes/game-core'
import { useGame } from '../hooks/useGame'

interface TradePanelProps {
  currentPlayer: Player
}

// Tribe display colors
const TRIBE_COLORS: Record<string, string> = {
  monkes: '#fbbf24',
  geckos: '#22c55e',
  degods: '#ef4444',
  cets: '#3b82f6',
}

export function TradePanel({ currentPlayer }: TradePanelProps): JSX.Element {
  const { state, dispatch } = useGame()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedOrigin, setSelectedOrigin] = useState<SettlementId | null>(null)

  if (!state) return <></>

  const tradeUnlocked = hasTradeUnlocked(state, currentPlayer.tribeId)
  const routes = getPlayerTradeRoutes(state, currentPlayer.tribeId)
  const capacity = getTradeRouteCapacity(state, currentPlayer.tribeId)
  const income = calculateTradeRouteIncome(state, currentPlayer.tribeId)
  const activeRoutes = routes.filter(r => r.active)
  const formingRoutes = routes.filter(r => !r.active && r.turnsUntilActive > 0)

  // Get player's settlements
  const playerSettlements = Array.from(state.settlements.values())
    .filter(s => s.owner === currentPlayer.tribeId)

  // Get available destinations when origin is selected
  const availableDestinations = selectedOrigin
    ? getAvailableTradeDestinations(state, currentPlayer.tribeId)
    : []

  const handleCreateRoute = (destinationId: SettlementId) => {
    if (!selectedOrigin) return
    dispatch({
      type: 'CREATE_TRADE_ROUTE',
      origin: selectedOrigin,
      destination: destinationId,
    })
    setSelectedOrigin(null)
  }

  const handleCancelRoute = (routeId: string) => {
    dispatch({
      type: 'CANCEL_TRADE_ROUTE',
      routeId: routeId as any,
    })
  }

  // Get settlement name
  const getSettlementName = (id: SettlementId): string => {
    const settlement = state.settlements.get(id)
    return settlement?.name || 'Unknown'
  }

  // Get tribe name for a settlement
  const getTribeName = (id: SettlementId): string => {
    const settlement = state.settlements.get(id)
    if (!settlement) return 'Unknown'
    const player = state.players.find(p => p.tribeId === settlement.owner)
    return player?.tribeName || 'Unknown'
  }

  // Get tribe color for a settlement
  const getTribeColor = (id: SettlementId): string => {
    const tribeName = getTribeName(id)
    return TRIBE_COLORS[tribeName] || '#6b7280'
  }

  return (
    <>
      {/* Trade Button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 12px',
          background: tradeUnlocked ? '#1a2a1a' : '#2a2a2a',
          border: `1px solid ${tradeUnlocked ? '#22c55e' : '#4b5563'}`,
          borderRadius: '4px',
          color: tradeUnlocked ? '#22c55e' : '#6b7280',
          cursor: 'pointer',
          fontSize: '13px',
          opacity: tradeUnlocked ? 1 : 0.7,
        }}
      >
        <span>Trade</span>
        {tradeUnlocked && activeRoutes.length > 0 && (
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            background: '#22c55e',
            color: '#000',
            padding: '1px 6px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 'bold',
          }}>
            +{income}
            <img src="/assets/icons/gold.svg" alt="gold" style={{ width: 12, height: 12, filter: 'brightness(0)' }} />
          </span>
        )}
        {!tradeUnlocked && (
          <span style={{
            color: '#6b7280',
            fontSize: '10px',
          }}>
            (locked)
          </span>
        )}
      </button>

      {/* Trade Modal */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setIsOpen(false)
            setSelectedOrigin(null)
          }}
        >
          <div
            style={{
              background: '#1a1a2e',
              borderRadius: '12px',
              padding: '24px',
              minWidth: '600px',
              maxWidth: '800px',
              maxHeight: '80vh',
              overflow: 'auto',
              border: '2px solid #374151',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}>
              <div>
                <h2 style={{ color: '#fff', margin: 0, fontSize: '20px' }}>
                  Trade Routes
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>
                  {tradeUnlocked ? (
                    <>
                      {activeRoutes.length}/{capacity} routes active | +{income}
                      <img src="/assets/icons/gold.svg" alt="gold" style={{ width: 12, height: 12, filter: 'brightness(0) saturate(100%) invert(83%) sepia(44%) saturate(1000%) hue-rotate(359deg) brightness(103%) contrast(106%)' }} />
                      /turn
                    </>
                  ) : (
                    'Requires Smart Contracts tech to unlock'
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setSelectedOrigin(null)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  fontSize: '24px',
                }}
              >
                x
              </button>
            </div>

            {!tradeUnlocked ? (
              /* Locked state */
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#6b7280',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
                <div style={{ fontSize: '16px', marginBottom: '8px' }}>Trade Routes Locked</div>
                <div style={{ fontSize: '13px' }}>
                  Research <strong style={{ color: '#22c55e' }}>Smart Contracts</strong> technology to unlock trade routes.
                </div>
              </div>
            ) : (
              <>
                {/* Active Routes */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ color: '#22c55e', fontSize: '14px', marginBottom: '12px', textTransform: 'uppercase' }}>
                    Active Routes ({activeRoutes.length})
                  </h3>
                  {activeRoutes.length === 0 ? (
                    <div style={{ color: '#6b7280', fontSize: '13px', padding: '12px', background: '#252535', borderRadius: '8px' }}>
                      No active trade routes. Create one below.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {activeRoutes.map(route => (
                        <RouteCard
                          key={route.id}
                          route={route}
                          getSettlementName={getSettlementName}
                          getTribeName={getTribeName}
                          getTribeColor={getTribeColor}
                          onCancel={() => handleCancelRoute(route.id)}
                          isInternal={route.ownerTribe === route.targetTribe}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Forming Routes */}
                {formingRoutes.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ color: '#fbbf24', fontSize: '14px', marginBottom: '12px', textTransform: 'uppercase' }}>
                      Forming ({formingRoutes.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {formingRoutes.map(route => (
                        <RouteCard
                          key={route.id}
                          route={route}
                          getSettlementName={getSettlementName}
                          getTribeName={getTribeName}
                          getTribeColor={getTribeColor}
                          onCancel={() => handleCancelRoute(route.id)}
                          isInternal={route.ownerTribe === route.targetTribe}
                          isForming
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Create New Route */}
                {routes.length < capacity && (
                  <div>
                    <h3 style={{ color: '#3b82f6', fontSize: '14px', marginBottom: '12px', textTransform: 'uppercase' }}>
                      Create New Route
                    </h3>

                    {/* Origin Selection */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>
                        1. Select origin settlement:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {playerSettlements.map(settlement => (
                          <button
                            key={settlement.id}
                            onClick={() => setSelectedOrigin(settlement.id)}
                            style={{
                              padding: '8px 16px',
                              background: selectedOrigin === settlement.id ? '#3b82f6' : '#252535',
                              border: `1px solid ${selectedOrigin === settlement.id ? '#3b82f6' : '#4b5563'}`,
                              borderRadius: '6px',
                              color: selectedOrigin === settlement.id ? '#fff' : '#9ca3af',
                              cursor: 'pointer',
                              fontSize: '13px',
                            }}
                          >
                            {settlement.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Destination Selection */}
                    {selectedOrigin && (
                      <div>
                        <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>
                          2. Select destination:
                        </div>
                        {availableDestinations.length === 0 ? (
                          <div style={{ color: '#6b7280', fontSize: '13px', padding: '12px', background: '#252535', borderRadius: '8px' }}>
                            No available destinations. Explore more of the map or improve diplomatic relations.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {availableDestinations.map(dest => {
                              const validation = canCreateTradeRoute(state, selectedOrigin, dest.settlement.id)
                              return (
                                <div
                                  key={dest.settlement.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px',
                                    background: '#252535',
                                    borderRadius: '8px',
                                    borderLeft: `4px solid ${dest.isInternal ? '#3b82f6' : getTribeColor(dest.settlement.id)}`,
                                  }}
                                >
                                  <div style={{ flex: 1 }}>
                                    <div style={{ color: '#fff', fontWeight: 'bold' }}>
                                      {dest.settlement.name}
                                    </div>
                                    <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                                      {dest.isInternal ? 'Internal Route' : getTribeName(dest.settlement.id)}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#22c55e', fontSize: '14px', fontWeight: 'bold' }}>
                                    +{dest.goldPerTurn}
                                    <img src="/assets/icons/gold.svg" alt="gold" style={{ width: 14, height: 14, filter: 'brightness(0) saturate(100%) invert(83%) sepia(44%) saturate(1000%) hue-rotate(359deg) brightness(103%) contrast(106%)' }} />
                                    /turn
                                  </div>
                                  <button
                                    onClick={() => handleCreateRoute(dest.settlement.id)}
                                    disabled={!validation.canCreate}
                                    style={{
                                      padding: '6px 16px',
                                      background: validation.canCreate ? '#22c55e' : '#374151',
                                      border: 'none',
                                      borderRadius: '4px',
                                      color: validation.canCreate ? '#000' : '#6b7280',
                                      cursor: validation.canCreate ? 'pointer' : 'not-allowed',
                                      fontSize: '12px',
                                      fontWeight: 'bold',
                                    }}
                                    title={validation.reason || ''}
                                  >
                                    {validation.canCreate ? 'Create' : validation.reason}
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Capacity Full */}
                {routes.length >= capacity && (
                  <div style={{
                    textAlign: 'center',
                    padding: '20px',
                    color: '#6b7280',
                    background: '#252535',
                    borderRadius: '8px',
                  }}>
                    Trade route capacity full ({capacity}/{capacity}).
                    <br />
                    <span style={{ fontSize: '12px' }}>
                      Research more technologies or unlock policies to increase capacity.
                    </span>
                  </div>
                )}

                {/* Legend */}
                <div style={{
                  display: 'flex',
                  gap: '24px',
                  justifyContent: 'center',
                  paddingTop: '20px',
                  marginTop: '20px',
                  borderTop: '1px solid #374151',
                  fontSize: '11px',
                  color: '#9ca3af',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '2px' }} />
                    Internal (own settlements)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#22c55e', borderRadius: '2px' }} />
                    External (other tribes)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#fbbf24', borderRadius: '2px' }} />
                    Allied (+25% yield)
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// Route card component
interface RouteCardProps {
  route: TradeRoute
  getSettlementName: (id: SettlementId) => string
  getTribeName: (id: SettlementId) => string
  getTribeColor: (id: SettlementId) => string
  onCancel: () => void
  isInternal: boolean
  isForming?: boolean
}

function RouteCard({
  route,
  getSettlementName,
  getTribeName,
  getTribeColor,
  onCancel,
  isInternal,
  isForming,
}: RouteCardProps): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        background: isForming ? '#2a2a1a' : '#252535',
        borderRadius: '8px',
        borderLeft: `4px solid ${isInternal ? '#3b82f6' : getTribeColor(route.destination)}`,
        opacity: isForming ? 0.8 : 1,
      }}
    >
      {/* Origin */}
      <div style={{ minWidth: '100px' }}>
        <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '13px' }}>
          {getSettlementName(route.origin)}
        </div>
        <div style={{ color: '#9ca3af', fontSize: '11px' }}>Origin</div>
      </div>

      {/* Arrow */}
      <div style={{
        flex: 1,
        height: '2px',
        background: isForming
          ? `repeating-linear-gradient(90deg, #fbbf24 0, #fbbf24 8px, transparent 8px, transparent 16px)`
          : (isInternal ? '#3b82f6' : '#22c55e'),
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          right: '-4px',
          top: '-4px',
          width: 0,
          height: 0,
          borderTop: '5px solid transparent',
          borderBottom: '5px solid transparent',
          borderLeft: `8px solid ${isForming ? '#fbbf24' : (isInternal ? '#3b82f6' : '#22c55e')}`,
        }} />
      </div>

      {/* Destination */}
      <div style={{ minWidth: '100px' }}>
        <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '13px' }}>
          {getSettlementName(route.destination)}
        </div>
        <div style={{ color: '#9ca3af', fontSize: '11px' }}>
          {isInternal ? 'Internal' : getTribeName(route.destination)}
        </div>
      </div>

      {/* Gold yield or forming status */}
      <div style={{
        minWidth: '70px',
        textAlign: 'center',
        padding: '4px 12px',
        background: isForming ? '#3a3a1a' : '#1a2a1a',
        borderRadius: '4px',
        color: isForming ? '#fbbf24' : '#22c55e',
        fontWeight: 'bold',
        fontSize: '13px',
      }}>
        {isForming ? (
          `${route.turnsUntilActive} turns`
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            +{route.goldPerTurn}
            <img src="/assets/icons/gold.svg" alt="gold" style={{ width: 14, height: 14, filter: 'brightness(0) saturate(100%) invert(83%) sepia(44%) saturate(1000%) hue-rotate(359deg) brightness(103%) contrast(106%)' }} />
          </span>
        )}
      </div>

      {/* Cancel button */}
      <button
        onClick={onCancel}
        style={{
          padding: '4px 10px',
          background: '#3a1a1a',
          border: '1px solid #ef4444',
          borderRadius: '4px',
          color: '#ef4444',
          cursor: 'pointer',
          fontSize: '11px',
        }}
      >
        Cancel
      </button>
    </div>
  )
}
