'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  ArrowLeft, Upload, FileText, X, CheckCircle, XCircle,
  PlusCircle, Users, ClipboardList, ExternalLink, Copy, Check,
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
  created_at: string
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

type Tab = 'members' | 'assignments' | 'submissions'

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [course, setCourse] = useState<Course | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [tab, setTab] = useState<Tab>('members')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
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

  useEffect(() => {
    async function load() {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const { data: { user } } = await sb.auth.getUser()
      if (user) setUserId(user.id)

      const [courseRes, membersRes, assignRes, subsRes] = await Promise.all([
        fetch(`${API_URL}/api/courses/${id}`),
        fetch(`${API_URL}/api/courses/${id}/members`),
        fetch(`${API_URL}/api/courses/${id}/assignments`),
        fetch(`${API_URL}/api/courses/${id}/submissions`),
      ])

      if (courseRes.ok) setCourse((await courseRes.json()).course)
      if (membersRes.ok) setMembers((await membersRes.json()).members || [])
      if (assignRes.ok) setAssignments((await assignRes.json()).assignments || [])
      if (subsRes.ok) setSubmissions((await subsRes.json()).submissions || [])
      setLoading(false)
    }
    load()
  }, [id])

  async function handleMemberAction(memberId: string, action: 'approve' | 'reject') {
    setActionId(memberId)
    await fetch(`${API_URL}/api/courses/${id}/members/${memberId}/${action}`, { method: 'POST' })
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, status: action === 'approve' ? 'approved' : 'rejected' } : m))
    setActionId(null)
  }

  async function handleRubricUpload() {
    if (!rubricFile) return
    setUploading(true)
    setRubricMsg(null)
    const formData = new FormData()
    formData.append('rubric', rubricFile, rubricFile.name)
    try {
      const res = await fetch(`${API_URL}/api/courses/${id}/rubric`, { method: 'POST', body: formData })
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
        headers: { 'Content-Type': 'application/json' },
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

  const pending = members.filter((m) => m.status === 'pending')
  const approved = members.filter((m) => m.status === 'approved')

  if (loading) {
    return <div className="p-6 text-[#55556a] text-sm">Loading...</div>
  }

  if (!course) {
    return <div className="p-6 text-[#ef4444] text-sm">Course not found.</div>
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/educator/dashboard">
          <button className="mt-1 text-[#55556a] hover:text-[#8888a0] transition-colors">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a', marginBottom: 4 }}>
            COURSE · {course.subject_code}
          </div>
          <h1 className="text-2xl font-semibold text-[#e8e8f0]">{course.name}</h1>
          {course.description && <p className="text-[#8888a0] text-sm mt-1">{course.description}</p>}
        </div>
        <Link href={`/educator/courses/${id}/assignments/new`}>
          <Button variant="secondary">
            <PlusCircle size={14} className="mr-2" />
            New Assignment
          </Button>
        </Link>
      </div>

      {/* Invite code + rubric strip */}
      <div className="grid grid-cols-2 gap-4">
        {/* Invite code */}
        <div className="flex flex-col gap-3 rounded-xl border p-4" style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#55556a' }}>INVITE CODE</div>
          <div className="flex items-center gap-3">
            <code className="font-mono text-lg font-semibold text-[#f59e0b]">{course.invite_code}</code>
            <button onClick={copyInviteCode} className="text-[#55556a] hover:text-[#8888a0] transition-colors">
              {copied ? <Check size={14} style={{ color: '#22c55e' }} /> : <Copy size={14} />}
            </button>
          </div>
          <p className="text-[#3a3a52] text-xs">Share this code with students to let them request to join.</p>
        </div>

        {/* Rubric PDF */}
        <div className="flex flex-col gap-3 rounded-xl border p-4" style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#55556a' }}>RUBRIC PDF</div>
          {course.rubric_path ? (
            <div className="flex items-center gap-2">
              <FileText size={16} style={{ color: '#22c55e' }} />
              <span className="text-sm text-[#22c55e]">Rubric uploaded</span>
              <button
                className="text-xs text-[#55556a] hover:text-[#8888a0] underline ml-2"
                onClick={() => { setCourse((c) => c ? { ...c, rubric_path: null } : c); setRubricFile(null) }}
              >Replace</button>
            </div>
          ) : rubricFile ? (
            <div className="flex items-center gap-2">
              <FileText size={16} style={{ color: '#3b82f6' }} />
              <span className="text-sm text-[#8888a0] truncate flex-1">{rubricFile.name}</span>
              <button onClick={() => setRubricFile(null)}><X size={14} style={{ color: '#55556a' }} /></button>
            </div>
          ) : (
            <button
              onClick={() => rubricInputRef.current?.click()}
              className="flex items-center gap-2 text-sm text-[#55556a] hover:text-[#8888a0] transition-colors"
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

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg p-1" style={{ background: 'rgba(255,255,255,0.04)', width: 'fit-content' }}>
        {(['members', 'assignments', 'submissions'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize"
            style={tab === t
              ? { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }
              : { color: '#55556a' }}
          >
            {t}
            {t === 'members' && pending.length > 0 && (
              <span className="ml-1.5 rounded-full text-[10px] px-1.5 py-0.5 font-bold" style={{ background: '#ef4444', color: '#fff' }}>
                {pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Members */}
      {tab === 'members' && (
        <div className="flex flex-col gap-4">
          {/* Invite by email */}
          <div className="flex flex-col gap-3 rounded-xl border p-4" style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#55556a' }}>INVITE BY EMAIL</div>
            <div className="flex gap-3">
              <input
                type="email"
                placeholder="student@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 rounded-lg border px-3.5 py-2 text-sm text-[#e8e8f0] outline-none placeholder:text-[#3a3a52]"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
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
                    <span className="text-sm font-semibold text-[#e8e8f0]">{m.users?.full_name}</span>
                    <span className="text-xs text-[#55556a] ml-2">{m.users?.email}</span>
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
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#55556a' }}>
              ENROLLED STUDENTS ({approved.length})
            </div>
            {approved.length === 0 ? (
              <div className="flex items-center justify-center h-24 rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="text-[#3a3a52] text-sm">No approved students yet.</p>
              </div>
            ) : (
              approved.map((m) => (
                <div key={m.id} className="flex items-center gap-4 rounded-lg border px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <Users size={14} style={{ color: '#55556a', flexShrink: 0 }} />
                  <span className="text-sm text-[#e8e8f0] flex-1">{m.users?.full_name}</span>
                  <span className="text-xs text-[#55556a]">{m.users?.email}</span>
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
            <span className="text-[#55556a] text-sm">{assignments.length} assignment{assignments.length !== 1 ? 's' : ''}</span>
            <Link href={`/educator/courses/${id}/assignments/new`}>
              <Button variant="secondary">
                <PlusCircle size={14} className="mr-2" />
                New Assignment
              </Button>
            </Link>
          </div>
          {assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 rounded-xl border gap-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <ClipboardList size={24} style={{ color: '#55556a', opacity: 0.5 }} />
              <p className="text-[#3a3a52] text-sm">No assignments yet.</p>
            </div>
          ) : (
            assignments.map((a) => (
              <div key={a.id} className="flex items-start gap-4 rounded-xl border p-4"
                style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-[#e8e8f0]">{a.title}</span>
                    {a.exam_mode && <Badge variant="amber">Exam Mode</Badge>}
                  </div>
                  {a.description && <p className="text-xs text-[#55556a] mb-2">{a.description}</p>}
                  {a.deadline && (
                    <p className="text-xs text-[#3a3a52]">
                      Due: {new Date(a.deadline).toLocaleDateString('en-MY', { dateStyle: 'medium' })}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Submissions */}
      {tab === 'submissions' && (
        <div className="flex flex-col gap-3">
          <span className="text-[#55556a] text-sm">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</span>
          {submissions.length === 0 ? (
            <div className="flex items-center justify-center h-32 rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-[#3a3a52] text-sm">No submissions yet.</p>
            </div>
          ) : (
            submissions.map((s) => {
              const r = Array.isArray(s.feedback_reports) ? s.feedback_reports[0] : s.feedback_reports
              return (
                <div key={s.id} className="flex items-center gap-4 rounded-xl border p-4"
                  style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-[#e8e8f0]">{s.users?.full_name}</span>
                      <Badge variant={s.status === 'complete' ? 'green' : s.status === 'failed' ? 'red' : 'amber'}>
                        {s.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#55556a]">
                      {s.assignments && <span>Assignment: {s.assignments.title}</span>}
                      {r?.band_score != null && <span>Band: <strong className="text-[#e8e8f0]">{r.band_score.toFixed(1)}</strong></span>}
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
    </div>
  )
}
