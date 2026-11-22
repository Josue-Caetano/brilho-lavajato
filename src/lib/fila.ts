import { minutosDesde } from './datas'

export type EtapaFila = 'aguardando' | 'lavando' | 'acabamento' | 'pronto'

export const ETAPAS: { status: EtapaFila; titulo: string; acao?: string }[] = [
  { status: 'aguardando', titulo: 'Aguardando', acao: 'Iniciar lavagem' },
  { status: 'lavando', titulo: 'Lavando', acao: 'Ir para secagem' },
  { status: 'acabamento', titulo: 'Secagem e acabamento', acao: 'Marcar como pronto' },
  { status: 'pronto', titulo: 'Pronto' },
]

export function proximaEtapa(s: EtapaFila): EtapaFila | null {
  const i = ETAPAS.findIndex((e) => e.status === s)
  return ETAPAS[i + 1]?.status ?? null
}

export function etapaAnterior(s: EtapaFila): EtapaFila | null {
  const i = ETAPAS.findIndex((e) => e.status === s)
  return i > 0 ? ETAPAS[i - 1]!.status : null
}

/**
 * Tempo previsto (min) em cada etapa, a partir da duração total dos serviços:
 * espera até 20 min; lavagem ≈ 65% da duração; secagem/acabamento ≈ 35%; pronto aguarda o cliente até 60 min.
 */
export function tempoPrevistoEtapa(status: EtapaFila, duracaoServicos: number): number {
  const d = Math.max(10, duracaoServicos)
  switch (status) {
    case 'aguardando':
      return 20
    case 'lavando':
      return Math.round(d * 0.65)
    case 'acabamento':
      return Math.max(10, Math.round(d * 0.35))
    case 'pronto':
      return 60
  }
}

export interface TempoEtapa {
  minutos: number
  previsto: number
  atrasado: boolean
}

export function tempoNaEtapa(
  o: {
    status: EtapaFila
    entrada_em: string
    inicio_em: string | null
    acabamento_em: string | null
    pronto_em: string | null
    duracao_prevista: number
  },
  agora: Date,
): TempoEtapa {
  const inicioEtapa =
    (o.status === 'lavando' && o.inicio_em) ||
    (o.status === 'acabamento' && o.acabamento_em) ||
    (o.status === 'pronto' && o.pronto_em) ||
    o.entrada_em
  const minutos = Math.max(0, minutosDesde(inicioEtapa, agora))
  const previsto = tempoPrevistoEtapa(o.status, o.duracao_prevista)
  return { minutos, previsto, atrasado: minutos > previsto }
}

/** Espera média (min) dos carros ainda na fila, desde a entrada. */
export function esperaMedia(entradas: string[], agora: Date): number {
  if (entradas.length === 0) return 0
  return Math.round(entradas.reduce((a, e) => a + Math.max(0, minutosDesde(e, agora)), 0) / entradas.length)
}
