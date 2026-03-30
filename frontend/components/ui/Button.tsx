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
        'disabled:opacity-40 disabled:cursor-not-allowed',
        {
          'bg-[#e8e8f0] text-[#0d0d14] hover:bg-white font-semibold': variant === 'primary',
          'bg-transparent text-[#8888a0] border border-[rgba(255,255,255,0.10)] hover:border-[rgba(255,255,255,0.18)] hover:text-[#e8e8f0]':
            variant === 'secondary',
          'bg-[rgba(239,68,68,0.12)] text-[#ef4444] border border-[rgba(239,68,68,0.25)]':
            variant === 'danger',
          'bg-transparent text-[#8888a0] hover:text-[#e8e8f0]': variant === 'ghost',
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
