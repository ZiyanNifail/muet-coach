'use client'
import Link from 'next/link'
import { VoxReadyLogo } from './ui/voxready-logo'
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
  CalendarClock,
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
      { label: 'Schedule MUET Exam', href: '/educator/exams/new', icon: CalendarClock },
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

export function EducatorSidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/educator/dashboard') return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      {/* Backdrop — mobile only */}
      <div
        className={clsx(
          'fixed inset-0 md:hidden transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        style={{ background: 'rgba(0,0,0,0.45)', zIndex: 40, top: 48 }}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={clsx(
          'flex flex-col py-5 gap-4 overflow-y-auto',
          'fixed md:static top-[48px] bottom-0 left-0',
          'z-50 md:z-auto',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
        style={{
          width: 232,
          minWidth: 232,
          background: 'var(--bg-panel)',
          borderRight: '1px solid var(--border-subtle)',
          transition: 'transform 0.3s ease, background 0.3s ease, border-color 0.3s ease',
        }}
      >
        {/* Portal identity */}
        <div className="px-4 pb-1 flex flex-col gap-1">
          <VoxReadyLogo iconSize={18} />
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.01em', color: 'var(--text-primary)', fontFamily: 'var(--font-lora, Georgia, serif)' }}>
              Educator Portal
            </span>
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: 'var(--accent-teal-dim)', color: 'var(--accent-teal)', letterSpacing: '0.06em' }}
            >
              EDU
            </span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0 16px' }} />

        {nav.map((group) => (
          <div key={group.section}>
            <div
              className="px-4 mb-1.5"
              style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}
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
                    onClick={onClose}
                    className={clsx(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all no-underline',
                      active ? 'font-medium' : 'hover:bg-[var(--bg-surface)]',
                    )}
                    style={active
                      ? { background: 'var(--accent-teal-dim)', color: 'var(--accent-teal)' }
                      : { color: 'var(--text-tertiary)' }
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
        <div className="mt-auto px-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-2 text-[12px] transition-colors no-underline hover:opacity-70"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <Users size={12} />
            Switch to Student View
          </Link>
        </div>
      </aside>
    </>
  )
}
