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
          'bg-[rgba(107,96,80,0.12)] text-[#6B6050]': variant === 'blue',
          'bg-[rgba(34,163,90,0.12)] text-[#22a35a]': variant === 'green',
          'bg-[rgba(184,134,11,0.12)] text-[#B8860B]': variant === 'amber',
          'bg-[rgba(192,57,43,0.10)] text-[#C0392B]': variant === 'red',
          'bg-[rgba(123,94,167,0.12)] text-[#7B5EA7]': variant === 'purple',
        },
        className
      )}
    >
      {children}
    </span>
  )
}
