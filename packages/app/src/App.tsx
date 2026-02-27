// Main application component

import { Component, useState, useEffect, useCallback } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { GameProvider, useGameContext } from './context/GameContext'
import { GameCanvas } from './components/GameCanvas'
import { GameUI } from './components/GameUI'
import { MainMenu } from './components/MainMenu'
import { EndGameScreen } from './components/EndGameScreen'
import { SolanaProvider } from './wallet/SolanaProvider'
import { isGameOver } from '@tribes/game-core'
import type { TribeName } from '@tribes/game-core'

// Error boundary to prevent blank screens from unhandled errors
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Moon or Dust] Uncaught error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', background: '#1a1a2e', color: '#fff', fontFamily: 'system-ui, sans-serif',
          padding: '20px', textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '12px' }}>Something went wrong</h1>
          <p style={{ color: '#888', marginBottom: '16px', maxWidth: '500px' }}>{this.state.error.message}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px', background: '#7c3aed', border: 'none', borderRadius: '8px',
              color: '#fff', fontSize: '14px', cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

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

  // Check if game is over (turn limit or conquest victory)
  const gameOver = isGameOver(state)

  return (
    <>
      <GameView />
      {gameOver && <EndGameScreen state={state} onPlayAgain={handlePlayAgain} soarService={soarService} />}
    </>
  )
}

export function App(): JSX.Element {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  )
}
