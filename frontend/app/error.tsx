'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import ErrorState from '@/components/ErrorState'

/**
 * Segment-level error boundary. This Next.js build (v16.x) passes `unstable_retry`;
 * older builds pass `reset`. We accept either so recovery works across versions.
 */
export default function Error({
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
    <div
      className="flex flex-col items-center justify-center"
      style={{ minHeight: '70vh', padding: 24 }}
    >
      <ErrorState
        title="Something went wrong"
        message="We hit an unexpected error loading this page. Trying again usually fixes it."
        onRetry={retry}
      />
      <Link
        href="/"
        style={{ marginTop: 12, fontSize: 13, color: 'var(--text-tertiary)' }}
        className="hover:underline"
      >
        Go to home
      </Link>
    </div>
  )
}
