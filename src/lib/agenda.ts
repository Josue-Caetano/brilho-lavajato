import { addDays, format, parseISO } from 'date-fns'

/** Regras da agenda: horário de funcionamento, intervalo entre horários e quantos carros ao mesmo tempo. */
export interface ConfigAgenda {
  abre: string // "08:00"
  fecha: string // "18:00"
  intervaloMin: number
  /** Quantos carros podem ser atendidos ao mesmo tempo (boxes/equipes). */
  vagas: number
  /** Dias da semana fechados (0 = domingo). */
  diasFechados: number[]
}

export type StatusAgendamento = 'agendado' | 'confirmado' | 'chegou' | 'cancelado' | 'faltou'

export const STATUS_AGENDAMENTO: Record<
  StatusAgendamento,
  { label: string; tom: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' }
> = {
  agendado: { label: 'Agendado', tom: 'neutral' },
  confirmado: { label: 'Confirmado', tom: 'primary' },
  chegou: { label: 'Chegou', tom: 'success' },
  cancelado: { label: 'Cancelado', tom: 'danger' },
  faltou: { label: 'Faltou', tom: 'warning' },
}

/** Agendamentos que ainda ocupam horário (cancelado e faltou liberam a vaga). */
export const ocupaVaga = (s: StatusAgendamento) => s !== 'cancelado' && s !== 'faltou'

export function paraMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export function paraHora(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

/** Horários de início possíveis no dia: 08:00, 08:30, … até antes de fechar. */
export function gerarHorarios(cfg: ConfigAgenda): string[] {
  const ini = paraMinutos(cfg.abre)
  const fim = paraMinutos(cfg.fecha)
  const passo = Math.max(5, cfg.intervaloMin)
  const out: string[] = []
  for (let m = ini; m < fim; m += passo) out.push(paraHora(m))
  return out
}

export function diaFechado(dia: string, cfg: ConfigAgenda): boolean {
  return cfg.diasFechados.includes(parseISO(`${dia}T12:00:00`).getDay())
}

export interface Ocupante {
  id?: number
  data_hora: string // "2026-10-18T09:30:00"
  duracao_min: number
  status: StatusAgendamento
}

/** Quantos agendamentos se sobrepõem ao intervalo [inicio, fim) do dia (minutos desde 00:00). */
export function sobrepostos(
  dia: string,
  inicio: number,
  fim: number,
  ags: Ocupante[],
  ignorarId?: number,
): number {
  return ags.filter((a) => {
    if (
      !ocupaVaga(a.status) ||
      (ignorarId !== undefined && a.id === ignorarId) ||
      !a.data_hora.startsWith(dia)
    )
      return false
    const ini = paraMinutos(a.data_hora.slice(11, 16))
    const termina = ini + Math.max(1, a.duracao_min)
    return ini < fim && inicio < termina
  }).length
}

export interface Horario {
  hora: string
  /** Maior número de carros ao mesmo tempo durante o serviço que começaria aqui. */
  ocupados: number
  livre: boolean
  passado: boolean
}

/**
 * Horários do dia para um serviço de `duracao` minutos. Um horário está livre se, durante todo o
 * serviço, nunca houver `vagas` carros ao mesmo tempo.
 */
export function horariosDoDia(
  dia: string,
  ags: Ocupante[],
  cfg: ConfigAgenda,
  duracao: number,
  agora: Date = new Date(),
  ignorarId?: number,
): Horario[] {
  if (diaFechado(dia, cfg)) return []
  const hoje = format(agora, 'yyyy-MM-dd')
  const minAgora = agora.getHours() * 60 + agora.getMinutes()
  const passo = Math.max(5, cfg.intervaloMin)
  return gerarHorarios(cfg).map((hora) => {
    const ini = paraMinutos(hora)
    const fim = ini + Math.max(passo, duracao)
    let ocupados = 0
    for (let m = ini; m < fim; m += passo) {
      ocupados = Math.max(ocupados, sobrepostos(dia, m, m + passo, ags, ignorarId))
    }
    const passado = dia < hoje || (dia === hoje && ini < minAgora)
    return { hora, ocupados, livre: ocupados < cfg.vagas && !passado, passado }
  })
}

/** Os 7 dias da semana (domingo a sábado) que contêm `dia`. */
export function diasDaSemana(dia: string): string[] {
  const d = parseISO(`${dia}T12:00:00`)
  const domingo = addDays(d, -d.getDay())
  return Array.from({ length: 7 }, (_, i) => format(addDays(domingo, i), 'yyyy-MM-dd'))
}
