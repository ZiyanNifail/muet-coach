'use client'
import { ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-medium rounded-lg transition-all cursor-pointer',
        'active:scale-[0.97] disabled:active:scale-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A7D6A]/40 focus-visible:ring-offset-1',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        {
          'bg-[#3A7D6A] text-white hover:bg-[#2d6356] font-semibold': variant === 'primary',
          'bg-transparent text-[var(--text-secondary)] border border-[rgba(180,165,148,0.40)] hover:border-[rgba(180,165,148,0.65)] hover:text-[var(--text-primary)]':
            variant === 'secondary',
          'bg-[rgba(192,57,43,0.10)] text-[#C0392B] border border-[rgba(192,57,43,0.25)] hover:bg-[rgba(192,57,43,0.16)]':
            variant === 'danger',
          'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(180,165,148,0.10)]': variant === 'ghost',
          'px-3 py-1.5 text-xs': size === 'sm',
          'px-[18px] py-[9px] text-sm': size === 'md',
          'px-6 py-3 text-base': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
