import { differenceInCalendarDays, parseISO } from 'date-fns'

export interface ClienteVisita {
  id: number
  ultimaVisita: string | null
}

/** Clientes que não voltam há `dias` dias ou mais, do mais antigo para o mais recente. */
export function clientesSumidos<T extends ClienteVisita>(
  clientes: T[],
  dias: number,
  hoje: Date = new Date(),
): (T & { diasSemVir: number })[] {
  return clientes
    .filter((c) => c.ultimaVisita)
    .map((c) => ({ ...c, diasSemVir: differenceInCalendarDays(hoje, parseISO(c.ultimaVisita!)) }))
    .filter((c) => c.diasSemVir >= dias)
    .sort((a, b) => b.diasSemVir - a.diasSemVir)
}
