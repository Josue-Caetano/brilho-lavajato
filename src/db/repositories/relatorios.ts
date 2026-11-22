import type { Db } from '../types'
import { faturamentoPorDia, rankingServicos, type PontoDia, type RankingServico } from './painel'

export interface Periodo {
  inicio: string
  fim: string
}

const ENTREGUE = "o.status = 'entregue' AND date(o.entregue_em) BETWEEN ? AND ?"

export interface ResumoPeriodo {
  faturamento: number
  carros: number
  ticketMedio: number
  descontos: number
  despesas: number
  lucro: number
  fiadoEmAberto: number
}

export async function resumoPeriodo(db: Db, p: Periodo): Promise<ResumoPeriodo> {
  const [o] = await db.select<{ fat: number; n: number; desc: number }>(
    `SELECT COALESCE(SUM(o.total), 0) AS fat, COUNT(*) AS n, COALESCE(SUM(o.desconto), 0) AS "desc" FROM ordens o WHERE ${ENTREGUE}`,
    [p.inicio, p.fim],
  )
  const [d] = await db.select<{ v: number }>(
    'SELECT COALESCE(SUM(valor), 0) AS v FROM despesas WHERE date(data) BETWEEN ? AND ?',
    [p.inicio, p.fim],
  )
  const [f] = await db.select<{ v: number }>(
    `SELECT COALESCE(SUM(p.valor), 0) AS v FROM pagamentos p JOIN ordens o ON o.id = p.ordem_id
     WHERE p.forma = 'fiado' AND p.quitado_em IS NULL AND ${ENTREGUE}`,
    [p.inicio, p.fim],
  )
  const faturamento = Number(o?.fat ?? 0)
  const carros = Number(o?.n ?? 0)
  const despesas = Number(d?.v ?? 0)
  return {
    faturamento,
    carros,
    ticketMedio: carros ? Math.round(faturamento / carros) : 0,
    descontos: Number(o?.desc ?? 0),
    despesas,
    lucro: faturamento - despesas,
    fiadoEmAberto: Number(f?.v ?? 0),
  }
}

export async function porFormaPagamento(db: Db, p: Periodo): Promise<{ forma: string; valor: number }[]> {
  const rows = await db.select<{ forma: string; valor: number }>(
    `SELECT p.forma, SUM(p.valor) AS valor FROM pagamentos p JOIN ordens o ON o.id = p.ordem_id
     WHERE ${ENTREGUE} GROUP BY p.forma`,
    [p.inicio, p.fim],
  )
  return rows.map((r) => ({ forma: r.forma, valor: Number(r.valor) }))
}

export async function porFuncionario(
  db: Db,
  p: Periodo,
): Promise<{ nome: string; carros: number; faturamento: number }[]> {
  const rows = await db.select<{ nome: string | null; carros: number; faturamento: number }>(
    `SELECT u.nome, COUNT(*) AS carros, SUM(o.total) AS faturamento
     FROM ordens o LEFT JOIN usuarios u ON u.id = o.funcionario_id
     WHERE ${ENTREGUE} GROUP BY o.funcionario_id ORDER BY carros DESC`,
    [p.inicio, p.fim],
  )
  return rows.map((r) => ({
    nome: r.nome ?? 'Sem registro',
    carros: Number(r.carros),
    faturamento: Number(r.faturamento),
  }))
}

export async function despesasPorCategoria(
  db: Db,
  p: Periodo,
): Promise<{ categoria: string; valor: number }[]> {
  const rows = await db.select<{ categoria: string; valor: number }>(
    `SELECT categoria, SUM(valor) AS valor FROM despesas WHERE date(data) BETWEEN ? AND ?
     GROUP BY categoria ORDER BY valor DESC`,
    [p.inicio, p.fim],
  )
  return rows.map((r) => ({ categoria: r.categoria, valor: Number(r.valor) }))
}

