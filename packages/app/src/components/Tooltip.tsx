// Reusable tooltip component with consistent styling

import { useState, useRef, useEffect, type ReactNode, type CSSProperties } from 'react'

export type TooltipPosition = 'above' | 'below' | 'left' | 'right'

export interface TooltipProps {
  /** The element that triggers the tooltip on hover */
  children: ReactNode
  /** The content to display in the tooltip */
  content: ReactNode
  /** Position of the tooltip relative to the trigger */
  position?: TooltipPosition
  /** Whether to show the arrow pointing to the trigger */
  showArrow?: boolean
  /** Custom width for the tooltip */
  width?: number | 'auto'
  /** Maximum width for the tooltip */
  maxWidth?: number
  /** Delay before showing tooltip (ms) */
  delay?: number
  /** Whether the tooltip is disabled */
  disabled?: boolean
  /** Custom styles for the tooltip container */
  tooltipStyle?: CSSProperties
  /** Custom styles for the wrapper */
  wrapperStyle?: CSSProperties
}

// Tooltip color themes
export type TooltipTheme = 'default' | 'tech' | 'culture' | 'military' | 'economy' | 'success' | 'warning' | 'error'

const THEME_COLORS: Record<TooltipTheme, { bg: string; border: string; arrow: string }> = {
  default: {
    bg: 'linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 100%)',
    border: '#444',
    arrow: '#444',
  },
  tech: {
    bg: 'linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 100%)',
    border: '#64b5f6',
    arrow: '#64b5f6',
  },
  culture: {
    bg: 'linear-gradient(180deg, #2d1a2e 0%, #1a0d1a 100%)',
    border: '#ba68c8',
    arrow: '#ba68c8',
  },
  military: {
    bg: 'linear-gradient(180deg, #2e1a1a 0%, #1a0d0d 100%)',
    border: '#ef5350',
    arrow: '#ef5350',
  },
  economy: {
    bg: 'linear-gradient(180deg, #2e2a1a 0%, #1a170d 100%)',
    border: '#ffd54f',
    arrow: '#ffd54f',
  },
  success: {
    bg: 'linear-gradient(180deg, #1a2e1a 0%, #0d1a0d 100%)',
    border: '#4caf50',
    arrow: '#4caf50',
  },
  warning: {
    bg: 'linear-gradient(180deg, #2e2a1a 0%, #1a170d 100%)',
    border: '#ff9800',
    arrow: '#ff9800',
  },
  error: {
    bg: 'linear-gradient(180deg, #2e1a1a 0%, #1a0d0d 100%)',
    border: '#f44336',
    arrow: '#f44336',
  },
}

export interface ThemedTooltipProps extends TooltipProps {
  theme?: TooltipTheme
}

