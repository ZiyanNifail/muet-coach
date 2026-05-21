'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function NewCoursePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [subjectCode, setSubjectCode] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !subjectCode.trim()) return
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not authenticated.'); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('Session expired. Please log in again.'); return }

      const res = await fetch(`${API_URL}/api/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          educator_id: user.id,
          name: name.trim(),
          subject_code: subjectCode.trim().toUpperCase(),
          description: description.trim(),
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.detail || `HTTP ${res.status}`)
      }
      const data = await res.json()
      router.push(`/educator/courses/${data.course.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create course.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    background: 'rgba(180,165,148,0.08)',
    borderColor: 'rgba(180,165,148,0.30)',
    color: 'var(--text-primary)',
  }

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-2xl w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/educator/dashboard">
          <button className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 2 }}>
            COURSES
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Create New Course</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div
          className="flex flex-col gap-5 rounded-xl border p-5"
          style={{ background: 'rgba(255,255,255,0.80)', borderColor: 'rgba(180,165,148,0.22)' }}
        >
          {/* Course name */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[var(--text-secondary)]" htmlFor="name">Course Name *</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Speaking Skills for Academic Purposes"
              required
              className="rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--text-tertiary)]"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(245,158,11,0.35)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(180,165,148,0.30)')}
            />
          </div>

          {/* Subject code */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[var(--text-secondary)]" htmlFor="code">Subject Code *</label>
            <input
              id="code"
              type="text"
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
              placeholder="e.g. BEL311"
              required
              className="rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--text-tertiary)] font-mono"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(245,158,11,0.35)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(180,165,148,0.30)')}
            />
            <p className="text-[var(--text-tertiary)] text-xs">Used to generate the invite code, e.g. BEL311-X7K2</p>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[var(--text-secondary)]" htmlFor="desc">Description</label>
            <textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the course objectives..."
              rows={3}
              className="rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--text-tertiary)] resize-none"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(245,158,11,0.35)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(180,165,148,0.30)')}
            />
          </div>

          <div
            className="rounded-lg px-4 py-3 text-xs"
            style={{ background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.15)', border: '1px solid', color: '#f59e0b' }}
          >
            An invite code will be auto-generated from your subject code. Students use this to request to join your course.
            You can upload a rubric PDF after creating the course.
          </div>
        </div>

        {error && (
          <p className="text-sm text-[#ef4444]">{error}</p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading || !name.trim() || !subjectCode.trim()}>
            {loading ? 'Creating...' : 'Create Course →'}
          </Button>
          <Link href="/educator/dashboard">
            <Button type="button" variant="ghost">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
