'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CheckCircle, XCircle, Clock, RefreshCw, Trash2, AlertTriangle, Users } from 'lucide-react'

interface Approval {
  id: string
  educator_id: string
  status: string
  submitted_at: string
  reviewed_at: string | null
  users?: { full_name: string; email: string }
}

interface Student {
  id: string
  full_name: string
  email: string
  created_at: string
  consent_given: boolean
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function getAuthHeaders(): Promise<Record<string, string>> {
  const demoKey = sessionStorage.getItem('adminAccessKey')
  if (demoKey) {
    return { 'X-Admin-Key': demoKey }
  }
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` }
    }
  } catch { /* fall through */ }
  return {}
}

export default function AdminPage() {
  const [tab, setTab] = useState<'approvals' | 'students'>('approvals')

  // Approvals state
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [approvalsLoading, setApprovalsLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  // Students state
  const [students, setStudents] = useState<Student[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    setIsDemo(!!sessionStorage.getItem('adminAccessKey'))
  }, [])

  async function fetchApprovals() {
    setApprovalsLoading(true)
    setError(null)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/api/admin/educator-approvals`, { headers })
      if (res.status === 401 || res.status === 403) {
        setError('Access denied — admin role required.')
        setApprovalsLoading(false)
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setApprovals(data.approvals || [])
    } catch {
      setError('Could not load approvals. Check API connection.')
    } finally {
      setApprovalsLoading(false)
    }
  }

  async function fetchStudents() {
    setStudentsLoading(true)
    setError(null)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/api/admin/users`, { headers })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setStudents(data.students || [])
    } catch {
      setError('Could not load students. Check API connection.')
    } finally {
      setStudentsLoading(false)
    }
  }

  useEffect(() => { fetchApprovals() }, [])

  useEffect(() => {
    if (tab === 'students' && students.length === 0 && !studentsLoading) {
      fetchStudents()
    }
  }, [tab])

  async function handleApprovalAction(approvalId: string, action: 'approve' | 'reject') {
    setActionId(approvalId)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(
        `${API_URL}/api/admin/educator-approvals/${approvalId}/${action}`,
        { method: 'POST', headers },
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setApprovals((prev) => prev.filter((a) => a.id !== approvalId))
    } catch {
      setError(`Failed to ${action} — check API connection.`)
    } finally {
      setActionId(null)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleting(true)
    setError(null)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `HTTP ${res.status}`)
      }
      setStudents((prev) => prev.filter((s) => s.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err: unknown) {
      setError(`Delete failed: ${err instanceof Error ? err.message : String(err)}`)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const tabStyle = (active: boolean) => ({
    padding: '7px 16px',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    background: active ? 'rgba(58,125,106,0.10)' : 'transparent',
    color: active ? '#3A7D6A' : '#9B8E80',
    transition: 'all 0.15s',
  })

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B8E80', marginBottom: 4 }}>
            ADMIN PANEL
          </div>
          <h1 className="text-2xl font-semibold text-[#1C1A17]">Admin Dashboard</h1>
          <p className="text-[#6B6050] text-sm mt-1">Manage educator approvals and student accounts.</p>
        </div>
        <Button variant="ghost" onClick={tab === 'approvals' ? fetchApprovals : fetchStudents}>
          <RefreshCw size={14} className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* Notice */}
      <div className="rounded-lg border px-4 py-3 text-sm" style={{ background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
        {isDemo ? 'Admin demo mode — authenticated via admin key.' : 'Admin access — only authorised administrators should view this page.'}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(180,165,148,0.10)', border: '1px solid rgba(180,165,148,0.22)' }}>
        <button style={tabStyle(tab === 'approvals')} onClick={() => setTab('approvals')}>
          Educator Approvals
        </button>
        <button style={tabStyle(tab === 'students')} onClick={() => setTab('students')}>
          <Users size={12} className="inline mr-1.5" />
          Students
        </button>
      </div>

      {/* ── Approvals tab ── */}
      {tab === 'approvals' && (
        <div className="rounded-xl border" style={{ background: 'rgba(255,255,255,0.80)', borderColor: 'rgba(180,165,148,0.22)' }}>
          <div className="grid gap-4 px-5 py-3 text-[10px] font-semibold tracking-widest uppercase" style={{ gridTemplateColumns: '1fr 1fr auto auto auto', color: '#9B8E80', borderBottom: '1px solid rgba(180,165,148,0.22)' }}>
            <span>Name</span><span>Email</span><span>Submitted</span><span>Status</span><span>Actions</span>
          </div>
          {approvalsLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="text-[#9B8E80] text-sm">Loading...</span>
            </div>
          ) : approvals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <CheckCircle size={28} style={{ color: '#22c55e', opacity: 0.5 }} />
              <p className="text-[#9B8E80] text-sm">No pending approvals.</p>
            </div>
          ) : (
            approvals.map((a, i) => (
              <div key={a.id} className="grid gap-4 px-5 py-4 items-center" style={{ gridTemplateColumns: '1fr 1fr auto auto auto', borderTop: i === 0 ? 'none' : '1px solid rgba(180,165,148,0.08)' }}>
                <span className="text-sm text-[#1C1A17] truncate">{a.users?.full_name || 'Unknown'}</span>
                <span className="text-sm text-[#6B6050] truncate">{a.users?.email || a.educator_id}</span>
                <span className="text-xs text-[#9B8E80] whitespace-nowrap">
                  {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('en-MY', { dateStyle: 'medium' }) : '—'}
                </span>
                <Badge variant="amber"><Clock size={10} className="mr-1 inline" />Pending</Badge>
                <div className="flex gap-2">
                  <button onClick={() => handleApprovalAction(a.id, 'approve')} disabled={actionId === a.id} title="Approve" className="rounded-lg p-1.5 transition-colors" style={{ color: '#22c55e', background: 'rgba(34,197,94,0.08)' }}>
                    <CheckCircle size={16} />
                  </button>
                  <button onClick={() => handleApprovalAction(a.id, 'reject')} disabled={actionId === a.id} title="Reject" className="rounded-lg p-1.5 transition-colors" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)' }}>
                    <XCircle size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Students tab ── */}
      {tab === 'students' && (
        <div className="rounded-xl border" style={{ background: 'rgba(255,255,255,0.80)', borderColor: 'rgba(180,165,148,0.22)' }}>
          <div className="grid gap-4 px-5 py-3 text-[10px] font-semibold tracking-widest uppercase" style={{ gridTemplateColumns: '1fr 1fr auto auto auto', color: '#9B8E80', borderBottom: '1px solid rgba(180,165,148,0.22)' }}>
            <span>Name</span><span>Email</span><span>Joined</span><span>Consent</span><span>Actions</span>
          </div>
          {studentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="text-[#9B8E80] text-sm">Loading...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Users size={28} style={{ color: '#9B8E80', opacity: 0.5 }} />
              <p className="text-[#9B8E80] text-sm">No students found.</p>
            </div>
          ) : (
            students.map((s, i) => (
              <div key={s.id} className="grid gap-4 px-5 py-4 items-center" style={{ gridTemplateColumns: '1fr 1fr auto auto auto', borderTop: i === 0 ? 'none' : '1px solid rgba(180,165,148,0.08)' }}>
                <span className="text-sm text-[#1C1A17] truncate">{s.full_name || 'Unknown'}</span>
                <span className="text-sm text-[#6B6050] truncate">{s.email}</span>
                <span className="text-xs text-[#9B8E80] whitespace-nowrap">
                  {s.created_at ? new Date(s.created_at).toLocaleDateString('en-MY', { dateStyle: 'medium' }) : '—'}
                </span>
                <Badge variant={s.consent_given ? 'green' : 'amber'}>
                  {s.consent_given ? 'Given' : 'Pending'}
                </Badge>
                <button
                  onClick={() => setDeleteTarget(s)}
                  title="Delete student"
                  className="rounded-lg p-1.5 transition-colors"
                  style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)' }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <p className="text-[#C4B8A8] text-xs">
        Approving an educator sets their account role to <code className="text-[#9B8E80]">educator</code> in the database.
        Deleting a student permanently removes their account, sessions, and video recordings.
      </p>

      {/* ── Delete confirmation overlay ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div className="w-full max-w-sm rounded-2xl border p-6 flex flex-col gap-4" style={{ background: '#FAF8F4', borderColor: 'rgba(239,68,68,0.25)', boxShadow: '0 20px 60px rgba(0,0,0,0.28)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.10)' }}>
                <AlertTriangle size={20} style={{ color: '#ef4444' }} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#1C1A17]">Delete student?</h3>
                <p className="text-xs text-[#9B8E80] mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <p className="font-medium text-[#1C1A17]">{deleteTarget.full_name || 'Unknown'}</p>
              <p className="text-[#6B6050] text-xs mt-0.5">{deleteTarget.email}</p>
            </div>

            <p className="text-sm text-[#6B6050]">
              This will permanently delete their account, all session recordings, transcripts, and coaching reports.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 rounded-lg py-2 text-sm font-medium transition-colors"
                style={{ background: 'rgba(180,165,148,0.15)', color: '#6B6050', border: '1px solid rgba(180,165,148,0.25)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 rounded-lg py-2 text-sm font-semibold transition-colors"
                style={{ background: '#ef4444', color: '#fff', opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? 'Deleting...' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
