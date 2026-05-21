'use client'
import { useEffect, useState } from 'react'

const BARS = [
  { x: 2,  height: 12, y: 14 },
  { x: 11, height: 24, y: 8  },
  { x: 20, height: 36, y: 2  },
  { x: 29, height: 24, y: 8  },
  { x: 38, height: 12, y: 14 },
]

const JUMP_COLORS = ['#3DB896', '#D4A44C', '#7AB5A8', '#5BB5A0', '#B8E0D4']
const BASE_COLOR = '#3A7D6A'
const STROKE_WIDTH = 6
const RX = 3
const JUMP_HEIGHT = 18
const ANIM_DURATION = 340  // ms per bar jump
const SEQUENCE_GAP = 120   // ms between each bar

interface HeroLogoProps {
  size?: number
}

export function HeroLogo({ size = 180 }: HeroLogoProps) {
  const [activeBar, setActiveBar] = useState<number | null>(null)
  const [barColors, setBarColors] = useState<string[]>(BARS.map(() => BASE_COLOR))
  const [barOffsets, setBarOffsets] = useState<number[]>(BARS.map(() => 0))

  useEffect(() => {
    let cancelled = false

    async function runSequence() {
      while (!cancelled) {
        // animate bars left → right
        for (let i = 0; i < BARS.length; i++) {
          if (cancelled) break
          setActiveBar(i)
          setBarColors(prev => {
            const next = [...prev]
            next[i] = JUMP_COLORS[i]
            return next
          })
          setBarOffsets(prev => {
            const next = [...prev]
            next[i] = -JUMP_HEIGHT
            return next
          })

          await wait(ANIM_DURATION / 2)
          if (cancelled) break

          setBarOffsets(prev => {
            const next = [...prev]
            next[i] = 0
            return next
          })

          await wait(ANIM_DURATION / 2)
          if (cancelled) break

          setBarColors(prev => {
            const next = [...prev]
            next[i] = BASE_COLOR
            return next
          })
          setActiveBar(null)

          await wait(SEQUENCE_GAP)
        }
        // pause between full cycles
        await wait(800)
      }
    }

    runSequence()
    return () => { cancelled = true }
  }, [])

  return (
    <svg
      width={size}
      height={size * (40 / 48)}
      viewBox="0 0 48 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="fluency.my"
      role="img"
      style={{ overflow: 'visible' }}
    >
      {BARS.map((bar, i) => (
        <line
          key={i}
          x1={bar.x + STROKE_WIDTH / 2}
          y1={bar.y + RX + barOffsets[i]}
          x2={bar.x + STROKE_WIDTH / 2}
          y2={bar.y + bar.height - RX + barOffsets[i]}
          stroke={barColors[i]}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          style={{
            transition: `y1 ${ANIM_DURATION / 2}ms cubic-bezier(0.34,1.56,0.64,1), y2 ${ANIM_DURATION / 2}ms cubic-bezier(0.34,1.56,0.64,1), stroke 150ms ease`,
            filter: activeBar === i ? `drop-shadow(0 0 6px ${barColors[i]}88)` : 'none',
          }}
        />
      ))}
    </svg>
  )
}

function wait(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms))
}
