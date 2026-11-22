import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-8', className)}>
      <rect width="32" height="32" rx="9" fill="var(--primary-tint)" />
      <path
        d="M16 5.5c-4 5.6-7.5 9.8-7.5 14a7.5 7.5 0 0 0 15 0c0-4.2-3.5-8.4-7.5-14z"
        fill="var(--primary)"
      />
      <path
        d="M13 19.8a3 3 0 0 0 3 3"
        stroke="var(--bg)"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="font-display text-xl font-bold tracking-tight">Brilho</span>
    </div>
  )
}
