// Civ 6 style policy panel - shows active policies and available pool
// Supports drag and drop for slotting/unslotting policies

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import type { Player, PolicyId, PolicySlotType, PolicyCard as PolicyCardType } from '@tribes/game-core'
import { getPolicy } from '@tribes/game-core'
import { PolicyCard } from './PolicyCard'
import { Tooltip } from '../Tooltip'

interface PolicyPanelProps {
  player: Player
  canSwap: boolean // True when completing a culture
  onSwapPolicies?: (toSlot: PolicyId[], toUnslot: PolicyId[]) => void
  onClose: () => void
}

// Slot type display order and info
const SLOT_TYPES: { type: PolicySlotType; name: string; color: string; icon: string; description: string }[] = [
  { type: 'military', name: 'Military', color: '#ef4444', icon: '⚔️', description: 'Policies focused on combat, unit production, and defense. Only military policies can be placed here.' },
  { type: 'economy', name: 'Economy', color: '#eab308', icon: '💰', description: 'Policies focused on gold income, trade routes, and production. Only economy policies can be placed here.' },
  { type: 'progress', name: 'Progress', color: '#3b82f6', icon: '🔬', description: 'Policies focused on research, expansion, and development. Only progress policies can be placed here.' },
  { type: 'wildcard', name: 'Wildcard', color: '#a855f7', icon: '⭐', description: 'Flexible slots that accept ANY policy type. Useful for stacking effects.' },
]

// Check if a policy can be placed in a slot type
function canPlaceInSlot(policySlotType: PolicySlotType, targetSlotType: PolicySlotType): boolean {
  // Wildcard slots accept any policy
  if (targetSlotType === 'wildcard') return true
  // Other slots only accept matching policies
  return policySlotType === targetSlotType
}

// A slot assignment: which policy is in which slot (by slot type and index)
interface SlotAssignment {
  policyId: PolicyId
  slotType: PolicySlotType
  slotIndex: number
}

interface DragState {
  policyId: PolicyId
  startX: number
  startY: number
  currentX: number
  currentY: number
}

