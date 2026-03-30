'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { signIn, signOut, getAppUser, getEducatorApprovalStatus } from '@/lib/auth'
import { ShieldCheck, X } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Admin bubble state
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminId, setAdminId] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      const user = await getAppUser()
      if (user?.role === 'educator') {
        const approvalStatus = await getEducatorApprovalStatus(user.id)
        if (approvalStatus !== 'approved') {
          await signOut()
          setError(
            approvalStatus === 'rejected'
              ? 'Your educator registration was rejected. Contact the administrator.'
              : 'Your educator account is awaiting admin approval. Please check back later.'
          )
          return
        }
        router.push('/educator/dashboard')
      } else {
        router.push('/dashboard')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    setAdminError('')
    setAdminLoading(true)

    // Validate credentials against env-configured values
    const expectedId = process.env.NEXT_PUBLIC_ADMIN_ID || 'ziyan'
    const expectedPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'Nirvana2003'
    const adminKey = process.env.NEXT_PUBLIC_ADMIN_ACCESS_KEY || ''

    await new Promise((r) => setTimeout(r, 300)) // brief delay to prevent instant guess

    if (adminId === expectedId && adminPassword === expectedPassword) {
      if (adminKey) {
        sessionStorage.setItem('adminAccessKey', adminKey)
      }
      router.push('/admin')
    } else {
      setAdminError('Incorrect credentials.')
    }
    setAdminLoading(false)
  }

  return (
    <>
      {/* Admin bubble — fixed top-right */}
      <div
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 100,
        }}
      >
        {!adminOpen ? (
          <button
            onClick={() => setAdminOpen(true)}
            title="Admin access"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(18,18,28,0.7)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#55556a',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.18)'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#8888a0'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#55556a'
            }}
          >
            <ShieldCheck size={15} />
          </button>
        ) : (
          <div
            style={{
              width: 240,
              borderRadius: 12,
              background: 'rgba(14,14,22,0.85)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              padding: '14px 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            {/* Popover header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={13} style={{ color: '#8888a0' }} />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#55556a',
                  }}
                >
                  Admin Access
                </span>
              </div>
              <button
                onClick={() => { setAdminOpen(false); setAdminError('') }}
                style={{ color: '#55556a', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
              >
                <X size={13} />
              </button>
            </div>

            {/* Popover form */}
            <form onSubmit={handleAdminLogin} className="flex flex-col gap-2.5">
              <div className="flex flex-col gap-1">
                <label style={{ fontSize: 10, color: '#55556a', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  ID
                </label>
                <input
                  type="text"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  autoComplete="off"
                  required
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 13,
                    color: '#e8e8f0',
                    outline: 'none',
                    width: '100%',
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label style={{ fontSize: 10, color: '#55556a', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 13,
                    color: '#e8e8f0',
                    outline: 'none',
                    width: '100%',
                  }}
                />
              </div>
              {adminError && (
                <p style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>{adminError}</p>
              )}
              <button
                type="submit"
                disabled={adminLoading}
                style={{
                  marginTop: 2,
                  background: 'rgba(148,163,184,0.12)',
                  border: '1px solid rgba(148,163,184,0.25)',
                  borderRadius: 6,
                  padding: '7px 0',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#94a3b8',
                  cursor: adminLoading ? 'not-allowed' : 'pointer',
                  opacity: adminLoading ? 0.6 : 1,
                  width: '100%',
                }}
              >
                {adminLoading ? 'Verifying...' : 'Enter Admin Panel →'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Main login card */}
      <div
        className="w-full max-w-sm flex flex-col gap-6 rounded-xl border p-8"
        style={{
          background: 'rgba(14,14,22,0.55)',
          borderColor: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#55556a',
              marginBottom: 8,
            }}
          >
            PRESENTATION COACH
          </div>
          <h1 className="text-2xl font-semibold text-[#e8e8f0]">Sign in</h1>
          <p className="text-[#8888a0] text-sm mt-1">AI-powered presentation coaching</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {error && <p className="text-[#ef4444] text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in →'}
          </Button>
        </form>

        <p className="text-[#8888a0] text-sm text-center">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[#94a3b8] hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </>
  )
}