export function Tooltip({
  children,
  content,
  position = 'below',
  showArrow = true,
  width,
  maxWidth = 280,
  delay = 300,
  disabled = false,
  tooltipStyle,
  wrapperStyle,
}: TooltipProps): JSX.Element {
  const [isVisible, setIsVisible] = useState(false)
  const [adjustedPosition, setAdjustedPosition] = useState(position)
  const timeoutRef = useRef<number | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Adjust position if tooltip would overflow viewport
  useEffect(() => {
    if (isVisible && tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth

      let newPosition = position

      // Check vertical overflow
      if (position === 'below' && tooltipRect.bottom > viewportHeight - 10) {
        newPosition = 'above'
      } else if (position === 'above' && tooltipRect.top < 10) {
        newPosition = 'below'
      }

      // Check horizontal overflow
      if (position === 'right' && tooltipRect.right > viewportWidth - 10) {
        newPosition = 'left'
      } else if (position === 'left' && tooltipRect.left < 10) {
        newPosition = 'right'
      }

      if (newPosition !== adjustedPosition) {
        setAdjustedPosition(newPosition)
      }
    }
  }, [isVisible, position, adjustedPosition])

  const handleMouseEnter = () => {
    if (disabled) return
    if (delay > 0) {
      timeoutRef.current = window.setTimeout(() => {
        setIsVisible(true)
      }, delay)
    } else {
      setIsVisible(true)
    }
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsVisible(false)
  }

  const getPositionStyles = (): CSSProperties => {
    const base: CSSProperties = {
      position: 'absolute',
      zIndex: 9999,
    }

    switch (adjustedPosition) {
      case 'above':
        return { ...base, bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' }
      case 'below':
        return { ...base, top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px' }
      case 'left':
        return { ...base, right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '8px' }
      case 'right':
        return { ...base, left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '8px' }
    }
  }

  const getArrowStyles = (): CSSProperties => {
    const base: CSSProperties = {
      position: 'absolute',
      width: 0,
      height: 0,
      borderLeft: '6px solid transparent',
      borderRight: '6px solid transparent',
      borderTop: '6px solid transparent',
      borderBottom: '6px solid transparent',
    }

    switch (adjustedPosition) {
      case 'above':
        return {
          ...base,
          bottom: '-6px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderTopColor: '#444',
          borderBottomColor: 'transparent',
        }
      case 'below':
        return {
          ...base,
          top: '-6px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderBottomColor: '#444',
          borderTopColor: 'transparent',
        }
      case 'left':
        return {
          ...base,
          right: '-6px',
          top: '50%',
          transform: 'translateY(-50%)',
          borderLeftColor: '#444',
          borderRightColor: 'transparent',
        }
      case 'right':
        return {
          ...base,
          left: '-6px',
          top: '50%',
          transform: 'translateY(-50%)',
          borderRightColor: '#444',
          borderLeftColor: 'transparent',
        }
    }
  }

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'relative',
        display: 'inline-block',
        ...wrapperStyle,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && content && (
        <div
          ref={tooltipRef}
          style={{
            ...getPositionStyles(),
            background: 'linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 100%)',
            border: '1px solid #444',
            borderRadius: '6px',
            padding: '10px 12px',
            width: width === 'auto' ? 'auto' : width,
            maxWidth,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
            color: '#fff',
            fontSize: '12px',
            lineHeight: 1.4,
            ...tooltipStyle,
          }}
        >
          {content}
          {showArrow && <div style={getArrowStyles()} />}
        </div>
      )}
    </div>
  )
}

// Themed tooltip with preset color schemes
export function ThemedTooltip({
  theme = 'default',
  tooltipStyle,
  ...props
}: ThemedTooltipProps): JSX.Element {
  const colors = THEME_COLORS[theme]

  return (
    <Tooltip
      {...props}
      tooltipStyle={{
        background: colors.bg,
        borderColor: colors.border,
        ...tooltipStyle,
      }}
    />
  )
}

// Helper components for common tooltip content patterns

interface TooltipHeaderProps {
  icon?: string
  title: string
  subtitle?: string | undefined
}

export function TooltipHeader({ icon, title, subtitle }: TooltipHeaderProps): JSX.Element {
  return (
    <div style={{ marginBottom: subtitle ? '4px' : '8px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        fontWeight: 700,
        color: '#fff',
      }}>
        {icon && <img src={icon} alt="" style={{ width: '20px', height: '20px' }} />}
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}

interface TooltipSectionProps {
  label: string
  children: ReactNode
}

export function TooltipSection({ label, children }: TooltipSectionProps): JSX.Element {
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{
        fontSize: '9px',
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '3px',
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

interface TooltipDividerProps {
  color?: string
}

export function TooltipDivider({ color = '#333' }: TooltipDividerProps): JSX.Element {
  return (
    <div style={{
      height: '1px',
      background: color,
      margin: '8px 0',
    }} />
  )
}

interface TooltipRowProps {
  label: string
  value: string | number
  valueColor?: string | undefined
}

export function TooltipRow({ label, value, valueColor = '#fff' }: TooltipRowProps): JSX.Element {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '11px',
      marginBottom: '2px',
    }}>
      <span style={{ color: '#aaa' }}>{label}</span>
      <span style={{ color: valueColor, fontWeight: 600 }}>{value}</span>
    </div>
  )
}

interface TooltipListProps {
  items: Array<{ text: string; color?: string }>
  prefix?: string
}

export function TooltipList({ items, prefix = '•' }: TooltipListProps): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {items.map((item, i) => (
        <div key={i} style={{ fontSize: '11px', color: item.color || '#fff' }}>
          {prefix} {item.text}
        </div>
      ))}
    </div>
  )
}

interface TooltipWarningProps {
  message: string
}

export function TooltipWarning({ message }: TooltipWarningProps): JSX.Element {
  return (
    <div style={{
      marginTop: '8px',
      paddingTop: '6px',
      borderTop: '1px solid #333',
      fontSize: '10px',
      color: '#ef5350',
      fontStyle: 'italic',
    }}>
      {message}
    </div>
  )
}
