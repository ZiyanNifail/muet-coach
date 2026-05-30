const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * Typed error thrown by apiFetch/swrFetcher. `status` is 0 for network-level
 * failures (backend unreachable / cold start). Callers and SWR `onError` can
 * branch on `status` (e.g. 401 → re-auth) without parsing strings.
 */
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const text = await res.text()
    if (!text) return `Request failed (${res.status})`
    try {
      const json = JSON.parse(text)
      return json.detail || json.message || `Request failed (${res.status})`
    } catch {
      // Non-JSON body (e.g. HTML error page) — don't surface raw markup.
      return `Request failed (${res.status})`
    }
  } catch {
    return `Request failed (${res.status})`
  }
}

export async function apiFetch(path: string, options?: RequestInit) {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, options)
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.')
  }
  if (!res.ok) {
    throw new ApiError(res.status, await parseError(res))
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
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { headers })
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.')
  }
  if (!res.ok) {
    throw new ApiError(res.status, await parseError(res))
  }
  return res.json()
}
