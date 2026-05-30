'use client'

import { useEffect } from 'react'

/**
 * Top-level fallback that replaces the root layout when it (or its providers)
 * crash. Must render its own <html>/<body> and cannot rely on the app theme,
 * so colors are inlined and self-contained.
 */
export default function GlobalError({
  error,
  unstable_retry,
  reset,
}: {
  error: Error & { digest?: string }
  unstable_retry?: () => void
  reset?: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const retry = unstable_retry ?? reset ?? (() => window.location.reload())

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          background: '#0B1410',
          color: '#E8F5F1',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <title>Something went wrong — fluency.my</title>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Something went wrong</h1>
        <p style={{ fontSize: 14, color: '#A8C5BC', margin: 0, maxWidth: 380 }}>
          The app ran into an unexpected error. Reloading usually fixes it.
        </p>
        <button
          onClick={() => retry()}
          style={{
            marginTop: 4,
            background: 'rgba(61,184,150,0.13)',
            border: '1px solid rgba(61,184,150,0.42)',
            borderRadius: 8,
            padding: '9px 18px',
            fontSize: 13,
            fontWeight: 600,
            color: '#3DB896',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
