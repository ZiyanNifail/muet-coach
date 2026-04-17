'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EducatorSidebar } from '@/components/EducatorSidebar'
import { Topbar } from '@/components/Topbar'
import { getAppUser, type AppUser } from '@/lib/auth'

export default function EducatorLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAF9F7' }}>
        <span className="text-[#6B6050] text-sm">Loading...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAF9F7' }}>
      <Topbar userName={user?.full_name} role={user?.role} />
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 48px)' }}>
        <EducatorSidebar />
        <main className="flex-1 overflow-y-scroll">{children}</main>
      </div>
    </div>
  )
}
