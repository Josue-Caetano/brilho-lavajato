import { Delete } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

/** Teclado numérico para PIN de 4 dígitos. Aceita também o teclado físico. */
export function PinPad({
  value,
  onChange,
  onComplete,
  erro,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  onComplete?: (v: string) => void
  erro?: boolean
  disabled?: boolean
}) {
  const digitar = (d: string) => {
    if (disabled || value.length >= 4) return
    const novo = value + d
    onChange(novo)
    if (novo.length === 4) onComplete?.(novo)
  }
  const apagar = () => !disabled && onChange(value.slice(0, -1))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (/^\d$/.test(e.key)) {
        e.preventDefault()
        digitar(e.key)
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        apagar()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
  const tecla =
    'flex h-16 items-center justify-center rounded-2xl border border-border bg-surface-2 font-display text-2xl font-semibold transition-[background-color,transform] duration-150 hover:bg-border active:scale-95 disabled:opacity-40'
  return (
    <div className="flex flex-col items-center gap-7">
      <div
        className={cn('flex gap-4', erro && 'animate-[shake_320ms_ease-in-out]')}
        aria-label={`${value.length} de 4 dígitos digitados`}
        role="status"
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              'size-4 rounded-full border-2 transition-all duration-150',
              erro
                ? 'border-danger bg-danger'
                : i < value.length
                  ? 'border-primary bg-primary scale-110'
                  : 'border-border-strong bg-transparent',
            )}
          />
        ))}
      </div>
      <div className="grid w-[264px] grid-cols-3 gap-3">
        {teclas.map((t) => (
          <button key={t} type="button" className={tecla} onClick={() => digitar(t)} disabled={disabled}>
            {t}
          </button>
        ))}
        <span />
        <button type="button" className={tecla} onClick={() => digitar('0')} disabled={disabled}>
          0
        </button>
        <button
          type="button"
          className={cn(tecla, 'text-muted')}
          onClick={apagar}
          disabled={disabled}
          aria-label="Apagar dígito"
        >
          <Delete className="size-6" />
        </button>
      </div>
    </div>
  )
}
