import { differenceInMinutes, format, formatDistanceStrict, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/** Datas são guardadas como ISO 8601 no horário local, sem fuso: "2026-10-18T14:30:00". */
export function toIsoLocal(d: Date): string {
  return format(d, "yyyy-MM-dd'T'HH:mm:ss")
}

export function agoraIso(): string {
  return toIsoLocal(new Date())
}

export function hojeIso(d: Date = new Date()): string {
  return format(d, 'yyyy-MM-dd')
}

export function parseData(iso: string): Date {
  return parseISO(iso)
}

/** dd/mm/aaaa */
export function formatarData(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? parseISO(iso) : iso
  return format(d, 'dd/MM/yyyy')
}

export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return '—'
  return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm")
}

export function formatarHora(iso: string | null | undefined): string {
  if (!iso) return '—'
  return format(parseISO(iso), 'HH:mm')
}

/** "sábado, 18 de outubro de 2026" */
export function dataPorExtenso(d: Date = new Date()): string {
  return format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

/** Minutos → "45 min", "1h 05min", "2 dias". */
export function formatarDuracao(minutos: number): string {
  const m = Math.max(0, Math.round(minutos))
  if (m < 60) return `${m} min`
  if (m < 60 * 24) {
    const h = Math.floor(m / 60)
    const r = m % 60
    return r ? `${h}h ${String(r).padStart(2, '0')}min` : `${h}h`
  }
  const dias = Math.floor(m / (60 * 24))
  return dias === 1 ? '1 dia' : `${dias} dias`
}

export function minutosDesde(iso: string, agora: Date = new Date()): number {
  return differenceInMinutes(agora, parseISO(iso))
}

/** "há 3 dias" */
export function tempoRelativo(iso: string, agora: Date = new Date()): string {
  return `há ${formatDistanceStrict(parseISO(iso), agora, { locale: ptBR })}`
}

/** Opções globais do date-fns: semana começa no domingo. */
export const opcoesSemana = { locale: ptBR, weekStartsOn: 0 as const }
