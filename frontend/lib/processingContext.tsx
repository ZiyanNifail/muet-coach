'use client'
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { toast } from 'sonner'

interface ProcessingJob {
  presentationId: string
  topicText: string
  startedAt: number
}

interface ProcessingContextValue {
  addJob: (presentationId: string, topicText: string) => void
}

const ProcessingContext = createContext<ProcessingContextValue>({ addJob: () => {} })

const STORAGE_KEY = 'fluency-processing-jobs'
const POLL_MS = 5000
const MAX_AGE_MS = 30 * 60 * 1000
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function persist(jobs: ProcessingJob[]) {
  try {
    if (jobs.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

export function ProcessingProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<ProcessingJob[]>([])
  const jobsRef = useRef<ProcessingJob[]>([])

  useEffect(() => { jobsRef.current = jobs }, [jobs])

  // Rehydrate persisted jobs on mount (survive page navigation)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed: ProcessingJob[] = JSON.parse(raw)
      const fresh = parsed.filter(j => Date.now() - j.startedAt < MAX_AGE_MS)
      if (fresh.length) { setJobs(fresh); jobsRef.current = fresh }
      else localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }, [])

  const removeJob = useCallback((presentationId: string) => {
    setJobs(prev => {
      const next = prev.filter(j => j.presentationId !== presentationId)
      persist(next)
      return next
    })
  }, [])

  const addJob = useCallback((presentationId: string, topicText: string) => {
    setJobs(prev => {
      if (prev.some(j => j.presentationId === presentationId)) return prev
      const next = [...prev, { presentationId, topicText, startedAt: Date.now() }]
      persist(next)
      return next
    })
  }, [])

  // Stable polling interval — reads from ref so it always sees latest jobs
  // without needing to restart the interval when jobs change.
  useEffect(() => {
    const id = setInterval(async () => {
      const current = jobsRef.current
      if (!current.length) return
      for (const job of [...current]) {
        if (Date.now() - job.startedAt > MAX_AGE_MS) { removeJob(job.presentationId); continue }
        try {
          const res = await fetch(`${API_URL}/api/presentations/${job.presentationId}/status`)
          if (!res.ok) continue
          const { status } = await res.json()
          if (status === 'complete') {
            const { presentationId: pid, topicText } = job
            removeJob(pid)
            toast.success('Feedback report ready!', {
              description: topicText
                ? `"${topicText}" has been analysed.`
                : 'Your session has been analysed.',
              action: {
                label: 'View Results',
                onClick: () => { window.location.href = `/results/${pid}` },
              },
              duration: Infinity,
            })
          } else if (status === 'failed') {
            removeJob(job.presentationId)
            toast.error('Analysis failed', {
              description: 'Something went wrong processing your session.',
              action: {
                label: 'New Session',
                onClick: () => { window.location.href = '/practice' },
              },
              duration: Infinity,
            })
          }
        } catch {}
      }
    }, POLL_MS)
    return () => clearInterval(id)
  }, [removeJob])

  return (
    <ProcessingContext.Provider value={{ addJob }}>
      {children}
    </ProcessingContext.Provider>
  )
}

export function useProcessing() {
  return useContext(ProcessingContext)
}
