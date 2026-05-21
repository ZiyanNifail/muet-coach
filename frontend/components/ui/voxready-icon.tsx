import React from 'react'
import { cn } from '@/lib/utils'

interface VoxReadyIconProps {
  size?: number
  className?: string
  style?: React.CSSProperties
}

export function VoxReadyIcon({ size = 48, className, style }: VoxReadyIconProps) {
  const bars = [
    { x: 2,  height: 12, y: 14 },
    { x: 11, height: 24, y: 8  },
    { x: 20, height: 36, y: 2  },
    { x: 29, height: 24, y: 8  },
    { x: 38, height: 12, y: 14 },
  ]
  const strokeWidth = 6
  const rx = 3

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
      style={style}
      aria-label="fluency.my logo"
      role="img"
    >
      {bars.map((bar, i) => (
        <line
          key={i}
          x1={bar.x + strokeWidth / 2}
          y1={bar.y + rx}
          x2={bar.x + strokeWidth / 2}
          y2={bar.y + bar.height - rx}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}
