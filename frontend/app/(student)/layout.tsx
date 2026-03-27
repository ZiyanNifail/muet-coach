'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { Topbar } from '@/components/Topbar'
import { ConsentModal } from '@/components/ConsentModal'
import { getAppUser, type AppUser } from '@/lib/auth'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [showConsent, setShowConsent] = useState(false)
  const router = useRouter()

  useEffect(() => {
    getAppUser().then((u) => {
      if (!u) {
        router.replace('/login')
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
        style={{ background: '#0a0a0f' }}
      >
        <span className="text-[#8888a0] text-sm">Loading...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0f' }}>
      <Topbar userName={user?.full_name} role={user?.role} />
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 48px)' }}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      {showConsent && user && (
        <ConsentModal userId={user.id} onAccepted={() => setShowConsent(false)} />
      )}
    </div>
  )
}
