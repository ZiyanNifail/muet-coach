'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { signIn, signOut, signInWithGoogle, getAppUser, getEducatorApprovalStatus } from '@/lib/auth'
import { ShieldCheck, X, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
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
    const expectedId = process.env.NEXT_PUBLIC_ADMIN_ID
    const expectedPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD
    const adminKey = process.env.NEXT_PUBLIC_ADMIN_ACCESS_KEY || ''

    await new Promise((r) => setTimeout(r, 300)) // brief delay to prevent instant guess

    if (!expectedId || !expectedPassword) {
      setAdminError('Admin access is not configured.')
      setAdminLoading(false)
      return
    }

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
              background: 'rgba(240,237,230,0.85)',
              border: '1px solid rgba(180,165,148,0.30)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#9B8E80',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(180,165,148,0.50)'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#6B6050'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(180,165,148,0.30)'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#9B8E80'
            }}
          >
            <ShieldCheck size={15} />
          </button>
        ) : (
          <div
            style={{
              width: 240,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.92)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              padding: '14px 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            {/* Popover header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={13} style={{ color: '#6B6050' }} />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#9B8E80',
                  }}
                >
                  Admin Access
                </span>
              </div>
              <button
                onClick={() => { setAdminOpen(false); setAdminError('') }}
                style={{ color: '#9B8E80', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
              >
                <X size={13} />
              </button>
            </div>

            {/* Popover form */}
            <form onSubmit={handleAdminLogin} className="flex flex-col gap-2.5">
              <div className="flex flex-col gap-1">
                <label style={{ fontSize: 10, color: '#9B8E80', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  ID
                </label>
                <input
                  type="text"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  autoComplete="off"
                  required
                  style={{
                    background: 'rgba(180,165,148,0.08)',
                    border: '1px solid rgba(180,165,148,0.30)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 13,
                    color: '#1C1A17',
                    outline: 'none',
                    width: '100%',
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label style={{ fontSize: 10, color: '#9B8E80', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  style={{
                    background: 'rgba(180,165,148,0.08)',
                    border: '1px solid rgba(180,165,148,0.30)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 13,
                    color: '#1C1A17',
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
          background: 'rgba(18, 42, 36, 0.55)',
          borderColor: 'rgba(58,125,106,0.30)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.40)',
        }}
      >
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[#7AB5A8] text-xs hover:text-[#5BB5A0] transition-colors mb-4"
          >
            <ArrowLeft size={13} />
            Back to home
          </Link>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#7AB5A8',
              marginBottom: 8,
            }}
          >
            FLUENCY.MY
          </div>
          <h1 className="text-2xl font-semibold text-[#E8F5F1]">Sign in</h1>
          <p className="text-[#A8C5BC] text-sm mt-1">AI-powered presentation coaching</p>
        </div>

        {/* Google sign-in */}
        <button
          type="button"
          onClick={async () => {
            setGoogleLoading(true)
            try { await signInWithGoogle() } catch { setGoogleLoading(false) }
          }}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 rounded-lg border py-2.5 text-sm font-medium transition-colors"
          style={{
            background: 'rgba(255,255,255,0.07)',
            borderColor: 'rgba(58,125,106,0.35)',
            color: '#E8F5F1',
            cursor: googleLoading ? 'not-allowed' : 'pointer',
            opacity: googleLoading ? 0.6 : 1,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
            <path d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.332 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
            <path d="M6.306 14.691l6.571 4.819C14.655 15.108 19.001 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
            <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.316 0-9.828-3.337-11.558-8H6.306A19.946 19.946 0 0 0 24 44z" fill="#4CAF50"/>
            <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l6.19 5.238C42.021 35.625 44 30.138 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
          </svg>
          {googleLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'rgba(58,125,106,0.25)' }} />
          <span className="text-[#7AB5A8] text-xs">or</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(58,125,106,0.25)' }} />
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
            style={{ color: '#E8F5F1', background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(58,125,106,0.35)' }}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{ color: '#E8F5F1', background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(58,125,106,0.35)' }}
          />
          {error && <p className="text-[#ff8080] text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in →'}
          </Button>
        </form>

        <p className="text-[#A8C5BC] text-sm text-center">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[#5BB5A0] hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </>
  )
}
