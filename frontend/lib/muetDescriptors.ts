// Official MUET band descriptors (1–6), surfaced to students on the results page.
// Source of truth mirrors the band descriptors used in the scoring prompt
// (backend/services/groq_service.py). A shared 1–6 map is used across all
// rubric criteria for v1.

export const MUET_BAND_DESCRIPTORS: Record<number, string> = {
  1: 'Minimal — barely communicates, virtually no control of the language.',
  2: 'Very limited — only short utterances, frequent breakdown in communication.',
  3: 'Limited — conveys basic meaning but with many errors and a restricted range.',
  4: 'Satisfactory — meaning is generally clear, with some errors and an adequate range.',
  5: 'Good — generally accurate and fluent, with a good range of language.',
  6: 'Excellent — highly accurate, with a wide range and near-native fluency.',
}

// MUET bands run 1–6. Round a fractional score to its nearest whole band and clamp.
export function toBand(score: number): number {
  return Math.max(1, Math.min(6, Math.round(score)))
}

export function bandDescriptor(score: number): string {
  return MUET_BAND_DESCRIPTORS[toBand(score)]
}

// Descriptor of the next band up, or null if already at Band 6.
export function nextBandDescriptor(score: number): { band: number; text: string } | null {
  const next = toBand(score) + 1
  if (next > 6) return null
  return { band: next, text: MUET_BAND_DESCRIPTORS[next] }
}
