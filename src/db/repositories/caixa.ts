import {
  conferirCaixa,
  FORMAS_CAIXA,
  type Conferencia,
  type FormaCaixa,
  type MovimentosCaixa,
} from '@/lib/caixa'
import { agoraIso } from '@/lib/datas'
import type { Db } from '../types'

export interface CaixaRow {
  id: number
  aberto_em: string
  fechado_em: string | null
  valor_abertura: number
  valor_fechamento_informado: number | null
  diferenca: number | null
  conferencia: string | null
  usuario_id: number | null
  observacoes: string | null
}

export type TipoMovimento = 'entrada' | 'saida' | 'sangria' | 'suprimento'

export const CATEGORIAS_DESPESA = [
  'Produtos',
  'Água e luz',
  'Aluguel',
  'Salários',
  'Manutenção',
  'Alimentação',
  'Impostos',
  'Outros',
] as const

export async function caixaAberto(db: Db): Promise<CaixaRow | null> {
  const [c] = await db.select<CaixaRow>(
    'SELECT * FROM caixa WHERE fechado_em IS NULL ORDER BY id DESC LIMIT 1',
  )
  return c ?? null
}

export async function abrirCaixa(db: Db, valorAbertura: number, usuarioId: number | null): Promise<number> {
  if (await caixaAberto(db)) throw new Error('Já existe um caixa aberto.')
  const r = await db.execute('INSERT INTO caixa (aberto_em, valor_abertura, usuario_id) VALUES (?, ?, ?)', [
    agoraIso(),
    Math.max(0, valorAbertura),
    usuarioId,
  ])
  return r.lastInsertId
}

export async function lancarMovimento(
  db: Db,
  caixaId: number,
  tipo: TipoMovimento,
  valor: number,
  descricao: string,
) {
  if (valor <= 0) throw new Error('Informe um valor maior que zero.')
  await db.execute(
    'INSERT INTO movimentos_caixa (caixa_id, tipo, descricao, valor, criado_em) VALUES (?, ?, ?, ?, ?)',
    [caixaId, tipo, descricao.trim() || null, valor, agoraIso()],
  )
}

export interface DespesaInput {
  descricao: string
  categoria: string
  valor: number
  data: string
  /** Paga com o dinheiro da gaveta do caixa aberto? */
  caixaId: number | null
}

export async function lancarDespesa(db: Db, d: DespesaInput) {
  if (d.valor <= 0) throw new Error('Informe um valor maior que zero.')
  await db.execute(
    'INSERT INTO despesas (descricao, categoria, valor, data, caixa_id) VALUES (?, ?, ?, ?, ?)',
    [d.descricao.trim(), d.categoria, d.valor, d.data, d.caixaId],
  )
}

export async function excluirDespesa(db: Db, id: number) {
  await db.execute('DELETE FROM despesas WHERE id = ?', [id])
}

export async function excluirMovimento(db: Db, id: number) {
  await db.execute(
    'DELETE FROM movimentos_caixa WHERE id = ? AND caixa_id IN (SELECT id FROM caixa WHERE fechado_em IS NULL)',
    [id],
  )
}

export interface Despesa {
  id: number
  descricao: string
  categoria: string
  valor: number
  data: string
  caixa_id: number | null
}

export async function listarDespesas(db: Db, inicio: string, fim: string): Promise<Despesa[]> {
  return db.select<Despesa>(
    'SELECT * FROM despesas WHERE date(data) BETWEEN ? AND ? ORDER BY data DESC, id DESC',
    [inicio, fim],
  )
}

export interface Lancamento {
  chave: string
  tipo: 'venda' | 'quitacao' | 'fiado' | TipoMovimento | 'despesa'
  descricao: string
  forma: string | null
  valor: number
  quando: string
  /** id do movimento (para excluir) */
  movimentoId?: number
}

export interface ResumoCaixa {
  caixa: CaixaRow
  movimentos: MovimentosCaixa
  fiadoLancado: number
  lancamentos: Lancamento[]
}

