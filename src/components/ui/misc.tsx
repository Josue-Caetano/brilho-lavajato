import * as React from 'react'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger'
const toneClass: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted border-border',
  primary: 'bg-primary-tint text-primary border-primary/30',
  success: 'bg-success-tint text-success border-success/30',
  warning: 'bg-warning-tint text-warning border-warning/30',
  danger: 'bg-danger-tint text-danger border-danger/30',
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold whitespace-nowrap [&_svg]:size-3.5',
        toneClass[tone],
        className,
      )}
      {...props}
    />
  )
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('bg-surface-2 animate-pulse rounded-lg', className)} {...props} />
}

export function Progress({
  value,
  max = 100,
  tone = 'primary',
  className,
  label,
}: {
  value: number
  max?: number
  tone?: 'primary' | 'success' | 'warning'
  className?: string
  label?: string
}) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0))
  const bar = { primary: 'bg-primary', success: 'bg-success', warning: 'bg-warning' }[tone]
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn('bg-surface-2 h-2 w-full overflow-hidden rounded-full', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out', bar)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'border-border-strong bg-surface-2 text-muted inline-flex h-6 min-w-6 items-center justify-center rounded-md border px-1.5 font-sans text-xs font-semibold',
        className,
      )}
      {...props}
    />
  )
}

export function EmptyState({
  icon: Icon,
  titulo,
  descricao,
  acao,
  className,
  compacto,
}: {
  icon: React.ComponentType<{ className?: string }>
  titulo: string
  descricao?: React.ReactNode
  acao?: React.ReactNode
  className?: string
  compacto?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-center',
        compacto ? 'py-8' : 'py-16',
        className,
      )}
    >
      <div className="border-border bg-surface-2 text-primary flex size-14 items-center justify-center rounded-2xl border">
        <Icon className="size-7" />
      </div>
      <div className="max-w-sm">
        <p className="font-display text-base font-semibold">{titulo}</p>
        {descricao && <p className="text-muted mt-1 text-sm leading-relaxed">{descricao}</p>}
      </div>
      {acao && <div className="mt-1">{acao}</div>}
    </div>
  )
}

/** Controle segmentado (ex.: R$ | %). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  'aria-label': ariaLabel,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: React.ReactNode }[]
  className?: string
  'aria-label'?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'border-border-strong bg-bg inline-flex rounded-[var(--radius-btn)] border p-1',
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-9 min-w-11 rounded-[9px] px-3 text-sm font-semibold transition-colors duration-150',
            value === o.value ? 'bg-surface-2 text-text' : 'text-muted hover:text-text',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
