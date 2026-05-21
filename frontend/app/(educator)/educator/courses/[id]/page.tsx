'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase, getAuthHeaders } from '@/lib/supabase'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  ArrowLeft, Upload, FileText, X, CheckCircle, XCircle,
  PlusCircle, Users, ClipboardList, ExternalLink, Copy, Check,
  Sparkles, ChevronDown, ChevronUp, AlertCircle, CalendarClock, Mail,
} from 'lucide-react'

interface Member {
  id: string
  student_id: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  users: { full_name: string; email: string }
}

interface Assignment {
  id: string
  title: string
  description: string
  deadline: string | null
  exam_mode: boolean
  scheduled_at: string | null
  exam_duration_mins: number | null
  created_at: string
}

interface ExamInvitation {
  id: string
  student_id: string
  status: 'pending' | 'accepted' | 'declined'
  users: { full_name: string; email: string }
}

interface Submission {
  id: string
  student_id: string
  uploaded_at: string
  status: string
  users: { full_name: string; email: string }
  feedback_reports: { band_score: number | null; wpm_avg: number | null; generated_at: string } | null
  assignments: { title: string } | null
}

interface Course {
  id: string
  name: string
  subject_code: string
  invite_code: string
  description: string
  rubric_path: string | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type Tab = 'members' | 'assignments' | 'exams' | 'submissions'

const PRESENTATION_TYPES = [
  'Individual Academic Presentation',
  'Group Presentation',
  'MUET Part 1 (Individual)',
  'Business Pitch',
  'Research Presentation',
  'General English Presentation',
]

const FOCUS_AREAS = [
  'Content & Organisation',
  'Language Accuracy',
  'Vocabulary Range',
  'Fluency & Delivery',
  'Eye Contact & Body Language',
  'Use of Visual Aids',
  'Time Management',
]

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>()

  const [course, setCourse] = useState<Course | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [tab, setTab] = useState<Tab>('members')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Rubric upload
  const [rubricFile, setRubricFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [rubricMsg, setRubricMsg] = useState<string | null>(null)
  const rubricInputRef = useRef<HTMLInputElement>(null)

  // Invite by email
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const tokenRef = useRef<string>('')

  // Exam invite modal
  const [inviteModalExamId, setInviteModalExamId] = useState<string | null>(null)
  const [allStudents, setAllStudents] = useState<{ id: string; full_name: string; email: string }[]>([])
  const [examInvitations, setExamInvitations] = useState<ExamInvitation[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [inviteSearch, setInviteSearch] = useState('')
  const [bulkInviting, setBulkInviting] = useState(false)

  // AI Rubric generation
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [presentationType, setPresentationType] = useState(PRESENTATION_TYPES[0])
  const [selectedFocus, setSelectedFocus] = useState<string[]>(['Content & Organisation', 'Language Accuracy', 'Fluency & Delivery', 'Eye Contact & Body Language'])
  const [bandCount, setBandCount] = useState<4 | 5>(5)
  const [generating, setGenerating] = useState(false)
  const [generatedRubric, setGeneratedRubric] = useState<string | null>(null)
  const [genError, setGenError] = useState<string | null>(null)
  const [rubricCopied, setRubricCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
      const { data: { session } } = await supabase.auth.getSession()
      tokenRef.current = session?.access_token ?? ''
      const authHdr = await getAuthHeaders()

      const [courseRes, membersRes, assignRes, subsRes] = await Promise.all([
        fetch(`${API_URL}/api/courses/${id}`, { headers: authHdr }),
        fetch(`${API_URL}/api/courses/${id}/members`, { headers: authHdr }),
        fetch(`${API_URL}/api/courses/${id}/assignments`, { headers: authHdr }),
        fetch(`${API_URL}/api/courses/${id}/submissions`, { headers: authHdr }),
      ])

      if (courseRes.ok) setCourse((await courseRes.json()).course)
      if (membersRes.ok) setMembers((await membersRes.json()).members || [])
      if (assignRes.ok) setAssignments((await assignRes.json()).assignments || [])
      if (subsRes.ok) setSubmissions((await subsRes.json()).submissions || [])
      setLoading(false)
    }
    load()

    // Poll for new join requests every 15 s so educator sees them without manual refresh
    const poll = setInterval(async () => {
      if (!tokenRef.current) return
      const authHdr = { Authorization: `Bearer ${tokenRef.current}` }
      const res = await fetch(`${API_URL}/api/courses/${id}/members`, { headers: authHdr })
      if (res.ok) setMembers((await res.json()).members || [])
    }, 15000)
    return () => clearInterval(poll)
  }, [id])

