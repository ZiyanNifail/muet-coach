const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, options)
  if (!res.ok) {
    const error = await res.text()
    throw new Error(error || `API error: ${res.status}`)
  }
  return res.json()
}

/**
 * SWR-compatible fetcher. Accepts a [path, token] tuple as the key.
 * Pass `null` as the key to skip the fetch (SWR convention).
 *
 * Usage:
 *   const { data } = useSWR(['/api/reports/history/123', token], swrFetcher)
 */
export async function swrFetcher([path, token]: [string, string | null]) {
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {}
  const res = await fetch(`${API_URL}${path}`, { headers })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
