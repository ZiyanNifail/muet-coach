'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_URL}/api/courses/${courseId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          deadline: deadline || null,
          exam_mode: examMode,
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
    background: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#e8e8f0',
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href={`/educator/courses/${courseId}`}>
          <button className="text-[#55556a] hover:text-[#8888a0] transition-colors">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a', marginBottom: 2 }}>
            ASSIGNMENT
          </div>
          <h1 className="text-2xl font-semibold text-[#e8e8f0]">New Assignment</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div
          className="flex flex-col gap-5 rounded-xl border p-5"
          style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {/* Title */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[#8888a0]">Assignment Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Individual Presentation — Topic 1"
              required
              className="rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-[#3a3a52]"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(245,158,11,0.35)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[#8888a0]">Instructions / Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task, topic, or rubric criteria..."
              rows={4}
              className="rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-[#3a3a52] resize-none"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(245,158,11,0.35)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>

          {/* Deadline */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[#8888a0]">Deadline (optional)</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors"
              style={{ ...inputStyle, colorScheme: 'dark' }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(245,158,11,0.35)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>

          {/* Exam mode toggle */}
          <div
            className="flex items-center justify-between rounded-lg border px-4 py-3"
            style={{ borderColor: examMode ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)' }}
          >
            <div>
              <div className="text-sm font-semibold text-[#e8e8f0]">Exam Mode (MUET Part 1)</div>
              <div className="text-xs text-[#55556a] mt-0.5">2-minute prep + 2-minute delivery format</div>
            </div>
            <button
              type="button"
              onClick={() => setExamMode((v) => !v)}
              className="rounded-full transition-all"
              style={{
                width: 40, height: 22,
                background: examMode ? '#f59e0b' : 'rgba(255,255,255,0.08)',
                position: 'relative',
              }}
            >
              <span
                className="absolute rounded-full bg-white transition-all"
                style={{
                  width: 16, height: 16,
                  top: 3,
                  left: examMode ? 21 : 3,
                }}
              />
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-[#ef4444]">{error}</p>}

        <div className="flex gap-3">
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
