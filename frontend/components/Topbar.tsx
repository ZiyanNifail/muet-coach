'use client'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Badge } from './ui/Badge'
import { signOut } from '@/lib/auth'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/practice': 'Practice Session',
  '/history': 'Session History',
  '/progress': 'Progress Tracking',
  '/courses': 'My Courses',
}

export function Topbar({ userName, role }: { userName?: string; role?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const title = pageTitles[pathname] ?? 'Presentation Coach'

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <header
      className="flex items-center justify-between px-5"
      style={{
        height: 48,
        background: 'rgba(10,10,18,0.55)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-3">
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#3a3a52',
          }}
        >
          PreCoach
        </span>
        <span style={{ color: 'rgba(255,255,255,0.08)', fontSize: 16 }}>·</span>
        <span className="text-[#8888a0] text-sm">{title}</span>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant={role === 'educator' ? 'amber' : 'blue'}>
          {role === 'educator' ? 'Educator' : 'Student'}
        </Badge>
        {userName && (
          <span className="text-[#55556a] text-sm hidden sm:block">{userName}</span>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-[#55556a] hover:text-[#8888a0] transition-colors text-sm"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  )
}
