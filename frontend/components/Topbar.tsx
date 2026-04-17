'use client'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, GraduationCap } from 'lucide-react'
import { Badge } from './ui/Badge'
import { signOut } from '@/lib/auth'

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
  return studentPageTitles[pathname] ?? 'Presentation Coach'
}

export function Topbar({ userName, role }: { userName?: string; role?: string }) {
  const pathname = usePathname()
  const router = useRouter()
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
        background: '#F5F2EC',
        borderBottom: '1px solid rgba(180,165,148,0.25)',
      }}
    >
      <div className="flex items-center gap-3">
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#3A7D6A',
            fontFamily: 'var(--font-lora, Georgia, serif)',
          }}
        >
          PreCoach
        </span>
        <span style={{ color: 'rgba(180,165,148,0.5)', fontSize: 16 }}>·</span>
        <span className="text-sm" style={{ color: '#9B8E80' }}>{title}</span>
      </div>

      <div className="flex items-center gap-3">
        {isEducator && (
          <div className="flex items-center gap-1.5 mr-1" style={{ color: '#9B8E80' }}>
            <GraduationCap size={13} />
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9B8E80' }}>
              EDUCATOR
            </span>
          </div>
        )}
        <Badge variant={isEducator ? 'amber' : 'blue'}>
          {isEducator ? 'Educator' : 'Student'}
        </Badge>
        {userName && (
          <span className="text-sm hidden sm:block" style={{ color: '#6B6050' }}>{userName}</span>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-sm transition-colors hover:opacity-70"
          style={{ color: '#9B8E80' }}
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  )
}
