import { useEffect, useState } from 'react'

/** Hora atual que se atualiza sozinha (padrão: a cada 30 s) — para cronômetros da fila e textos "há X min". */
export function useAgora(intervaloMs = 30_000): Date {
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), intervaloMs)
    return () => clearInterval(id)
  }, [intervaloMs])
  return agora
}
