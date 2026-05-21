'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { Topbar } from '@/components/Topbar'
import { ConsentModal } from '@/components/ConsentModal'
import { OnboardingTour } from '@/components/OnboardingTour'
import { getAppUser, type AppUser } from '@/lib/auth'
import ThemeToggle from '@/components/ui/theme-toggle'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [showConsent, setShowConsent] = useState(false)
  const [tourForceShow, setTourForceShow] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    getAppUser().then((u) => {
      if (!u) {
        router.replace('/login')
        return
      }
      if (u.role === 'educator') {
        router.replace('/educator/dashboard')
        return
      }
      setUser(u)
      setShowConsent(!u.consent_given)
      setLoading(false)
    })
  }, [router])

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-base)' }}
      >
        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <Topbar userName={user?.full_name} role={user?.role} onMenuToggle={() => setSidebarOpen(o => !o)} />
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 48px)' }}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-scroll">{children}</main>
      </div>
      {showConsent && user && (
        <ConsentModal userId={user.id} onAccepted={() => { setShowConsent(false); setTourForceShow(true) }} />
      )}
      {!showConsent && <OnboardingTour forceShow={tourForceShow} />}
      <ThemeToggle />
    </div>
  )
}
