import { addDays, format, startOfMonth } from 'date-fns'
import { clientesSumidos } from '@/lib/clientes'
import { progressoFidelidade, type RegraFidelidade } from '@/lib/fidelidade'
import { hojeIso } from '@/lib/datas'
import type { Db } from '../types'

export interface KpisDia {
  faturamento: number
  faturamentoSemanaPassada: number
  atendidos: number
  ticketMedio: number
  naFila: number
  entradasFila: string[]
}

async function totalDia(db: Db, dia: string) {
  const [r] = await db.select<{ fat: number; n: number }>(
    `SELECT COALESCE(SUM(total), 0) AS fat, COUNT(*) AS n FROM ordens
     WHERE status = 'entregue' AND date(entregue_em) = ?`,
    [dia],
  )
  return { faturamento: Number(r?.fat ?? 0), atendidos: Number(r?.n ?? 0) }
}

export async function kpisDoDia(db: Db, hoje: Date = new Date()): Promise<KpisDia> {
  const dia = hojeIso(hoje)
  const atual = await totalDia(db, dia)
  const passada = await totalDia(db, hojeIso(addDays(hoje, -7)))
  const fila = await db.select<{ entrada_em: string }>(
    "SELECT entrada_em FROM ordens WHERE status IN ('aguardando','lavando','acabamento','pronto')",
  )
  return {
    faturamento: atual.faturamento,
    faturamentoSemanaPassada: passada.faturamento,
    atendidos: atual.atendidos,
    ticketMedio: atual.atendidos ? Math.round(atual.faturamento / atual.atendidos) : 0,
    naFila: fila.length,
    entradasFila: fila.map((f) => f.entrada_em),
  }
}

export interface PontoDia {
  dia: string
  faturamento: number
  carros: number
}

/** Faturamento diário de `dias` dias terminando em `fim` (dias sem movimento vêm com zero). */
export async function faturamentoPorDia(db: Db, inicio: string, fim: string): Promise<PontoDia[]> {
  const rows = await db.select<{ dia: string; fat: number; n: number }>(
    `SELECT date(entregue_em) AS dia, SUM(total) AS fat, COUNT(*) AS n FROM ordens
     WHERE status = 'entregue' AND date(entregue_em) BETWEEN ? AND ? GROUP BY dia`,
    [inicio, fim],
  )
  const mapa = new Map(rows.map((r) => [r.dia, r]))
  const out: PontoDia[] = []
  for (let d = new Date(`${inicio}T12:00:00`); hojeIso(d) <= fim; d = addDays(d, 1)) {
    const r = mapa.get(hojeIso(d))
    out.push({ dia: hojeIso(d), faturamento: Number(r?.fat ?? 0), carros: Number(r?.n ?? 0) })
  }
  return out
}

export interface RankingServico {
  nome: string
  quantidade: number
  receita: number
}

export async function rankingServicos(
  db: Db,
  inicio: string,
  fim: string,
  limite = 5,
): Promise<RankingServico[]> {
  const rows = await db.select<RankingServico>(
    `SELECT i.nome, SUM(i.quantidade) AS quantidade, SUM(i.preco_unit * i.quantidade) AS receita
     FROM ordem_itens i JOIN ordens o ON o.id = i.ordem_id
     WHERE o.status = 'entregue' AND date(o.entregue_em) BETWEEN ? AND ?
     GROUP BY i.nome ORDER BY quantidade DESC, receita DESC LIMIT ${Math.floor(limite)}`,
    [inicio, fim],
  )
  return rows.map((r) => ({ ...r, quantidade: Number(r.quantidade), receita: Number(r.receita) }))
}

export function inicioDoMes(hoje: Date = new Date()) {
  return format(startOfMonth(hoje), 'yyyy-MM-dd')
}

export interface ClienteResumo {
  id: number
  nome: string
  telefone: string | null
  ultimaVisita: string | null
  modelo: string | null
  placa: string | null
  pagas: number
  cortesias: number
  aniversario: string | null
}

/** Uma linha por cliente com última visita, contagem de fidelidade e um veículo de referência. */
export async function resumoClientes(db: Db): Promise<ClienteResumo[]> {
  const rows = await db.select<ClienteResumo>(
    `SELECT c.id, c.nome, c.telefone, c.aniversario,
            MAX(o.entregue_em) AS ultimaVisita,
            COALESCE(SUM(o.status = 'entregue' AND o.cortesia = 0), 0) AS pagas,
            COALESCE(SUM(o.status = 'entregue' AND o.cortesia = 1), 0) AS cortesias,
            (SELECT modelo FROM veiculos WHERE cliente_id = c.id ORDER BY id LIMIT 1) AS modelo,
            (SELECT placa FROM veiculos WHERE cliente_id = c.id ORDER BY id LIMIT 1) AS placa
     FROM clientes c LEFT JOIN ordens o ON o.cliente_id = c.id AND o.status = 'entregue'
     GROUP BY c.id`,
  )
  return rows.map((r) => ({ ...r, pagas: Number(r.pagas), cortesias: Number(r.cortesias) }))
}

export function selecionarSumidos(clientes: ClienteResumo[], dias: number, hoje: Date, limite = 6) {
  return clientesSumidos(clientes, dias, hoje).slice(0, limite)
}

export function selecionarQuasePremio(clientes: ClienteResumo[], regra: RegraFidelidade) {
  return clientes
    .map((c) => ({ ...c, fid: progressoFidelidade(c.pagas, c.cortesias, regra) }))
    .filter((c) => regra.ativo && (c.fid.faltam === 1 || c.fid.premioDisponivel))
    .sort((a, b) => a.fid.faltam - b.fid.faltam || a.nome.localeCompare(b.nome))
}

/** Aniversariantes nos próximos `dias` dias (campo MM-DD). */
export function selecionarAniversariantes(clientes: ClienteResumo[], hoje: Date, dias = 7) {
  const proximos = new Map<string, number>()
  for (let i = 0; i < dias; i++) proximos.set(format(addDays(hoje, i), 'MM-dd'), i)
  return clientes
    .filter((c) => c.aniversario && proximos.has(c.aniversario))
    .map((c) => ({ ...c, emDias: proximos.get(c.aniversario!)! }))
    .sort((a, b) => a.emDias - b.emDias)
}