/** Tudo que entrou e saiu num caixa — base da tela e da conferência de fechamento. */
export async function resumoCaixa(db: Db, caixaId: number): Promise<ResumoCaixa | null> {
  const [caixa] = await db.select<CaixaRow>('SELECT * FROM caixa WHERE id = ?', [caixaId])
  if (!caixa) return null

  const vendas = await db.select<{
    id: number
    forma: string
    valor: number
    pago_em: string
    placa: string
    numero: number
  }>(
    `SELECT p.id, p.forma, p.valor, p.pago_em, v.placa, o.numero
     FROM pagamentos p JOIN ordens o ON o.id = p.ordem_id JOIN veiculos v ON v.id = o.veiculo_id
     WHERE p.caixa_id = ?`,
    [caixaId],
  )
  const quitacoes = await db.select<{
    id: number
    quitado_forma: string
    valor: number
    quitado_em: string
    cliente: string
  }>(
    `SELECT p.id, p.quitado_forma, p.valor, p.quitado_em, c.nome AS cliente
     FROM pagamentos p JOIN ordens o ON o.id = p.ordem_id JOIN clientes c ON c.id = o.cliente_id
     WHERE p.quitado_caixa_id = ?`,
    [caixaId],
  )
  const movs = await db.select<{
    id: number
    tipo: TipoMovimento
    descricao: string | null
    valor: number
    criado_em: string
  }>('SELECT * FROM movimentos_caixa WHERE caixa_id = ?', [caixaId])
  const despesas = await db.select<Despesa>('SELECT * FROM despesas WHERE caixa_id = ?', [caixaId])

  const recebido: Record<FormaCaixa, number> = { dinheiro: 0, pix: 0, debito: 0, credito: 0 }
  let fiadoLancado = 0
  for (const v of vendas) {
    if (v.forma === 'fiado') fiadoLancado += v.valor
    else recebido[v.forma as FormaCaixa] += v.valor
  }
  for (const q of quitacoes) recebido[q.quitado_forma as FormaCaixa] += q.valor
  const somaTipo = (t: TipoMovimento) => movs.filter((m) => m.tipo === t).reduce((a, m) => a + m.valor, 0)

  const movimentos: MovimentosCaixa = {
    valorAbertura: caixa.valor_abertura,
    recebido,
    suprimentos: somaTipo('suprimento'),
    sangrias: somaTipo('sangria'),
    entradas: somaTipo('entrada'),
    saidas: somaTipo('saida'),
    despesasDinheiro: despesas.reduce((a, d) => a + d.valor, 0),
  }

  const lancamentos: Lancamento[] = [
    ...vendas.map((v) => ({
      chave: `p${v.id}`,
      tipo: (v.forma === 'fiado' ? 'fiado' : 'venda') as Lancamento['tipo'],
      descricao: `Ordem nº ${v.numero} · ${v.placa}`,
      forma: v.forma,
      valor: v.valor,
      quando: v.pago_em,
    })),
    ...quitacoes.map((q) => ({
      chave: `q${q.id}`,
      tipo: 'quitacao' as const,
      descricao: `Fiado quitado · ${q.cliente}`,
      forma: q.quitado_forma,
      valor: q.valor,
      quando: q.quitado_em,
    })),
    ...movs.map((m) => ({
      chave: `m${m.id}`,
      tipo: m.tipo,
      descricao: m.descricao ?? '',
      forma: 'dinheiro',
      valor: m.valor,
      quando: m.criado_em,
      movimentoId: m.id,
    })),
    ...despesas.map((d) => ({
      chave: `d${d.id}`,
      tipo: 'despesa' as const,
      descricao: `${d.descricao} (${d.categoria})`,
      forma: 'dinheiro',
      valor: d.valor,
      quando: d.data,
    })),
  ].sort((a, b) => (a.quando < b.quando ? 1 : -1))

  return { caixa, movimentos, fiadoLancado, lancamentos }
}

/** Fecha o caixa com a conferência por forma de pagamento. */
export async function fecharCaixa(
  db: Db,
  caixaId: number,
  informado: Record<FormaCaixa, number>,
  observacoes = '',
): Promise<Conferencia> {
  const r = await resumoCaixa(db, caixaId)
  if (!r) throw new Error('Caixa não encontrado.')
  if (r.caixa.fechado_em) throw new Error('Este caixa já foi fechado.')
  const conf = conferirCaixa(r.movimentos, informado)
  await db.transaction([
    {
      sql: `UPDATE caixa SET fechado_em = ?, valor_fechamento_informado = ?, diferenca = ?, conferencia = ?, observacoes = ?
            WHERE id = ? AND fechado_em IS NULL`,
      params: [
        agoraIso(),
        informado.dinheiro,
        conf.diferenca,
        JSON.stringify(conf),
        observacoes.trim() || null,
        caixaId,
      ],
    },
  ])
  return conf
}

export interface CaixaHistorico extends CaixaRow {
  usuario_nome: string | null
  recebido: number
}

export async function listarCaixas(db: Db, limite = 60): Promise<CaixaHistorico[]> {
  const rows = await db.select<CaixaHistorico>(
    `SELECT c.*, u.nome AS usuario_nome,
            COALESCE((SELECT SUM(valor) FROM pagamentos WHERE caixa_id = c.id AND forma <> 'fiado'), 0)
            + COALESCE((SELECT SUM(valor) FROM pagamentos WHERE quitado_caixa_id = c.id), 0) AS recebido
     FROM caixa c LEFT JOIN usuarios u ON u.id = c.usuario_id
     WHERE c.fechado_em IS NOT NULL ORDER BY c.aberto_em DESC LIMIT ${Math.floor(limite)}`,
  )
  return rows.map((r) => ({ ...r, recebido: Number(r.recebido) }))
}

export { FORMAS_CAIXA }
