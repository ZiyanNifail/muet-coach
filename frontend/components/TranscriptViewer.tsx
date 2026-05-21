'use client'

interface FillerBreakdown {
  word: string
  count: number
}

function parseFillerBreakdown(transcript: string): FillerBreakdown[] {
  const matches = transcript.match(/\[([^\]]+)\]/g) || []
  const counts: Record<string, number> = {}
  for (const m of matches) {
    const word = m.slice(1, -1).toLowerCase()
    counts[word] = (counts[word] || 0) + 1
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([word, count]) => ({ word, count }))
}

export function TranscriptViewer({
  transcript,
  fillerCount,
  fillerDensity,
}: {
  transcript: string
  fillerCount: number | null
  fillerDensity: number | null
}) {
  const breakdown = parseFillerBreakdown(transcript)

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border p-5"
      style={{ background: 'var(--bg-panel)', borderColor: 'rgba(180,165,148,0.22)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          TRANSCRIPT
        </div>
        {fillerCount != null && fillerCount > 0 && (
          <span className="text-xs font-mono" style={{ color: '#f59e0b' }}>
            {fillerCount} filler{fillerCount !== 1 ? 's' : ''}
            {fillerDensity != null && ` · ${fillerDensity.toFixed(1)}/min`}
          </span>
        )}
      </div>

      {/* Transcript text — fillers highlighted in amber */}
      <p className="text-sm leading-7" style={{ color: 'var(--text-secondary)' }}>
        {transcript.split(/(\[[^\]]+\])/).map((part, i) =>
          /^\[.+\]$/.test(part) ? (
            <mark
              key={i}
              className="rounded px-0.5 not-italic"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
            >
              {part.slice(1, -1)}
            </mark>
          ) : (
            part
          ),
        )}
      </p>

      {/* Per-filler breakdown */}
      {breakdown.length > 0 && (
        <div className="flex flex-col gap-2">
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            FILLER BREAKDOWN
          </div>
          <div className="flex flex-wrap gap-2">
            {breakdown.map(({ word, count }) => (
              <div
                key={word}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
                style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
              >
                <span className="text-xs font-mono" style={{ color: '#d97706' }}>"{word}"</span>
                <span
                  className="text-xs font-bold font-mono rounded-full px-1.5 py-0.5"
                  style={{ background: 'rgba(245,158,11,0.18)', color: '#f59e0b' }}
                >
                  ×{count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
