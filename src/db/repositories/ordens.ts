import { agoraIso } from '@/lib/datas'
import type { FormaPagamento, TipoVeiculo } from '@/lib/ordem'
import { ref, type Db, type SqlValue, type Stmt } from '../types'

export type StatusOrdem = 'aguardando' | 'lavando' | 'acabamento' | 'pronto' | 'entregue' | 'cancelada'
export type StatusFila = Extract<StatusOrdem, 'aguardando' | 'lavando' | 'acabamento' | 'pronto'>

export const COLUNAS_FILA: StatusFila[] = ['aguardando', 'lavando', 'acabamento', 'pronto']

/** Coluna de data/hora que marca a entrada em cada etapa. */
export const CAMPO_ETAPA: Record<StatusFila | 'entregue', string> = {
  aguardando: 'entrada_em',
  lavando: 'inicio_em',
  acabamento: 'acabamento_em',
  pronto: 'pronto_em',
  entregue: 'entregue_em',
}

export interface ItemOrdem {
  id: number
  ordem_id: number
  servico_id: number | null
  nome: string
  preco_unit: number
  quantidade: number
}

export interface OrdemFila {
  id: number
  numero: number
  status: StatusFila
  entrada_em: string
  inicio_em: string | null
  acabamento_em: string | null
  pronto_em: string | null
  subtotal: number
  desconto: number
  total: number
  observacoes: string | null
  veiculo_id: number
  placa: string
  modelo: string | null
  cor: string | null
  tipo: TipoVeiculo
  cliente_id: number
  cliente_nome: string
  cliente_telefone: string | null
  cliente_observacoes: string | null
  /** Soma das durações previstas dos serviços (min). */
  duracao_prevista: number
  itens: ItemOrdem[]
}

export async function contarFila(db: Db): Promise<number> {
  const [r] = await db.select<{ n: number }>(
    "SELECT COUNT(*) AS n FROM ordens WHERE status IN ('aguardando','lavando','acabamento','pronto')",
  )
  return Number(r?.n ?? 0)
}

async function itensDe(db: Db, ids: number[]): Promise<Map<number, ItemOrdem[]>> {
  const mapa = new Map<number, ItemOrdem[]>()
  if (ids.length === 0) return mapa
  const itens = await db.select<ItemOrdem>(
    `SELECT * FROM ordem_itens WHERE ordem_id IN (${ids.map(() => '?').join(',')}) ORDER BY id`,
    ids,
  )
  for (const i of itens) {
    const lista = mapa.get(i.ordem_id) ?? []
    lista.push(i)
    mapa.set(i.ordem_id, lista)
  }
  return mapa
}

const SELECT_ORDEM = `
  SELECT o.id, o.numero, o.status, o.entrada_em, o.inicio_em, o.acabamento_em, o.pronto_em,
         o.subtotal, o.desconto, o.total, o.observacoes, o.veiculo_id, o.cliente_id,
         v.placa, v.modelo, v.cor, v.tipo,
         c.nome AS cliente_nome, c.telefone AS cliente_telefone, c.observacoes AS cliente_observacoes,
         COALESCE((SELECT SUM(s.duracao_min) FROM ordem_itens i JOIN servicos s ON s.id = i.servico_id
                   WHERE i.ordem_id = o.id), 30) AS duracao_prevista
  FROM ordens o
  JOIN veiculos v ON v.id = o.veiculo_id
  JOIN clientes c ON c.id = o.cliente_id`

/** Carros na fila (tudo que não foi entregue nem cancelado). */
export async function listarFila(db: Db): Promise<OrdemFila[]> {
  const ordens = await db.select<Omit<OrdemFila, 'itens'>>(
    `${SELECT_ORDEM} WHERE o.status IN ('aguardando','lavando','acabamento','pronto') ORDER BY o.entrada_em, o.id`,
  )
  const itens = await itensDe(
    db,
    ordens.map((o) => o.id),
  )
  return ordens.map((o) => ({ ...o, itens: itens.get(o.id) ?? [] }))
}

