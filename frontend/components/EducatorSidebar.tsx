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
  ClipboardList,
  GraduationCap,
} from 'lucide-react'

const nav = [
  {
    section: 'OVERVIEW',
    items: [
      { label: 'Dashboard', href: '/educator/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'TEACHING',
    items: [
      { label: 'My Courses', href: '/educator/dashboard', icon: BookOpen },
      { label: 'New Course', href: '/educator/courses/new', icon: PlusCircle },
      { label: 'Assignments', href: '/educator/submissions', icon: ClipboardList },
      { label: 'All Submissions', href: '/educator/submissions', icon: FileCheck },
    ],
  },
  {
    section: 'INSIGHTS',
    items: [
      { label: 'Class Analytics', href: '/educator/analytics', icon: BarChart2 },
      { label: 'Students', href: '/educator/students', icon: GraduationCap },
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
      className="flex flex-col py-5 gap-5 overflow-y-auto"
      style={{
        width: 224,
        minWidth: 224,
        background: 'rgba(8,8,14,0.70)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(245,158,11,0.10)',
      }}
    >
      {/* Portal identity */}
      <div className="px-4 pb-1 flex flex-col gap-0.5">
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(245,158,11,0.4)' }}>
          PreCoach
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', color: '#f59e0b' }}>
          Educator Portal
        </span>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(245,158,11,0.08)', margin: '0 16px' }} />

      {nav.map((group) => (
        <div key={group.section}>
          <div
            className="px-4 mb-1.5"
            style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(245,158,11,0.3)' }}
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
                    active
                      ? 'bg-[rgba(245,158,11,0.12)] text-[#f59e0b]'
                      : 'text-[#55556a] hover:bg-[rgba(245,158,11,0.06)] hover:text-[#8888a0]',
                  )}
                >
                  <Icon size={14} strokeWidth={1.75} style={{ color: active ? '#f59e0b' : undefined }} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      ))}

      {/* Bottom: switch to student view */}
      <div className="mt-auto px-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-[12px] text-[#3a3a52] hover:text-[#55556a] transition-colors no-underline"
        >
          <Users size={12} />
          Switch to Student View
        </Link>
      </div>
    </aside>
  )
}
