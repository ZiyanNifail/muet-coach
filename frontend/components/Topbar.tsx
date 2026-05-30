'use client'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, GraduationCap, Menu, Sun, Moon } from 'lucide-react'
import { motion } from 'framer-motion'
import { Badge } from './ui/Badge'
import { signOut } from '@/lib/auth'
import { VoxReadyLogo } from './ui/voxready-logo'
import { useTheme } from '@/components/ThemeProvider'

const studentPageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/practice': 'Practice Session',
  '/history': 'Session History',
  '/progress': 'Progress Tracking',
  '/courses': 'My Courses',
}

const educatorPageTitles: Record<string, string> = {
  '/educator/dashboard': 'Dashboard',
  '/educator/courses/new': 'Create Course',
  '/educator/submissions': 'All Submissions',
  '/educator/students': 'Students',
  '/educator/analytics': 'Analytics',
  '/admin': 'Admin Panel',
}

function getTitle(pathname: string, role?: string): string {
  if (role === 'educator') {
    if (educatorPageTitles[pathname]) return educatorPageTitles[pathname]
    if (pathname.match(/^\/educator\/courses\/[^/]+\/assignments\/new/)) return 'New Assignment'
    if (pathname.match(/^\/educator\/courses\/[^/]+\/submissions\//)) return 'Review Submission'
    if (pathname.match(/^\/educator\/courses\/[^/]+/)) return 'Course Detail'
    return 'Educator Portal'
  }
  return studentPageTitles[pathname] ?? 'fluency.my'
}

export function Topbar({ userName, role, onMenuToggle }: { userName?: string; role?: string; onMenuToggle?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const title = getTitle(pathname, role)
  const isEducator = role === 'educator'

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <header
      className="flex items-center justify-between px-5"
      style={{
        height: 48,
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-subtle)',
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}
    >
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-tertiary)' }}
            aria-label="Toggle menu"
          >
            <Menu size={18} />
          </button>
        )}
        <VoxReadyLogo iconSize={20} />
        <span style={{ color: 'var(--border-medium)', fontSize: 16 }}>·</span>
        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{title}</span>
      </div>

      <div className="flex items-center gap-3">
        {isEducator && (
          <div className="flex items-center gap-1.5 mr-1" style={{ color: 'var(--text-tertiary)' }}>
            <GraduationCap size={13} />
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
              EDUCATOR
            </span>
          </div>
        )}
        <Badge variant={isEducator ? 'amber' : 'blue'}>
          {isEducator ? 'Educator' : 'Student'}
        </Badge>
        {userName && (
          <span className="text-sm hidden sm:block" style={{ color: 'var(--text-secondary)' }}>{userName}</span>
        )}
        <button
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-1.5 rounded-lg transition-colors hover:opacity-70"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <motion.div
            key={theme}
            initial={{ rotate: -60, scale: 0.5, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, type: 'spring', stiffness: 260, damping: 18 }}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </motion.div>
        </button>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-sm transition-colors hover:opacity-70"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  )
}
