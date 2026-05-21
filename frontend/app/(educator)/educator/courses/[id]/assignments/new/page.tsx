'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAuthHeaders } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { ArrowLeft } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function NewAssignmentPage() {
  const { id: courseId } = useParams<{ id: string }>()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [examMode, setExamMode] = useState(false)
  const [slideRequired, setSlideRequired] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    setError(null)

    try {
      const authHdr = await getAuthHeaders()

      const res = await fetch(`${API_URL}/api/courses/${courseId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHdr },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          deadline: deadline || null,
          exam_mode: examMode,
          slide_required: slideRequired,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.detail || `HTTP ${res.status}`)
      }
      router.push(`/educator/courses/${courseId}?tab=assignments`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment.')
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
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href={`/educator/courses/${courseId}`}>
          <button className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 2 }}>
            ASSIGNMENT
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">New Assignment</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div
          className="flex flex-col gap-5 rounded-xl border p-5"
          style={{ background: 'var(--bg-panel)', borderColor: 'rgba(180,165,148,0.22)' }}
        >
          {/* Title */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">Assignment Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Individual Presentation — Topic 1"
              required
              className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--text-tertiary)] min-h-[44px]"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(245,158,11,0.35)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(180,165,148,0.30)')}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">Instructions / Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task, topic, or rubric criteria..."
              rows={4}
              className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--text-tertiary)] resize-none"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(245,158,11,0.35)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(180,165,148,0.30)')}
            />
          </div>

          {/* Deadline */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">Deadline (optional)</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors min-h-[44px]"
              style={{ ...inputStyle, colorScheme: 'dark' }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(245,158,11,0.35)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(180,165,148,0.30)')}
            />
          </div>

          {/* Exam mode toggle */}
          <div
            className="flex items-start justify-between gap-4 rounded-lg border px-4 py-3"
            style={{ borderColor: examMode ? 'rgba(245,158,11,0.3)' : 'rgba(180,165,148,0.30)' }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-[var(--text-primary)]">Exam Mode (MUET Part 1)</div>
              <div className="text-xs text-[var(--text-tertiary)] mt-0.5">2-minute prep + 2-minute delivery format</div>
            </div>
            <button
              type="button"
              onClick={() => setExamMode((v) => !v)}
              className="rounded-full transition-all"
              style={{
                width: 40, height: 22,
                background: examMode ? '#f59e0b' : 'rgba(180,165,148,0.30)',
                position: 'relative',
              }}
            >
              <span
                className="absolute rounded-full bg-[var(--bg-panel)] transition-all"
                style={{ width: 16, height: 16, top: 3, left: examMode ? 21 : 3 }}
              />
            </button>
          </div>

          {/* Slide deck required toggle */}
          <div
            className="flex items-start justify-between gap-4 rounded-lg border px-4 py-3"
            style={{ borderColor: slideRequired ? 'rgba(245,158,11,0.3)' : 'rgba(180,165,148,0.30)' }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-[var(--text-primary)]">Require Slide Deck</div>
              <div className="text-xs text-[var(--text-tertiary)] mt-0.5">Students must upload a PDF or PPTX alongside their recording</div>
            </div>
            <button
              type="button"
              onClick={() => setSlideRequired((v) => !v)}
              className="rounded-full transition-all"
              style={{
                width: 40, height: 22,
                background: slideRequired ? '#f59e0b' : 'rgba(180,165,148,0.30)',
                position: 'relative',
              }}
            >
              <span
                className="absolute rounded-full bg-[var(--bg-panel)] transition-all"
                style={{ width: 16, height: 16, top: 3, left: slideRequired ? 21 : 3 }}
              />
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-[#ef4444]">{error}</p>}

        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <Button type="submit" disabled={loading || !title.trim()}>
            {loading ? 'Creating...' : 'Create Assignment →'}
          </Button>
          <Link href={`/educator/courses/${courseId}`}>
            <Button type="button" variant="ghost">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
