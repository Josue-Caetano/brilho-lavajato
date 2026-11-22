import { formatarPlaca } from '@/lib/placa'
import { cn } from '@/lib/utils'

/** "Chip de placa": fundo claro, texto escuro, Sora em negrito e letras espaçadas. */
export function PlateChip({
  placa,
  size = 'md',
  className,
}: {
  placa: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const s = {
    sm: 'h-6 px-2 text-[11px] tracking-[0.12em]',
    md: 'h-7 px-2.5 text-[13px] tracking-[0.14em]',
    lg: 'h-10 px-4 text-lg tracking-[0.18em]',
  }[size]
  return (
    <span
      className={cn(
        'border-plate-border bg-plate-bg font-display text-plate-text inline-flex items-center rounded-md border font-bold whitespace-nowrap uppercase shadow-[inset_0_-2px_0_rgb(0_0_0/0.06)]',
        s,
        className,
      )}
    >
      {formatarPlaca(placa)}
    </span>
  )
}
