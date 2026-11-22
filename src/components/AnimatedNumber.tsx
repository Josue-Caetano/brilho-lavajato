import { useEffect, useRef, useState } from 'react'

/** Contador animado (≈600ms, easing suave) para KPIs. Respeita "reduzir movimento". */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString('pt-BR'),
  duration = 600,
  className,
}: {
  value: number
  format?: (n: number) => string
  duration?: number
  className?: string
}) {
  const [display, setDisplay] = useState(value)
  const from = useRef(value)
  const raf = useRef(0)

  useEffect(() => {
    const reduz = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const inicio = from.current
    if (reduz || inicio === value) {
      from.current = value
      setDisplay(value)
      return
    }
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      const e = 1 - Math.pow(1 - p, 3)
      const atual = inicio + (value - inicio) * e
      setDisplay(atual)
      from.current = atual
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value, duration])

  return (
    <span className={className} aria-live="polite">
      {format(display)}
    </span>
  )
}