/** Mapa de calor: entradas de carros por dia da semana (0 = domingo) × hora. */
export async function mapaDeCalor(
  db: Db,
  p: Periodo,
): Promise<{ dia: number; hora: number; carros: number }[]> {
  const rows = await db.select<{ dia: string; hora: string; carros: number }>(
    `SELECT strftime('%w', o.entrada_em) AS dia, strftime('%H', o.entrada_em) AS hora, COUNT(*) AS carros
     FROM ordens o WHERE o.status <> 'cancelada' AND date(o.entrada_em) BETWEEN ? AND ?
     GROUP BY dia, hora`,
    [p.inicio, p.fim],
  )
  return rows.map((r) => ({ dia: Number(r.dia), hora: Number(r.hora), carros: Number(r.carros) }))
}

export interface NovosRecorrentes {
  novos: number
  recorrentes: number
  faturamentoNovos: number
  faturamentoRecorrentes: number
}

/** Novo = primeira lavagem entregue caiu dentro do período. */
export async function novosRecorrentes(db: Db, p: Periodo): Promise<NovosRecorrentes> {
  const rows = await db.select<{ novo: number; fat: number }>(
    `SELECT (SELECT MIN(date(x.entregue_em)) FROM ordens x WHERE x.cliente_id = o.cliente_id AND x.status = 'entregue') >= ? AS novo,
            SUM(o.total) AS fat
     FROM ordens o WHERE ${ENTREGUE} GROUP BY o.cliente_id`,
    [p.inicio, p.inicio, p.fim],
  )
  const r: NovosRecorrentes = { novos: 0, recorrentes: 0, faturamentoNovos: 0, faturamentoRecorrentes: 0 }
  for (const x of rows) {
    if (Number(x.novo)) {
      r.novos++
      r.faturamentoNovos += Number(x.fat)
    } else {
      r.recorrentes++
      r.faturamentoRecorrentes += Number(x.fat)
    }
  }
  return r
}

export interface OrdemRelatorio {
  numero: number
  entregue_em: string
  cliente: string
  placa: string
  servicos: string
  subtotal: number
  desconto: number
  total: number
  formas: string | null
  funcionario: string | null
}

export async function ordensDoPeriodo(db: Db, p: Periodo): Promise<OrdemRelatorio[]> {
  return db.select<OrdemRelatorio>(
    `SELECT o.numero, o.entregue_em, c.nome AS cliente, v.placa,
            (SELECT GROUP_CONCAT(nome, ' + ') FROM ordem_itens WHERE ordem_id = o.id) AS servicos,
            o.subtotal, o.desconto, o.total,
            (SELECT GROUP_CONCAT(forma, ' + ') FROM pagamentos WHERE ordem_id = o.id) AS formas,
            u.nome AS funcionario
     FROM ordens o JOIN clientes c ON c.id = o.cliente_id JOIN veiculos v ON v.id = o.veiculo_id
     LEFT JOIN usuarios u ON u.id = o.funcionario_id
     WHERE ${ENTREGUE} ORDER BY o.entregue_em`,
    [p.inicio, p.fim],
  )
}

export interface Relatorio {
  periodo: Periodo
  resumo: ResumoPeriodo
  porDia: PontoDia[]
  formas: { forma: string; valor: number }[]
  servicos: RankingServico[]
  funcionarios: { nome: string; carros: number; faturamento: number }[]
  despesas: { categoria: string; valor: number }[]
  calor: { dia: number; hora: number; carros: number }[]
  clientes: NovosRecorrentes
}

export async function gerarRelatorio(db: Db, p: Periodo): Promise<Relatorio> {
  const [resumo, porDia, formas, servicos, funcionarios, despesas, calor, clientes] = await Promise.all([
    resumoPeriodo(db, p),
    faturamentoPorDia(db, p.inicio, p.fim),
    porFormaPagamento(db, p),
    rankingServicos(db, p.inicio, p.fim, 50),
    porFuncionario(db, p),
    despesasPorCategoria(db, p),
    mapaDeCalor(db, p),
    novosRecorrentes(db, p),
  ])
  return { periodo: p, resumo, porDia, formas, servicos, funcionarios, despesas, calor, clientes }
}
