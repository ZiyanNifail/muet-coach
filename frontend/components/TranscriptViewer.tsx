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

// Estimate the timestamp (in seconds) of each filler by its word-position in
// the transcript. Uses the same uniform-distribution assumption as the WPM
// timeseries — approximate but consistent with the rest of the pipeline.
function computeFillerTimestamps(
  transcript: string,
  durationSecs: number,
): Array<{ word: string; t: number }> {
  const tokens = transcript.split(/\s+/)
  const total = tokens.length
  if (total === 0) return []
  const result: Array<{ word: string; t: number }> = []
  tokens.forEach((token, i) => {
    if (/^\[.+\]$/.test(token)) {
      result.push({
        word: token.slice(1, -1).toLowerCase(),
        t: Math.round((i / total) * durationSecs),
      })
    }
  })
  return result
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function TranscriptViewer({
  transcript,
  fillerCount,
  fillerDensity,
  durationSecs,
}: {
  transcript: string
  fillerCount: number | null
  fillerDensity: number | null
  durationSecs: number | null
}) {
  const breakdown = parseFillerBreakdown(transcript)
  const fillerTimestamps =
    durationSecs != null && durationSecs > 0
      ? computeFillerTimestamps(transcript, durationSecs)
      : []

  // Group timestamps by filler word
  const timedBreakdown = breakdown.map(({ word, count }) => ({
    word,
    count,
    times: fillerTimestamps.filter(ft => ft.word === word).map(ft => ft.t),
  }))

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

      {/* Per-filler breakdown with timestamps */}
      {timedBreakdown.length > 0 && (
        <div className="flex flex-col gap-3">
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            FILLER BREAKDOWN
          </div>
          <div className="flex flex-col gap-2">
            {timedBreakdown.map(({ word, count, times }) => (
              <div key={word} className="flex items-center gap-2 flex-wrap">
                {/* Word + count badge */}
                <div
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 shrink-0"
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
                {/* Per-occurrence timestamp chips */}
                {times.map((t, i) => (
                  <span
                    key={i}
                    className="font-mono text-[10px] rounded px-1.5 py-0.5"
                    style={{
                      background: 'rgba(180,165,148,0.08)',
                      border: '1px solid rgba(180,165,148,0.18)',
                      color: 'var(--text-tertiary)',
                    }}
                    title={`at ${formatTime(t)} (approximate)`}
                  >
                    {formatTime(t)}
                  </span>
                ))}
              </div>
            ))}
          </div>
          {fillerTimestamps.length > 0 && (
            <p style={{ fontSize: 9, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              Timestamps are approximate — based on word position in the transcript.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
