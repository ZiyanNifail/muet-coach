'use client'
import { useTheme } from '@/components/ThemeProvider'
import SkyToggle from './sky-toggle'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
      }}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <SkyToggle checked={theme === 'dark'} onChange={toggle} />
    </div>
  )
}
