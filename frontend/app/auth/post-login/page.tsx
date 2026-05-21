'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ensureAppUserRow, signOut } from '@/lib/auth'

export default function PostLoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    let handled = false

    async function handle() {
      if (handled) return
      handled = true
      try {
        const user = await ensureAppUserRow()
        if (!user) { router.push('/login'); return }
        if (user.role === 'educator') {
          await signOut()
          setError('Educator accounts cannot sign in with Google. Please use email and password.')
          return
        }
        router.push('/dashboard')
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.')
      }
    }

    // Fast path: session already in cookie (e.g. refresh or second visit)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) handle()
    })

    // Slow path: wait for client to pick up the session from the OAuth redirect cookie
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) handle()
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0E1A16]">
        <div
          className="w-full max-w-sm flex flex-col gap-4 rounded-xl border p-8 text-center"
          style={{
            background: 'rgba(18, 42, 36, 0.55)',
            borderColor: 'rgba(58,125,106,0.30)',
            backdropFilter: 'blur(24px)',
          }}
        >
          <p className="text-[#ff8080] text-sm">{error}</p>
          <a href="/login" className="text-[#5BB5A0] text-sm hover:underline">
            Back to sign in
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0E1A16]">
      <p className="text-[#A8C5BC] text-sm">Signing you in…</p>
    </div>
  )
}
