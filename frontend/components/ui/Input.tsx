import { InputHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#55556a]">
          {label}
        </label>
      )}
      <input
        className={clsx(
          'bg-[rgba(255,255,255,0.04)] border rounded-lg px-3.5 py-2.5 text-sm text-[#e8e8f0] w-full outline-none transition-colors',
          'placeholder:text-[#55556a]',
          error
            ? 'border-[#ef4444]'
            : 'border-[rgba(255,255,255,0.06)] focus:border-[rgba(255,255,255,0.18)]',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-[#ef4444]">{error}</span>}
    </div>
  )
}
