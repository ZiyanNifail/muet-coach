'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

// Global navigation guard. Active-work pages (recording, drills, exam, etc.) call
// `useNavigationGuard(active, pageName)` to register themselves. While any guard is
// active, in-app section moves (the Sidebar) and browser close/refresh ask the user
// to confirm before leaving.

interface NavGuardCtx {
  active: boolean
  name: string | null
  register: (id: number, name: string) => void
  unregister: (id: number) => void
  attemptNavigate: (href: string, onProceed?: () => void) => void
}

const Ctx = createContext<NavGuardCtx | null>(null)
let _idSeq = 0

export function NavGuardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const guardsRef = useRef<Map<number, string>>(new Map())
  const [name, setName] = useState<string | null>(null)
  const [pending, setPending] = useState<{ href: string; onProceed?: () => void } | null>(null)

  const recompute = useCallback(() => {
    const vals = Array.from(guardsRef.current.values())
    setName(vals.length ? vals[vals.length - 1] : null)
  }, [])

  const register = useCallback((id: number, n: string) => { guardsRef.current.set(id, n); recompute() }, [recompute])
  const unregister = useCallback((id: number) => { guardsRef.current.delete(id); recompute() }, [recompute])

  const active = name !== null

  const attemptNavigate = useCallback((href: string, onProceed?: () => void) => {
    if (!active || href === pathname) { router.push(href); onProceed?.(); return }
    setPending({ href, onProceed })
  }, [active, pathname, router])

  // Warn on tab close / refresh while a guard is active (native browser dialog).
  useEffect(() => {
    if (!active) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [active])

  const confirmLeave = useCallback(() => {
    const p = pending
    setPending(null)
    guardsRef.current.clear()
    recompute()
    if (p) { router.push(p.href); p.onProceed?.() }
  }, [pending, recompute, router])

  return (
    <Ctx.Provider value={{ active, name, register, unregister, attemptNavigate }}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setPending(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border p-6 flex flex-col gap-5"
            style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-medium)', boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Leave {name}?
              </h3>
              <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                Are you sure you want to exit {name}? Any progress in this session may be lost.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 sm:justify-end">
              <button
                onClick={() => setPending(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px]"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-medium)' }}
              >
                Stay on page
              </button>
              <button
                onClick={confirmLeave}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity min-h-[44px]"
                style={{ background: '#ef4444' }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                Leave anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}

export function useNavGuard() {
  return useContext(Ctx)
}

// Pages call this to register a guard while `active` is true.
export function useNavigationGuard(active: boolean, name: string) {
  const ctx = useContext(Ctx)
  useEffect(() => {
    if (!ctx || !active) return
    const id = ++_idSeq
    ctx.register(id, name)
    return () => ctx.unregister(id)
    // ctx identity is stable; depend on active/name only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, name])
}
