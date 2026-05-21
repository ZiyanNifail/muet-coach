'use client'
import { Suspense } from 'react'
import { WritingContent } from './WritingContent'

export default function WritingPage() {
  return (
    <Suspense fallback={null}>
      <WritingContent />
    </Suspense>
  )
}
