import { normalizarPlaca } from '@/lib/placa'
import { normalizarTelefone } from '@/lib/telefone'
import type { Db } from '../types'

export interface ResultadoVeiculo {
  veiculo_id: number
  placa: string
  modelo: string | null
  cor: string | null
  cliente_id: number
  cliente_nome: string
  na_fila: number
}

export interface ResultadoCliente {
  id: number
  nome: string
  telefone: string | null
  placas: string
}

/** Busca por placa (parcial), nome (sem diferenciar maiúsculas) ou telefone. */
export async function buscaGlobal(
  db: Db,
  termo: string,
): Promise<{ veiculos: ResultadoVeiculo[]; clientes: ResultadoCliente[] }> {
  const t = termo.trim()
  if (t.length < 2) return { veiculos: [], clientes: [] }
  const placa = normalizarPlaca(t)
  const tel = normalizarTelefone(t)
  const veiculos =
    placa.length >= 2
      ? await db.select<ResultadoVeiculo>(
          `SELECT v.id AS veiculo_id, v.placa, v.modelo, v.cor, c.id AS cliente_id, c.nome AS cliente_nome,
                  EXISTS (SELECT 1 FROM ordens o WHERE o.veiculo_id = v.id
                          AND o.status IN ('aguardando','lavando','acabamento','pronto')) AS na_fila
           FROM veiculos v JOIN clientes c ON c.id = v.cliente_id
           WHERE v.placa LIKE ? ORDER BY v.placa LIKE ? DESC, v.placa LIMIT 6`,
          [`%${placa}%`, `${placa}%`],
        )
      : []
  const clientes = await db.select<ResultadoCliente>(
    `SELECT c.id, c.nome, c.telefone,
            COALESCE((SELECT GROUP_CONCAT(placa, ' ') FROM veiculos WHERE cliente_id = c.id), '') AS placas
     FROM clientes c
     WHERE c.nome LIKE ? ${tel.length >= 4 ? 'OR c.telefone LIKE ?' : ''}
     ORDER BY c.nome LIKE ? DESC, c.nome COLLATE NOCASE LIMIT 6`,
    tel.length >= 4 ? [`%${t}%`, `%${tel}%`, `${t}%`] : [`%${t}%`, `${t}%`],
  )
  return { veiculos, clientes }
}
