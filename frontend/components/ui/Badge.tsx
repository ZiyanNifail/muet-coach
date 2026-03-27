import { clsx } from 'clsx'

interface BadgeProps {
  variant?: 'blue' | 'green' | 'amber' | 'red' | 'purple'
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'blue', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold',
        {
          'bg-[rgba(59,130,246,0.12)] text-[#3b82f6]': variant === 'blue',
          'bg-[rgba(34,197,94,0.15)] text-[#22c55e]': variant === 'green',
          'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]': variant === 'amber',
          'bg-[rgba(239,68,68,0.12)] text-[#ef4444]': variant === 'red',
          'bg-[rgba(139,92,246,0.12)] text-[#8b5cf6]': variant === 'purple',
        },
        className
      )}
    >
      {children}
    </span>
  )
}
