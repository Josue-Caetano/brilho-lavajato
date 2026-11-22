import { addDays, format, startOfMonth } from 'date-fns'
import type { Periodo } from '@/db/repositories/relatorios'

export type AtalhoPeriodo = 'hoje' | '7dias' | 'mes' | 'personalizado'

export function periodoDoAtalho(atalho: Exclude<AtalhoPeriodo, 'personalizado'>, hoje = new Date()): Periodo {
  const fim = format(hoje, 'yyyy-MM-dd')
  if (atalho === 'hoje') return { inicio: fim, fim }
  if (atalho === '7dias') return { inicio: format(addDays(hoje, -6), 'yyyy-MM-dd'), fim }
  return { inicio: format(startOfMonth(hoje), 'yyyy-MM-dd'), fim }
}
