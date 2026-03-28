'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react'

interface Approval {
  id: string
  educator_id: string
  status: string
  submitted_at: string
  reviewed_at: string | null
  users?: { full_name: string; email: string }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function getAuthHeaders(): Promise<Record<string, string>> {
  // Check for demo admin key stored by the login bubble
  const demoKey = sessionStorage.getItem('adminAccessKey')
  if (demoKey) {
    return { 'X-Admin-Key': demoKey }
  }

  // Fall back to Supabase JWT
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: { session } } = await sb.auth.getSession()
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` }
    }
  } catch { /* fall through */ }
  return {}
}

export default function AdminPage() {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    setIsDemo(!!sessionStorage.getItem('adminAccessKey'))
  }, [])

  async function fetchApprovals() {
    setLoading(true)
    setError(null)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/api/admin/educator-approvals`, { headers })
      if (res.status === 401 || res.status === 403) {
        setError('Access denied — admin role required.')
        setLoading(false)
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setApprovals(data.approvals || [])
    } catch {
      setError('Could not load approvals. Check API connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchApprovals() }, [])

  async function handleAction(approvalId: string, action: 'approve' | 'reject') {
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

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div
            style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: '#55556a', marginBottom: 4,
            }}
          >
            ADMIN PANEL
          </div>
          <h1 className="text-2xl font-semibold text-[#e8e8f0]">Educator Approvals</h1>
          <p className="text-[#8888a0] text-sm mt-1">
            Review pending educator registration requests.
          </p>
        </div>
        <Button variant="ghost" onClick={fetchApprovals}>
          <RefreshCw size={14} className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* Notice */}
      <div
        className="rounded-lg border px-4 py-3 text-sm"
        style={{ background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}
      >
        {isDemo
          ? 'Admin demo mode — authenticated via admin key.'
          : 'Admin access — only authorised administrators should view this page.'}
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)', color: '#ef4444' }}
        >
          {error}
        </div>
      )}

      {/* Content */}
      <div
        className="rounded-xl border"
        style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        {/* Table header */}
        <div
          className="grid gap-4 px-5 py-3 text-[10px] font-semibold tracking-widest uppercase"
          style={{
            gridTemplateColumns: '1fr 1fr auto auto auto',
            color: '#55556a',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span>Name</span>
          <span>Email</span>
          <span>Submitted</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {/* Rows */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-[#55556a] text-sm">Loading...</span>
          </div>
        ) : approvals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <CheckCircle size={28} style={{ color: '#22c55e', opacity: 0.5 }} />
            <p className="text-[#55556a] text-sm">No pending approvals.</p>
          </div>
        ) : (
          approvals.map((a, i) => (
            <div
              key={a.id}
              className="grid gap-4 px-5 py-4 items-center"
              style={{
                gridTemplateColumns: '1fr 1fr auto auto auto',
                borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <span className="text-sm text-[#e8e8f0] truncate">
                {a.users?.full_name || 'Unknown'}
              </span>
              <span className="text-sm text-[#8888a0] truncate">
                {a.users?.email || a.educator_id}
              </span>
              <span className="text-xs text-[#55556a] whitespace-nowrap">
                {a.submitted_at
                  ? new Date(a.submitted_at).toLocaleDateString('en-MY', { dateStyle: 'medium' })
                  : '—'}
              </span>
              <Badge variant="amber">
                <Clock size={10} className="mr-1 inline" />
                Pending
              </Badge>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction(a.id, 'approve')}
                  disabled={actionId === a.id}
                  title="Approve"
                  className="rounded-lg p-1.5 transition-colors"
                  style={{ color: '#22c55e', background: 'rgba(34,197,94,0.08)' }}
                >
                  <CheckCircle size={16} />
                </button>
                <button
                  onClick={() => handleAction(a.id, 'reject')}
                  disabled={actionId === a.id}
                  title="Reject"
                  className="rounded-lg p-1.5 transition-colors"
                  style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)' }}
                >
                  <XCircle size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-[#3a3a52] text-xs">
        Approving an educator sets their account role to <code className="text-[#55556a]">educator</code> in the database.
        Rejected requests are hidden from this queue. All actions are logged via <code className="text-[#55556a]">educator_approvals.reviewed_at</code>.
      </p>
    </div>
  )
}
