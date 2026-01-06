// Canvas component that wraps the Pixi.js GameRenderer

import { useRef, useEffect, useState, useMemo } from 'react'
import { GameRenderer, type GameRendererConfig } from '@tribes/renderer'
import type { HexCoord } from '@tribes/game-core'
import { getReachableHexes, getValidTargets, hexKey } from '@tribes/game-core'
import { useGame, useTileClick, useTileRightClick, useSelectedSettlement } from '../hooks/useGame'

interface GameCanvasProps {
  width: number
  height: number
  hexSize?: number
  onTileHover?: (coord: HexCoord | null) => void
  onRendererReady?: (controls: { zoomIn: () => void; zoomOut: () => void }) => void
}

export function GameCanvas({
  width,
  height,
  hexSize = 40,
  onTileHover,
  onRendererReady,
}: GameCanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<GameRenderer | null>(null)
  const { state, selectedUnit } = useGame()
  const selectedSettlement = useSelectedSettlement()
  const handleTileClick = useTileClick()
  const handleTileRightClick = useTileRightClick()
  const [isInitialized, setIsInitialized] = useState(false)

  // Use refs to avoid stale closure in renderer callbacks
  const tileClickRef = useRef(handleTileClick)
  tileClickRef.current = handleTileClick
  const tileRightClickRef = useRef(handleTileRightClick)
  tileRightClickRef.current = handleTileRightClick

  // Calculate reachable hexes for selected unit
  const reachableHexes = useMemo(() => {
    if (!state || !selectedUnit) return new Set<string>()
    const unit = state.units.get(selectedUnit)
    if (!unit || unit.owner !== state.currentPlayer) return new Set<string>()
    return new Set(getReachableHexes(state, unit).keys())
  }, [state, selectedUnit])

  // Calculate attack targets for selected unit
  const attackTargetHexes = useMemo(() => {
    if (!state || !selectedUnit) return new Set<string>()
    const unit = state.units.get(selectedUnit)
    if (!unit || unit.owner !== state.currentPlayer) return new Set<string>()
    const targets = getValidTargets(state, unit)
    return new Set(targets.map((t) => hexKey(t.position)))
  }, [state, selectedUnit])

  // Store latest state in ref so we can apply it after init
  const pendingStateRef = useRef<{
    state: typeof state
    selectedUnit: typeof selectedUnit
    selectedSettlement: typeof selectedSettlement
    reachableHexes: typeof reachableHexes
    attackTargetHexes: typeof attackTargetHexes
  } | null>(null)

  // Initialize renderer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const config: GameRendererConfig = {
      canvas,
      width,
      height,
      hexSize,
      // Use refs to always get the latest callbacks (avoids stale closure)
      onTileClick: (coord: HexCoord) => tileClickRef.current(coord),
      onTileRightClick: (coord: HexCoord) => tileRightClickRef.current(coord),
      ...(onTileHover && { onTileHover }),
    }

    const renderer = new GameRenderer(config)

    renderer.init().then(() => {
      if (renderer.isDestroyed()) return
      rendererRef.current = renderer
      setIsInitialized(true)

      // Expose zoom controls to parent
      onRendererReady?.({
        zoomIn: () => renderer.zoomIn(),
        zoomOut: () => renderer.zoomOut(),
      })

      // Apply any pending state that arrived during init
      const pending = pendingStateRef.current
      if (pending?.state) {
        const ownedSettlement = pending.selectedSettlement?.owner === pending.state.currentPlayer
          ? pending.selectedSettlement
          : null
        renderer.update(pending.state, {
          selectedUnitId: pending.selectedUnit,
          selectedSettlement: ownedSettlement,
          reachableHexes: pending.reachableHexes,
          attackTargetHexes: pending.attackTargetHexes,
        })
      }
    }).catch((err) => {
      console.error('Renderer initialization failed:', err)
    })

    return () => {
      renderer.destroy()
      rendererRef.current = null
      setIsInitialized(false)
    }
  }, [width, height, hexSize]) // Don't include onTileClick/onTileHover to avoid re-init

  // Update renderer when game state changes
  useEffect(() => {
    // Always store the latest state in case renderer is still initializing
    pendingStateRef.current = { state, selectedUnit, selectedSettlement, reachableHexes, attackTargetHexes }

    if (!isInitialized || !rendererRef.current || !state) return
    // Only pass settlement if owned by current player
    const ownedSettlement = selectedSettlement?.owner === state.currentPlayer ? selectedSettlement : null
    rendererRef.current.update(state, {
      selectedUnitId: selectedUnit,
      selectedSettlement: ownedSettlement,
      reachableHexes,
      attackTargetHexes
    })
  }, [state, isInitialized, selectedUnit, selectedSettlement, reachableHexes, attackTargetHexes])

  // Handle resize
  useEffect(() => {
    if (!rendererRef.current) return
    rendererRef.current.resize(width, height)
  }, [width, height])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        touchAction: 'none',
      }}
    />
  )
}