export async function obterOrdem(db: Db, id: number): Promise<OrdemFila | null> {
  const [o] = await db.select<Omit<OrdemFila, 'itens'>>(`${SELECT_ORDEM} WHERE o.id = ?`, [id])
  if (!o) return null
  const itens = await itensDe(db, [id])
  return { ...o, itens: itens.get(id) ?? [] }
}

/**
 * Muda a etapa e registra a hora. Se pular etapas (arrastando direto para "Pronto"), preenche as
 * horas puladas com o momento atual; ao voltar, limpa as horas das etapas seguintes.
 */
export async function moverOrdem(db: Db, id: number, para: StatusFila, quando = agoraIso()) {
  const idx = COLUNAS_FILA.indexOf(para)
  const sets: string[] = ['status = ?']
  const params: SqlValue[] = [para]
  COLUNAS_FILA.forEach((s, i) => {
    if (s === 'aguardando') return
    if (i < idx) {
      sets.push(`${CAMPO_ETAPA[s]} = COALESCE(${CAMPO_ETAPA[s]}, ?)`)
      params.push(quando)
    } else if (i === idx) {
      sets.push(`${CAMPO_ETAPA[s]} = ?`)
      params.push(quando)
    } else {
      sets.push(`${CAMPO_ETAPA[s]} = NULL`)
    }
  })
  await db.execute(`UPDATE ordens SET ${sets.join(', ')} WHERE id = ?`, [...params, id])
}

export async function cancelarOrdem(db: Db, id: number) {
  await db.execute("UPDATE ordens SET status = 'cancelada' WHERE id = ?", [id])
}

export interface NovaOrdemInput {
  /** Veículo existente ou dados para criar um novo (com cliente novo ou existente). */
  veiculoId?: number
  clienteId?: number
  novoCliente?: { nome: string; telefone: string }
  novoVeiculo?: { placa: string; modelo: string; cor: string; tipo: TipoVeiculo }
  itens: { servico_id: number; nome: string; preco_unit: number; quantidade: number }[]
  observacoes?: string
  funcionarioId?: number | null
}

/**
 * Comandos para criar (se preciso) cliente e veículo e pôr o carro na fila. Devolve também o índice
 * do INSERT da ordem, para quem quiser encadear mais comandos na mesma transação (ex.: agendamento).
 */
export function stmtsNovaOrdem(
  input: NovaOrdemInput,
  agora = agoraIso(),
): { stmts: Stmt[]; ordemIdx: number } {
  const stmts: Stmt[] = []
  let clienteRef: SqlValue | undefined = input.clienteId
  let veiculoRef: SqlValue | undefined = input.veiculoId

  if (input.novoCliente) {
    clienteRef = ref(
      stmts.push({
        sql: 'INSERT INTO clientes (nome, telefone, criado_em) VALUES (?, ?, ?)',
        params: [input.novoCliente.nome.trim(), input.novoCliente.telefone || null, agora],
      }) - 1,
    )
  }
  if (input.novoVeiculo) {
    if (clienteRef === undefined) throw new Error('Informe o cliente do veículo.')
    veiculoRef = ref(
      stmts.push({
        sql: 'INSERT INTO veiculos (cliente_id, placa, modelo, cor, tipo, criado_em) VALUES (?, ?, ?, ?, ?, ?)',
        params: [
          clienteRef,
          input.novoVeiculo.placa,
          input.novoVeiculo.modelo.trim() || null,
          input.novoVeiculo.cor.trim() || null,
          input.novoVeiculo.tipo,
          agora,
        ],
      }) - 1,
    )
  }
  if (veiculoRef === undefined || clienteRef === undefined) throw new Error('Informe o veículo e o cliente.')
  if (input.itens.length === 0) throw new Error('Escolha pelo menos um serviço.')

  const subtotal = input.itens.reduce((a, i) => a + i.preco_unit * i.quantidade, 0)
  const ordemIdx =
    stmts.push({
      sql: `INSERT INTO ordens (numero, veiculo_id, cliente_id, status, entrada_em, funcionario_id, subtotal, desconto, total, observacoes)
            VALUES ((SELECT COALESCE(MAX(numero), 0) + 1 FROM ordens), ?, ?, 'aguardando', ?, ?, ?, 0, ?, ?)`,
      params: [
        veiculoRef,
        clienteRef,
        agora,
        input.funcionarioId ?? null,
        subtotal,
        subtotal,
        input.observacoes || null,
      ],
    }) - 1
  for (const i of input.itens) {
    stmts.push({
      sql: 'INSERT INTO ordem_itens (ordem_id, servico_id, nome, preco_unit, quantidade) VALUES (?, ?, ?, ?, ?)',
      params: [ref(ordemIdx), i.servico_id, i.nome, i.preco_unit, i.quantidade],
    })
  }
  return { stmts, ordemIdx }
}

