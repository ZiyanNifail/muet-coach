'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { clsx } from 'clsx'
import { Suspense } from 'react'
import {
  Mic,
  Mic2,
  Timer,
  TrendingUp,
  History,
  BookOpen,
  LayoutDashboard,
  Volume2,
} from 'lucide-react'

const studentNav = [
  {
    section: 'PRACTICE',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Unguided Session', href: '/practice?mode=unguided', icon: Mic },
      { label: 'Guided Session', href: '/practice?mode=guided', icon: Mic2 },
      { label: 'Exam Mode', href: '/practice?mode=exam', icon: Timer },
    ],
  },
  {
    section: 'PROGRESS',
    items: [
      { label: 'Band Timeline', href: '/progress', icon: TrendingUp },
      { label: 'Session History', href: '/history', icon: History },
    ],
  },
  {
    section: 'COURSES',
    items: [{ label: 'My Courses', href: '/courses', icon: BookOpen }],
  },
  {
    section: 'IMPROVE',
    items: [{ label: 'Pronunciation', href: '/pronunciation', icon: Volume2 }],
  },
]

function SidebarNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function isActive(href: string) {
    const [hrefPath, hrefQuery] = href.split('?')
    if (pathname !== hrefPath) return false
    if (!hrefQuery) return true
    const hrefParams = new URLSearchParams(hrefQuery)
    for (const [key, val] of hrefParams.entries()) {
      if (searchParams.get(key) !== val) return false
    }
    return true
  }

  return (
    <>
      {studentNav.map((group) => (
        <div key={group.section}>
          <div
            className="px-4 mb-1"
            style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#C4B8A8' }}
          >
            {group.section}
          </div>
          <div className="flex flex-col gap-0.5 px-2">
            {group.items.map((item) => {
              const active = isActive(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all no-underline',
                    active
                      ? 'font-medium'
                      : 'hover:bg-[rgba(180,165,148,0.10)]'
                  )}
                  style={active
                    ? { background: 'rgba(58,125,106,0.10)', color: '#3A7D6A' }
                    : { color: '#9B8E80' }
                  }
                >
                  <Icon size={14} strokeWidth={1.75} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}

export function Sidebar() {
  return (
    <aside
      className="flex flex-col py-5 gap-6 overflow-y-auto"
      style={{
        width: 220,
        minWidth: 220,
        background: '#F0EDE6',
        borderRight: '1px solid rgba(180,165,148,0.25)',
      }}
    >
      {/* Logo */}
      <div className="px-4 pb-1">
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#3A7D6A', fontFamily: 'var(--font-lora, Georgia, serif)' }}>
          PreCoach
        </span>
      </div>

      <Suspense fallback={null}>
        <SidebarNav />
      </Suspense>
    </aside>
  )
}
