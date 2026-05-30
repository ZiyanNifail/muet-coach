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
        <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
          {label}
        </label>
      )}
      <input
        className={clsx(
          'bg-[rgba(180,165,148,0.08)] border rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] w-full outline-none transition-all',
          'placeholder:text-[var(--text-tertiary)]',
          'focus:shadow-[0_0_0_3px_rgba(58,125,106,0.14)]',
          error
            ? 'border-[#ef4444] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.14)]'
            : 'border-[rgba(180,165,148,0.22)] focus:border-[rgba(58,125,106,0.45)]',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-[#ef4444]">{error}</span>}
    </div>
  )
}