export function PolicyPanel({
  player,
  canSwap,
  onSwapPolicies,
  onClose,
}: PolicyPanelProps): JSX.Element {
  // Track slot assignments - which policy is in which slot
  const [assignments, setAssignments] = useState<SlotAssignment[]>(() => {
    // Initialize from current active policies
    const initial: SlotAssignment[] = []
    const slotCounts: Record<PolicySlotType, number> = { military: 0, economy: 0, progress: 0, wildcard: 0 }

    for (const policyId of player.policies.active) {
      const policy = getPolicy(policyId)
      if (!policy) continue

      // Try to place in matching slot first
      if (slotCounts[policy.slotType] < player.policies.slots[policy.slotType]) {
        initial.push({ policyId, slotType: policy.slotType, slotIndex: slotCounts[policy.slotType] })
        slotCounts[policy.slotType]++
      } else if (slotCounts.wildcard < player.policies.slots.wildcard) {
        // Fall back to wildcard
        initial.push({ policyId, slotType: 'wildcard', slotIndex: slotCounts.wildcard })
        slotCounts.wildcard++
      }
    }
    return initial
  })

  const [dragState, setDragState] = useState<DragState | null>(null)
  const [dragOverSlot, setDragOverSlot] = useState<{ type: PolicySlotType; index: number } | null>(null)
  const [dragOverPool, setDragOverPool] = useState(false)
  const [poolFilter, setPoolFilter] = useState<PolicySlotType | 'all'>('all')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const slotRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const poolRef = useRef<HTMLDivElement>(null)

  // Get policy in a specific slot
  const getPolicyInSlot = useCallback((slotType: PolicySlotType, slotIndex: number): PolicyCardType | null => {
    const assignment = assignments.find(a => a.slotType === slotType && a.slotIndex === slotIndex)
    if (!assignment) return null
    return getPolicy(assignment.policyId) ?? null
  }, [assignments])

  // Get all unassigned policies in pool
  const poolPolicies = useMemo(() => {
    const assignedIds = new Set(assignments.map(a => a.policyId))
    return player.policies.pool
      .filter(id => !assignedIds.has(id))
      .map(id => getPolicy(id))
      .filter((p): p is PolicyCardType => p !== null)
  }, [player.policies.pool, assignments])

  // Filter pool policies by selected type
  const filteredPoolPolicies = useMemo(() => {
    if (poolFilter === 'all') return poolPolicies
    return poolPolicies.filter(p => p.slotType === poolFilter)
  }, [poolPolicies, poolFilter])

  // Count policies by type for filter badges
  const poolCounts = useMemo(() => {
    const counts: Record<PolicySlotType | 'all', number> = {
      all: poolPolicies.length,
      military: 0,
      economy: 0,
      progress: 0,
      wildcard: 0,
    }
    for (const p of poolPolicies) {
      counts[p.slotType]++
    }
    return counts
  }, [poolPolicies])

  // Calculate what changed from original
  const changes = useMemo(() => {
    const originalActive = new Set(player.policies.active)
    const newActive = new Set(assignments.map(a => a.policyId))

    const toSlot = assignments
      .map(a => a.policyId)
      .filter(id => !originalActive.has(id))

    const toUnslot = player.policies.active
      .filter(id => !newActive.has(id))

    return { toSlot, toUnslot, hasChanges: toSlot.length > 0 || toUnslot.length > 0 }
  }, [assignments, player.policies.active])

  // Mouse move handler for custom drag
  useEffect(() => {
    if (!dragState) return

    const handleMouseMove = (e: MouseEvent) => {
      setDragState(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null)

      // Check if over any slot
      const policy = getPolicy(dragState.policyId)
      if (!policy) return

      let foundSlot = false
      slotRefs.current.forEach((element, key) => {
        const rect = element.getBoundingClientRect()
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
          const parts = key.split('-')
          const type = parts[0] as PolicySlotType
          const indexStr = parts[1] ?? '0'
          if (canPlaceInSlot(policy.slotType, type)) {
            setDragOverSlot({ type, index: parseInt(indexStr) })
            foundSlot = true
          }
        }
      })

      // Check if over pool
      if (poolRef.current) {
        const rect = poolRef.current.getBoundingClientRect()
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
          setDragOverPool(true)
          if (!foundSlot) setDragOverSlot(null)
        } else {
          setDragOverPool(false)
        }
      }

      if (!foundSlot && !dragOverPool) {
        setDragOverSlot(null)
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      const policy = getPolicy(dragState.policyId)
      if (!policy) {
        setDragState(null)
        setDragOverSlot(null)
        setDragOverPool(false)
        return
      }

      // Check if dropped on a slot
      let dropped = false
      slotRefs.current.forEach((element, key) => {
        if (dropped) return
        const rect = element.getBoundingClientRect()
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
          const parts = key.split('-')
          const slotType = parts[0] as PolicySlotType
          const slotIndex = parseInt(parts[1] ?? '0')

          if (canPlaceInSlot(policy.slotType, slotType)) {
            handleDrop(slotType, slotIndex)
            dropped = true
          }
        }
      })

      // Check if dropped on pool
      if (!dropped && poolRef.current) {
        const rect = poolRef.current.getBoundingClientRect()
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
          // Remove from assignments (move to pool)
          setAssignments(prev => prev.filter(a => a.policyId !== dragState.policyId))
        }
      }

      setDragState(null)
      setDragOverSlot(null)
      setDragOverPool(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState, dragOverPool])

  const handleDrop = (targetSlotType: PolicySlotType, targetSlotIndex: number) => {
    if (!dragState) return

    const policy = getPolicy(dragState.policyId)
    if (!policy) return

    if (!canPlaceInSlot(policy.slotType, targetSlotType)) return

    setAssignments(prev => {
      // Remove policy from current position (if any)
      const filtered = prev.filter(a => a.policyId !== dragState.policyId)

      // Check if target slot is occupied
      const occupant = prev.find(a => a.slotType === targetSlotType && a.slotIndex === targetSlotIndex)

      if (occupant) {
        // Swap: find where the dragged policy was
        const draggedFrom = prev.find(a => a.policyId === dragState.policyId)
        if (draggedFrom) {
          // Check if occupant can go to the source slot
          const occupantPolicy = getPolicy(occupant.policyId)
          if (occupantPolicy && canPlaceInSlot(occupantPolicy.slotType, draggedFrom.slotType)) {
            // Move occupant to where dragged policy was
            return [
              ...filtered.filter(a => a.policyId !== occupant.policyId),
              { policyId: dragState.policyId, slotType: targetSlotType, slotIndex: targetSlotIndex },
              { policyId: occupant.policyId, slotType: draggedFrom.slotType, slotIndex: draggedFrom.slotIndex },
            ]
          } else {
            // Can't swap, just move occupant to pool
            return [
              ...filtered.filter(a => a.policyId !== occupant.policyId),
              { policyId: dragState.policyId, slotType: targetSlotType, slotIndex: targetSlotIndex },
            ]
          }
        } else {
          // Dragged from pool, move occupant to pool (remove it)
          return [
            ...filtered.filter(a => a.policyId !== occupant.policyId),
            { policyId: dragState.policyId, slotType: targetSlotType, slotIndex: targetSlotIndex },
          ]
        }
      }

      // Just place in empty slot
      return [
        ...filtered,
        { policyId: dragState.policyId, slotType: targetSlotType, slotIndex: targetSlotIndex },
      ]
    })
  }

  const handleMouseDown = (e: React.MouseEvent, policyId: PolicyId) => {
    if (!canSwap) return
    e.preventDefault()
    setDragState({
      policyId,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    })
  }

  // Show confirmation dialog before applying changes
  const handleConfirmClick = () => {
    setShowConfirmDialog(true)
  }

  // Apply pending changes after confirmation
  const handleConfirmFinal = () => {
    if (onSwapPolicies && changes.hasChanges) {
      onSwapPolicies(changes.toSlot, changes.toUnslot)
    }
    setShowConfirmDialog(false)
    onClose()
  }

  // Cancel and reset
  const handleCancel = () => {
    onClose()
  }

  // Get the policy being dragged
  const draggingPolicy = dragState ? getPolicy(dragState.policyId) : null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={handleCancel}
    >
      {/* Floating drag card */}
      {dragState && draggingPolicy && (
        <div
          style={{
            position: 'fixed',
            left: dragState.currentX - 90,
            top: dragState.currentY - 50,
            zIndex: 2000,
            pointerEvents: 'none',
            transform: 'scale(1.08)',
            filter: 'drop-shadow(0 0 16px rgba(255, 255, 255, 0.7))',
          }}
        >
          <PolicyCard policy={draggingPolicy} isSelected />
        </div>
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90%',
          maxWidth: '1200px',
          maxHeight: '90vh',
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
            <h2
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 700,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '28px' }}>📜</span>
              Policy Cards
            </h2>
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: '13px',
                color: '#888',
              }}
            >
              {canSwap
                ? 'Drag cards to slots or back to pool'
                : 'Complete a culture to swap policies'}
            </p>
          </div>

          <button
            onClick={handleCancel}
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
              transition: 'all 0.2s',
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '24px',
          }}
        >
          {/* Active Policies Section */}
          <div style={{ marginBottom: '32px' }}>
            <h3
              style={{
                margin: '0 0 16px 0',
                fontSize: '14px',
                fontWeight: 600,
                color: '#aaa',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Active Policies
            </h3>

            <div
              style={{
                display: 'flex',
                gap: '24px',
                flexWrap: 'wrap',
              }}
            >
              {SLOT_TYPES.map(({ type, name, color, icon, description }) => {
                const slotCount = player.policies.slots[type]
                const usedCount = assignments.filter(a => a.slotType === type).length

                return (
                  <div key={type} style={{ minWidth: '200px' }}>
                    {/* Slot Type Header */}
                    <Tooltip
                      content={
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: '4px', color }}>
                            {icon} {name} Slot
                          </div>
                          <div style={{ fontSize: '11px', color: '#aaa' }}>
                            {description}
                          </div>
                        </div>
                      }
                      position="above"
                      maxWidth={240}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '12px',
                          cursor: 'help',
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>{icon}</span>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: color,
                          }}
                        >
                          {name}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            color: '#666',
                            marginLeft: 'auto',
                          }}
                        >
                          {usedCount}/{slotCount}
                        </span>
                      </div>
                    </Tooltip>

                    {/* Slots */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {slotCount === 0 ? (
                        <div
                          style={{
                            padding: '20px',
                            textAlign: 'center',
                            color: '#555',
                            fontSize: '12px',
                            border: '1px dashed #333',
                            borderRadius: '8px',
                          }}
                        >
                          No {name} slots unlocked
                        </div>
                      ) : (
                        Array.from({ length: slotCount }).map((_, slotIndex) => {
                          const policy = getPolicyInSlot(type, slotIndex)
                          const isDropTarget = dragOverSlot?.type === type && dragOverSlot?.index === slotIndex
                          const canAccept = draggingPolicy ? canPlaceInSlot(draggingPolicy.slotType, type) : false

                          return (
                            <div
                              key={`${type}-${slotIndex}`}
                              ref={(el) => {
                                if (el) slotRefs.current.set(`${type}-${slotIndex}`, el)
                              }}
                              style={{
                                position: 'relative',
                                minHeight: '100px',
                                borderRadius: '8px',
                                border: isDropTarget && canAccept
                                  ? `2px solid ${color}`
                                  : dragState && canAccept
                                    ? `2px dashed ${color}66`
                                    : 'none',
                                background: isDropTarget && canAccept ? `${color}22` : 'transparent',
                                transition: 'all 0.15s',
                              }}
                            >
                              {policy ? (
                                <div
                                  onMouseDown={(e) => handleMouseDown(e, policy.id)}
                                  style={{
                                    cursor: canSwap ? 'grab' : 'default',
                                    opacity: dragState?.policyId === policy.id ? 0.3 : 1,
                                    userSelect: 'none',
                                  }}
                                >
                                  <PolicyCard
                                    policy={policy}
                                    isActive
                                  />
                                </div>
                              ) : (
                                <EmptySlot
                                  slotType={type}
                                  isHighlighted={isDropTarget && canAccept}
                                  canAcceptDrag={dragState !== null && canAccept}
                                />
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, #444, transparent)',
              margin: '16px 0 24px 0',
            }}
          />

          {/* Available Policies Pool */}
          <div
            ref={poolRef}
            style={{
              minHeight: '120px',
              padding: '12px',
              border: dragState ? (dragOverPool ? '2px solid #888' : '2px dashed #666') : '2px solid transparent',
              borderRadius: '12px',
              background: dragOverPool ? 'rgba(100, 100, 100, 0.2)' : dragState ? 'rgba(100, 100, 100, 0.1)' : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#aaa',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                Policy Pool
                <span style={{ color: '#666', fontWeight: 400, marginLeft: '8px' }}>
                  ({poolPolicies.length} available)
                </span>
              </h3>

              {/* Filter buttons */}
              {poolPolicies.length > 0 && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <FilterButton
                    label="All"
                    count={poolCounts.all}
                    isActive={poolFilter === 'all'}
                    color="#888"
                    onClick={() => setPoolFilter('all')}
                  />
                  <FilterButton
                    label="⚔️"
                    count={poolCounts.military}
                    isActive={poolFilter === 'military'}
                    color="#ef4444"
                    onClick={() => setPoolFilter('military')}
                  />
                  <FilterButton
                    label="💰"
                    count={poolCounts.economy}
                    isActive={poolFilter === 'economy'}
                    color="#eab308"
                    onClick={() => setPoolFilter('economy')}
                  />
                  <FilterButton
                    label="🔬"
                    count={poolCounts.progress}
                    isActive={poolFilter === 'progress'}
                    color="#3b82f6"
                    onClick={() => setPoolFilter('progress')}
                  />
                  <FilterButton
                    label="⭐"
                    count={poolCounts.wildcard}
                    isActive={poolFilter === 'wildcard'}
                    color="#a855f7"
                    onClick={() => setPoolFilter('wildcard')}
                  />
                </div>
              )}
            </div>

            {poolPolicies.length === 0 && player.policies.pool.length === 0 ? (
              <div
                style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#555',
                  fontSize: '14px',
                }}
              >
                Complete cultures to unlock policy cards
              </div>
            ) : filteredPoolPolicies.length === 0 ? (
              <div
                style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#666',
                  fontSize: '13px',
                }}
              >
                {poolPolicies.length === 0
                  ? 'All policies are slotted'
                  : `No ${poolFilter} policies in pool`}
                {dragState && <span style={{ color: '#888' }}> — drop here to unslot</span>}
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                {filteredPoolPolicies.map((policy) => (
                  <div
                    key={policy.id}
                    onMouseDown={(e) => handleMouseDown(e, policy.id)}
                    style={{
                      cursor: canSwap ? 'grab' : 'default',
                      opacity: dragState?.policyId === policy.id ? 0.3 : 1,
                      userSelect: 'none',
                    }}
                  >
                    <PolicyCard policy={policy} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            padding: '16px 24px',
            borderTop: '1px solid #333',
            background: 'rgba(0, 0, 0, 0.3)',
          }}
        >
          {canSwap && changes.hasChanges && (
            <>
              <button
                onClick={() => {
                  // Reset to original state
                  const initial: SlotAssignment[] = []
                  const slotCounts: Record<PolicySlotType, number> = { military: 0, economy: 0, progress: 0, wildcard: 0 }

                  for (const policyId of player.policies.active) {
                    const policy = getPolicy(policyId)
                    if (!policy) continue

                    if (slotCounts[policy.slotType] < player.policies.slots[policy.slotType]) {
                      initial.push({ policyId, slotType: policy.slotType, slotIndex: slotCounts[policy.slotType] })
                      slotCounts[policy.slotType]++
                    } else if (slotCounts.wildcard < player.policies.slots.wildcard) {
                      initial.push({ policyId, slotType: 'wildcard', slotIndex: slotCounts.wildcard })
                      slotCounts.wildcard++
                    }
                  }
                  setAssignments(initial)
                }}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  color: '#888',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
              <button
                onClick={handleConfirmClick}
                style={{
                  padding: '10px 24px',
                  background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
                }}
              >
                Confirm Changes
              </button>
            </>
          )}
          {!changes.hasChanges && (
            <button
              onClick={onClose}
              style={{
                padding: '10px 24px',
                background: '#333',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => setShowConfirmDialog(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '400px',
              background: 'linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 100%)',
              borderRadius: '12px',
              border: '2px solid #f59e0b',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(245, 158, 11, 0.2)',
              overflow: 'hidden',
            }}
          >
            {/* Dialog Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #333',
                background: 'rgba(245, 158, 11, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '24px' }}>⚠️</span>
              <h3
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#f59e0b',
                }}
              >
                Confirm Policy Changes
              </h3>
            </div>

            {/* Dialog Content */}
            <div style={{ padding: '20px' }}>
              <p
                style={{
                  margin: '0 0 16px 0',
                  fontSize: '14px',
                  color: '#ccc',
                  lineHeight: '1.5',
                }}
              >
                After confirming these changes, you will not be able to swap policies until you complete another culture.
              </p>
              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid #f59e0b44',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#f59e0b',
                }}
              >
                <strong>Changes:</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  {changes.toSlot.length > 0 && (
                    <li>Slotting {changes.toSlot.length} policy{changes.toSlot.length > 1 ? ' cards' : ' card'}</li>
                  )}
                  {changes.toUnslot.length > 0 && (
                    <li>Unslotting {changes.toUnslot.length} policy{changes.toUnslot.length > 1 ? ' cards' : ' card'}</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Dialog Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                padding: '16px 20px',
                borderTop: '1px solid #333',
                background: 'rgba(0, 0, 0, 0.2)',
              }}
            >
              <button
                onClick={() => setShowConfirmDialog(false)}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  color: '#888',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmFinal}
                style={{
                  padding: '10px 24px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                }}
              >
                Confirm & Lock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Filter button component
function FilterButton({
  label,
  count,
  isActive,
  color,
  onClick,
}: {
  label: string
  count: number
  isActive: boolean
  color: string
  onClick: () => void
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        background: isActive ? `${color}33` : 'transparent',
        border: `1px solid ${isActive ? color : '#444'}`,
        borderRadius: '16px',
        color: isActive ? color : '#888',
        fontSize: '12px',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <span>{label}</span>
      {count > 0 && (
        <span
          style={{
            background: isActive ? color : '#555',
            color: '#fff',
            fontSize: '10px',
            padding: '1px 5px',
            borderRadius: '8px',
            fontWeight: 600,
          }}
        >
          {count}
        </span>
      )}
    </button>
  )
}

// Empty slot component (inline to avoid circular deps)
function EmptySlot({
  slotType,
  isHighlighted,
  canAcceptDrag,
}: {
  slotType: PolicySlotType
  isHighlighted: boolean
  canAcceptDrag: boolean
}): JSX.Element {
  const colors: Record<PolicySlotType, { primary: string; border: string; bg: string }> = {
    military: { primary: '#ef4444', border: '#7f1d1d', bg: 'rgba(127, 29, 29, 0.3)' },
    economy: { primary: '#eab308', border: '#713f12', bg: 'rgba(113, 63, 18, 0.3)' },
    progress: { primary: '#3b82f6', border: '#1e3a5f', bg: 'rgba(30, 58, 95, 0.3)' },
    wildcard: { primary: '#a855f7', border: '#581c87', bg: 'rgba(88, 28, 135, 0.3)' },
  }

  const icons: Record<PolicySlotType, string> = {
    military: '⚔️',
    economy: '💰',
    progress: '🔬',
    wildcard: '⭐',
  }

  const names: Record<PolicySlotType, string> = {
    military: 'Military',
    economy: 'Economy',
    progress: 'Progress',
    wildcard: 'Wildcard',
  }

  const c = colors[slotType]

  return (
    <div
      style={{
        width: '180px',
        minHeight: '100px',
        padding: '10px 12px',
        background: c.bg,
        border: `2px dashed ${isHighlighted ? c.primary : canAcceptDrag ? c.primary + '66' : c.border}`,
        borderRadius: '8px',
        transition: 'all 0.15s ease',
        boxShadow: isHighlighted ? `0 0 12px ${c.primary}40` : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
    >
      <span style={{ fontSize: '24px', opacity: 0.5 }}>
        {icons[slotType]}
      </span>
      <span
        style={{
          fontSize: '11px',
          color: c.primary,
          opacity: 0.7,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}
      >
        {names[slotType]} Slot
      </span>
      <span style={{ fontSize: '10px', color: '#666' }}>
        {canAcceptDrag ? 'Drop here' : 'Empty'}
      </span>
    </div>
  )
}
