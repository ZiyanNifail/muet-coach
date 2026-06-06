// MediaPipe's TFLite WASM (via Emscripten printErr) writes benign init lines to
// console.error/info during model load — e.g. "INFO: Created TensorFlow Lite XNNPACK
// delegate for CPU." Next.js's dev overlay surfaces any console.error as a "Console
// Error" popup and attributes it to the active stack frame (the detect loop), making
// it look like a crash. This filters ONLY those known-benign lines; real errors pass
// through untouched. Idempotent — safe to call from multiple components.

const BENIGN_PATTERNS = [
  'Created TensorFlow Lite XNNPACK delegate',
  'INFO: Created TensorFlow Lite',
  'TensorFlow Lite XNNPACK delegate for CPU',
]

function isBenign(args: unknown[]): boolean {
  const first = args[0]
  if (typeof first !== 'string') return false
  return BENIGN_PATTERNS.some((p) => first.includes(p))
}

let installed = false

export function suppressMediapipeLogs(): void {
  if (installed || typeof window === 'undefined') return
  installed = true

  const methods = ['error', 'info', 'log', 'warn'] as const
  for (const method of methods) {
    const original = console[method].bind(console)
    console[method] = (...args: unknown[]) => {
      if (isBenign(args)) return
      original(...args)
    }
  }
}
