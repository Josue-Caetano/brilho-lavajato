import { agoraIso } from '@/lib/datas'
import { progressoFidelidade, type ProgressoFidelidade, type RegraFidelidade } from '@/lib/fidelidade'
import type { TipoVeiculo } from '@/lib/ordem'
import { normalizarPlaca } from '@/lib/placa'
import { normalizarTelefone } from '@/lib/telefone'
import type { Db } from '../types'

export interface Veiculo {
  id: number
  cliente_id: number
  placa: string
  modelo: string | null
  cor: string | null
  tipo: TipoVeiculo
}

export interface Cliente {
  id: number
  nome: string
  telefone: string | null
  observacoes: string | null
  aniversario: string | null
  criado_em: string
}

export interface ContagemFidelidade {
  pagas: number
  cortesias: number
}

export async function contagemFidelidade(db: Db, clienteId: number): Promise<ContagemFidelidade> {
  const [r] = await db.select<{ pagas: number; cortesias: number }>(
    `SELECT COALESCE(SUM(cortesia = 0), 0) AS pagas, COALESCE(SUM(cortesia = 1), 0) AS cortesias
     FROM ordens WHERE cliente_id = ? AND status = 'entregue'`,
    [clienteId],
  )
  return { pagas: Number(r?.pagas ?? 0), cortesias: Number(r?.cortesias ?? 0) }
}

export interface HistoricoVeiculo {
  veiculo: Veiculo
  cliente: Cliente
  ultimaVisita: string | null
  visitas: number
  servicoMaisComum: string | null
  fidelidade: ProgressoFidelidade
  fiadoAberto: number
  /** Já existe uma ordem em andamento para este veículo? */
  naFila: boolean
}

/** Busca pela placa (com ou sem hífen) e traz o histórico do cliente para o "Novo carro". */
export async function buscarPorPlaca(
  db: Db,
  placa: string,
  regra: RegraFidelidade,
): Promise<HistoricoVeiculo | null> {
  const p = normalizarPlaca(placa)
  const [v] = await db.select<Veiculo>('SELECT * FROM veiculos WHERE placa = ?', [p])
  if (!v) return null
  const [c] = await db.select<Cliente>('SELECT * FROM clientes WHERE id = ?', [v.cliente_id])
  if (!c) return null
  const [h] = await db.select<{ ultima: string | null; visitas: number }>(
    "SELECT MAX(entrada_em) AS ultima, COUNT(*) AS visitas FROM ordens WHERE veiculo_id = ? AND status = 'entregue'",
    [v.id],
  )
  const [comum] = await db.select<{ nome: string }>(
    `SELECT i.nome FROM ordem_itens i JOIN ordens o ON o.id = i.ordem_id
     WHERE o.veiculo_id = ? AND o.status = 'entregue' GROUP BY i.nome ORDER BY COUNT(*) DESC, MAX(o.entrada_em) DESC LIMIT 1`,
    [v.id],
  )
  const cont = await contagemFidelidade(db, c.id)
  return {
    veiculo: v,
    cliente: c,
    ultimaVisita: h?.ultima ?? null,
    visitas: Number(h?.visitas ?? 0),
    servicoMaisComum: comum?.nome ?? null,
    fidelidade: progressoFidelidade(cont.pagas, cont.cortesias, regra),
    fiadoAberto: await fiadoEmAberto(db, c.id),
    naFila:
      (
        await db.select(
          "SELECT 1 FROM ordens WHERE veiculo_id = ? AND status IN ('aguardando','lavando','acabamento','pronto') LIMIT 1",
          [v.id],
        )
      ).length > 0,
  }
}

export async function fiadoEmAberto(db: Db, clienteId: number): Promise<number> {
  const [r] = await db.select<{ v: number }>(
    `SELECT COALESCE(SUM(p.valor), 0) AS v FROM pagamentos p JOIN ordens o ON o.id = p.ordem_id
     WHERE o.cliente_id = ? AND p.forma = 'fiado' AND p.quitado_em IS NULL`,
    [clienteId],
  )
  return Number(r?.v ?? 0)
}

/** Busca rápida de clientes por nome ou telefone (para vincular um carro novo a um cliente existente). */
export async function buscarClientes(
  db: Db,
  termo: string,
  limite = 8,
): Promise<(Cliente & { placas: string })[]> {
  const t = termo.trim()
  if (!t) return []
  const digitos = normalizarTelefone(t)
  return db.select(
    `SELECT c.*, COALESCE((SELECT GROUP_CONCAT(placa, ' ') FROM veiculos WHERE cliente_id = c.id), '') AS placas
     FROM clientes c
     WHERE c.nome LIKE ? COLLATE NOCASE ${digitos.length >= 3 ? "OR REPLACE(REPLACE(REPLACE(REPLACE(c.telefone,'(',''),')',''),'-',''),' ','') LIKE ?" : ''}
     ORDER BY c.nome COLLATE NOCASE LIMIT ${Math.floor(limite)}`,
    digitos.length >= 3 ? [`%${t}%`, `%${digitos}%`] : [`%${t}%`],
  )
}

