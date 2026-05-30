'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronRight, ShieldCheck } from 'lucide-react'
import { Button } from './ui/Button'
import { giveConsent } from '@/lib/auth'
import { backdropFade, springPop, staggerContainer, staggerItem } from '@/lib/motion'

interface ConsentModalProps {
  userId: string
  onAccepted: () => void
}

const consentPoints = [
  'Your video and audio recordings will be processed by AI models to generate coaching feedback.',
  'Recording data is stored securely on Supabase for up to 90 days.',
  'Your transcript and metrics are used only for personalised coaching, never shared externally.',
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
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      variants={backdropFade}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="w-full max-w-md flex flex-col gap-5 rounded-2xl border p-6"
        style={{
          background: 'var(--bg-panel)',
          borderColor: 'rgba(58,125,106,0.20)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.28)',
          transition: 'background 0.3s ease, color 0.3s ease',
        }}
        variants={springPop}
        initial="hidden"
        animate="visible"
      >
        {/* MSU logo */}
        <div className="flex items-center gap-2.5 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/msu.png" alt="Management and Science University" style={{ width: 40, height: 40, objectFit: 'contain' }} />
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>Management and Science University</span>
        </div>

        <div className="flex items-start gap-3">
          <ShieldCheck size={22} style={{ color: '#3A7D6A', marginTop: 2, flexShrink: 0 }} />
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
                marginBottom: 4,
              }}
            >
              Data Consent
            </div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Before you begin</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              This platform uses AI to analyse your presentations. Please review:
            </p>
          </div>
        </div>

        <motion.ul
          className="flex flex-col gap-2.5"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {consentPoints.map((point, i) => (
            <motion.li key={i} variants={staggerItem} className="flex gap-2.5 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
              <ChevronRight
                size={14}
                style={{ color: '#3A7D6A', marginTop: 4, flexShrink: 0 }}
              />
              {point}
            </motion.li>
          ))}
        </motion.ul>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 w-4 h-4 accent-[#3A7D6A] shrink-0"
          />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            I understand and consent to my video and audio being processed by AI for coaching purposes.
          </span>
        </label>

        <Button onClick={handleAccept} disabled={!checked || loading} className="w-full">
          {loading ? 'Saving...' : 'Accept & Continue'}
          {!loading && <ArrowRight size={14} className="ml-2" />}
        </Button>
      </motion.div>
    </motion.div>
  )
}
