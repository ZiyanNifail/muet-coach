'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

/**
 * Shared presentational error UI. Used by the route-level error boundaries
 * (error.tsx, global-error.tsx) and by in-page fetch failures so error states
 * look consistent across the app. Never render raw server text here.
 */
export default function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again in a moment.',
  onRetry,
  retryLabel = 'Try again',
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center gap-4 p-8 ${className}`}
      style={{ minHeight: 240 }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--accent-red-dim)',
          color: 'var(--accent-red)',
        }}
      >
        <AlertTriangle size={26} />
      </div>
      <div className="flex flex-col gap-1.5">
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          {title}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, maxWidth: 360 }}>
          {message}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 transition-colors"
          style={{
            marginTop: 4,
            background: 'var(--accent-teal-dim)',
            border: '1px solid var(--border-medium)',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--accent-teal)',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} />
          {retryLabel}
        </button>
      )}
    </div>
  )
}
