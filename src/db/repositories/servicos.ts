import type { Db } from '../types'

export interface Servico {
  id: number
  nome: string
  descricao: string | null
  preco_carro: number
  preco_caminhonete: number
  preco_moto: number
  duracao_min: number
  ativo: number
  ordem_exibicao: number
}

export type ServicoInput = Omit<Servico, 'id' | 'ativo' | 'ordem_exibicao'> & { ativo?: boolean }

export const SERVICOS_PADRAO: ServicoInput[] = [
  {
    nome: 'Lavagem simples',
    descricao: 'Externa com shampoo neutro, secagem e pretinho nos pneus',
    preco_carro: 4000,
    preco_caminhonete: 5500,
    preco_moto: 2500,
    duracao_min: 30,
  },
  {
    nome: 'Lavagem completa',
    descricao: 'Externa + aspiração, painel e vidros por dentro',
    preco_carro: 6000,
    preco_caminhonete: 8000,
    preco_moto: 3500,
    duracao_min: 50,
  },
  {
    nome: 'Completa + cera',
    descricao: 'Lavagem completa com cera de carnaúba',
    preco_carro: 9000,
    preco_caminhonete: 11500,
    preco_moto: 5000,
    duracao_min: 70,
  },
  {
    nome: 'Higienização interna',
    descricao: 'Bancos, carpetes e teto com extratora',
    preco_carro: 22000,
    preco_caminhonete: 28000,
    preco_moto: 0,
    duracao_min: 180,
  },
  {
    nome: 'Polimento',
    descricao: 'Polimento técnico com remoção de riscos superficiais',
    preco_carro: 35000,
    preco_caminhonete: 45000,
    preco_moto: 15000,
    duracao_min: 240,
  },
]

export async function listarServicos(db: Db, apenasAtivos = false): Promise<Servico[]> {
  return db.select<Servico>(
    `SELECT * FROM servicos ${apenasAtivos ? 'WHERE ativo = 1' : ''} ORDER BY ordem_exibicao, id`,
  )
}

export function stmtCriarServico(s: ServicoInput, ordem = 0) {
  return {
    sql: `INSERT INTO servicos (nome, descricao, preco_carro, preco_caminhonete, preco_moto, duracao_min, ativo, ordem_exibicao)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    params: [
      s.nome.trim(),
      s.descricao?.trim() || null,
      s.preco_carro,
      s.preco_caminhonete,
      s.preco_moto,
      s.duracao_min,
      s.ativo === false ? 0 : 1,
      ordem,
    ],
  }
}

export async function criarServico(db: Db, s: ServicoInput) {
  const [r] = await db.select<{ n: number }>('SELECT COALESCE(MAX(ordem_exibicao), 0) + 1 AS n FROM servicos')
  const st = stmtCriarServico(s, Number(r?.n ?? 0))
  return (await db.execute(st.sql, st.params)).lastInsertId
}

export async function atualizarServico(db: Db, id: number, s: ServicoInput) {
  await db.execute(
    `UPDATE servicos SET nome = ?, descricao = ?, preco_carro = ?, preco_caminhonete = ?, preco_moto = ?,
       duracao_min = ?, ativo = ? WHERE id = ?`,
    [
      s.nome.trim(),
      s.descricao?.trim() || null,
      s.preco_carro,
      s.preco_caminhonete,
      s.preco_moto,
      s.duracao_min,
      s.ativo === false ? 0 : 1,
      id,
    ],
  )
}

export async function alternarServico(db: Db, id: number, ativo: boolean) {
  await db.execute('UPDATE servicos SET ativo = ? WHERE id = ?', [ativo ? 1 : 0, id])
}

/** Serviço com ordens no histórico não pode ser apagado — só desativado. */
export async function excluirServico(db: Db, id: number): Promise<boolean> {
  const [r] = await db.select<{ n: number }>('SELECT COUNT(*) AS n FROM ordem_itens WHERE servico_id = ?', [
    id,
  ])
  if (Number(r?.n ?? 0) > 0) return false
  await db.execute('DELETE FROM servicos WHERE id = ?', [id])
  return true
}

export async function reordenarServicos(db: Db, ids: number[]) {
  await db.transaction(
    ids.map((id, i) => ({ sql: 'UPDATE servicos SET ordem_exibicao = ? WHERE id = ?', params: [i + 1, id] })),
  )
}