export interface ClienteInput {
  nome: string
  telefone: string
  observacoes?: string
  aniversario?: string
}

export async function criarCliente(db: Db, c: ClienteInput): Promise<number> {
  const r = await db.execute(
    'INSERT INTO clientes (nome, telefone, observacoes, aniversario, criado_em) VALUES (?, ?, ?, ?, ?)',
    [
      c.nome.trim(),
      normalizarTelefone(c.telefone) || null,
      c.observacoes?.trim() || null,
      c.aniversario || null,
      agoraIso(),
    ],
  )
  return r.lastInsertId
}

export async function atualizarCliente(db: Db, id: number, c: ClienteInput) {
  await db.execute(
    'UPDATE clientes SET nome = ?, telefone = ?, observacoes = ?, aniversario = ? WHERE id = ?',
    [
      c.nome.trim(),
      normalizarTelefone(c.telefone) || null,
      c.observacoes?.trim() || null,
      c.aniversario || null,
      id,
    ],
  )
}

export interface VeiculoInput {
  placa: string
  modelo: string
  cor: string
  tipo: TipoVeiculo
}

export async function criarVeiculo(db: Db, clienteId: number, v: VeiculoInput): Promise<number> {
  const r = await db.execute(
    'INSERT INTO veiculos (cliente_id, placa, modelo, cor, tipo, criado_em) VALUES (?, ?, ?, ?, ?, ?)',
    [clienteId, normalizarPlaca(v.placa), v.modelo.trim() || null, v.cor.trim() || null, v.tipo, agoraIso()],
  )
  return r.lastInsertId
}

export async function atualizarVeiculo(db: Db, id: number, v: VeiculoInput) {
  await db.execute('UPDATE veiculos SET placa = ?, modelo = ?, cor = ?, tipo = ? WHERE id = ?', [
    normalizarPlaca(v.placa),
    v.modelo.trim() || null,
    v.cor.trim() || null,
    v.tipo,
    id,
  ])
}

/** Veículo com ordens não pode ser apagado (o histórico depende dele). */
export async function excluirVeiculo(db: Db, id: number): Promise<boolean> {
  const [r] = await db.select<{ n: number }>('SELECT COUNT(*) AS n FROM ordens WHERE veiculo_id = ?', [id])
  if (Number(r?.n ?? 0) > 0) return false
  await db.execute('DELETE FROM veiculos WHERE id = ?', [id])
  return true
}

export interface ClienteLinha extends Cliente {
  placas: string
  visitas: number
  totalGasto: number
  ultimaVisita: string | null
  pagas: number
  cortesias: number
  fiado: number
}

/** Tabela de clientes com totais calculados (uma consulta só, rápida para centenas de clientes). */
export async function listarClientesTabela(db: Db): Promise<ClienteLinha[]> {
  const rows = await db.select<ClienteLinha>(
    `SELECT c.*,
            COALESCE((SELECT GROUP_CONCAT(placa, ' ') FROM veiculos WHERE cliente_id = c.id), '') AS placas,
            COUNT(o.id) AS visitas,
            COALESCE(SUM(o.total), 0) AS totalGasto,
            MAX(o.entregue_em) AS ultimaVisita,
            COALESCE(SUM(o.cortesia = 0), 0) AS pagas,
            COALESCE(SUM(o.cortesia = 1), 0) AS cortesias,
            COALESCE((SELECT SUM(p.valor) FROM pagamentos p JOIN ordens x ON x.id = p.ordem_id
                      WHERE x.cliente_id = c.id AND p.forma = 'fiado' AND p.quitado_em IS NULL), 0) AS fiado
     FROM clientes c
     LEFT JOIN ordens o ON o.cliente_id = c.id AND o.status = 'entregue'
     GROUP BY c.id
     ORDER BY c.nome COLLATE NOCASE`,
  )
  return rows.map((r) => ({
    ...r,
    visitas: Number(r.visitas),
    totalGasto: Number(r.totalGasto),
    pagas: Number(r.pagas),
    cortesias: Number(r.cortesias),
    fiado: Number(r.fiado),
  }))
}

