'use client'
import { useLucideDrawerAnimation } from '@/components/ui/lucide-icon-drawer'
import { VoxReadyIcon } from '@/components/ui/voxready-icon'
import { cn } from '@/lib/utils'

interface VoxReadyLogoProps {
  iconSize?: number
  showWordmark?: boolean
  className?: string
  iconClassName?: string
}

export function VoxReadyLogo({
  iconSize = 32,
  showWordmark = true,
  className,
  iconClassName,
}: VoxReadyLogoProps) {
  const root = useLucideDrawerAnimation()

  return (
    <div ref={root} className={cn('flex items-center gap-2', className)}>
      <VoxReadyIcon
        size={iconSize}
        className={cn(iconClassName)}
        style={{ color: 'var(--accent-teal)' }}
      />
      {showWordmark && (
        <span className="text-xl leading-none tracking-tight select-none">
          <span className="font-bold" style={{ color: 'var(--accent-teal)' }}>fluency</span>
          <span className="font-normal" style={{ color: 'var(--text-primary)' }}>.my</span>
        </span>
      )}
    </div>
  )
}
