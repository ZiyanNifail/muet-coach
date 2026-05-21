'use client'
import { Suspense } from 'react'
import { ExamContent } from './ExamContent'

export default function ExamPage() {
  return (
    <Suspense fallback={null}>
      <ExamContent />
    </Suspense>
  )
}