export async function obterCliente(db: Db, id: number): Promise<Cliente | null> {
  const [c] = await db.select<Cliente>('SELECT * FROM clientes WHERE id = ?', [id])
  return c ?? null
}

export async function veiculosDoCliente(db: Db, clienteId: number): Promise<Veiculo[]> {
  return db.select<Veiculo>('SELECT * FROM veiculos WHERE cliente_id = ? ORDER BY id', [clienteId])
}

export interface OrdemHistorico {
  id: number
  numero: number
  status: string
  entrada_em: string
  entregue_em: string | null
  total: number
  cortesia: number
  placa: string
  modelo: string | null
  servicos: string
  formas: string | null
}

export async function historicoCliente(db: Db, clienteId: number): Promise<OrdemHistorico[]> {
  return db.select<OrdemHistorico>(
    `SELECT o.id, o.numero, o.status, o.entrada_em, o.entregue_em, o.total, o.cortesia, v.placa, v.modelo,
            (SELECT GROUP_CONCAT(nome, ' + ') FROM ordem_itens WHERE ordem_id = o.id) AS servicos,
            (SELECT GROUP_CONCAT(DISTINCT forma) FROM pagamentos WHERE ordem_id = o.id) AS formas
     FROM ordens o JOIN veiculos v ON v.id = o.veiculo_id
     WHERE o.cliente_id = ? ORDER BY o.entrada_em DESC`,
    [clienteId],
  )
}

export interface FiadoAberto {
  id: number
  ordem_id: number
  numero: number
  valor: number
  pago_em: string
  placa: string
}

export async function fiadosDoCliente(db: Db, clienteId: number): Promise<FiadoAberto[]> {
  return db.select<FiadoAberto>(
    `SELECT p.id, p.ordem_id, o.numero, p.valor, p.pago_em, v.placa
     FROM pagamentos p JOIN ordens o ON o.id = p.ordem_id JOIN veiculos v ON v.id = o.veiculo_id
     WHERE o.cliente_id = ? AND p.forma = 'fiado' AND p.quitado_em IS NULL ORDER BY p.pago_em`,
    [clienteId],
  )
}

/** Quita fiados: registra a forma de recebimento e o caixa aberto (entra na conferência do dia). */
export async function quitarFiados(
  db: Db,
  pagamentoIds: number[],
  forma: 'dinheiro' | 'pix' | 'debito' | 'credito',
  caixaId: number | null,
) {
  await db.transaction(
    pagamentoIds.map((id) => ({
      sql: `UPDATE pagamentos SET quitado_em = ?, quitado_forma = ?, quitado_caixa_id = ?
            WHERE id = ? AND forma = 'fiado' AND quitado_em IS NULL`,
      params: [agoraIso(), forma, caixaId, id],
    })),
  )
}

/** Cliente sem ordens pode ser apagado (veículos vão junto). */
export async function excluirCliente(db: Db, id: number): Promise<boolean> {
  const [r] = await db.select<{ n: number }>('SELECT COUNT(*) AS n FROM ordens WHERE cliente_id = ?', [id])
  if (Number(r?.n ?? 0) > 0) return false
  await db.execute('DELETE FROM clientes WHERE id = ?', [id])
  return true
}

/** Todas as placas já cadastradas (para a importação não duplicar). */
export async function placasCadastradas(db: Db): Promise<Set<string>> {
  const rows = await db.select<{ placa: string }>('SELECT placa FROM veiculos')
  return new Set(rows.map((r) => r.placa))
}

/** Grava a importação inteira numa transação: ou entra tudo, ou nada. */
export async function importarClientes(
  db: Db,
  clientes: import('@/lib/importacao').ClienteImportacao[],
): Promise<{ clientes: number; veiculos: number }> {
  const agora = agoraIso()
  const stmts: import('../types').Stmt[] = []
  let veiculos = 0
  for (const c of clientes) {
    const idx =
      stmts.push({
        sql: 'INSERT INTO clientes (nome, telefone, observacoes, aniversario, criado_em) VALUES (?, ?, ?, ?, ?)',
        params: [c.nome, c.telefone || null, c.observacoes || null, c.aniversario, agora],
      }) - 1
    for (const v of c.veiculos) {
      veiculos++
      stmts.push({
        sql: 'INSERT INTO veiculos (cliente_id, placa, modelo, cor, tipo, criado_em) VALUES (?, ?, ?, ?, ?, ?)',
        params: [{ $ref: idx }, v.placa, v.modelo || null, v.cor || null, v.tipo, agora],
      })
    }
  }
  if (stmts.length) await db.transaction(stmts)
  return { clientes: clientes.length, veiculos }
}
