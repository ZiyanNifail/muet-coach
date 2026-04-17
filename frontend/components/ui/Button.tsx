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
          'bg-[#1C1A17] text-[#FAF9F7] hover:bg-[#2E2B26] font-semibold': variant === 'primary',
          'bg-transparent text-[#6B6050] border border-[rgba(180,165,148,0.40)] hover:border-[rgba(180,165,148,0.65)] hover:text-[#1C1A17]':
            variant === 'secondary',
          'bg-[rgba(192,57,43,0.10)] text-[#C0392B] border border-[rgba(192,57,43,0.25)] hover:bg-[rgba(192,57,43,0.16)]':
            variant === 'danger',
          'bg-transparent text-[#6B6050] hover:text-[#1C1A17] hover:bg-[rgba(180,165,148,0.10)]': variant === 'ghost',
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
