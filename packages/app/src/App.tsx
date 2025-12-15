// Main application component

import { useState, useEffect, useCallback } from 'react'
import { GameProvider, useGameContext } from './context/GameContext'
import { GameCanvas } from './components/GameCanvas'
import { GameUI } from './components/GameUI'
import type { TribeName } from '@tribes/game-core'

function MainMenu({ onStartGame }: { onStartGame: (tribe: TribeName) => void }): JSX.Element {
  const tribes: { name: TribeName; display: string; available: boolean }[] = [
    { name: 'monkes', display: 'Monkes', available: true },
    { name: 'geckos', display: 'Geckos', available: true },
    { name: 'degods', display: 'DeGods', available: true },
    { name: 'cets', display: 'Cets', available: true },
    { name: 'gregs', display: 'Gregs', available: false },
    { name: 'dragonz', display: 'Dragonz', available: false },
  ]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#fff',
        padding: '20px',
      }}
    >
      <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>Tribes</h1>
      <p style={{ color: '#888', marginBottom: '2rem' }}>A turn-based 4X strategy game</p>

      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#aaa' }}>
          Select Your Tribe
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            maxWidth: '400px',
          }}
        >
          {tribes.map((tribe) => (
            <button
              key={tribe.name}
              onClick={() => tribe.available && onStartGame(tribe.name)}
              disabled={!tribe.available}
              style={{
                padding: '16px 24px',
                background: tribe.available ? '#2a2a4a' : '#1a1a2a',
                border: '2px solid',
                borderColor: tribe.available ? '#4a4a8a' : '#333',
                borderRadius: '8px',
                color: tribe.available ? '#fff' : '#666',
                cursor: tribe.available ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'all 0.2s',
              }}
            >
              {tribe.display}
              {!tribe.available && (
                <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>
                  Coming Soon
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

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
