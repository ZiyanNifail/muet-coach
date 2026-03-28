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
    // Check educator routes first, then dynamic routes
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
        background: isEducator
          ? 'rgba(14,9,4,0.65)'
          : 'rgba(10,10,18,0.55)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: isEducator
          ? '1px solid rgba(245,158,11,0.10)'
          : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-3">
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: isEducator ? 'rgba(245,158,11,0.35)' : '#3a3a52',
          }}
        >
          PreCoach
        </span>
        <span style={{ color: isEducator ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.08)', fontSize: 16 }}>·</span>
        <span className="text-sm" style={{ color: isEducator ? '#c08830' : '#8888a0' }}>{title}</span>
      </div>

      <div className="flex items-center gap-3">
        {isEducator && (
          <div className="flex items-center gap-1.5 mr-1" style={{ color: 'rgba(245,158,11,0.5)' }}>
            <GraduationCap size={13} />
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(245,158,11,0.5)' }}>
              EDUCATOR
            </span>
          </div>
        )}
        <Badge variant={isEducator ? 'amber' : 'blue'}>
          {isEducator ? 'Educator' : 'Student'}
        </Badge>
        {userName && (
          <span className="text-[#55556a] text-sm hidden sm:block">{userName}</span>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: isEducator ? 'rgba(245,158,11,0.4)' : '#55556a' }}
        >
          <LogOut size={14} />
          <span className="hidden sm:inline" style={{ color: isEducator ? 'rgba(245,158,11,0.4)' : undefined }}>
            Sign out
          </span>
        </button>
      </div>
    </header>
  )
}
