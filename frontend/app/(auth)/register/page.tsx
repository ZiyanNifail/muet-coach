'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { clsx } from 'clsx'
import { GraduationCap, ClipboardList } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { signUp, type UserRole } from '@/lib/auth'

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
          background: 'rgba(14,14,22,0.55)',
          borderColor: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#55556a',
          }}
        >
          ACCOUNT CREATED
        </div>
        <h2 className="text-xl font-semibold text-[#e8e8f0]">Pending admin review</h2>
        <p className="text-[#8888a0] text-sm leading-6">
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
        <Link href="/login" className="text-[#3b82f6] text-sm hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div
      className="w-full max-w-md flex flex-col gap-6 rounded-xl border p-8"
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
        <h1 className="text-2xl font-semibold text-[#e8e8f0]">Create account</h1>
      </div>

      {/* Role selection */}
      <div className="flex flex-col gap-2">
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#55556a',
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
                  ? 'border-[#3b82f6] bg-[rgba(59,130,246,0.08)]'
                  : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.10)]'
              )}
            >
              <opt.Icon size={22} style={{ color: role === opt.value ? '#3b82f6' : '#55556a' }} />
              <span className="text-[10px] font-semibold text-[#55556a] tracking-widest uppercase">
                {opt.title}
              </span>
              <span className="text-xs text-[#8888a0] leading-5">{opt.desc}</span>
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
        />
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
          placeholder="Min. 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
          autoComplete="new-password"
        />
        {error && <p className="text-[#ef4444] text-sm">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading || !role}>
          {loading ? 'Creating account...' : 'Create account →'}
        </Button>
      </form>

      <p className="text-[#8888a0] text-sm text-center">
        Already have an account?{' '}
        <Link href="/login" className="text-[#3b82f6] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
