'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { motion, LayoutGroup } from 'framer-motion'
import { clsx } from 'clsx'
import { Suspense } from 'react'
import { springs } from '@/lib/motion'
import { useNavGuard } from '@/lib/navGuard'
import {
  LayoutDashboard,
  Mic,
  Mic2,
  Radio,
  Upload,
  TrendingUp,
  History,
  BookOpen,
  GraduationCap,
  PenLine,
  Headphones,
  Zap,
  Briefcase,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>
  desc?: string
  soon?: boolean   // route not yet built — renders as greyed-out with a "Soon" badge
}

interface NavSection {
  section: string
  items: NavItem[]
}

// Navigation structured as a learning progression: HOME → LEARN → PRACTICE → PROGRESS → TEST.
// All MUET skill features are surfaced under LEARN so students can discover them without
// hunting through sub-menus or exam flows.
const studentNav: NavSection[] = [
  {
    section: 'HOME',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'LEARN',
    items: [
      { label: 'Pronunciation', href: '/pronunciation', icon: Mic,        desc: 'Syllable scoring + tips'   },
      { label: 'Writing',       href: '/writing',       icon: PenLine,    desc: 'Task 1 & 2 MUET practice' },
      { label: 'Listening',     href: '/listening',     icon: Headphones, desc: 'MUET MCQ sections'         },
      { label: 'Filler Drill',  href: '/filler-drill',  icon: Zap,        desc: '60-second challenge'       },
    ],
  },
  {
    section: 'PRACTICE',
    items: [
      { label: 'Guided Session',   href: '/practice?mode=guided',   icon: Radio, desc: 'Real-time coaching' },
      { label: 'Unguided Session', href: '/practice?mode=unguided', icon: Mic2,  desc: 'Baseline recording'  },
      { label: 'Upload Video',     href: '/upload',                  icon: Upload },
    ],
  },
  {
    section: 'PROGRESS',
    items: [
      { label: 'Band Timeline',   href: '/progress', icon: TrendingUp },
      { label: 'Session History', href: '/history',  icon: History    },
      { label: 'My Courses',      href: '/courses',  icon: BookOpen   },
    ],
  },
  {
    section: 'TEST',
    items: [
      { label: 'Full Mock Exam',  href: '/exam',      icon: GraduationCap, desc: 'Simulated MUET conditions'    },
      { label: 'Mock Interview',  href: '/interview', icon: Briefcase,  desc: 'Job & presentation practice' },
    ],
  },
]

function SidebarNav({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const navGuard = useNavGuard()

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
    <LayoutGroup id="student-nav">
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
              const Icon = item.icon

              // "Soon" items — not yet built, rendered as non-interactive with a badge
              if (item.soon) {
                return (
                  <div
                    key={item.href}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                    style={{ color: 'var(--text-tertiary)', opacity: 0.5, cursor: 'default' }}
                  >
                    <Icon size={14} strokeWidth={1.75} className="flex-shrink-0" />
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span style={{ fontSize: 13 }}>{item.label}</span>
                        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.10em', background: 'rgba(180,165,148,0.25)', color: 'var(--text-tertiary)', padding: '1px 4px', borderRadius: 3 }}>
                          SOON
                        </span>
                      </div>
                      {item.desc && (
                        <span style={{ fontSize: 9, color: 'var(--text-tertiary)', lineHeight: 1.3, marginTop: 1 }}>
                          {item.desc}
                        </span>
                      )}
                    </div>
                  </div>
                )
              }

              const active = isActive(item.href)
              return (
                <div key={item.href} className="relative">
                  {active && (
                    <motion.div
                      layoutId="student-nav-pill"
                      className="absolute inset-0 rounded-lg"
                      style={{ background: 'var(--accent-teal-dim)' }}
                      transition={springs.gentle}
                    />
                  )}
                  <Link
                    href={item.href}
                    onClick={(e) => {
                      if (navGuard?.active) {
                        e.preventDefault()
                        navGuard.attemptNavigate(item.href, onClose)
                        return
                      }
                      onClose?.()
                    }}
                    className={clsx(
                      'relative flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors no-underline',
                      active ? 'font-medium' : 'hover:bg-[var(--bg-surface)]'
                    )}
                    style={active ? { color: 'var(--accent-teal)' } : { color: 'var(--text-tertiary)' }}
                  >
                    <motion.span whileHover={{ x: 1 }} transition={{ duration: 0.12 }} className="flex-shrink-0">
                      <Icon size={14} strokeWidth={1.75} />
                    </motion.span>
                    <div className="flex flex-col min-w-0">
                      <span style={{ fontSize: 13 }}>{item.label}</span>
                      {item.desc && (
                        <span style={{
                          fontSize: 9,
                          color: active ? 'rgba(58,125,106,0.65)' : 'var(--text-tertiary)',
                          lineHeight: 1.3,
                          marginTop: 1,
                        }}>
                          {item.desc}
                        </span>
                      )}
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </LayoutGroup>
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