/** Cria (se preciso) cliente e veículo e põe o carro na fila — tudo numa transação. */
export async function criarOrdem(db: Db, input: NovaOrdemInput): Promise<number> {
  const { stmts, ordemIdx } = stmtsNovaOrdem(input)
  const res = await db.transaction(stmts)
  return res[ordemIdx]!.lastInsertId
}

export interface EntregaInput {
  ordemId: number
  subtotal: number
  /** Desconto total gravado (inclui o valor da cortesia). */
  desconto: number
  total: number
  cortesia: boolean
  /** Valores líquidos por forma (dinheiro já sem o troco). */
  pagamentos: { forma: FormaPagamento; valor: number }[]
  caixaId: number | null
}

/** Entregar e cobrar: fecha a ordem e registra os pagamentos de uma vez. */
export async function entregarOrdem(db: Db, e: EntregaInput, quando = agoraIso()) {
  const stmts: Stmt[] = [
    {
      sql: `UPDATE ordens SET status = 'entregue', entregue_em = ?, pronto_em = COALESCE(pronto_em, ?),
              subtotal = ?, desconto = ?, total = ?, cortesia = ? WHERE id = ? AND status <> 'entregue'`,
      params: [quando, quando, e.subtotal, e.desconto, e.total, e.cortesia ? 1 : 0, e.ordemId],
    },
    ...e.pagamentos
      .filter((p) => p.valor > 0)
      .map((p) => ({
        sql: 'INSERT INTO pagamentos (ordem_id, forma, valor, pago_em, caixa_id) VALUES (?, ?, ?, ?, ?)',
        params: [e.ordemId, p.forma, p.valor, quando, e.caixaId] as SqlValue[],
      })),
  ]
  await db.transaction(stmts)
}

export interface PagamentoOrdem {
  id: number
  forma: FormaPagamento
  valor: number
  pago_em: string
  quitado_em: string | null
  quitado_forma: string | null
}

export async function pagamentosDaOrdem(db: Db, ordemId: number): Promise<PagamentoOrdem[]> {
  return db.select<PagamentoOrdem>(
    'SELECT id, forma, valor, pago_em, quitado_em, quitado_forma FROM pagamentos WHERE ordem_id = ? ORDER BY id',
    [ordemId],
  )
}

/** Dados completos para o comprovante. */
export async function obterComprovante(db: Db, ordemId: number) {
  const [o] = await db.select<{
    id: number
    numero: number
    entrada_em: string
    entregue_em: string | null
    subtotal: number
    desconto: number
    total: number
    cortesia: number
    placa: string
    modelo: string | null
    cliente_nome: string
    funcionario_nome: string | null
  }>(
    `SELECT o.id, o.numero, o.entrada_em, o.entregue_em, o.subtotal, o.desconto, o.total, o.cortesia,
            v.placa, v.modelo, c.nome AS cliente_nome, u.nome AS funcionario_nome
     FROM ordens o JOIN veiculos v ON v.id = o.veiculo_id JOIN clientes c ON c.id = o.cliente_id
     LEFT JOIN usuarios u ON u.id = o.funcionario_id WHERE o.id = ?`,
    [ordemId],
  )
  if (!o) return null
  const itens = (await itensDe(db, [ordemId])).get(ordemId) ?? []
  const pagamentos = await pagamentosDaOrdem(db, ordemId)
  return { ...o, itens, pagamentos }
}
export type Comprovante = NonNullable<Awaited<ReturnType<typeof obterComprovante>>>
