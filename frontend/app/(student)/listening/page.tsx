'use client'
import { Suspense } from 'react'
import { ListeningContent } from './ListeningContent'

export default function ListeningPage() {
  return (
    <Suspense fallback={null}>
      <ListeningContent />
    </Suspense>
  )
}
