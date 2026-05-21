'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { clsx } from 'clsx'
import { Suspense } from 'react'
import {
  Mic,
  Mic2,
  TrendingUp,
  History,
  BookOpen,
  LayoutDashboard,
  Volume2,
  Upload,
  Headphones,
  PenLine,
  GraduationCap,
} from 'lucide-react'

const studentNav = [
  {
    section: 'PRACTICE',
    items: [
      { label: 'Dashboard',        href: '/dashboard',             icon: LayoutDashboard },
      { label: 'Unguided Session', href: '/practice?mode=unguided', icon: Mic },
      { label: 'Guided Session',   href: '/practice?mode=guided',  icon: Mic2 },
      { label: 'Upload Video',     href: '/upload',                icon: Upload },
    ],
  },
  {
    section: 'PROGRESS',
    items: [
      { label: 'Band Timeline',   href: '/progress', icon: TrendingUp },
      { label: 'Session History', href: '/history',  icon: History },
    ],
  },
  {
    section: 'COURSES',
    items: [{ label: 'My Courses', href: '/courses', icon: BookOpen }],
  },
  {
    section: 'IMPROVE',
    items: [
      { label: 'Full Mock Exam',  href: '/exam',          icon: GraduationCap },
      { label: 'Filler Drill',    href: '/filler-drill',  icon: Mic2          },
      { label: 'Pronunciation',   href: '/pronunciation', icon: Volume2       },
      { label: 'Listening Test',  href: '/listening',     icon: Headphones    },
      { label: 'Writing Test',    href: '/writing',       icon: PenLine       },
    ],
  },
]

function SidebarNav({ onClose }: { onClose?: () => void }) {
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
        <div key={group.section} data-tour={`section-${group.section.toLowerCase()}`}>
          <div
            className="px-4 mb-1"
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
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={clsx(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all no-underline',
                    active
                      ? 'font-medium'
                      : 'hover:bg-[var(--bg-surface)]'
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
    </>
  )
}

export function Sidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
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
          'flex flex-col py-5 gap-6 overflow-y-auto',
          'fixed md:static top-[48px] bottom-0 left-0',
          'z-50 md:z-auto',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
        style={{
          width: 220,
          minWidth: 220,
          background: 'var(--bg-panel)',
          borderRight: '1px solid var(--border-subtle)',
          transition: 'transform 0.3s ease, background 0.3s ease, border-color 0.3s ease',
        }}
      >
        {/* Logos */}
        <div className="px-4 pb-1 flex items-center justify-center gap-3">
          {[
            { src: '/msu.png', alt: 'Management and Science University' },
            { src: '/moe.jpg', alt: 'Kementerian Pendidikan Malaysia' },
            { src: '/mpm.png', alt: 'Majlis Peperiksaan Malaysia' },
          ].map(({ src, alt }) => (
            <div key={src} className="flex items-center justify-center" style={{ width: 34, height: 34, flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={alt} style={{ maxWidth: 34, maxHeight: 34, width: 'auto', height: 'auto', objectFit: 'contain' }} />
            </div>
          ))}
        </div>

        <Suspense fallback={null}>
          <SidebarNav onClose={onClose} />
        </Suspense>

        {/* MUET footer */}
        <div className="mt-auto px-4 pt-3 pb-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2 mb-0.5">
            <div
              style={{
                background: 'var(--accent-teal)',
                color: '#fff',
                fontWeight: 800,
                fontSize: 9,
                letterSpacing: '0.10em',
                padding: '2px 6px',
                borderRadius: 3,
              }}
            >
              MUET
            </div>
            <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 500 }}>Aligned</span>
          </div>
          <p style={{ fontSize: 9, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>Malaysian University English Test</p>
        </div>
      </aside>
    </>
  )
}
