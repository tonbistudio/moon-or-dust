// Main application component

import { useState, useEffect, useCallback } from 'react'
import { GameProvider, useGameContext } from './context/GameContext'
import { GameCanvas } from './components/GameCanvas'
import { GameUI } from './components/GameUI'
import { MainMenu } from './components/MainMenu'
import { EndGameScreen } from './components/EndGameScreen'
import { SolanaProvider } from './wallet/SolanaProvider'
import type { TribeName } from '@tribes/game-core'

interface ZoomControls {
  zoomIn: () => void
  zoomOut: () => void
}

function GameView(): JSX.Element {
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })
  const [hoveredTile, setHoveredTile] = useState<{ q: number; r: number } | null>(null)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [zoomControls, setZoomControls] = useState<ZoomControls | null>(null)

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  const handleRendererReady = useCallback((controls: ZoomControls) => {
    setZoomControls(controls)
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <GameCanvas
        width={dimensions.width}
        height={dimensions.height}
        hexSize={40}
        onTileHover={setHoveredTile}
        onRendererReady={handleRendererReady}
      />
      <GameUI
        hoveredTile={hoveredTile}
        mousePosition={mousePosition}
        onZoomIn={zoomControls?.zoomIn}
        onZoomOut={zoomControls?.zoomOut}
      />
    </div>
  )
}

function GameApp(): JSX.Element {
  const { state, startGame, soarService } = useGameContext()

  const handleStartGame = useCallback(
    (tribe: TribeName) => {
      // Get AI tribes (exclude selected tribe, and unavailable tribes)
      const availableTribes: TribeName[] = ['monkes', 'geckos', 'degods', 'cets']
      const aiTribes = availableTribes.filter((t) => t !== tribe).slice(0, 3)

      startGame({
        seed: Date.now(),
        humanTribe: tribe,
        aiTribes,
      })
    },
    [startGame]
  )

  const handlePlayAgain = useCallback(() => {
    // Simple reset - reload the page to return to main menu
    window.location.reload()
  }, [])

  if (!state) {
    return <MainMenu onStartGame={handleStartGame} soarService={soarService} />
  }

  // Check if game is over (turn exceeds maxTurns)
  const isGameOver = state.turn > state.maxTurns

  return (
    <>
      <GameView />
      {isGameOver && <EndGameScreen state={state} onPlayAgain={handlePlayAgain} soarService={soarService} />}
    </>
  )
}

export function App(): JSX.Element {
  return (
    <SolanaProvider>
      <GameProvider>
        <div
          style={{
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
            background: '#1a1a2e',
          }}
        >
          <GameApp />
        </div>
      </GameProvider>
    </SolanaProvider>
  )
}
