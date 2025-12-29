// Event log for displaying combat results and other game events

export interface GameEvent {
  id: string
  message: string
  type: 'combat' | 'lootbox' | 'settlement' | 'info' | 'diplomacy' | 'milestone' | 'research' | 'golden' | 'culture' | 'policy' | 'great_person'
  turn: number
}

interface EventLogProps {
  events: GameEvent[]
}

export function EventLog({ events }: EventLogProps): JSX.Element | null {
  if (events.length === 0) return null

  return (
    <div
      style={{
        position: 'absolute',
        right: '16px',
        bottom: '16px',
        maxWidth: '350px',
        maxHeight: '200px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        pointerEvents: 'none',
      }}
    >
      {events.map((event) => (
        <div
          key={event.id}
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            borderRadius: '4px',
            padding: '8px 12px',
            color: getEventColor(event.type),
            fontSize: '12px',
            borderLeft: `3px solid ${getEventColor(event.type)}`,
            animation: 'fadeIn 0.3s ease-in-out',
          }}
        >
          {event.message}
        </div>
      ))}
    </div>
  )
}

function getEventColor(type: GameEvent['type']): string {
  switch (type) {
    case 'combat':
      return '#ef4444' // red
    case 'lootbox':
      return '#d946ef' // fuchsia
    case 'settlement':
      return '#22c55e' // green
    case 'diplomacy':
      return '#f97316' // orange
    case 'milestone':
      return '#4ade80' // bright green
    case 'research':
      return '#60a5fa' // blue
    case 'golden':
      return '#fbbf24' // golden/amber
    case 'culture':
      return '#c084fc' // purple (for culture unlocks)
    case 'policy':
      return '#a855f7' // violet (for policy selections)
    case 'great_person':
      return '#f0abfc' // pink (for great people appearances)
    case 'info':
    default:
      return '#ffffff' // white
  }
}
