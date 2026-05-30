export default function Loading() {
  return (
    <div
      className="flex items-center justify-center"
      style={{ minHeight: '70vh' }}
    >
      <div
        className="animate-spin"
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '3px solid var(--border-subtle)',
          borderTopColor: 'var(--accent-teal)',
        }}
        aria-label="Loading"
        role="status"
      />
    </div>
  )
}
