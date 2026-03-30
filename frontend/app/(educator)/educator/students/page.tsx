'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { GraduationCap, BookOpen, ChevronRight, TrendingUp, ArrowLeft } from 'lucide-react'

interface StudentRow {
  student_id: string
  full_name: string
  email: string
  course_id: string
  course_name: string
  subject_code: string
  status: string
  requested_at: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setLoading(false); return }

      try {
        const coursesRes = await fetch(`${API_URL}/api/courses?educator_id=${user.id}`)
        if (!coursesRes.ok) { setLoading(false); return }
        const courses = (await coursesRes.json()).courses || []

        const rows: StudentRow[] = []
        await Promise.all(
          courses.map(async (c: { id: string; name: string; subject_code: string }) => {
            const res = await fetch(`${API_URL}/api/courses/${c.id}/members`)
            if (!res.ok) return
            const members = (await res.json()).members || []
            for (const m of members) {
              if (m.status !== 'approved') continue
              rows.push({
                student_id: m.student_id,
                full_name: m.users?.full_name || '—',
                email: m.users?.email || '—',
                course_id: c.id,
                course_name: c.name,
                subject_code: c.subject_code,
                status: m.status,
                requested_at: m.requested_at,
              })
            }
          })
        )
        rows.sort((a, b) => a.full_name.localeCompare(b.full_name))
        setStudents(rows)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const filtered = search.trim()
    ? students.filter(
        (s) =>
          s.full_name.toLowerCase().includes(search.toLowerCase()) ||
          s.email.toLowerCase().includes(search.toLowerCase()),
      )
    : students

  return (
    <div className="p-6 flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/educator/dashboard">
            <button className="mt-1 text-[#6b6050] hover:text-[#c08830] transition-colors">
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b6050', marginBottom: 4 }}>
              MANAGE
            </div>
            <h1 className="text-2xl font-semibold text-[#e8e8f0]">Students</h1>
            <p className="text-[#8888a0] text-sm mt-1">All approved students across your courses.</p>
          </div>
        </div>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border px-3.5 py-2 text-sm outline-none placeholder:text-[#3a3a52]"
          style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: '#e8e8f0', width: 260 }}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 rounded-xl border"
          style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <span className="text-[#55556a] text-sm">Loading students...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 rounded-xl border gap-3"
          style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <GraduationCap size={28} style={{ color: '#55556a', opacity: 0.4 }} />
          <p className="text-[#55556a] text-sm">
            {students.length === 0 ? 'No approved students yet. Share your course invite codes to get started.' : 'No students match your search.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {/* Table header */}
          <div className="grid px-4 py-2.5"
            style={{
              gridTemplateColumns: '1fr 1fr 1fr auto',
              background: 'rgba(255,255,255,0.03)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
            {['STUDENT', 'EMAIL', 'COURSE', ''].map((h, i) => (
              <div key={i} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: '#3a3a52' }}>{h}</div>
            ))}
          </div>

          {filtered.map((s, i) => (
            <Link key={`${s.student_id}-${s.course_id}`} href={`/educator/courses/${s.course_id}`} className="no-underline">
              <div
                className="grid items-center px-4 py-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                style={{
                  gridTemplateColumns: '1fr 1fr 1fr auto',
                  borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(148,163,184,0.12)' }}>
                    <GraduationCap size={13} style={{ color: '#94a3b8' }} />
                  </div>
                  <span className="text-sm font-semibold text-[#e8e8f0] truncate">{s.full_name}</span>
                </div>
                <span className="text-xs text-[#55556a] truncate pr-4">{s.email}</span>
                <div className="flex items-center gap-2 min-w-0">
                  <BookOpen size={11} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <span className="text-xs font-mono text-[#f59e0b]">{s.subject_code}</span>
                  <span className="text-xs text-[#55556a] truncate hidden sm:block">{s.course_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="green">Enrolled</Badge>
                  <ChevronRight size={13} style={{ color: '#3a3a52' }} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-[#3a3a52]">
          <TrendingUp size={11} />
          {filtered.length} enrolled student{filtered.length !== 1 ? 's' : ''} shown
          {search && ` matching "${search}"`}
        </div>
      )}
    </div>
  )
}
