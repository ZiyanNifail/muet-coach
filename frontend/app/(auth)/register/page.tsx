'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { clsx } from 'clsx'
import { GraduationCap, ClipboardList } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { signUp, signInWithGoogle, type UserRole } from '@/lib/auth'

const roles = [
  {
    value: 'student' as UserRole,
    Icon: GraduationCap,
    title: 'STUDENT',
    desc: 'Practice sessions, AI feedback, and progress tracking.',
  },
  {
    value: 'educator' as UserRole,
    Icon: ClipboardList,
    title: 'EDUCATOR',
    desc: 'Manage courses, review students, override AI scores.',
  },
]

export default function RegisterPage() {
  const [role, setRole] = useState<UserRole | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [educatorPending, setEducatorPending] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!role) { setError('Please select a role'); return }
    setError('')
    setLoading(true)
    try {
      await signUp(email, password, fullName, role)
      if (role === 'educator') {
        setEducatorPending(true)
      } else {
        router.push('/dashboard')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (educatorPending) {
    return (
      <div
        className="w-full max-w-sm flex flex-col gap-5 rounded-xl border p-8 text-center"
        style={{
          background: 'rgba(18, 42, 36, 0.55)',
          borderColor: 'rgba(58,125,106,0.30)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.40)',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#7AB5A8',
          }}
        >
          ACCOUNT CREATED
        </div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Pending admin review</h2>
        <p className="text-[#A8C5BC] text-sm leading-6">
          Educator accounts require approval before Educator features are unlocked. You&apos;ll receive an
          email once your account is approved.
        </p>
        <div
          className="rounded-lg p-3 text-sm"
          style={{
            background: 'rgba(245,158,11,0.15)',
            border: '1px solid rgba(245,158,11,0.25)',
            color: '#f59e0b',
          }}
        >
          Account pending admin review
        </div>
        <Link href="/login" className="text-[#5BB5A0] text-sm hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div
      className="w-full max-w-md flex flex-col gap-6 rounded-xl border p-8"
      style={{
        background: 'rgba(18, 42, 36, 0.55)',
        borderColor: 'rgba(58,125,106,0.30)',
        backdropFilter: 'blur(24px)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.40)',
      }}
    >
      <div>
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
        <h1 className="text-2xl font-semibold text-[#E8F5F1]">Create account</h1>
      </div>

      {/* Google sign-in */}
      <div className="flex flex-col gap-3">
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
          {googleLoading ? 'Redirecting…' : 'Continue with Google (Student)'}
        </button>
        <p className="text-[#7AB5A8] text-xs text-center">Google sign-up creates a student account</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'rgba(58,125,106,0.25)' }} />
        <span className="text-[#7AB5A8] text-xs">or register with email</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(58,125,106,0.25)' }} />
      </div>

      {/* Role selection */}
      <div className="flex flex-col gap-2">
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#7AB5A8',
          }}
        >
          SELECT YOUR ROLE
        </div>
        <div className="grid grid-cols-2 gap-3">
          {roles.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRole(opt.value)}
              className={clsx(
                'text-left flex flex-col gap-2 p-4 rounded-lg border transition-all cursor-pointer',
                role === opt.value
                  ? 'border-[rgba(58,125,106,0.60)] bg-[rgba(58,125,106,0.15)]'
                  : 'border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.22)]'
              )}
            >
              <opt.Icon size={22} style={{ color: role === opt.value ? '#5BB5A0' : '#7AB5A8' }} />
              <span className="text-[10px] font-semibold text-[#7AB5A8] tracking-widest uppercase">
                {opt.title}
              </span>
              <span className="text-xs text-[#A8C5BC] leading-5">{opt.desc}</span>
            </button>
          ))}
        </div>
        {role === 'educator' && (
          <div
            className="rounded-lg p-3 text-xs"
            style={{
              background: 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.25)',
              color: '#f59e0b',
            }}
          >
            Your account will be reviewed by an admin before Educator features are unlocked.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Full Name"
          type="text"
          placeholder="Ziyan Nifail"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          style={{ color: '#E8F5F1', background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(58,125,106,0.35)' }}
        />
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
          placeholder="Min. 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
          autoComplete="new-password"
          style={{ color: '#E8F5F1', background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(58,125,106,0.35)' }}
        />
        {error && <p className="text-[#ff8080] text-sm">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading || !role}>
          {loading ? 'Creating account...' : 'Create account →'}
        </Button>
      </form>

      <p className="text-[#A8C5BC] text-sm text-center">
        Already have an account?{' '}
        <Link href="/login" className="text-[#5BB5A0] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
