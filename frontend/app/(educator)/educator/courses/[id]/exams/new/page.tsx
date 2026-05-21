'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, getAuthHeaders } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Calendar, Clock, BookOpen } from 'lucide-react'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Topic { id: string; topic: string; category: string }

export default function NewExamPage() {
  const { id: courseId } = useParams<{ id: string }>()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [durationMins, setDurationMins] = useState(30)
  const [topicId, setTopicId] = useState('')
  const [topics, setTopics] = useState<Topic[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('muet_topics')
      .select('id, topic, category')
      .order('category')
      .then(({ data }) => { if (data) setTopics(data) })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !scheduledAt) {
      setError('Title and scheduled date/time are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const authHdr = await getAuthHeaders()
      const res = await fetch(`${API_URL}/api/courses/${courseId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHdr },
        body: JSON.stringify({
          title: title.trim(),
          exam_mode: true,
          scheduled_at: new Date(scheduledAt).toISOString(),
          exam_duration_mins: durationMins,
          exam_topic_id: topicId || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.detail || 'Failed to create exam.')
      }
      router.push(`/educator/courses/${courseId}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create exam.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-xl flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href={`/educator/courses/${courseId}`}>
          <button className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 2 }}>
            MOCK EXAM
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Schedule MUET Practice Exam</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">Exam Title *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. MUET Mid-Semester Mock Exam"
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--text-tertiary)] min-h-[44px]"
            style={{ background: 'rgba(180,165,148,0.08)', borderColor: 'rgba(180,165,148,0.30)', color: 'var(--text-primary)' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(139,92,246,0.35)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(180,165,148,0.30)')}
          />
        </div>

        {/* Date + time */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
            <Calendar size={12} /> Scheduled Date &amp; Time *
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors min-h-[44px]"
            style={{ background: 'rgba(180,165,148,0.08)', borderColor: 'rgba(180,165,148,0.30)', color: 'var(--text-primary)' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(139,92,246,0.35)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(180,165,148,0.30)')}
          />
        </div>

        {/* Duration */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
            <Clock size={12} /> Duration (minutes)
          </label>
          <input
            type="number"
            min={5}
            max={180}
            value={durationMins}
            onChange={e => setDurationMins(Number(e.target.value))}
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors min-h-[44px]"
            style={{ background: 'rgba(180,165,148,0.08)', borderColor: 'rgba(180,165,148,0.30)', color: 'var(--text-primary)' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(139,92,246,0.35)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(180,165,148,0.30)')}
          />
        </div>

        {/* MUET Topic */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
            <BookOpen size={12} /> MUET Topic (optional)
          </label>
          <select
            value={topicId}
            onChange={e => setTopicId(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors min-h-[44px]"
            style={{ background: 'rgba(180,165,148,0.08)', borderColor: 'rgba(180,165,148,0.30)', color: topicId ? '#1C1A17' : '#C4B8A8' }}
          >
            <option value="">Random / not specified</option>
            {topics.map(t => (
              <option key={t.id} value={t.id}>{t.topic}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-xs text-[#ef4444]">{error}</p>}

        <Button type="submit" disabled={saving}>
          {saving ? 'Scheduling...' : 'Schedule Exam'}
        </Button>
      </form>
    </div>
  )
}
