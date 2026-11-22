import type { StatusAgendamento } from '@/lib/agenda'
import { agoraIso } from '@/lib/datas'
import type { TipoVeiculo } from '@/lib/ordem'
import { normalizarPlaca } from '@/lib/placa'
import { normalizarTelefone } from '@/lib/telefone'
import { ref, type Db } from '../types'
import { stmtsNovaOrdem, type NovaOrdemInput } from './ordens'

export interface ServicoAgendado {
  servico_id: number
  nome: string
  preco_unit: number
}

export interface Agendamento {
  id: number
  data_hora: string
  duracao_min: number
  status: StatusAgendamento
  cliente_id: number | null
  veiculo_id: number | null
  nome: string
  telefone: string | null
  placa: string | null
  modelo: string | null
  cor: string | null
  tipo: TipoVeiculo
  servicos: ServicoAgendado[]
  total: number
  observacoes: string | null
  ordem_id: number | null
}

type Linha = Omit<Agendamento, 'servicos'> & { servicos: string }

const ler = (r: Linha): Agendamento => {
  let servicos: ServicoAgendado[] = []
  try {
    servicos = JSON.parse(r.servicos) as ServicoAgendado[]
  } catch {
    servicos = []
  }
  return { ...r, servicos }
}

/** Agendamentos entre duas datas (inclusive), em ordem de horário. */
export async function listarAgendamentos(db: Db, inicio: string, fim: string): Promise<Agendamento[]> {
  const rows = await db.select<Linha>(
    `SELECT a.id, a.data_hora, a.duracao_min, a.status, a.cliente_id, a.veiculo_id,
            COALESCE(c.nome, a.nome) AS nome, COALESCE(c.telefone, a.telefone) AS telefone,
            COALESCE(v.placa, a.placa) AS placa, COALESCE(v.modelo, a.modelo) AS modelo,
            COALESCE(v.cor, a.cor) AS cor, COALESCE(v.tipo, a.tipo) AS tipo,
            a.servicos, a.total, a.observacoes, a.ordem_id
     FROM agendamentos a
     LEFT JOIN clientes c ON c.id = a.cliente_id
     LEFT JOIN veiculos v ON v.id = a.veiculo_id
     WHERE date(a.data_hora) BETWEEN ? AND ?
     ORDER BY a.data_hora, a.id`,
    [inicio, fim],
  )
  return rows.map(ler)
}

export interface AgendamentoInput {
  data_hora: string
  duracao_min: number
  cliente_id: number | null
  veiculo_id: number | null
  nome: string
  telefone: string
  placa: string
  modelo: string
  cor: string
  tipo: TipoVeiculo
  servicos: ServicoAgendado[]
  observacoes: string
}

function valores(a: AgendamentoInput) {
  if (!a.nome.trim()) throw new Error('Informe o nome do cliente.')
  if (a.servicos.length === 0) throw new Error('Escolha pelo menos um serviço.')
  return [
    a.data_hora,
    Math.max(5, Math.round(a.duracao_min)),
    a.cliente_id,
    a.veiculo_id,
    a.nome.trim(),
    normalizarTelefone(a.telefone) || null,
    normalizarPlaca(a.placa) || null,
    a.modelo.trim() || null,
    a.cor.trim() || null,
    a.tipo,
    JSON.stringify(a.servicos),
    a.servicos.reduce((s, x) => s + x.preco_unit, 0),
    a.observacoes.trim() || null,
  ]
}

export async function criarAgendamento(db: Db, a: AgendamentoInput): Promise<number> {
  const r = await db.execute(
    `INSERT INTO agendamentos (data_hora, duracao_min, cliente_id, veiculo_id, nome, telefone, placa, modelo, cor, tipo,
       servicos, total, observacoes, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [...valores(a), agoraIso()],
  )
  return r.lastInsertId
}

export async function atualizarAgendamento(db: Db, id: number, a: AgendamentoInput) {
  await db.execute(
    `UPDATE agendamentos SET data_hora = ?, duracao_min = ?, cliente_id = ?, veiculo_id = ?, nome = ?, telefone = ?,
       placa = ?, modelo = ?, cor = ?, tipo = ?, servicos = ?, total = ?, observacoes = ?
     WHERE id = ? AND status IN ('agendado','confirmado')`,
    [...valores(a), id],
  )
}

export async function mudarStatusAgendamento(
  db: Db,
  id: number,
  status: Exclude<StatusAgendamento, 'chegou'>,
) {
  await db.execute("UPDATE agendamentos SET status = ? WHERE id = ? AND status <> 'chegou'", [status, id])
}

/**
 * O cliente chegou: cadastra cliente/veículo se ainda não existirem, põe o carro na fila com os
 * serviços agendados e liga a ordem ao agendamento — tudo numa transação.
 */
export async function registrarChegada(db: Db, id: number, funcionarioId: number | null): Promise<number> {
  const [a] = (await db.select<Linha>('SELECT * FROM agendamentos WHERE id = ?', [id])).map(ler)
  if (!a) throw new Error('Agendamento não encontrado.')
  if (a.status === 'chegou') throw new Error('Este cliente já chegou e está na fila.')
  if (a.status === 'cancelado') throw new Error('Este agendamento foi cancelado.')

  let veiculoId = a.veiculo_id
  let clienteId = a.cliente_id
  const placa = a.placa ? normalizarPlaca(a.placa) : ''
  if (!veiculoId && placa) {
    // A placa pode ter sido cadastrada depois do agendamento
    const [v] = await db.select<{ id: number; cliente_id: number }>(
      'SELECT id, cliente_id FROM veiculos WHERE placa = ?',
      [placa],
    )
    if (v) {
      veiculoId = v.id
      clienteId = v.cliente_id
    }
  }
  if (!veiculoId && !placa) throw new Error('Informe a placa no agendamento antes de pôr o carro na fila.')

  const input: NovaOrdemInput = {
    veiculoId: veiculoId ?? undefined,
    clienteId: clienteId ?? undefined,
    novoCliente: clienteId ? undefined : { nome: a.nome, telefone: a.telefone ?? '' },
    novoVeiculo: veiculoId ? undefined : { placa, modelo: a.modelo ?? '', cor: a.cor ?? '', tipo: a.tipo },
    itens: a.servicos.map((s) => ({ ...s, quantidade: 1 })),
    observacoes: a.observacoes ? `Agendado: ${a.observacoes}` : 'Agendado',
    funcionarioId,
  }
  const { stmts, ordemIdx } = stmtsNovaOrdem(input)
  stmts.push({
    sql: `UPDATE agendamentos SET status = 'chegou', ordem_id = ?,
            cliente_id = (SELECT cliente_id FROM ordens WHERE id = ?),
            veiculo_id = (SELECT veiculo_id FROM ordens WHERE id = ?)
          WHERE id = ?`,
    params: [ref(ordemIdx), ref(ordemIdx), ref(ordemIdx), id],
  })
  const res = await db.transaction(stmts)
  return res[ordemIdx]!.lastInsertId
}

/** Quantos clientes ainda são esperados hoje (para o contador do menu). */
export async function contarAgendadosHoje(db: Db, hoje: string): Promise<number> {
  const [r] = await db.select<{ n: number }>(
    "SELECT COUNT(*) AS n FROM agendamentos WHERE date(data_hora) = ? AND status IN ('agendado','confirmado')",
    [hoje],
  )
  return Number(r?.n ?? 0)
}
