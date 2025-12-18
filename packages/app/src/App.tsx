// Main application component

import { useState, useEffect, useCallback } from 'react'
import { GameProvider, useGameContext } from './context/GameContext'
import { GameCanvas } from './components/GameCanvas'
import { GameUI } from './components/GameUI'
import { MainMenu } from './components/MainMenu'
import type { TribeName } from '@tribes/game-core'

function GameView(): JSX.Element {
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <GameCanvas width={dimensions.width} height={dimensions.height} hexSize={40} />
      <GameUI />
    </div>
  )
}

function GameApp(): JSX.Element {
  const { state, startGame } = useGameContext()

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

  if (!state) {
    return <MainMenu onStartGame={handleStartGame} />
  }

  return <GameView />
}

export function App(): JSX.Element {
  return (
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
  )
}
