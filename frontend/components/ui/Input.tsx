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
          'bg-[rgba(180,165,148,0.08)] border rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] w-full outline-none transition-colors',
          'placeholder:text-[var(--text-tertiary)]',
          error
            ? 'border-[#ef4444]'
            : 'border-[rgba(180,165,148,0.22)] focus:border-[rgba(180,165,148,0.50)]',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-[#ef4444]">{error}</span>}
    </div>
  )
}
