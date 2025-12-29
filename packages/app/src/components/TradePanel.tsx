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
            background: 'rgba(0, 0, 0, 0.85)',
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
            onClick={e => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: '700px',
              maxHeight: '80vh',
              background: 'linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 100%)',
              borderRadius: '16px',
              border: '2px solid #333',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderBottom: '1px solid #333',
                background: 'rgba(0, 0, 0, 0.3)',
              }}
            >
              <div>
                <h2 style={{
                  margin: 0,
                  color: '#fff',
                  fontSize: '20px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <span style={{ fontSize: '24px' }}>🔄</span>
                  Trade Routes
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#888', fontSize: '13px', marginTop: '4px' }}>
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
                  width: '36px',
                  height: '36px',
                  background: 'transparent',
                  border: '1px solid #444',
                  borderRadius: '50%',
                  color: '#888',
                  fontSize: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            {/* Main Content */}
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                padding: '20px 24px',
              }}
            >
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
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{
                      color: '#22c55e',
                      fontSize: '12px',
                      marginBottom: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      fontWeight: 600,
                    }}>
                      Active Routes ({activeRoutes.length})
                    </h3>
                    {activeRoutes.length === 0 ? (
                      <div style={{ color: '#555', fontSize: '13px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px dashed #333' }}>
                        No active trade routes. Create one below.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                    <div style={{ marginBottom: '20px' }}>
                      <h3 style={{
                        color: '#fbbf24',
                        fontSize: '12px',
                        marginBottom: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontWeight: 600,
                      }}>
                        Forming ({formingRoutes.length})
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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

                  {/* Divider */}
                  <div style={{
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent, #444, transparent)',
                    margin: '16px 0',
                  }} />

                  {/* Create New Route */}
                  {routes.length < capacity && (
                    <div>
                      <h3 style={{
                        color: '#3b82f6',
                        fontSize: '12px',
                        marginBottom: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontWeight: 600,
                      }}>
                        Create New Route
                      </h3>

                      {/* Origin Selection */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>
                          1. Select origin settlement:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {playerSettlements.map(settlement => (
                            <button
                              key={settlement.id}
                              onClick={() => setSelectedOrigin(settlement.id)}
                              style={{
                                padding: '8px 16px',
                                background: selectedOrigin === settlement.id ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${selectedOrigin === settlement.id ? '#3b82f6' : '#444'}`,
                                borderRadius: '6px',
                                color: selectedOrigin === settlement.id ? '#fff' : '#aaa',
                                cursor: 'pointer',
                                fontSize: '13px',
                                transition: 'all 0.15s',
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
                          <div style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>
                            2. Select destination:
                          </div>
                          {availableDestinations.length === 0 ? (
                            <div style={{ color: '#555', fontSize: '13px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px dashed #333' }}>
                              No available destinations. Explore more of the map or improve diplomatic relations.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {availableDestinations.map(dest => {
                                const validation = canCreateTradeRoute(state, selectedOrigin, dest.settlement.id)
                                return (
                                  <div
                                    key={dest.settlement.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '12px',
                                      padding: '10px 12px',
                                      background: 'rgba(255,255,255,0.03)',
                                      borderRadius: '8px',
                                      borderLeft: `3px solid ${dest.isInternal ? '#3b82f6' : getTribeColor(dest.settlement.id)}`,
                                    }}
                                  >
                                    <div style={{ flex: 1 }}>
                                      <div style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>
                                        {dest.settlement.name}
                                      </div>
                                      <div style={{ color: '#666', fontSize: '11px' }}>
                                        {dest.isInternal ? 'Internal Route' : getTribeName(dest.settlement.id)}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#22c55e', fontSize: '13px', fontWeight: 'bold' }}>
                                      +{dest.goldPerTurn}
                                      <img src="/assets/icons/gold.svg" alt="gold" style={{ width: 12, height: 12, filter: 'brightness(0) saturate(100%) invert(83%) sepia(44%) saturate(1000%) hue-rotate(359deg) brightness(103%) contrast(106%)' }} />
                                    </div>
                                    <button
                                      onClick={() => handleCreateRoute(dest.settlement.id)}
                                      disabled={!validation.canCreate}
                                      style={{
                                        padding: '6px 14px',
                                        background: validation.canCreate ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : '#333',
                                        border: 'none',
                                        borderRadius: '4px',
                                        color: validation.canCreate ? '#fff' : '#666',
                                        cursor: validation.canCreate ? 'pointer' : 'not-allowed',
                                        fontSize: '11px',
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
                      color: '#666',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '8px',
                      border: '1px dashed #333',
                    }}>
                      Trade route capacity full ({capacity}/{capacity}).
                      <br />
                      <span style={{ fontSize: '12px' }}>
                        Research more technologies or unlock policies to increase capacity.
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer Legend */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '20px',
                padding: '12px 24px',
                borderTop: '1px solid #333',
                background: 'rgba(0, 0, 0, 0.3)',
                fontSize: '11px',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: '#3b82f6', borderRadius: '2px' }} />
                <span style={{ color: '#666' }}>Internal</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: '#22c55e', borderRadius: '2px' }} />
                <span style={{ color: '#666' }}>External</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: '#fbbf24', borderRadius: '2px' }} />
                <span style={{ color: '#666' }}>Allied (+25%)</span>
              </span>
            </div>
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
  const lineColor = isForming ? '#fbbf24' : (isInternal ? '#3b82f6' : '#22c55e')

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '8px',
        borderLeft: `3px solid ${isInternal ? '#3b82f6' : getTribeColor(route.destination)}`,
        opacity: isForming ? 0.85 : 1,
      }}
    >
      {/* Origin */}
      <div style={{ minWidth: '90px' }}>
        <div style={{ color: '#fff', fontWeight: 600, fontSize: '12px' }}>
          {getSettlementName(route.origin)}
        </div>
        <div style={{ color: '#555', fontSize: '10px' }}>Origin</div>
      </div>

      {/* Arrow */}
      <div style={{
        flex: 1,
        height: '2px',
        background: isForming
          ? `repeating-linear-gradient(90deg, ${lineColor} 0, ${lineColor} 6px, transparent 6px, transparent 12px)`
          : lineColor,
        position: 'relative',
        minWidth: '40px',
      }}>
        <div style={{
          position: 'absolute',
          right: '-3px',
          top: '-3px',
          width: 0,
          height: 0,
          borderTop: '4px solid transparent',
          borderBottom: '4px solid transparent',
          borderLeft: `6px solid ${lineColor}`,
        }} />
      </div>

      {/* Destination */}
      <div style={{ minWidth: '90px' }}>
        <div style={{ color: '#fff', fontWeight: 600, fontSize: '12px' }}>
          {getSettlementName(route.destination)}
        </div>
        <div style={{ color: '#555', fontSize: '10px' }}>
          {isInternal ? 'Internal' : getTribeName(route.destination)}
        </div>
      </div>

      {/* Gold yield or forming status */}
      <div style={{
        minWidth: '60px',
        textAlign: 'center',
        padding: '4px 10px',
        background: isForming ? 'rgba(251, 191, 36, 0.1)' : 'rgba(34, 197, 94, 0.1)',
        border: `1px solid ${isForming ? 'rgba(251, 191, 36, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
        borderRadius: '4px',
        color: isForming ? '#fbbf24' : '#22c55e',
        fontWeight: 600,
        fontSize: '12px',
      }}>
        {isForming ? (
          `${route.turnsUntilActive}t`
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
            +{route.goldPerTurn}
            <img src="/assets/icons/gold.svg" alt="gold" style={{ width: 12, height: 12, filter: 'brightness(0) saturate(100%) invert(83%) sepia(44%) saturate(1000%) hue-rotate(359deg) brightness(103%) contrast(106%)' }} />
          </span>
        )}
      </div>

      {/* Cancel button */}
      <button
        onClick={onCancel}
        style={{
          padding: '4px 8px',
          background: 'transparent',
          border: '1px solid #444',
          borderRadius: '4px',
          color: '#666',
          cursor: 'pointer',
          fontSize: '10px',
          transition: 'all 0.15s',
        }}
        onMouseOver={e => {
          e.currentTarget.style.borderColor = '#ef4444'
          e.currentTarget.style.color = '#ef4444'
        }}
        onMouseOut={e => {
          e.currentTarget.style.borderColor = '#444'
          e.currentTarget.style.color = '#666'
        }}
      >
        ×
      </button>
    </div>
  )
}
