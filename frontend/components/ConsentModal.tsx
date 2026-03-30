'use client'
import { useState } from 'react'
import { ArrowRight, ChevronRight, ShieldCheck } from 'lucide-react'
import { Button } from './ui/Button'
import { giveConsent } from '@/lib/auth'

interface ConsentModalProps {
  userId: string
  onAccepted: () => void
}

const consentPoints = [
  'Your video and audio recordings will be processed by AI models to generate coaching feedback.',
  'Recording data is stored securely on Supabase for up to 90 days.',
  'Your transcript and metrics are used only for personalised coaching — never shared externally.',
  'You can withdraw consent and request data deletion at any time from Settings.',
]

export function ConsentModal({ userId, onAccepted }: ConsentModalProps) {
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleAccept() {
    if (!checked) return
    setLoading(true)
    try {
      await giveConsent(userId)
      onAccepted()
    } catch {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(20px)' }}
    >
      <div
        className="w-full max-w-md flex flex-col gap-5 rounded-2xl border p-6"
        style={{
          background: 'rgba(14,14,22,0.60)',
          borderColor: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <div className="flex items-start gap-3">
          <ShieldCheck size={22} style={{ color: '#94a3b8', marginTop: 2, flexShrink: 0 }} />
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#55556a',
                marginBottom: 4,
              }}
            >
              Data Consent
            </div>
            <h2 className="text-lg font-semibold text-[#e8e8f0]">Before you begin</h2>
            <p className="text-[#8888a0] text-sm mt-1">
              This platform uses AI to analyse your presentations. Please review:
            </p>
          </div>
        </div>

        <ul className="flex flex-col gap-2.5">
          {consentPoints.map((point, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-[#8888a0] leading-6">
              <ChevronRight
                size={14}
                style={{ color: '#94a3b8', marginTop: 4, flexShrink: 0 }}
              />
              {point}
            </li>
          ))}
        </ul>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 w-4 h-4 accent-[#94a3b8] shrink-0"
          />
          <span className="text-sm text-[#e8e8f0]">
            I understand and consent to my video and audio being processed by AI for coaching purposes.
          </span>
        </label>

        <Button onClick={handleAccept} disabled={!checked || loading} className="w-full">
          {loading ? 'Saving...' : 'Accept & Continue'}
          {!loading && <ArrowRight size={14} className="ml-2" />}
        </Button>
      </div>
    </div>
  )
}