  async function handleMemberAction(memberId: string, action: 'approve' | 'reject') {
    setActionId(memberId)
    setActionError(null)
    const authHdr: Record<string, string> = tokenRef.current
      ? { Authorization: `Bearer ${tokenRef.current}` } : {}
    const res = await fetch(`${API_URL}/api/courses/${id}/members/${memberId}/${action}`, {
      method: 'POST', headers: authHdr,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setActionError(data.detail || `Failed to ${action} member.`)
    } else {
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, status: action === 'approve' ? 'approved' : 'rejected' } : m))
    }
    setActionId(null)
  }

  async function handleRubricUpload() {
    if (!rubricFile) return
    setUploading(true)
    setRubricMsg(null)
    const formData = new FormData()
    formData.append('rubric', rubricFile, rubricFile.name)
    try {
      const authHdr: Record<string, string> = tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}
      const res = await fetch(`${API_URL}/api/courses/${id}/rubric`, { method: 'POST', headers: authHdr, body: formData })
      if (!res.ok) throw new Error((await res.json()).detail || 'Upload failed')
      setRubricMsg('Rubric uploaded successfully.')
      setCourse((c) => c ? { ...c, rubric_path: 'uploaded' } : c)
      setRubricFile(null)
    } catch (err: unknown) {
      setRubricMsg(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim() || !userId) return
    setInviting(true)
    setInviteMsg(null)
    try {
      const res = await fetch(`${API_URL}/api/courses/${id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}) },
        body: JSON.stringify({ educator_id: userId, email: inviteEmail.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Invite failed')
      setInviteMsg(data.message)
      setInviteEmail('')
    } catch (err: unknown) {
      setInviteMsg(err instanceof Error ? err.message : 'Invite failed.')
    } finally {
      setInviting(false)
    }
  }

  function copyInviteCode() {
    if (!course?.invite_code) return
    navigator.clipboard.writeText(course.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function toggleFocus(area: string) {
    setSelectedFocus((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    )
  }

  async function generateRubric() {
    if (selectedFocus.length === 0) {
      setGenError('Select at least one focus area.')
      return
    }

    setGenerating(true)
    setGenError(null)
    setGeneratedRubric(null)

    try {
      const res = await fetch(`${API_URL}/api/courses/${id}/generate-rubric`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}) },
        body: JSON.stringify({
          course_name: course?.name ?? '',
          subject_code: course?.subject_code ?? '',
          description: course?.description ?? '',
          presentation_type: presentationType,
          focus_areas: selectedFocus,
          band_count: bandCount,
        }),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || `Server error ${res.status}`)
      }
      const data = await res.json()
      setGeneratedRubric(data.rubric ?? 'No content returned.')
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : 'Failed to generate rubric.')
    } finally {
      setGenerating(false)
    }
  }

  function copyRubric() {
    if (!generatedRubric) return
    navigator.clipboard.writeText(generatedRubric)
    setRubricCopied(true)
    setTimeout(() => setRubricCopied(false), 2000)
  }

  async function openInviteModal(assignmentId: string) {
    setInviteModalExamId(assignmentId)
    setSelectedStudents(new Set())
    setInviteSearch('')
    const authHdr = await getAuthHeaders()
    const [studentsRes, invitationsRes] = await Promise.all([
      fetch(`${API_URL}/api/courses/all-students`, { headers: authHdr }),
      fetch(`${API_URL}/api/exams/${assignmentId}/invitations`, { headers: authHdr }),
    ])
    if (studentsRes.ok) setAllStudents((await studentsRes.json()).students || [])
    if (invitationsRes.ok) setExamInvitations((await invitationsRes.json()).invitations || [])
  }

  function toggleStudent(studentId: string) {
    setSelectedStudents(prev => {
      const next = new Set(prev)
      next.has(studentId) ? next.delete(studentId) : next.add(studentId)
      return next
    })
  }

  async function handleBulkInvite() {
    if (!userId || !inviteModalExamId || selectedStudents.size === 0) return
    setBulkInviting(true)
    const authHdr = await getAuthHeaders()
    await Promise.all(
      Array.from(selectedStudents).map(studentId =>
        fetch(`${API_URL}/api/exams/${inviteModalExamId}/invitations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHdr },
          body: JSON.stringify({ student_id: studentId, educator_id: userId }),
        })
      )
    )
    // Refresh invitations list
    const res = await fetch(`${API_URL}/api/exams/${inviteModalExamId}/invitations`, { headers: authHdr })
    if (res.ok) setExamInvitations((await res.json()).invitations || [])
    setSelectedStudents(new Set())
    setBulkInviting(false)
  }

  const pending = members.filter((m) => m.status === 'pending')
  const approved = members.filter((m) => m.status === 'approved')

  if (loading) {
    return <div className="p-4 md:p-6 text-[#9B8E80] text-sm">Loading...</div>
  }

  if (!course) {
    return <div className="p-4 md:p-6 text-[#ef4444] text-sm">Course not found.</div>
  }

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <Link href="/educator/dashboard">
          <button className="mt-1 text-[#6b6050] hover:text-[#c08830] transition-colors">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b6050', marginBottom: 4 }}>
            COURSE · <span style={{ color: '#f59e0b' }}>{course.subject_code}</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#1C1A17]">{course.name}</h1>
          {course.description && <p className="text-[#6B6050] text-sm mt-1">{course.description}</p>}
        </div>
        <div className="flex gap-2">
          <Link href={`/educator/courses/${id}/assignments/new`}>
            <Button variant="secondary">
              <PlusCircle size={14} className="mr-2" />
              New Assignment
            </Button>
          </Link>
        </div>
      </div>

      {/* Invite code + rubric strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Invite code */}
        <div className="flex flex-col gap-3 rounded-xl border p-4" style={{ background: 'rgba(255,255,255,0.90)', borderColor: 'rgba(180,165,148,0.22)' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b6050' }}>INVITE CODE</div>
          <div className="flex items-center gap-3">
            <code className="font-mono text-xl font-bold text-[#f59e0b]">{course.invite_code}</code>
            <button onClick={copyInviteCode} className="transition-colors" style={{ color: '#6b6050' }}>
              {copied ? <Check size={14} style={{ color: '#22c55e' }} /> : <Copy size={14} />}
            </button>
          </div>
          <p className="text-xs" style={{ color: '#4a4035' }}>Share this code with students — they enter it in My Courses to request to join.</p>
        </div>

        {/* Rubric PDF */}
        <div className="flex flex-col gap-3 rounded-xl border p-4" style={{ background: 'rgba(255,255,255,0.90)', borderColor: 'rgba(180,165,148,0.22)' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b6050' }}>RUBRIC PDF</div>
          {course.rubric_path ? (
            <div className="flex items-center gap-2">
              <FileText size={16} style={{ color: '#22c55e' }} />
              <span className="text-sm text-[#22c55e]">Rubric uploaded</span>
              <button
                className="text-xs underline ml-2"
                style={{ color: '#6b6050' }}
                onClick={() => { setCourse((c) => c ? { ...c, rubric_path: null } : c); setRubricFile(null) }}
              >Replace</button>
            </div>
          ) : rubricFile ? (
            <div className="flex items-center gap-2">
              <FileText size={16} style={{ color: '#94a3b8' }} />
              <span className="text-sm text-[#6B6050] truncate flex-1">{rubricFile.name}</span>
              <button onClick={() => setRubricFile(null)}><X size={14} style={{ color: '#9B8E80' }} /></button>
            </div>
          ) : (
            <button
              onClick={() => rubricInputRef.current?.click()}
              className="flex items-center gap-2 text-sm transition-colors"
              style={{ color: '#6b6050' }}
            >
              <Upload size={14} />
              Upload rubric PDF (max 20 MB)
            </button>
          )}
          <input ref={rubricInputRef} type="file" accept="application/pdf" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setRubricFile(f) }} />
          {rubricFile && !course.rubric_path && (
            <Button variant="secondary" onClick={handleRubricUpload} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          )}
          {rubricMsg && (
            <p className={`text-xs ${rubricMsg.includes('success') ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>{rubricMsg}</p>
          )}
        </div>
      </div>

      {/* AI Rubric Generator */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.90)', borderColor: showAiPanel ? 'rgba(245,158,11,0.35)' : 'rgba(180,165,148,0.22)' }}
      >
        {/* Header toggle */}
        <button
          className="w-full flex items-center justify-between px-5 py-4 transition-colors"
          style={{ background: showAiPanel ? 'rgba(245,158,11,0.06)' : 'transparent' }}
          onClick={() => setShowAiPanel((v) => !v)}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles size={15} style={{ color: '#f59e0b' }} />
            <span className="text-sm font-semibold" style={{ color: '#e8c870' }}>Generate Rubric with AI</span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-bold"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
            >
              Powered by Groq
            </span>
          </div>
          {showAiPanel ? <ChevronUp size={14} style={{ color: '#6b6050' }} /> : <ChevronDown size={14} style={{ color: '#6b6050' }} />}
        </button>

        {showAiPanel && (
          <div className="flex flex-col gap-5 px-5 pb-5 pt-1" style={{ borderTop: '1px solid rgba(245,158,11,0.08)' }}>
            <p className="text-xs" style={{ color: '#6b6050' }}>
              The AI will generate a structured presentation rubric based on your course details and the options you select below.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Presentation type */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold" style={{ color: '#6B6050' }}>Presentation Type</label>
                <select
                  value={presentationType}
                  onChange={(e) => setPresentationType(e.target.value)}
                  className="rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors"
                  style={{
                    background: 'rgba(180,165,148,0.08)',
                    borderColor: 'rgba(245,158,11,0.15)',
                    color: '#1C1A17',
                    colorScheme: 'light',
                  }}
                >
                  {PRESENTATION_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Band count */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold" style={{ color: '#6B6050' }}>Band Levels</label>
                <select
                  value={String(bandCount)}
                  onChange={(e) => setBandCount(Number(e.target.value) as 4 | 5)}
                  className="rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors"
                  style={{
                    background: 'rgba(180,165,148,0.08)',
                    borderColor: 'rgba(245,158,11,0.15)',
                    color: '#1C1A17',
                    colorScheme: 'light',
                  }}
                >
                  <option value="4">4 Bands (1–4)</option>
                  <option value="5">5 Bands (1–5, MUET-style)</option>
                </select>
              </div>
            </div>

            {/* Focus areas */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold" style={{ color: '#6B6050' }}>
                Assessment Criteria <span style={{ color: '#4a4035' }}>(select all that apply)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {FOCUS_AREAS.map((area) => {
                  const active = selectedFocus.includes(area)
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleFocus(area)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: active ? 'rgba(245,158,11,0.15)' : 'rgba(180,165,148,0.08)',
                        borderWidth: 1,
                        borderStyle: 'solid',
                        borderColor: active ? 'rgba(245,158,11,0.30)' : 'rgba(180,165,148,0.22)',
                        color: active ? '#f59e0b' : '#9B8E80',
                      }}
                    >
                      {active && <span className="mr-1">✓</span>}
                      {area}
                    </button>
                  )
                })}
              </div>
            </div>

            {genError && (
              <div className="flex items-start gap-2 rounded-lg border px-3 py-2.5"
                style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' }}>
                <AlertCircle size={13} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs text-[#ef4444]">{genError}</p>
              </div>
            )}

            <Button
              onClick={generateRubric}
              disabled={generating || selectedFocus.length === 0}
            >
              <Sparkles size={13} className="mr-2" />
              {generating ? 'Generating...' : 'Generate Rubric'}
            </Button>

            {generatedRubric && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: '#22c55e' }}>
                    ✓ Rubric generated
                  </span>
                  <button
                    onClick={copyRubric}
                    className="flex items-center gap-1.5 text-xs transition-colors"
                    style={{ color: rubricCopied ? '#22c55e' : '#6b6050' }}
                  >
                    {rubricCopied ? <Check size={12} /> : <Copy size={12} />}
                    {rubricCopied ? 'Copied!' : 'Copy to clipboard'}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={generatedRubric}
                  rows={20}
                  className="w-full rounded-lg border px-4 py-3 text-xs font-mono outline-none resize-y"
                  style={{
                    background: 'rgba(180,165,148,0.06)',
                    borderColor: 'rgba(180,165,148,0.22)',
                    color: '#1C1A17',
                    lineHeight: 1.7,
                  }}
                />
                <p className="text-xs" style={{ color: '#4a4035' }}>
                  Tip: Copy the rubric and paste it into a Word document to format and save as PDF, then upload it above.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg p-1 overflow-x-auto" style={{ background: 'rgba(180,165,148,0.08)', width: 'fit-content', maxWidth: '100%' }}>
        {(['members', 'assignments', 'exams', 'submissions'] as Tab[]).map((t) => {
          const examCount = assignments.filter(a => a.exam_mode).length
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize"
              style={tab === t
                ? { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }
                : { color: '#9B8E80' }}
            >
              {t}
              {t === 'members' && pending.length > 0 && (
                <span className="ml-1.5 rounded-full text-[10px] px-1.5 py-0.5 font-bold" style={{ background: '#ef4444', color: '#fff' }}>
                  {pending.length}
                </span>
              )}
              {t === 'exams' && examCount > 0 && (
                <span className="ml-1.5 rounded-full text-[10px] px-1.5 py-0.5 font-bold" style={{ background: 'rgba(245,158,11,0.25)', color: '#f59e0b' }}>
                  {examCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab: Members */}
      {tab === 'members' && (
        <div className="flex flex-col gap-4">
          {/* Invite by email */}
          <div className="flex flex-col gap-3 rounded-xl border p-4" style={{ background: 'rgba(255,255,255,0.90)', borderColor: 'rgba(180,165,148,0.22)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b6050' }}>INVITE BY EMAIL</div>
            <p className="text-xs" style={{ color: '#4a4035' }}>
              Enter the email of a registered student to add them directly. They will appear as a pending request.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <input
                type="email"
                placeholder="student@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full sm:flex-1 rounded-lg border px-3.5 py-2 text-sm text-[#1C1A17] outline-none placeholder:text-[#C4B8A8] min-h-[44px]"
                style={{ background: 'rgba(180,165,148,0.08)', borderColor: 'rgba(245,158,11,0.15)' }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(245,158,11,0.35)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(245,158,11,0.15)')}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
              <Button variant="secondary" onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                {inviting ? 'Sending...' : 'Invite'}
              </Button>
            </div>
            {inviteMsg && (
              <p className={`text-xs ${inviteMsg.includes('fail') || inviteMsg.includes('No') ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>{inviteMsg}</p>
            )}
          </div>

          {/* Action error */}
          {actionError && (
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5"
              style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' }}>
              <AlertCircle size={13} style={{ color: '#ef4444', flexShrink: 0 }} />
              <p className="text-xs text-[#ef4444] flex-1">{actionError}</p>
              <button onClick={() => setActionError(null)} className="text-[#ef4444] opacity-60 hover:opacity-100"><X size={12} /></button>
            </div>
          )}

          {/* Pending requests */}
          {pending.length > 0 && (
            <div className="flex flex-col gap-2">
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f59e0b' }}>
                PENDING REQUESTS ({pending.length})
              </div>
              {pending.map((m) => (
                <div key={m.id} className="flex items-center gap-4 rounded-lg border px-4 py-3"
                  style={{ background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.15)' }}>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-[#1C1A17]">{m.users?.full_name}</span>
                    <span className="text-xs text-[#9B8E80] ml-2 break-all">{m.users?.email}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleMemberAction(m.id, 'approve')} disabled={actionId === m.id}
                      className="rounded-lg p-1.5 transition-colors" style={{ color: '#22c55e', background: 'rgba(34,197,94,0.08)' }}>
                      <CheckCircle size={16} />
                    </button>
                    <button onClick={() => handleMemberAction(m.id, 'reject')} disabled={actionId === m.id}
                      className="rounded-lg p-1.5 transition-colors" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)' }}>
                      <XCircle size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Approved members */}
          <div className="flex flex-col gap-2">
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b6050' }}>
              ENROLLED STUDENTS ({approved.length})
            </div>
            {approved.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 rounded-xl border gap-2"
                style={{ borderColor: 'rgba(245,158,11,0.08)' }}>
                <Users size={20} style={{ color: '#4a4035', opacity: 0.5 }} />
                <p className="text-xs" style={{ color: '#4a4035' }}>No enrolled students yet. Share the invite code above.</p>
              </div>
            ) : (
              approved.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border px-4 py-3"
                  style={{ background: 'rgba(180,165,148,0.04)', borderColor: 'rgba(180,165,148,0.22)' }}>
                  <Users size={14} style={{ color: '#9B8E80', flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-[#1C1A17] block truncate">{m.users?.full_name}</span>
                    <span className="text-xs text-[#9B8E80] block truncate">{m.users?.email}</span>
                  </div>
                  <Badge variant="green">Enrolled</Badge>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Assignments */}
      {tab === 'assignments' && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-[#9B8E80] text-sm">{assignments.length} assignment{assignments.length !== 1 ? 's' : ''}</span>
            <Link href={`/educator/courses/${id}/assignments/new`}>
              <Button variant="secondary">
                <PlusCircle size={14} className="mr-2" />
                New Assignment
              </Button>
            </Link>
          </div>
          {assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 rounded-xl border gap-3"
              style={{ borderColor: 'rgba(245,158,11,0.08)' }}>
              <ClipboardList size={24} style={{ color: '#4a4035', opacity: 0.5 }} />
              <p className="text-xs" style={{ color: '#4a4035' }}>No assignments yet. Create one to get started.</p>
            </div>
          ) : (
            assignments.map((a) => (
              <div key={a.id} className="flex items-start gap-4 rounded-xl border p-4"
                style={{ background: 'rgba(255,255,255,0.90)', borderColor: 'rgba(180,165,148,0.22)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-[#1C1A17]">{a.title}</span>
                    {a.exam_mode && <Badge variant="amber">Exam Mode</Badge>}
                  </div>
                  {a.description && <p className="text-xs text-[#9B8E80] mb-2">{a.description}</p>}
                  {a.deadline && (
                    <p className="text-xs text-[#C4B8A8]">
                      Due: {new Date(a.deadline).toLocaleDateString('en-MY', { dateStyle: 'medium' })}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Exams */}
      {tab === 'exams' && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-[#9B8E80] text-sm">
              {assignments.filter(a => a.exam_mode).length} mock exam{assignments.filter(a => a.exam_mode).length !== 1 ? 's' : ''}
            </span>
            <Link href={`/educator/courses/${id}/exams/new`}>
              <Button variant="secondary">
                <CalendarClock size={14} className="mr-2" />
                Schedule Exam
              </Button>
            </Link>
          </div>
          {assignments.filter(a => a.exam_mode).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 rounded-xl border gap-3"
              style={{ borderColor: 'rgba(245,158,11,0.08)' }}>
              <CalendarClock size={24} style={{ color: '#4a4035', opacity: 0.5 }} />
              <p className="text-xs" style={{ color: '#4a4035' }}>No mock exams scheduled yet.</p>
            </div>
          ) : (
            assignments.filter(a => a.exam_mode).map((a) => (
              <div key={a.id} className="flex items-start gap-4 rounded-xl border p-4"
                style={{ background: 'rgba(255,255,255,0.90)', borderColor: 'rgba(180,165,148,0.22)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-[#1C1A17]">{a.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                      style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                      EXAM
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#9B8E80]">
                    {a.scheduled_at && (
                      <span className="flex items-center gap-1">
                        <CalendarClock size={11} />
                        {new Date(a.scheduled_at).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    )}
                    {a.exam_duration_mins && (
                      <span>{a.exam_duration_mins} min</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => openInviteModal(a.id)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all"
                  style={{ background: 'rgba(180,165,148,0.10)', border: '1px solid rgba(180,165,148,0.22)', color: '#9B8E80' }}
                >
                  <Users size={13} />
                  Invite Students
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Submissions */}
      {tab === 'submissions' && (
        <div className="flex flex-col gap-3">
          <span className="text-[#9B8E80] text-sm">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</span>
          {submissions.length === 0 ? (
            <div className="flex items-center justify-center h-32 rounded-xl border" style={{ borderColor: 'rgba(245,158,11,0.08)' }}>
              <p className="text-xs" style={{ color: '#4a4035' }}>No submissions yet.</p>
            </div>
          ) : (
            submissions.map((s, idx) => {
              const r = Array.isArray(s.feedback_reports) ? s.feedback_reports[0] : s.feedback_reports
              // T4.01D: anonymise names in aggregate view — raw name only on individual review page
              const anonLabel = `Student ${String.fromCharCode(65 + (idx % 26))}`
              return (
                <div key={s.id} className="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:gap-4"
                  style={{ background: 'rgba(255,255,255,0.90)', borderColor: 'rgba(180,165,148,0.22)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-[#1C1A17]">{anonLabel}</span>
                      <Badge variant={s.status === 'complete' ? 'green' : s.status === 'failed' ? 'red' : 'amber'}>
                        {s.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#9B8E80]">
                      {s.assignments && <span>Assignment: {s.assignments.title}</span>}
                      {r?.band_score != null && <span>Band: <strong className="text-[#1C1A17]">{r.band_score.toFixed(1)}</strong></span>}
                      <span>{new Date(s.uploaded_at).toLocaleDateString('en-MY', { dateStyle: 'medium' })}</span>
                    </div>
                  </div>
                  <Link href={`/educator/courses/${id}/submissions/${s.id}`}>
                    <Button variant="ghost">
                      <ExternalLink size={13} className="mr-1.5" />
                      Review
                    </Button>
                  </Link>
                </div>
              )
            })
          )}
        </div>
      )}
      {/* Exam invite modal */}
      {inviteModalExamId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setInviteModalExamId(null)}
        >
          <div
            className="rounded-2xl border p-4 md:p-6 w-full max-w-[calc(100vw-2rem)] md:max-w-lg flex flex-col gap-4"
            style={{ background: '#FAFAF8', borderColor: 'rgba(180,165,148,0.35)', boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B8E80' }}>
                  INVITE STUDENTS
                </div>
                <h2 className="text-base font-semibold text-[#1C1A17] mt-0.5">
                  {assignments.find(a => a.id === inviteModalExamId)?.title}
                </h2>
              </div>
              <button onClick={() => setInviteModalExamId(null)} className="text-[#9B8E80] hover:text-[#1C1A17] transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search by name or email..."
              value={inviteSearch}
              onChange={e => setInviteSearch(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm outline-none placeholder:text-[#C4B8A8] text-[#1C1A17]"
              style={{ background: 'rgba(180,165,148,0.08)', borderColor: 'rgba(180,165,148,0.30)' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(139,92,246,0.35)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(180,165,148,0.30)')}
            />

            <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
              {allStudents.length === 0 ? (
                <p className="text-xs text-[#9B8E80] text-center py-6">Loading students...</p>
              ) : (() => {
                const q = inviteSearch.toLowerCase()
                const filtered = allStudents.filter(s =>
                  s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
                )
                if (filtered.length === 0) {
                  return <p className="text-xs text-[#9B8E80] text-center py-6">No students found.</p>
                }
                return filtered.map(s => {
                  const existing = examInvitations.find(i => i.student_id === s.id)
                  const checked = selectedStudents.has(s.id)
                  return (
                    <label
                      key={s.id}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors"
                      style={{
                        background: checked ? 'rgba(139,92,246,0.06)' : 'rgba(180,165,148,0.04)',
                        borderColor: checked ? 'rgba(139,92,246,0.25)' : 'rgba(180,165,148,0.18)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!!existing}
                        onChange={() => !existing && toggleStudent(s.id)}
                        className="rounded accent-violet-500"
                        style={{ width: 14, height: 14, flexShrink: 0 }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[#1C1A17] font-medium truncate">{s.full_name}</div>
                        <div className="text-xs text-[#9B8E80] flex items-center gap-1">
                          <Mail size={10} />
                          {s.email}
                        </div>
                      </div>
                      {existing && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-semibold flex-shrink-0"
                          style={{
                            background: existing.status === 'accepted' ? 'rgba(34,197,94,0.12)' : 'rgba(180,165,148,0.12)',
                            color: existing.status === 'accepted' ? '#16a34a' : '#9B8E80',
                          }}>
                          {existing.status === 'accepted' ? '✓ Accepted' : existing.status === 'declined' ? 'Declined' : 'Invited'}
                        </span>
                      )}
                    </label>
                  )
                })
              })()}
            </div>

            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between" style={{ borderTop: '1px solid rgba(180,165,148,0.18)' }}>
              <p className="text-[11px] text-[#9B8E80]">
                {selectedStudents.size > 0 ? `${selectedStudents.size} student${selectedStudents.size !== 1 ? 's' : ''} selected` : 'Select students to invite'}
              </p>
              <Button
                onClick={handleBulkInvite}
                disabled={bulkInviting || selectedStudents.size === 0}
              >
                {bulkInviting ? 'Inviting...' : `Invite Selected (${selectedStudents.size})`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
