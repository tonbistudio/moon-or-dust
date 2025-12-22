// Icon component for yield types with tooltip

interface YieldIconProps {
  type: 'gold' | 'alpha' | 'vibes' | 'production' | 'growth'
  value: number
  size?: number
}

const YIELD_COLORS: Record<string, string> = {
  gold: '#ffd700',
  alpha: '#64b5f6',
  vibes: '#ba68c8',
  production: '#ff9800',
  growth: '#4caf50',
}

// CSS filters to tint white SVGs to specific colors
// Generated using https://codepen.io/sosuke/pen/Pjoqqp
const YIELD_FILTERS: Record<string, string> = {
  gold: 'brightness(0) saturate(100%) invert(83%) sepia(44%) saturate(1000%) hue-rotate(359deg) brightness(103%) contrast(106%)',
  alpha: 'brightness(0) saturate(100%) invert(68%) sepia(44%) saturate(500%) hue-rotate(178deg) brightness(101%) contrast(92%)',
  vibes: 'brightness(0) saturate(100%) invert(52%) sepia(47%) saturate(600%) hue-rotate(250deg) brightness(95%) contrast(90%)',
  production: 'brightness(0) saturate(100%) invert(60%) sepia(89%) saturate(1000%) hue-rotate(360deg) brightness(103%) contrast(106%)',
  growth: 'brightness(0) saturate(100%) invert(58%) sepia(68%) saturate(500%) hue-rotate(80deg) brightness(95%) contrast(90%)',
}

const YIELD_LABELS: Record<string, string> = {
  gold: 'Gold',
  alpha: 'Alpha',
  vibes: 'Vibes',
  production: 'Production',
  growth: 'Growth',
}

export function YieldIcon({ type, value, size = 20 }: YieldIconProps): JSX.Element {
  const color = YIELD_COLORS[type]
  const filter = YIELD_FILTERS[type]
  const label = YIELD_LABELS[type]

  return (
    <div
      title={`${label}: ${value}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        cursor: 'default',
      }}
    >
      <img
        src={`/assets/icons/${type}.svg`}
        alt={label}
        style={{
          width: size,
          height: size,
          filter,
        }}
      />
      <span style={{ color, fontWeight: 'bold', fontSize: '14px' }}>{value}</span>
    </div>
  )
}
