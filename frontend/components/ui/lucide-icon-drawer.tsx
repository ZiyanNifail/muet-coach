'use client'
import { animate, svg } from 'animejs'
import { useEffect, useRef } from 'react'

export function useLucideDrawerAnimation() {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!root.current) return
    const elements = root.current.querySelectorAll('svg path, svg circle, svg polyline, svg line')
    elements.forEach((el) => el.classList.add('vox-line'))
    animate(svg.createDrawable('.vox-line'), {
      draw: ['0 0.05', '0.05 1'],
      ease: 'inOutQuad',
      duration: 1200,
      loop: true,
      alternate: true,
    })
  }, [])
  return root
}
