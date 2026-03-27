import { Suspense } from 'react'
import { PracticeContent } from './PracticeContent'

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[#8888a0] text-sm">Loading...</span>
        </div>
      }
    >
      <PracticeContent />
    </Suspense>
  )
}
