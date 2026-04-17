'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  FileCheck,
  Users,
  BarChart2,
  GraduationCap,
  Shield,
} from 'lucide-react'

const nav = [
  {
    section: 'OVERVIEW',
    items: [
      { label: 'Dashboard', href: '/educator/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'COURSES',
    items: [
      { label: 'My Courses', href: '/educator/dashboard', icon: BookOpen },
      { label: 'Create Course', href: '/educator/courses/new', icon: PlusCircle },
    ],
  },
  {
    section: 'MANAGE',
    items: [
      { label: 'All Submissions', href: '/educator/submissions', icon: FileCheck },
      { label: 'Students', href: '/educator/students', icon: GraduationCap },
    ],
  },
  {
    section: 'INSIGHTS',
    items: [
      { label: 'Analytics', href: '/educator/analytics', icon: BarChart2 },
    ],
  },
  {
    section: 'ADMIN',
    items: [
      { label: 'Educator Approvals', href: '/admin', icon: Shield },
    ],
  },
]

export function EducatorSidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/educator/dashboard') return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside
      className="flex flex-col py-5 gap-4 overflow-y-auto"
      style={{
        width: 232,
        minWidth: 232,
        background: '#EAE6DD',
        borderRight: '1px solid rgba(180,165,148,0.28)',
      }}
    >
      {/* Portal identity */}
      <div className="px-4 pb-1 flex flex-col gap-1">
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9B8E80', fontFamily: 'var(--font-lora, Georgia, serif)' }}>
          PreCoach
        </span>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.01em', color: '#1C1A17', fontFamily: 'var(--font-lora, Georgia, serif)' }}>
            Educator Portal
          </span>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(58,125,106,0.12)', color: '#3A7D6A', letterSpacing: '0.06em' }}
          >
            EDU
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(180,165,148,0.25)', margin: '0 16px' }} />

      {nav.map((group) => (
        <div key={group.section}>
          <div
            className="px-4 mb-1.5"
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
                  key={item.href + item.label}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all no-underline',
                    active ? 'font-medium' : 'hover:bg-[rgba(180,165,148,0.12)]',
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

      {/* Bottom: switch to student view */}
      <div className="mt-auto px-4 pt-4" style={{ borderTop: '1px solid rgba(180,165,148,0.20)' }}>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-[12px] transition-colors no-underline hover:opacity-70"
          style={{ color: '#C4B8A8' }}
        >
          <Users size={12} />
          Switch to Student View
        </Link>
      </div>
    </aside>
  )
}
