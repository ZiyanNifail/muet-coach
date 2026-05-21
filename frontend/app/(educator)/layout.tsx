'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EducatorSidebar } from '@/components/EducatorSidebar'
import { Topbar } from '@/components/Topbar'
import { getAppUser, type AppUser } from '@/lib/auth'
import ThemeToggle from '@/components/ui/theme-toggle'

export default function EducatorLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    getAppUser().then((u) => {
      if (!u) { router.replace('/login'); return }
      if (u.role === 'student') { router.replace('/dashboard'); return }
      // admin can also access educator portal
      setUser(u)
      setLoading(false)
    })
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <Topbar userName={user?.full_name} role={user?.role} onMenuToggle={() => setSidebarOpen(o => !o)} />
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 48px)' }}>
        <EducatorSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-scroll">{children}</main>
      </div>
      <ThemeToggle />
    </div>
  )
}
