import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{ minHeight: '70vh', gap: 14, padding: 24 }}
    >
      <span
        style={{
          fontSize: 56,
          fontWeight: 700,
          lineHeight: 1,
          color: 'var(--accent-teal)',
          fontFamily: 'var(--font-lora), serif',
        }}
      >
        404
      </span>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
        Page not found
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, maxWidth: 360 }}>
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link
        href="/"
        className="inline-flex items-center transition-colors hover:underline"
        style={{
          marginTop: 6,
          background: 'var(--accent-teal-dim)',
          border: '1px solid var(--border-medium)',
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--accent-teal)',
        }}
      >
        Back to home
      </Link>
    </div>
  )
}
